/**
 * SUNFARM PV — ACQUISITION IMPACT MODEL
 * ───────────────────────────────────────
 * Deterministic model: $35M Full-Asset Acquisition
 *
 * Computes adjusted IRR, NPV, DSCR, equity multiple, and debt capacity
 * for two acquisition scenarios against multiple D/E structures.
 *
 * Scenario A: Full-price ($35M + $55M CAPEX = $90M total basis)
 * Scenario B: Staggered / Discounted acquisition
 *
 * D/E Sensitivity: 60/40, 70/30, 80/20
 *
 * CRITICAL: If $90M total basis drives IRR below 18%, deal is overpriced.
 *
 * Consumes from: config/project.js, models/25-year-cashflow.js
 * Outputs: Deterministic — every number traces to an assumption.
 */

'use strict';

const { PROJECT, ASSUMPTIONS } = require('../config/project');

// ── ACQUISITION PARAMETERS ────────────────────────────────────────

const ACQUISITION = {
  purchase_price: 35_000_000,
  appraised_value: PROJECT.land.appraisal_total_usd,     // $47.9M
  discount_to_appraisal: 1 - 35_000_000 / PROJECT.land.appraisal_total_usd,
  capex: ASSUMPTIONS.capex_usd,                           // $55M
  total_basis: 35_000_000 + ASSUMPTIONS.capex_usd,        // $90M

  // Staged payment schedule
  staged_payments: [
    { milestone: 'Signing',           amount: 5_000_000,  timing_months: 0  },
    { milestone: 'Financial Close',   amount: 10_000_000, timing_months: 6  },
    { milestone: 'Notice to Proceed', amount: 10_000_000, timing_months: 12 },
    { milestone: 'COD',               amount: 10_000_000, timing_months: 24 },
  ],

  escrow: {
    holdback_pct: 0.10,
    holdback_total: 3_500_000,
    release_months_post_cod: 12,
    rep_warranty_survival_months: 24,
  },

  // Value decomposition
  value_allocation: {
    land:        20_000_000,
    development:  8_000_000,
    concession:   5_000_000,
    permits:      2_000_000,
  },

  // Transaction costs
  transaction_costs: 2_000_000,  // legal, advisory, transfer taxes
};

// ── D/E STRUCTURES TO TEST ────────────────────────────────────────

const DE_STRUCTURES = [
  { name: '60/40 D/E', debt_ratio: 0.60, equity_ratio: 0.40, rate: 0.065 },
  { name: '70/30 D/E', debt_ratio: 0.70, equity_ratio: 0.30, rate: 0.060 },
  { name: '80/20 D/E', debt_ratio: 0.80, equity_ratio: 0.20, rate: 0.055 },
];

// ── REVENUE MODEL (from 25-year-cashflow.js assumptions) ──────────

function generation(year) {
  const deg = Math.pow(1 - PROJECT.annual_degradation, year - 1);
  return PROJECT.capacity_mwp_dc * PROJECT.capacity_factor * PROJECT.hours_per_year * deg;
}

function totalRevenue(year, multiplier) {
  const gen = generation(year);
  const ppa = gen * ASSUMPTIONS.ppa_rate_usd_mwh *
    Math.pow(1 + ASSUMPTIONS.ppa_escalation, year - 1);
  const carbon = gen * ASSUMPTIONS.grid_emission_factor *
    ASSUMPTIONS.carbon_price_usd * Math.pow(1 + ASSUMPTIONS.carbon_escalation, year - 1);
  const bess = ASSUMPTIONS.bess_annual_revenue *
    Math.pow(1 + ASSUMPTIONS.bess_escalation, year - 1);
  const ag = ASSUMPTIONS.ag_revenue_annual *
    Math.pow(1 + ASSUMPTIONS.ag_escalation, year - 1);
  return (ppa + carbon + bess + ag) * multiplier;
}

function opex(year) {
  const om = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.om_per_kw *
    Math.pow(1 + ASSUMPTIONS.om_escalation, year - 1);
  const ins = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.insurance_per_kw;
  return om + ins + ASSUMPTIONS.land_lease_annual;
}

function debtServiceAnnual(principal, rate, term) {
  return principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
}

function interestForYear(principal, rate, term, year) {
  const ds = debtServiceAnnual(principal, rate, term);
  let balance = principal;
  for (let y = 1; y < year; y++) {
    const interest = balance * rate;
    const prinPay = ds - interest;
    balance -= prinPay;
  }
  return Math.max(0, balance * rate);
}

function taxes(year, ebitda, principal, rate, term) {
  if (year <= ASSUMPTIONS.tax_exemption_years) return 0;
  const interest = interestForYear(principal, rate, term, year);
  const taxable = Math.max(0, ebitda - interest);
  return taxable * ASSUMPTIONS.tax_rate;
}

// ── IRR & NPV CALCULATIONS ───────────────────────────────────────

function computeNPV(cashflows, rate) {
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

function computeIRR(cashflows, guess = 0.10) {
  let rate = guess;
  for (let iter = 0; iter < 2000; iter++) {
    let f = 0, df = 0;
    for (let i = 0; i < cashflows.length; i++) {
      f += cashflows[i] / Math.pow(1 + rate, i);
      df -= i * cashflows[i] / Math.pow(1 + rate, i + 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }
  return rate;
}

// ── SCENARIO ENGINE ───────────────────────────────────────────────

/**
 * Run acquisition impact analysis for a given total basis and D/E structure.
 *
 * @param {number} totalBasis - Total project cost (acquisition + CAPEX)
 * @param {Object} structure - D/E structure { debt_ratio, equity_ratio, rate }
 * @param {number} revenueMultiplier - Revenue scenario multiplier
 * @returns {Object} Full financial analysis
 */
function analyzeAcquisitionScenario(totalBasis, structure, revenueMultiplier = 1.0) {
  const debtAmount = totalBasis * structure.debt_ratio;
  const equityAmount = totalBasis * structure.equity_ratio;
  const loanTerm = ASSUMPTIONS.loan_term_years;
  const ds = debtServiceAnnual(debtAmount, structure.rate, loanTerm);

  const leveredFlows = [-equityAmount];
  const unleveredFlows = [-totalBasis];

  let minDSCR = Infinity;
  let avgDSCR_sum = 0;
  let dscr_years = 0;
  let cumCF = -equityAmount;
  let paybackYear = null;
  let totalRev = 0;
  let totalEBITDA = 0;
  let totalFCF = 0;

  const yearlyData = [];

  for (let y = 1; y <= PROJECT.concession_years; y++) {
    const rev = totalRevenue(y, revenueMultiplier);
    const ox = opex(y);
    const ebitda = rev - ox;
    const debt = y <= loanTerm ? ds : 0;
    const tax = taxes(y, ebitda, debtAmount, structure.rate, loanTerm);
    const fcf = ebitda - debt - tax;
    const unlevFcf = ebitda - tax;

    const dscr = debt > 0 ? ebitda / debt : null;
    if (dscr !== null) {
      if (dscr < minDSCR) minDSCR = dscr;
      avgDSCR_sum += dscr;
      dscr_years++;
    }

    cumCF += fcf;
    if (paybackYear === null && cumCF >= 0) paybackYear = y;

    totalRev += rev;
    totalEBITDA += ebitda;
    totalFCF += fcf;

    leveredFlows.push(fcf);
    unleveredFlows.push(unlevFcf);

    yearlyData.push({
      year: y, revenue: rev, ebitda, debtService: debt,
      tax, fcf, dscr, cumCF,
    });
  }

  const leveredIRR = computeIRR(leveredFlows);
  const unleveredIRR = computeIRR(unleveredFlows, 0.08);
  const npv8 = computeNPV(unleveredFlows, 0.08);
  const npv10 = computeNPV(unleveredFlows, 0.10);
  const equityMultiple = (equityAmount + totalFCF) / equityAmount;
  const avgDSCR = dscr_years > 0 ? avgDSCR_sum / dscr_years : 0;

  return {
    totalBasis,
    structure: structure.name,
    debtAmount,
    equityAmount,
    debtService: ds,
    leveredIRR,
    unleveredIRR,
    npv8,
    npv10,
    minDSCR,
    avgDSCR,
    equityMultiple,
    paybackYear: paybackYear || '>25',
    totalRevenue: totalRev,
    totalEBITDA,
    totalFCF,
    irr_above_floor: leveredIRR >= 0.18,
    dscr_above_floor: minDSCR >= 1.50,
    yearlyData,
  };
}

// ── FULL MATRIX ───────────────────────────────────────────────────

/**
 * Run the complete acquisition impact matrix.
 * Tests both scenarios across all D/E structures and revenue cases.
 *
 * @returns {Object} Complete analysis matrix
 */
function runAcquisitionMatrix() {
  const scenarios = [
    { name: 'Scenario A: Full Price ($35M + $55M)', totalBasis: ACQUISITION.total_basis },
    { name: 'Scenario B: Discounted ($25M + $55M)', totalBasis: 25_000_000 + ACQUISITION.capex },
    { name: 'Baseline: CAPEX Only ($55M)',          totalBasis: ACQUISITION.capex },
  ];

  const revenueScenarios = [
    { name: 'Conservative', multiplier: ASSUMPTIONS.scenarios.conservative },
    { name: 'Base',         multiplier: ASSUMPTIONS.scenarios.base },
    { name: 'Aggressive',   multiplier: ASSUMPTIONS.scenarios.aggressive },
  ];

  const matrix = [];

  for (const scenario of scenarios) {
    for (const de of DE_STRUCTURES) {
      for (const rev of revenueScenarios) {
        const result = analyzeAcquisitionScenario(
          scenario.totalBasis, de, rev.multiplier
        );
        matrix.push({
          acquisition_scenario: scenario.name,
          de_structure: de.name,
          revenue_scenario: rev.name,
          ...result,
        });
      }
    }
  }

  return {
    acquisition: ACQUISITION,
    matrix,
    summary: generateSummary(matrix),
  };
}

/**
 * Generate summary insights from the matrix.
 */
function generateSummary(matrix) {
  const fullPriceBase = matrix.find(
    r => r.acquisition_scenario.includes('Full Price') &&
         r.de_structure === '60/40 D/E' &&
         r.revenue_scenario === 'Base'
  );

  const baselineBase = matrix.find(
    r => r.acquisition_scenario.includes('Baseline') &&
         r.de_structure === '60/40 D/E' &&
         r.revenue_scenario === 'Base'
  );

  const irrDelta = baselineBase && fullPriceBase
    ? baselineBase.leveredIRR - fullPriceBase.leveredIRR
    : 0;

  // Find break-even acquisition price
  // Where IRR drops below 18% at 60/40 D/E Base
  let breakEvenPrice = null;
  for (let price = 5_000_000; price <= 60_000_000; price += 1_000_000) {
    const result = analyzeAcquisitionScenario(
      price + ACQUISITION.capex,
      DE_STRUCTURES[0],
      1.0
    );
    if (result.leveredIRR < 0.18) {
      breakEvenPrice = price - 1_000_000;
      break;
    }
  }

  const allPassFloor = matrix
    .filter(r => r.acquisition_scenario.includes('Full Price'))
    .every(r => r.irr_above_floor);

  return {
    acquisition_price: ACQUISITION.purchase_price,
    appraised_value: ACQUISITION.appraised_value,
    discount_pct: (ACQUISITION.discount_to_appraisal * 100).toFixed(1) + '%',
    total_basis_full_price: ACQUISITION.total_basis,
    baseline_irr: baselineBase ? baselineBase.leveredIRR : null,
    full_price_irr: fullPriceBase ? fullPriceBase.leveredIRR : null,
    irr_impact: irrDelta,
    break_even_acquisition_price: breakEvenPrice,
    all_scenarios_above_18pct_floor: allPassFloor,
    verdict: allPassFloor
      ? 'ACQUISITION VIABLE — All scenarios maintain IRR above 18% floor'
      : 'CAUTION — Some scenarios breach 18% IRR floor; renegotiate or restructure',
  };
}

// ── STAGED PAYMENT ANALYSIS ──────────────────────────────────────

/**
 * Analyze the time-value impact of staged vs lump-sum payments.
 *
 * @param {number} discountRate - Discount rate for TVM calculation
 * @returns {Object} Staged payment analysis
 */
function stagedPaymentAnalysis(discountRate = 0.08) {
  const payments = ACQUISITION.staged_payments;
  let pvTotal = 0;
  const details = payments.map(p => {
    const years = p.timing_months / 12;
    const pv = p.amount / Math.pow(1 + discountRate, years);
    pvTotal += pv;
    return { ...p, pv, discount: p.amount - pv };
  });

  return {
    nominal_total: ACQUISITION.purchase_price,
    pv_total: pvTotal,
    tvm_savings: ACQUISITION.purchase_price - pvTotal,
    effective_price: pvTotal,
    effective_discount_pct: ((ACQUISITION.purchase_price - pvTotal) / ACQUISITION.purchase_price * 100).toFixed(2) + '%',
    details,
  };
}

// ── DEBT CAPACITY ANALYSIS ───────────────────────────────────────

/**
 * Determine maximum debt capacity at various DSCR constraints.
 *
 * @returns {Object[]} Debt capacity analysis
 */
function debtCapacityAnalysis() {
  const results = [];
  const dscrConstraints = [1.20, 1.30, 1.50, 2.00];

  for (const targetDSCR of dscrConstraints) {
    // Year 1 EBITDA at base case
    const year1Rev = totalRevenue(1, 1.0);
    const year1Opex = opex(1);
    const year1EBITDA = year1Rev - year1Opex;

    // Max annual debt service = EBITDA / target DSCR
    const maxDS = year1EBITDA / targetDSCR;

    // Max principal that produces this DS
    const rate = 0.065;
    const term = ASSUMPTIONS.loan_term_years;
    const maxPrincipal = maxDS * (Math.pow(1 + rate, term) - 1) / (rate * Math.pow(1 + rate, term));

    results.push({
      target_dscr: targetDSCR,
      max_debt_service: maxDS,
      max_debt: maxPrincipal,
      max_debt_pct_of_90M: (maxPrincipal / ACQUISITION.total_basis * 100).toFixed(1) + '%',
      min_equity_at_90M: ACQUISITION.total_basis - maxPrincipal,
    });
  }

  return results;
}

// ── DISPLAY ───────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(2); }

function main() {
  console.log('═'.repeat(90));
  console.log('  SUNFARM PV — ACQUISITION IMPACT MODEL');
  console.log('  $35M Full-Asset Acquisition — Deterministic Analysis');
  console.log('═'.repeat(90));

  // Acquisition overview
  console.log('\n  ACQUISITION OVERVIEW');
  console.log('  ' + '─'.repeat(60));
  console.log(`  Purchase Price:          $${fmt(ACQUISITION.purchase_price)}M`);
  console.log(`  Appraised Value:         $${fmt(ACQUISITION.appraised_value)}M`);
  console.log(`  Discount to Appraisal:   ${(ACQUISITION.discount_to_appraisal * 100).toFixed(1)}%`);
  console.log(`  CAPEX:                   $${fmt(ACQUISITION.capex)}M`);
  console.log(`  Total Basis (A):         $${fmt(ACQUISITION.total_basis)}M`);
  console.log(`  Escrow Holdback:         $${fmt(ACQUISITION.escrow.holdback_total)}M (${ACQUISITION.escrow.holdback_pct * 100}%)`);

  // Value decomposition
  console.log('\n  VALUE DECOMPOSITION');
  console.log('  ' + '─'.repeat(60));
  for (const [key, val] of Object.entries(ACQUISITION.value_allocation)) {
    console.log(`  ${key.charAt(0).toUpperCase() + key.slice(1).padEnd(20)}: $${fmt(val)}M`);
  }

  // Run matrix
  const analysis = runAcquisitionMatrix();

  // Display matrix results
  console.log('\n' + '═'.repeat(90));
  console.log('  ACQUISITION IMPACT MATRIX');
  console.log('═'.repeat(90));
  console.log('  Scenario'.padEnd(42) + 'D/E'.padEnd(12) + 'Revenue'.padEnd(14) +
              'IRR'.padEnd(10) + 'DSCR'.padEnd(10) + 'Multiple'.padEnd(10) + 'Status');
  console.log('  ' + '─'.repeat(85));

  for (const r of analysis.matrix) {
    const scenarioShort = r.acquisition_scenario.replace(/Scenario [AB]: /, '').substring(0, 28);
    const irr = (r.leveredIRR * 100).toFixed(1) + '%';
    const dscr = r.minDSCR.toFixed(2) + 'x';
    const mult = r.equityMultiple.toFixed(2) + 'x';
    const status = r.irr_above_floor ? '✅' : '❌';
    console.log(
      `  ${scenarioShort.padEnd(40)} ${r.de_structure.padEnd(12)}${r.revenue_scenario.padEnd(14)}` +
      `${irr.padEnd(10)}${dscr.padEnd(10)}${mult.padEnd(10)}${status}`
    );
  }

  // Summary
  const summary = analysis.summary;
  console.log('\n' + '═'.repeat(90));
  console.log('  VERDICT');
  console.log('═'.repeat(90));
  console.log(`  Baseline IRR (CAPEX only):    ${summary.baseline_irr ? (summary.baseline_irr * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`  Full-Price IRR ($90M basis):   ${summary.full_price_irr ? (summary.full_price_irr * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`  IRR Impact of Acquisition:    -${(summary.irr_impact * 100).toFixed(1)} ppt`);
  console.log(`  Break-Even Acquisition Price: $${summary.break_even_acquisition_price ? fmt(summary.break_even_acquisition_price) + 'M' : 'N/A'}`);
  console.log(`  All Scenarios Above 18%:      ${summary.all_scenarios_above_18pct_floor ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  ${summary.verdict}`);

  // Staged payment analysis
  const staged = stagedPaymentAnalysis();
  console.log('\n  STAGED PAYMENT TIME-VALUE ANALYSIS (@ 8% discount)');
  console.log('  ' + '─'.repeat(60));
  for (const p of staged.details) {
    console.log(`  ${p.milestone.padEnd(22)} $${fmt(p.amount)}M nominal  →  $${fmt(p.pv)}M PV  (saves $${(p.discount / 1000).toFixed(0)}K)`);
  }
  console.log(`  Effective Price (PV):  $${fmt(staged.pv_total)}M`);
  console.log(`  TVM Savings:           $${fmt(staged.tvm_savings)}M (${staged.effective_discount_pct})`);

  // Debt capacity
  const debtCap = debtCapacityAnalysis();
  console.log('\n  DEBT CAPACITY AT $90M TOTAL BASIS');
  console.log('  ' + '─'.repeat(60));
  console.log('  DSCR Target | Max Debt      | % of $90M | Min Equity');
  console.log('  ' + '─'.repeat(60));
  for (const d of debtCap) {
    console.log(
      `  ${d.target_dscr.toFixed(2)}x       ` +
      `| $${fmt(d.max_debt)}M   ` +
      `| ${d.max_debt_pct_of_90M.padStart(6)} ` +
      `| $${fmt(d.min_equity_at_90M)}M`
    );
  }

  console.log('\n' + '═'.repeat(90));
}

module.exports = {
  ACQUISITION,
  DE_STRUCTURES,
  analyzeAcquisitionScenario,
  runAcquisitionMatrix,
  stagedPaymentAnalysis,
  debtCapacityAnalysis,
};

if (require.main === module) main();
