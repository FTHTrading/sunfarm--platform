/**
 * YIELDCO EXIT MODEL
 * Simulates drop-down into YieldCo at Year 5.
 * Models valuation, dividend yield, sponsor returns.
 * Consumes from config/project.js and 25-year-cashflow.js.
 */

const { ASSUMPTIONS } = require('../../config/project.js');
const { runScenario } = require('../../models/25-year-cashflow.js');

// ── VALUATION PARAMETERS ─────────────────────────────────────

const YIELDCO_ASSUMPTIONS = {
  target_dividend_yield: 0.06,    // 6% dividend yield
  ev_per_mw_low:        1_200_000, // $1.2M/MW
  ev_per_mw_high:       1_800_000, // $1.8M/MW
  ev_ebitda_low:        8,
  ev_ebitda_high:       12,
  management_fee_pct:   0.015,    // 1.5% AUM annual management fee
  gp_carry_pct:         0.20,     // 20% GP carry above hurdle
  hurdle_rate:          0.08,     // 8% hurdle for GP carry
  exit_years:           [3, 5, 7, 10],
  sale_pct:             1.00,     // 100% sale (can be partial)
};

// ── NEWTON-RAPHSON IRR ────────────────────────────────────────

/**
 * @param {number[]} flows
 * @returns {number}
 */
function computeIRR(flows) {
  let r = 0.10;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      const d = Math.pow(1 + r, t);
      npv += flows[t] / d;
      dnpv -= t * flows[t] / (d * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const rNew = r - npv / dnpv;
    if (Math.abs(rNew - r) < 1e-9) { r = rNew; break; }
    r = rNew;
  }
  return r;
}

// ── VALUATION METHODS ─────────────────────────────────────────

/**
 * Calculate asset valuation using multiple methods.
 * @param {Object} cashflow - Output from runScenario
 * @param {number} exitYear
 * @returns {Object}
 */
function calculateValuation(cashflow, exitYear) {
  const capacity = 50; // MW
  const remainingYears = 25 - exitYear;

  // Method 1: EV/MW
  const evPerMW_low = YIELDCO_ASSUMPTIONS.ev_per_mw_low * capacity;
  const evPerMW_high = YIELDCO_ASSUMPTIONS.ev_per_mw_high * capacity;

  // Method 2: EV/EBITDA (use average EBITDA of years around exit)
  const nearExitYears = cashflow.years.filter(y => y.year >= exitYear - 1 && y.year <= exitYear + 1);
  const avgEBITDA = nearExitYears.reduce((s, y) => s + y.ebitda, 0) / nearExitYears.length;
  const evEBITDA_low = avgEBITDA * YIELDCO_ASSUMPTIONS.ev_ebitda_low;
  const evEBITDA_high = avgEBITDA * YIELDCO_ASSUMPTIONS.ev_ebitda_high;

  // Method 3: DCF of remaining cash flows at 8%
  let dcfValue = 0;
  const remainingFlows = cashflow.years.filter(y => y.year > exitYear);
  for (const y of remainingFlows) {
    dcfValue += y.fcf / Math.pow(1.08, y.year - exitYear);
  }

  // Method 4: Dividend discount (CAFD-based)
  const exitYearData = cashflow.years.find(y => y.year === exitYear);
  const cafd = exitYearData ? exitYearData.fcf : avgEBITDA * 0.6;
  const dividendValuation = cafd / YIELDCO_ASSUMPTIONS.target_dividend_yield;

  return {
    evPerMW:   { low: Math.round(evPerMW_low), high: Math.round(evPerMW_high) },
    evEBITDA:  { low: Math.round(evEBITDA_low), high: Math.round(evEBITDA_high), avgEBITDA: Math.round(avgEBITDA) },
    dcf:       Math.round(dcfValue),
    dividend:  Math.round(dividendValuation),
    midpoint:  Math.round((evPerMW_low + evPerMW_high + evEBITDA_low + evEBITDA_high + dcfValue + dividendValuation) / 6),
    remainingPPAYears: remainingYears,
  };
}

// ── SPONSOR RETURN MODEL ──────────────────────────────────────

/**
 * Calculate total sponsor returns including pre-exit distributions and exit proceeds.
 * @param {string} [scenario='Base']
 * @param {number} [exitYear=5]
 * @param {number} [salePct=1.0]
 * @returns {Object}
 */
function modelYieldCoExit(scenario = 'Base', exitYear = 5, salePct = 1.0) {
  const multiplier = ASSUMPTIONS.scenarios[scenario.toLowerCase()] || 1.0;
  const cf = runScenario(scenario, multiplier);

  const sponsorEquity = ASSUMPTIONS.capex_usd * ASSUMPTIONS.equity_ratio;
  const valuation = calculateValuation(cf, exitYear);

  // Pre-exit distributions (FCF to sponsor during hold period)
  let preExitDistributions = 0;
  for (const y of cf.years) {
    if (y.year <= exitYear) {
      preExitDistributions += y.fcf;
    }
  }

  // Exit proceeds
  const exitValuation = valuation.midpoint;
  const exitProceeds = exitValuation * salePct;

  // Remaining equity value (if partial sale)
  const retainedValue = exitValuation * (1 - salePct);

  // Management fees (if sponsor retains GP)
  const annualMgmtFee = exitValuation * YIELDCO_ASSUMPTIONS.management_fee_pct;

  // Sponsor IRR
  const sponsorFlows = [-sponsorEquity];
  for (const y of cf.years) {
    if (y.year < exitYear) {
      sponsorFlows.push(y.fcf);
    } else if (y.year === exitYear) {
      sponsorFlows.push(y.fcf + exitProceeds);
    }
  }
  const sponsorIRR = computeIRR(sponsorFlows);
  const totalReturn = preExitDistributions + exitProceeds;
  const sponsorMultiple = totalReturn / sponsorEquity;

  return {
    scenario,
    exit_year:              exitYear,
    sale_pct:               salePct,
    sponsor_equity:         sponsorEquity,
    pre_exit_distributions: Math.round(preExitDistributions),
    exit_valuation:         exitValuation,
    exit_proceeds:          Math.round(exitProceeds),
    retained_value:         Math.round(retainedValue),
    total_return:           Math.round(totalReturn),
    sponsor_irr:            sponsorIRR,
    sponsor_multiple:       parseFloat(sponsorMultiple.toFixed(2)),
    annual_mgmt_fee:        Math.round(annualMgmtFee),
    implied_dividend_yield: YIELDCO_ASSUMPTIONS.target_dividend_yield,
    valuation_detail:       valuation,
  };
}

/**
 * Run exit timing sensitivity.
 * @param {string} [scenario='Base']
 * @returns {Object[]}
 */
function runExitSensitivity(scenario = 'Base') {
  return YIELDCO_ASSUMPTIONS.exit_years.map(yr => modelYieldCoExit(scenario, yr));
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { modelYieldCoExit, runExitSensitivity, calculateValuation, YIELDCO_ASSUMPTIONS };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — YIELDCO EXIT MODEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const exits = runExitSensitivity('Base');

  console.log('  Exit Year   Valuation    Pre-Exit    Proceeds    Total      IRR      Multiple');
  console.log('  ' + '─'.repeat(75));
  for (const e of exits) {
    console.log(
      `  Year ${String(e.exit_year).padStart(2)}    ` +
      `$${(e.exit_valuation / 1e6).toFixed(1).padStart(6)}M   ` +
      `$${(e.pre_exit_distributions / 1e6).toFixed(1).padStart(6)}M   ` +
      `$${(e.exit_proceeds / 1e6).toFixed(1).padStart(6)}M   ` +
      `$${(e.total_return / 1e6).toFixed(1).padStart(6)}M   ` +
      `${(e.sponsor_irr * 100).toFixed(1).padStart(5)}%   ` +
      `${e.sponsor_multiple.toFixed(1).padStart(5)}x`
    );
  }

  // Detail on target exit (Year 5)
  const target = exits.find(e => e.exit_year === 5);
  if (target) {
    console.log('\n\n  YEAR 5 EXIT — DETAILED VALUATION');
    console.log('  ' + '─'.repeat(50));
    const v = target.valuation_detail;
    console.log(`  EV/MW:               $${(v.evPerMW.low / 1e6).toFixed(0)}M – $${(v.evPerMW.high / 1e6).toFixed(0)}M`);
    console.log(`  EV/EBITDA:           $${(v.evEBITDA.low / 1e6).toFixed(0)}M – $${(v.evEBITDA.high / 1e6).toFixed(0)}M  (avg EBITDA: $${(v.evEBITDA.avgEBITDA / 1e6).toFixed(1)}M)`);
    console.log(`  DCF @ 8%:            $${(v.dcf / 1e6).toFixed(1)}M`);
    console.log(`  Dividend Discount:   $${(v.dividend / 1e6).toFixed(1)}M  (@ ${(YIELDCO_ASSUMPTIONS.target_dividend_yield * 100).toFixed(0)}% yield)`);
    console.log(`  Midpoint:            $${(v.midpoint / 1e6).toFixed(1)}M`);
    console.log(`  Remaining PPA Life:  ${v.remainingPPAYears} years`);
    console.log(`  Annual Mgmt Fee:     $${(target.annual_mgmt_fee / 1e3).toFixed(0)}K (${(YIELDCO_ASSUMPTIONS.management_fee_pct * 100).toFixed(1)}% AUM)`);
  }

  // Scenario comparison
  console.log('\n\n  SCENARIO COMPARISON (Year 5 Exit)');
  console.log('  ' + '─'.repeat(50));
  for (const label of ['Conservative', 'Base', 'Aggressive']) {
    const e = modelYieldCoExit(label, 5);
    console.log(
      `  ${label.padEnd(15)} Valuation: $${(e.exit_valuation / 1e6).toFixed(1)}M  ` +
      `IRR: ${(e.sponsor_irr * 100).toFixed(1)}%  ` +
      `Multiple: ${e.sponsor_multiple.toFixed(1)}x`
    );
  }
  console.log();
}
