/**
 * CAPITAL MATRIX ENGINE
 * Master WACC calculator — compares all capital structures.
 * Consumes from config/project.js.
 *
 * Inputs:  % debt, % equity, % bond, % token, PRI boolean, blended boolean
 * Outputs: Blended WACC, IRR to sponsor, DSCR, sensitivity table, risk score
 */

const { PROJECT, ASSUMPTIONS, TOKEN_DEFAULTS } = require('../config/project.js');
const { runScenario } = require('../models/25-year-cashflow.js');

// ── COST OF CAPITAL ASSUMPTIONS ───────────────────────────────

/** @type {Record<string, number>} */
const COST_OF_CAPITAL = {
  senior_debt:        0.065,   // 6.5% commercial
  concessional_debt:  0.025,   // 2.5% IFC/GCF
  mezzanine:          0.095,   // 9.5% climate facility
  equity:             0.120,   // 12% required return
  token:              0.080,   // 8% preferred return
  green_bond:         0.072,   // SOFR + 250 bps indicative
};

/** PRI spread reduction (bps) */
const PRI_SPREAD_REDUCTION = {
  miga:     0.0100,   // -100 bps
  dfc:      0.0075,   // -75 bps
  private:  0.0050,   // -50 bps
  stacked:  0.0125,   // -125 bps  (MIGA + DFC)
};

/** Blended concessional impact */
const CONCESSIONAL_WACC_BENEFIT = 0.018;  // ~180 bps reduction

// ── STRUCTURE DEFINITIONS ─────────────────────────────────────

/**
 * @typedef {Object} CapitalStructure
 * @property {string}  name
 * @property {number}  pct_senior_debt
 * @property {number}  pct_concessional_debt
 * @property {number}  pct_mezzanine
 * @property {number}  pct_equity
 * @property {number}  pct_token
 * @property {number}  pct_green_bond
 * @property {boolean} pri_applied
 * @property {string}  pri_type
 * @property {boolean} blended_finance
 */

/** @type {CapitalStructure[]} */
const STRUCTURES = [
  {
    name: 'Baseline (Commercial)',
    pct_senior_debt: 0.60, pct_concessional_debt: 0, pct_mezzanine: 0,
    pct_equity: 0.40, pct_token: 0, pct_green_bond: 0,
    pri_applied: false, pri_type: 'none', blended_finance: false,
  },
  {
    name: 'Baseline + Token',
    pct_senior_debt: 0.60, pct_concessional_debt: 0, pct_mezzanine: 0,
    pct_equity: 0.27, pct_token: 0.13, pct_green_bond: 0,
    pri_applied: false, pri_type: 'none', blended_finance: false,
  },
  {
    name: 'PRI-Enhanced Commercial',
    pct_senior_debt: 0.60, pct_concessional_debt: 0, pct_mezzanine: 0,
    pct_equity: 0.40, pct_token: 0, pct_green_bond: 0,
    pri_applied: true, pri_type: 'miga', blended_finance: false,
  },
  {
    name: 'Blended Finance (IFC A/B + Concessional)',
    pct_senior_debt: 0.35, pct_concessional_debt: 0.20, pct_mezzanine: 0.10,
    pct_equity: 0.20, pct_token: 0.15, pct_green_bond: 0,
    pri_applied: true, pri_type: 'miga', blended_finance: true,
  },
  {
    name: 'Full Multilateral (GCF + CIF + DFI)',
    pct_senior_debt: 0.25, pct_concessional_debt: 0.25, pct_mezzanine: 0.10,
    pct_equity: 0.20, pct_token: 0.10, pct_green_bond: 0.10,
    pri_applied: true, pri_type: 'stacked', blended_finance: true,
  },
  {
    name: 'Green Bond + Token Hybrid',
    pct_senior_debt: 0.30, pct_concessional_debt: 0.10, pct_mezzanine: 0,
    pct_equity: 0.20, pct_token: 0.15, pct_green_bond: 0.25,
    pri_applied: true, pri_type: 'dfc', blended_finance: true,
  },

  // ── ACQUISITION SCENARIOS ($35M + $55M = $90M total basis) ──────
  {
    name: 'Full Asset Acquisition ($90M basis)',
    pct_senior_debt: 0.60, pct_concessional_debt: 0, pct_mezzanine: 0,
    pct_equity: 0.40, pct_token: 0, pct_green_bond: 0,
    pri_applied: false, pri_type: 'none', blended_finance: false,
    total_basis_override: 90_000_000,
  },
  {
    name: 'Staged Acquisition ($90M, PRI-Enhanced)',
    pct_senior_debt: 0.35, pct_concessional_debt: 0.20, pct_mezzanine: 0.10,
    pct_equity: 0.20, pct_token: 0.15, pct_green_bond: 0,
    pri_applied: true, pri_type: 'miga', blended_finance: true,
    total_basis_override: 90_000_000,
  },
  {
    name: 'Option + Flip ($70M basis, 20% equity sell-down Yr 5)',
    pct_senior_debt: 0.60, pct_concessional_debt: 0, pct_mezzanine: 0,
    pct_equity: 0.27, pct_token: 0.13, pct_green_bond: 0,
    pri_applied: false, pri_type: 'none', blended_finance: false,
    total_basis_override: 70_000_000,
    equity_selldown_yr5_pct: 0.20,
  },
];

// ── WACC CALCULATOR ───────────────────────────────────────────

/**
 * Calculate blended WACC for a given capital structure.
 * @param {CapitalStructure} structure
 * @returns {{ wacc: number, components: Object }}
 */
function calculateWACC(structure) {
  const taxRate = ASSUMPTIONS.tax_rate;
  const taxShield = structure.blended_finance ? (1 - taxRate * 0.5) : (1 - taxRate);

  // Debt cost with PRI adjustment
  let debtCost = COST_OF_CAPITAL.senior_debt;
  if (structure.pri_applied && PRI_SPREAD_REDUCTION[structure.pri_type]) {
    debtCost -= PRI_SPREAD_REDUCTION[structure.pri_type];
  }

  const components = {
    senior_debt:       structure.pct_senior_debt * debtCost * taxShield,
    concessional_debt: structure.pct_concessional_debt * COST_OF_CAPITAL.concessional_debt * taxShield,
    mezzanine:         structure.pct_mezzanine * COST_OF_CAPITAL.mezzanine * taxShield,
    equity:            structure.pct_equity * COST_OF_CAPITAL.equity,
    token:             structure.pct_token * COST_OF_CAPITAL.token,
    green_bond:        structure.pct_green_bond * COST_OF_CAPITAL.green_bond * taxShield,
  };

  let wacc = Object.values(components).reduce((s, v) => s + v, 0);

  // Concessional blending benefit
  if (structure.blended_finance) {
    wacc -= CONCESSIONAL_WACC_BENEFIT * (structure.pct_concessional_debt + structure.pct_mezzanine * 0.5);
  }

  return { wacc: Math.max(wacc, 0.02), components };
}

// ── RISK SCORE ────────────────────────────────────────────────

/**
 * Simple risk score (1-10, lower is better) based on structure characteristics.
 * @param {CapitalStructure} structure
 * @returns {number}
 */
function calculateRiskScore(structure) {
  let score = 5; // baseline

  // More diversified capital = lower risk
  const nonZeroLayers = [
    structure.pct_senior_debt, structure.pct_concessional_debt,
    structure.pct_mezzanine, structure.pct_equity,
    structure.pct_token, structure.pct_green_bond,
  ].filter(v => v > 0).length;
  score -= (nonZeroLayers - 2) * 0.5;

  // PRI reduces risk
  if (structure.pri_applied) score -= 1.0;
  if (structure.pri_type === 'stacked') score -= 0.5;

  // High leverage increases risk
  const totalDebt = structure.pct_senior_debt + structure.pct_concessional_debt +
                    structure.pct_mezzanine + structure.pct_green_bond;
  if (totalDebt > 0.70) score += 1.0;
  if (totalDebt > 0.80) score += 1.0;

  // Blended finance reduces risk
  if (structure.blended_finance) score -= 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

// ── SCENARIO ENGINE ───────────────────────────────────────────

/**
 * Run capital matrix for a given structure across all scenarios.
 * @param {CapitalStructure} structure
 * @returns {Object}
 */
function analyzeStructure(structure) {
  const { wacc, components } = calculateWACC(structure);
  const riskScore = calculateRiskScore(structure);

  const totalCapex = structure.total_basis_override || ASSUMPTIONS.capex_usd;
  const equityAmount = totalCapex * structure.pct_equity;
  const totalDebt = totalCapex * (structure.pct_senior_debt + structure.pct_concessional_debt +
                                   structure.pct_mezzanine + structure.pct_green_bond);

  const scenarios = {};
  for (const [label, multiplier] of Object.entries(ASSUMPTIONS.scenarios)) {
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
    const cf = runScenario(displayLabel, multiplier);

    scenarios[displayLabel] = {
      leveredIRR:     cf.leveredIRR,
      minDSCR:        cf.dscr_min,
      avgDSCR:        cf.dscr_avg,
      equityMultiple: cf.equityMultiple,
      npv8:           cf.npv8,
      paybackYear:    cf.paybackYear,
    };
  }

  return {
    name:          structure.name,
    wacc,
    waccComponents: components,
    riskScore,
    equityAmount,
    totalDebt,
    tokenAmount:   totalCapex * structure.pct_token,
    pri:           structure.pri_applied ? structure.pri_type : 'none',
    blended:       structure.blended_finance,
    scenarios,
  };
}

/**
 * Run full capital matrix across all defined structures.
 * @returns {Object[]}
 */
function runCapitalMatrix() {
  return STRUCTURES.map(s => analyzeStructure(s));
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { runCapitalMatrix, analyzeStructure, calculateWACC, calculateRiskScore, STRUCTURES };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — CAPITAL MATRIX ENGINE');
  console.log('  Comparing all capital structures across 3 scenarios');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = runCapitalMatrix();

  for (const r of results) {
    console.log(`\n┌─── ${r.name} ${'─'.repeat(55 - r.name.length)}┐`);
    console.log(`│  WACC:        ${(r.wacc * 100).toFixed(2)}%`);
    console.log(`│  Risk Score:  ${r.riskScore} / 10`);
    console.log(`│  Equity:      $${(r.equityAmount / 1e6).toFixed(1)}M`);
    console.log(`│  Total Debt:  $${(r.totalDebt / 1e6).toFixed(1)}M`);
    console.log(`│  Token:       $${(r.tokenAmount / 1e6).toFixed(1)}M`);
    console.log(`│  PRI:         ${r.pri}`);
    console.log(`│  Blended:     ${r.blended}`);
    console.log('│');
    console.log('│  Scenario       IRR       DSCR    Multiple   NPV@8%     Payback');
    console.log('│  ─────────────────────────────────────────────────────────────');
    for (const [label, s] of Object.entries(r.scenarios)) {
      const irr = (s.leveredIRR * 100).toFixed(1).padStart(6);
      const dscr = s.minDSCR.toFixed(2).padStart(6);
      const mult = s.equityMultiple.toFixed(2).padStart(7);
      const npv = `$${(s.npv8 / 1e6).toFixed(1)}M`.padStart(8);
      const pay = `${s.paybackYear}yr`.padStart(8);
      console.log(`│  ${label.padEnd(16)} ${irr}%  ${dscr}x  ${mult}x  ${npv}  ${pay}`);
    }
    console.log(`└${'─'.repeat(62)}┘`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  WACC COMPARISON SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Structure'.padEnd(45) + 'WACC     Risk');
  console.log('  ' + '─'.repeat(58));
  for (const r of results) {
    console.log(`  ${r.name.padEnd(43)} ${(r.wacc * 100).toFixed(2)}%    ${r.riskScore}/10`);
  }
  console.log();
}
