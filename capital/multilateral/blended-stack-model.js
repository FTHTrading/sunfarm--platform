/**
 * BLENDED FINANCE STACK MODEL
 * Simulates WACC under various multilateral/blended structures.
 * Consumes from config/project.js.
 */

const { ASSUMPTIONS } = require('../../config/project.js');

// ── LAYER DEFINITIONS ─────────────────────────────────────────

/**
 * @typedef {Object} FinanceLayer
 * @property {string} name
 * @property {string} source
 * @property {number} pct       - Percentage of CAPEX
 * @property {number} rate      - Cost of capital (annual)
 * @property {number} tenor     - Years
 * @property {number} grace     - Grace period in years
 * @property {boolean} taxDeductible
 */

/** @type {FinanceLayer[]} */
const BLENDED_LAYERS = [
  { name: 'Commercial Senior Debt',   source: 'IFC A-loan / commercial bank', pct: 0.35, rate: 0.065, tenor: 18, grace: 2, taxDeductible: true },
  { name: 'Concessional Debt',        source: 'GCF / CIF / CDB',             pct: 0.20, rate: 0.025, tenor: 20, grace: 5, taxDeductible: true },
  { name: 'Climate Mezzanine',        source: 'CIF CTF / KfW DEG',           pct: 0.10, rate: 0.060, tenor: 15, grace: 3, taxDeductible: true },
  { name: 'Sponsor Equity',           source: 'Project sponsor',             pct: 0.20, rate: 0.120, tenor: 25, grace: 0, taxDeductible: false },
  { name: 'Token / Bond Layer',       source: 'Reg D 506(c) securities',     pct: 0.15, rate: 0.080, tenor: 25, grace: 0, taxDeductible: false },
];

// ── WACC CALCULATION ──────────────────────────────────────────

/**
 * Calculate WACC for a given set of finance layers.
 * @param {FinanceLayer[]} layers
 * @param {number} taxRate
 * @returns {{ wacc: number, layers: Object[] }}
 */
function calculateBlendedWACC(layers, taxRate = ASSUMPTIONS.tax_rate) {
  let totalPct = 0;
  let wacc = 0;
  const layerDetails = [];

  for (const layer of layers) {
    const taxShield = layer.taxDeductible ? (1 - taxRate) : 1;
    const contribution = layer.pct * layer.rate * taxShield;
    wacc += contribution;
    totalPct += layer.pct;

    layerDetails.push({
      name:         layer.name,
      source:       layer.source,
      pct:          layer.pct,
      rate:         layer.rate,
      taxShield,
      contribution,
      amount:       ASSUMPTIONS.capex_usd * layer.pct,
    });
  }

  return { wacc, totalPct, layers: layerDetails };
}

// ── STRUCTURE SCENARIOS ───────────────────────────────────────

/**
 * Run WACC comparison across multiple blended structures.
 * @returns {Object[]}
 */
function runBlendedComparison() {
  const structures = [
    {
      name: 'Commercial Only (60/40)',
      layers: [
        { name: 'Senior Debt', source: 'Commercial banks', pct: 0.60, rate: 0.065, tenor: 18, grace: 2, taxDeductible: true },
        { name: 'Sponsor Equity', source: 'Sponsor', pct: 0.40, rate: 0.120, tenor: 25, grace: 0, taxDeductible: false },
      ],
    },
    {
      name: 'IFC A/B + Sponsor',
      layers: [
        { name: 'IFC A-Loan', source: 'IFC own account', pct: 0.25, rate: 0.060, tenor: 18, grace: 2, taxDeductible: true },
        { name: 'IFC B-Loan', source: 'Mobilized commercial', pct: 0.25, rate: 0.065, tenor: 15, grace: 0, taxDeductible: true },
        { name: 'Sponsor Equity', source: 'Sponsor', pct: 0.30, rate: 0.120, tenor: 25, grace: 0, taxDeductible: false },
        { name: 'Token Securities', source: 'Reg D 506(c)', pct: 0.20, rate: 0.080, tenor: 25, grace: 0, taxDeductible: false },
      ],
    },
    {
      name: 'Full Blended (Default)',
      layers: BLENDED_LAYERS,
    },
    {
      name: 'Maximum Concessional',
      layers: [
        { name: 'Commercial Senior', source: 'IFC / commercial', pct: 0.20, rate: 0.060, tenor: 18, grace: 2, taxDeductible: true },
        { name: 'GCF Concessional', source: 'Green Climate Fund', pct: 0.25, rate: 0.015, tenor: 25, grace: 7, taxDeductible: true },
        { name: 'CIF CTF', source: 'Clean Technology Fund', pct: 0.15, rate: 0.020, tenor: 20, grace: 5, taxDeductible: true },
        { name: 'Sponsor Equity', source: 'Sponsor', pct: 0.20, rate: 0.120, tenor: 25, grace: 0, taxDeductible: false },
        { name: 'Token + Green Bond', source: 'Digital/traditional', pct: 0.20, rate: 0.075, tenor: 15, grace: 0, taxDeductible: false },
      ],
    },
    {
      name: 'Green Bond Primary',
      layers: [
        { name: 'Green Bond', source: 'ICMA-aligned issuance', pct: 0.50, rate: 0.072, tenor: 15, grace: 1, taxDeductible: true },
        { name: 'Concessional Debt', source: 'IDB / CAF', pct: 0.15, rate: 0.030, tenor: 20, grace: 5, taxDeductible: true },
        { name: 'Sponsor Equity', source: 'Sponsor', pct: 0.20, rate: 0.120, tenor: 25, grace: 0, taxDeductible: false },
        { name: 'Token Securities', source: 'Reg D 506(c)', pct: 0.15, rate: 0.080, tenor: 25, grace: 0, taxDeductible: false },
      ],
    },
  ];

  return structures.map(s => ({
    name: s.name,
    ...calculateBlendedWACC(s.layers),
  }));
}

// ── PRI IMPACT ────────────────────────────────────────────────

/**
 * Model the impact of Political Risk Insurance on WACC.
 * @param {number} baseWacc
 * @param {string} priType  - 'miga' | 'dfc' | 'private' | 'stacked'
 * @param {number} debtPct  - Total debt as % of capital
 * @returns {{ adjustedWacc: number, spreadReduction: number, annualSaving: number }}
 */
function modelPRIImpact(baseWacc, priType, debtPct) {
  const reductions = { miga: 0.0100, dfc: 0.0075, private: 0.0050, stacked: 0.0125 };
  const reduction = reductions[priType] || 0;
  const adjustedWacc = baseWacc - (reduction * debtPct);
  const annualSaving = ASSUMPTIONS.capex_usd * debtPct * reduction;

  return { adjustedWacc, spreadReduction: reduction, annualSaving };
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { calculateBlendedWACC, runBlendedComparison, modelPRIImpact, BLENDED_LAYERS };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — BLENDED FINANCE WACC COMPARISON');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = runBlendedComparison();

  for (const r of results) {
    console.log(`\n  ${r.name}`);
    console.log('  ' + '─'.repeat(55));
    console.log('  Layer'.padEnd(30) + 'Amount'.padStart(12) + 'Rate'.padStart(8) + 'Contribution'.padStart(14));
    for (const l of r.layers) {
      const amt = `$${(l.amount / 1e6).toFixed(1)}M`;
      const rate = `${(l.rate * 100).toFixed(1)}%`;
      const contrib = `${(l.contribution * 100).toFixed(3)}%`;
      console.log(`  ${l.name.padEnd(28)} ${amt.padStart(12)} ${rate.padStart(8)} ${contrib.padStart(14)}`);
    }
    console.log(`  ${''.padEnd(28)} ${''.padStart(12)} ${''.padStart(8)} ${'──────────────'}`);
    console.log(`  ${'WACC'.padEnd(28)} ${''.padStart(12)} ${''.padStart(8)} ${(r.wacc * 100).toFixed(3).padStart(13)}%`);
  }

  console.log('\n\n  PRI IMPACT ANALYSIS');
  console.log('  ' + '─'.repeat(55));
  const baseline = results[0];
  for (const priType of ['miga', 'dfc', 'private', 'stacked']) {
    const impact = modelPRIImpact(baseline.wacc, priType, 0.60);
    console.log(`  ${priType.toUpperCase().padEnd(12)} Adjusted WACC: ${(impact.adjustedWacc * 100).toFixed(2)}%  Savings: $${(impact.annualSaving / 1000).toFixed(0)}K/yr`);
  }
  console.log();
}
