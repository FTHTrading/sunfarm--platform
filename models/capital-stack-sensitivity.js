/**
 * SUNFARM PV — CAPITAL STACK SENSITIVITY MODEL
 * ─────────────────────────────────────────────
 * Tests D/E ratios from 50/50 to 80/20 across interest rate bands.
 * Outputs: Levered IRR, Equity Multiple, DSCR, NPV for each combo.
 */

'use strict';

const { PROJECT, ASSUMPTIONS } = require('../config/project');

// ── CORE CALC (mirrors cashflow model but parameterized) ───────

function calcDebtService(capex, debtRatio, rate, term) {
  const P = capex * debtRatio;
  const r = rate;
  const n = term;
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function generation(year) {
  return PROJECT.capacity_mwp_dc * PROJECT.capacity_factor *
    PROJECT.hours_per_year * Math.pow(1 - PROJECT.annual_degradation, year - 1);
}

function totalRevenue(year, scenario = 1.0) {
  const gen = generation(year);
  const ppa = gen * ASSUMPTIONS.ppa_rate_usd_mwh * Math.pow(1 + ASSUMPTIONS.ppa_escalation, year - 1);
  const carbon = gen * ASSUMPTIONS.grid_emission_factor * ASSUMPTIONS.carbon_price_usd * Math.pow(1 + ASSUMPTIONS.carbon_escalation, year - 1);
  const bess = ASSUMPTIONS.bess_annual_revenue * Math.pow(1 + ASSUMPTIONS.bess_escalation, year - 1);
  const ag = ASSUMPTIONS.ag_revenue_annual * Math.pow(1 + ASSUMPTIONS.ag_escalation, year - 1);
  return (ppa + carbon + bess + ag) * scenario;
}

function totalOpex(year) {
  const om = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.om_per_kw * Math.pow(1 + ASSUMPTIONS.om_escalation, year - 1);
  const ins = PROJECT.capacity_mw_ac * 1000 * ASSUMPTIONS.insurance_per_kw;
  return om + ins + ASSUMPTIONS.land_lease_annual;
}

function irr(cashflows, guess = 0.10) {
  let rate = guess;
  for (let iter = 0; iter < 1000; iter++) {
    let f = 0, df = 0;
    for (let i = 0; i < cashflows.length; i++) {
      f += cashflows[i] / Math.pow(1 + rate, i);
      df -= i * cashflows[i] / Math.pow(1 + rate, i + 1);
    }
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-8) return next;
    rate = next;
  }
  return rate;
}

function npv(cashflows, rate) {
  return cashflows.reduce((s, cf, i) => s + cf / Math.pow(1 + rate, i), 0);
}

// ── SENSITIVITY GRID ───────────────────────────────────────────

const DEBT_RATIOS = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
const INTEREST_RATES = [0.055, 0.060, 0.065, 0.070, 0.075, 0.080];
const CAPEX = ASSUMPTIONS.capex_usd;
const TERM = ASSUMPTIONS.loan_term_years;

function runSensitivitySingle(scenarioMultiplier = 1.0) {
  const results = [];

  for (const dr of DEBT_RATIOS) {
    for (const ir of INTEREST_RATES) {
      const equity = CAPEX * (1 - dr);
      const ds = calcDebtService(CAPEX, dr, ir, TERM);
      const flows = [-equity];
      let cumCF = -equity;
      let payback = null;
      let minDSCR = Infinity;
      let sumDSCR = 0;
      let dCount = 0;

      for (let y = 1; y <= PROJECT.concession_years; y++) {
        const rev = totalRevenue(y, scenarioMultiplier);
        const ox = totalOpex(y);
        const ebitda = rev - ox;
        const debt = y <= TERM ? ds : 0;
        const fcf = ebitda - debt;

        cumCF += fcf;
        if (!payback && cumCF > 0) payback = y;
        if (debt > 0) {
          const dscr = ebitda / debt;
          if (dscr < minDSCR) minDSCR = dscr;
          sumDSCR += dscr;
          dCount++;
        }
        flows.push(fcf);
      }

      results.push({
        debtRatio: dr,
        interestRate: ir,
        equity,
        annualDebtService: ds,
        leveredIRR: irr(flows),
        equityMultiple: (cumCF + equity) / equity,
        paybackYear: payback,
        npv8: npv(flows, 0.08),
        npv10: npv(flows, 0.10),
        minDSCR,
        avgDSCR: sumDSCR / dCount,
        cumCF,
      });
    }
  }
  return results;
}

/**
 * Dashboard-compatible: returns all 3 scenarios + optimal per scenario.
 * @param {number} [scenarioMultiplier] — If provided, runs single scenario (legacy mode).
 * @returns {Object|Array} Multi-scenario object or single array.
 */
function runSensitivity(scenarioMultiplier) {
  // Legacy mode: if a number is passed, return flat array for that scenario
  if (typeof scenarioMultiplier === 'number') {
    return runSensitivitySingle(scenarioMultiplier);
  }

  // Dashboard mode: return all 3 scenarios + optimal
  const baseResults = runSensitivitySingle(ASSUMPTIONS.scenarios.base);
  const consResults = runSensitivitySingle(ASSUMPTIONS.scenarios.conservative);
  const aggResults = runSensitivitySingle(ASSUMPTIONS.scenarios.aggressive);

  function findOptimal(results) {
    const viable = results.filter(r => r.minDSCR >= 1.25);
    if (viable.length === 0) return null;
    return viable.sort((a, b) => b.leveredIRR - a.leveredIRR)[0];
  }

  return {
    Base: baseResults,
    Conservative: consResults,
    Aggressive: aggResults,
    optimal: {
      Base: findOptimal(baseResults),
      Conservative: findOptimal(consResults),
      Aggressive: findOptimal(aggResults),
    },
  };
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(1); }

function printResults(results, label) {
  console.log('\n' + '═'.repeat(140));
  console.log(`  CAPITAL STACK SENSITIVITY — ${label}`);
  console.log('═'.repeat(140));
  console.log(
    '  D/E    | Rate  | Equity $M | Debt Svc $M | Lev IRR  | Eq Mult | Payback | NPV@8% $M | NPV@10% $M | Min DSCR | Avg DSCR'
  );
  console.log('  ' + '─'.repeat(130));

  for (const r of results) {
    const dscrFlag = r.minDSCR < 1.20 ? ' ⚠' : '';
    console.log(
      `  ${(r.debtRatio * 100).toFixed(0).padStart(3)}/${((1 - r.debtRatio) * 100).toFixed(0).padStart(2)} ` +
      `| ${(r.interestRate * 100).toFixed(1).padStart(4)}% ` +
      `| $${fmt(r.equity).padStart(8)} ` +
      `| $${fmt(r.annualDebtService).padStart(10)} ` +
      `| ${(r.leveredIRR * 100).toFixed(2).padStart(7)}% ` +
      `| ${r.equityMultiple.toFixed(2).padStart(6)}x ` +
      `| ${String(r.paybackYear || 'N/A').padStart(6)}y ` +
      `| $${fmt(r.npv8).padStart(8)} ` +
      `| $${fmt(r.npv10).padStart(9)} ` +
      `| ${r.minDSCR.toFixed(2).padStart(7)}x${dscrFlag} ` +
      `| ${r.avgDSCR.toFixed(2).padStart(7)}x`
    );
  }
}

// ── MAIN ───────────────────────────────────────────────────────

function main() {
  console.log('═'.repeat(80));
  console.log('  SUNFARM PV — CAPITAL STACK SENSITIVITY ANALYSIS');
  console.log(`  ${PROJECT.capacity_mw_ac} MW | CAPEX $${fmt(CAPEX)}M | Loan Term ${TERM}yr`);
  console.log('═'.repeat(80));

  printResults(runSensitivity(ASSUMPTIONS.scenarios.conservative), 'CONSERVATIVE (85% Revenue)');
  printResults(runSensitivity(ASSUMPTIONS.scenarios.base), 'BASE CASE (100% Revenue)');
  printResults(runSensitivity(ASSUMPTIONS.scenarios.aggressive), 'AGGRESSIVE (115% Revenue)');

  // Optimal structure recommendation
  const allResults = runSensitivity(); // dashboard mode
  const optimal = allResults.optimal.Base;

  if (optimal) {
    console.log('\n' + '═'.repeat(80));
    console.log('  RECOMMENDED STRUCTURE (Max IRR where Min DSCR ≥ 1.25x)');
    console.log('═'.repeat(80));
    console.log(`  Debt/Equity:        ${(optimal.debtRatio * 100).toFixed(0)}/${((1 - optimal.debtRatio) * 100).toFixed(0)}`);
    console.log(`  Interest Rate:      ${(optimal.interestRate * 100).toFixed(1)}%`);
    console.log(`  Levered IRR:        ${(optimal.leveredIRR * 100).toFixed(2)}%`);
    console.log(`  Equity Multiple:    ${optimal.equityMultiple.toFixed(2)}x`);
    console.log(`  NPV @ 8%:           $${fmt(optimal.npv8)}M`);
    console.log(`  Min DSCR:           ${optimal.minDSCR.toFixed(2)}x`);
    console.log('═'.repeat(80));
  }
}

module.exports = { runSensitivity, DEBT_RATIOS, INTEREST_RATES };

if (require.main === module) main();
