/**
 * SUNFARM PV — 25-YEAR CASH FLOW MODEL
 * ──────────────────────────────────────
 * Institutional-grade deterministic model.
 *
 * Outputs: Revenue breakdown, EBITDA, FCF, DSCR, Levered IRR,
 *          Unlevered IRR, Equity multiple, Payback, NPV @ 8% & 10%.
 *
 * Runs Conservative / Base / Aggressive scenarios.
 */

'use strict';

const { PROJECT, ASSUMPTIONS } = require('../config/project');

// ── HELPER FUNCTIONS ───────────────────────────────────────────

function generation(year) {
  const deg = Math.pow(1 - PROJECT.annual_degradation, year - 1);
  return PROJECT.capacity_mwp_dc * PROJECT.capacity_factor * PROJECT.hours_per_year * deg;
}

function ppaRevenue(year) {
  return generation(year) * ASSUMPTIONS.ppa_rate_usd_mwh *
    Math.pow(1 + ASSUMPTIONS.ppa_escalation, year - 1);
}

function carbonRevenue(year) {
  const credits = generation(year) * ASSUMPTIONS.grid_emission_factor;
  const price = ASSUMPTIONS.carbon_price_usd * Math.pow(1 + ASSUMPTIONS.carbon_escalation, year - 1);
  return credits * price;
}

function bessRevenue(year) {
  return ASSUMPTIONS.bess_annual_revenue * Math.pow(1 + ASSUMPTIONS.bess_escalation, year - 1);
}

function agRevenue(year) {
  return ASSUMPTIONS.ag_revenue_annual * Math.pow(1 + ASSUMPTIONS.ag_escalation, year - 1);
}

function opex(year) {
  const om = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.om_per_kw *
    Math.pow(1 + ASSUMPTIONS.om_escalation, year - 1);
  const ins = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.insurance_per_kw;
  return om + ins + ASSUMPTIONS.land_lease_annual;
}

function debtService() {
  const P = ASSUMPTIONS.capex_usd * ASSUMPTIONS.debt_ratio;
  const r = ASSUMPTIONS.interest_rate;
  const n = ASSUMPTIONS.loan_term_years;
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function interestPortion(year) {
  const P = ASSUMPTIONS.capex_usd * ASSUMPTIONS.debt_ratio;
  const r = ASSUMPTIONS.interest_rate;
  const n = ASSUMPTIONS.loan_term_years;
  const ds = debtService();
  let balance = P;
  for (let y = 1; y < year; y++) {
    const interest = balance * r;
    const principal = ds - interest;
    balance -= principal;
  }
  return balance * r;
}

function taxes(year, ebitda) {
  if (year <= ASSUMPTIONS.tax_exemption_years) return 0;
  const taxable = Math.max(0, ebitda - interestPortion(year));
  return taxable * ASSUMPTIONS.tax_rate;
}

function npv(cashflows, rate) {
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

function irr(cashflows, guess = 0.10) {
  let rate = guess;
  for (let iter = 0; iter < 1000; iter++) {
    let npvVal = 0, dnpv = 0;
    for (let i = 0; i < cashflows.length; i++) {
      npvVal += cashflows[i] / Math.pow(1 + rate, i);
      dnpv -= i * cashflows[i] / Math.pow(1 + rate, i + 1);
    }
    const newRate = rate - npvVal / dnpv;
    if (Math.abs(newRate - rate) < 1e-8) return newRate;
    rate = newRate;
  }
  return rate;
}

// ── SCENARIO NAME → MULTIPLIER MAP ─────────────────────────────

const SCENARIO_MAP = {
  Conservative: ASSUMPTIONS.scenarios.conservative,
  Base: ASSUMPTIONS.scenarios.base,
  Aggressive: ASSUMPTIONS.scenarios.aggressive,
  conservative: ASSUMPTIONS.scenarios.conservative,
  base: ASSUMPTIONS.scenarios.base,
  aggressive: ASSUMPTIONS.scenarios.aggressive,
};

// ── SCENARIO RUNNER ────────────────────────────────────────────

/**
 * @param {string} label — Scenario name ('Base', 'Conservative', 'Aggressive')
 * @param {number} [multiplier] — Optional explicit multiplier (overrides name lookup)
 */
function runScenario(label, multiplier) {
  // Resolve multiplier: explicit > name lookup > default 1.0
  if (multiplier === undefined) {
    multiplier = SCENARIO_MAP[label] !== undefined ? SCENARIO_MAP[label] : 1.0;
  }

  const ds = debtService();
  const equity = ASSUMPTIONS.capex_usd * ASSUMPTIONS.equity_ratio;
  const leveredFlows = [-equity];
  const unleveredFlows = [-ASSUMPTIONS.capex_usd];
  let cumCF = -equity;
  let paybackYear = null;
  let totalRevenue = 0, totalEbitda = 0, totalFCF = 0;

  const years = [];

  for (let y = 1; y <= PROJECT.concession_years; y++) {
    const gen = generation(y);
    const ppa = ppaRevenue(y) * multiplier;
    const carbon = carbonRevenue(y) * multiplier;
    const bess = bessRevenue(y) * multiplier;
    const ag = agRevenue(y) * multiplier;
    const rev = ppa + carbon + bess + ag;
    const ox = opex(y);
    const ebitda = rev - ox;
    const debt = y <= ASSUMPTIONS.loan_term_years ? ds : 0;
    const tax = taxes(y, ebitda);
    const fcf = ebitda - debt - tax;
    const unlevFcf = ebitda - tax;
    const dscr = debt > 0 ? ebitda / debt : Infinity;

    cumCF += fcf;
    if (!paybackYear && cumCF > 0) paybackYear = y;
    totalRevenue += rev;
    totalEbitda += ebitda;
    totalFCF += fcf;

    leveredFlows.push(fcf);
    unleveredFlows.push(unlevFcf);

    years.push({
      year: y, generation: gen,
      ppaRevenue: ppa, carbonRevenue: carbon, bessRevenue: bess, agRevenue: ag,
      totalRevenue: rev, opex: ox, ebitda, debtService: debt, tax, fcf, dscr, cumCF,
    });
  }

  const minDSCR = Math.min(...years.filter(r => r.debtService > 0).map(r => r.dscr));
  const avgDSCR = years.filter(r => r.debtService > 0).reduce((s, r) => s + r.dscr, 0) /
                  years.filter(r => r.debtService > 0).length;

  return {
    label,
    years,
    totalRevenue,
    totalEbitda,
    totalFCF,
    leveredIRR: irr(leveredFlows),
    unleveredIRR: irr(unleveredFlows),
    equityMultiple: (cumCF + equity) / equity,
    paybackYear,
    npv8: npv(leveredFlows, 0.08),
    npv10: npv(leveredFlows, 0.10),
    minDSCR,
    avgDSCR,
    // Legacy aliases
    dscr_min: minDSCR,
    dscr_avg: avgDSCR,
    leveredFlows,
    unleveredFlows,
  };
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n, d = 2) { return (n / 1e6).toFixed(d); }

function printScenario(s) {
  const W = 160;
  console.log('\n' + '═'.repeat(W));
  console.log(`  ${s.label.toUpperCase()} SCENARIO — 25-YEAR PRO FORMA`);
  console.log('═'.repeat(W));

  console.log(
    'Yr | Gen GWh  | PPA $M   | Carbon $M | BESS $M  | Ag $M   | Revenue $M | OpEx $M  | EBITDA $M | Debt $M  | Tax $M   | FCF $M    | DSCR  | Cumul $M'
  );
  console.log('─'.repeat(W));

  for (const r of s.years) {
    console.log(
      `${String(r.year).padStart(2)} ` +
      `| ${(r.generation / 1000).toFixed(1).padStart(7)} ` +
      `| $${fmt(r.ppaRevenue).padStart(7)} ` +
      `| $${fmt(r.carbonRevenue).padStart(8)} ` +
      `| $${fmt(r.bessRevenue).padStart(7)} ` +
      `| $${fmt(r.agRevenue).padStart(6)} ` +
      `| $${fmt(r.totalRevenue).padStart(9)} ` +
      `| $${fmt(r.opex).padStart(7)} ` +
      `| $${fmt(r.ebitda).padStart(8)} ` +
      `| $${fmt(r.debtService).padStart(7)} ` +
      `| $${fmt(r.tax).padStart(7)} ` +
      `| $${fmt(r.fcf).padStart(8)} ` +
      `| ${r.dscr === Infinity ? '  N/A' : r.dscr.toFixed(2).padStart(5)} ` +
      `| $${fmt(r.cumCF).padStart(8)}`
    );
  }

  console.log('─'.repeat(W));
  console.log('\n  SUMMARY');
  console.log('  ' + '─'.repeat(50));
  console.log(`  Total CAPEX:            $${fmt(ASSUMPTIONS.capex_usd)}M`);
  console.log(`  Equity Invested:        $${fmt(ASSUMPTIONS.capex_usd * ASSUMPTIONS.equity_ratio)}M`);
  console.log(`  25-Year Revenue:        $${fmt(s.totalRevenue)}M`);
  console.log(`  25-Year EBITDA:         $${fmt(s.totalEbitda)}M`);
  console.log(`  25-Year FCF (Levered):  $${fmt(s.totalFCF)}M`);
  console.log(`  Levered IRR:            ${(s.leveredIRR * 100).toFixed(2)}%`);
  console.log(`  Unlevered IRR:          ${(s.unleveredIRR * 100).toFixed(2)}%`);
  console.log(`  Equity Multiple:        ${s.equityMultiple.toFixed(2)}x`);
  console.log(`  Payback Period:         Year ${s.paybackYear}`);
  console.log(`  NPV @ 8%:              $${fmt(s.npv8)}M`);
  console.log(`  NPV @ 10%:             $${fmt(s.npv10)}M`);
  console.log(`  Min DSCR:              ${s.minDSCR.toFixed(2)}x`);
  console.log(`  Avg DSCR:              ${s.avgDSCR.toFixed(2)}x`);
}

// ── MAIN ───────────────────────────────────────────────────────

function main() {
  console.log('═'.repeat(80));
  console.log('  SUNFARM PV — 25-YEAR INSTITUTIONAL CASH FLOW MODEL');
  console.log(`  ${PROJECT.name} | ${PROJECT.location.municipality}, ${PROJECT.location.country}`);
  console.log(`  ${PROJECT.capacity_mw_ac} MW AC / ${PROJECT.capacity_mwp_dc} MWp DC`);
  console.log('═'.repeat(80));

  const scenarios = [
    runScenario('Conservative', ASSUMPTIONS.scenarios.conservative),
    runScenario('Base', ASSUMPTIONS.scenarios.base),
    runScenario('Aggressive', ASSUMPTIONS.scenarios.aggressive),
  ];

  for (const s of scenarios) {
    printScenario(s);
  }

  // Comparison Table
  console.log('\n\n' + '═'.repeat(80));
  console.log('  SCENARIO COMPARISON');
  console.log('═'.repeat(80));
  console.log('  Metric                    | Conservative |     Base     | Aggressive');
  console.log('  ' + '─'.repeat(75));
  console.log(`  25-Year Revenue           | $${fmt(scenarios[0].totalRevenue).padStart(9)}M | $${fmt(scenarios[1].totalRevenue).padStart(9)}M | $${fmt(scenarios[2].totalRevenue).padStart(9)}M`);
  console.log(`  25-Year EBITDA            | $${fmt(scenarios[0].totalEbitda).padStart(9)}M | $${fmt(scenarios[1].totalEbitda).padStart(9)}M | $${fmt(scenarios[2].totalEbitda).padStart(9)}M`);
  console.log(`  Levered IRR               | ${(scenarios[0].leveredIRR * 100).toFixed(2).padStart(10)}% | ${(scenarios[1].leveredIRR * 100).toFixed(2).padStart(10)}% | ${(scenarios[2].leveredIRR * 100).toFixed(2).padStart(10)}%`);
  console.log(`  Unlevered IRR             | ${(scenarios[0].unleveredIRR * 100).toFixed(2).padStart(10)}% | ${(scenarios[1].unleveredIRR * 100).toFixed(2).padStart(10)}% | ${(scenarios[2].unleveredIRR * 100).toFixed(2).padStart(10)}%`);
  console.log(`  Equity Multiple           | ${scenarios[0].equityMultiple.toFixed(2).padStart(10)}x | ${scenarios[1].equityMultiple.toFixed(2).padStart(10)}x | ${scenarios[2].equityMultiple.toFixed(2).padStart(10)}x`);
  console.log(`  Payback Year              | ${String(scenarios[0].paybackYear).padStart(11)} | ${String(scenarios[1].paybackYear).padStart(11)} | ${String(scenarios[2].paybackYear).padStart(11)}`);
  console.log(`  NPV @ 8%                  | $${fmt(scenarios[0].npv8).padStart(9)}M | $${fmt(scenarios[1].npv8).padStart(9)}M | $${fmt(scenarios[2].npv8).padStart(9)}M`);
  console.log(`  NPV @ 10%                 | $${fmt(scenarios[0].npv10).padStart(9)}M | $${fmt(scenarios[1].npv10).padStart(9)}M | $${fmt(scenarios[2].npv10).padStart(9)}M`);
  console.log(`  Min DSCR                  | ${scenarios[0].minDSCR.toFixed(2).padStart(10)}x | ${scenarios[1].minDSCR.toFixed(2).padStart(10)}x | ${scenarios[2].minDSCR.toFixed(2).padStart(10)}x`);
  console.log('═'.repeat(80));
}

// Export for dashboard consumption
module.exports = { runScenario, generation, ppaRevenue, carbonRevenue, bessRevenue, agRevenue, opex, debtService, irr, npv };

if (require.main === module) main();
