/**
 * SOVEREIGN / UTILITY MINORITY STAKE MODEL
 * Simulates 10-20% minority stake impact on IRR, WACC, and perceived risk.
 * Consumes from config/project.js and 25-year-cashflow.js.
 */

const { ASSUMPTIONS } = require('../../config/project.js');
const { runScenario } = require('../../models/25-year-cashflow.js');

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

// ── STAKE IMPACT MODEL ───────────────────────────────────────

/**
 * @typedef {Object} StakeScenario
 * @property {number} partner_pct    - Partner stake percentage (0-1)
 * @property {string} partner_type   - 'sovereign' | 'utility' | 'fund'
 * @property {number} spread_benefit - Debt spread reduction in bps (0-1)
 * @property {number} pri_discount   - PRI premium reduction (0-1)
 */

/**
 * Model the impact of a minority strategic partner stake.
 * @param {StakeScenario} scenario
 * @param {string} [revenueScenario='Base']
 * @returns {Object}
 */
function modelStakeImpact(scenario, revenueScenario = 'Base') {
  const capex = ASSUMPTIONS.capex_usd;
  const totalEquity = capex * ASSUMPTIONS.equity_ratio;
  const partnerEquity = capex * scenario.partner_pct;
  const sponsorEquity = totalEquity - partnerEquity;

  // Debt cost adjustment from strategic partner comfort
  const baseRate = ASSUMPTIONS.interest_rate;
  const adjustedRate = baseRate - scenario.spread_benefit;
  const debtAmount = capex * ASSUMPTIONS.debt_ratio;

  // Run cashflow model with base assumptions
  const multiplier = ASSUMPTIONS.scenarios[revenueScenario.toLowerCase()] || 1.0;
  const cf = runScenario(revenueScenario, multiplier);

  // Recalculate sponsor IRR on reduced equity base
  const sponsorFlows = [-sponsorEquity];
  const partnerFlows = [-partnerEquity];
  for (const yr of cf.years) {
    const totalCF = yr.fcf;
    sponsorFlows.push(totalCF * (1 - scenario.partner_pct / ASSUMPTIONS.equity_ratio));
    partnerFlows.push(totalCF * (scenario.partner_pct / ASSUMPTIONS.equity_ratio));
  }

  const sponsorIRR = computeIRR(sponsorFlows);
  const partnerIRR = computeIRR(partnerFlows);
  const sponsorMultiple = sponsorFlows.reduce((s, v) => s + Math.max(0, v), 0) / sponsorEquity;

  // Annual debt service savings
  const basePMT = debtAmount * (baseRate * Math.pow(1 + baseRate, ASSUMPTIONS.loan_term_years)) /
                   (Math.pow(1 + baseRate, ASSUMPTIONS.loan_term_years) - 1);
  const adjPMT = debtAmount * (adjustedRate * Math.pow(1 + adjustedRate, ASSUMPTIONS.loan_term_years)) /
                  (Math.pow(1 + adjustedRate, ASSUMPTIONS.loan_term_years) - 1);
  const annualSaving = basePMT - adjPMT;

  return {
    partner_pct:        scenario.partner_pct,
    partner_type:       scenario.partner_type,
    partner_equity:     partnerEquity,
    sponsor_equity:     sponsorEquity,
    sponsor_irr:        sponsorIRR,
    partner_irr:        partnerIRR,
    sponsor_multiple:   parseFloat(sponsorMultiple.toFixed(2)),
    spread_benefit_bps: Math.round(scenario.spread_benefit * 10000),
    annual_debt_saving: Math.round(annualSaving),
    base_dscr:          cf.dscr_min,
    scenario:           revenueScenario,
  };
}

/**
 * Run sensitivity across stake sizes.
 * @returns {Object[]}
 */
function runStakeSensitivity() {
  const stakeOptions = [0.05, 0.10, 0.15, 0.20, 0.25];
  const partnerTypes = [
    { partner_type: 'utility',   spread_benefit: 0.0050, pri_discount: 0.20 },
    { partner_type: 'sovereign', spread_benefit: 0.0075, pri_discount: 0.30 },
    { partner_type: 'fund',      spread_benefit: 0.0025, pri_discount: 0.10 },
  ];

  const results = [];
  for (const pt of partnerTypes) {
    for (const pct of stakeOptions) {
      results.push(modelStakeImpact({
        partner_pct: pct,
        partner_type: pt.partner_type,
        spread_benefit: pt.spread_benefit,
        pri_discount: pt.pri_discount,
      }));
    }
  }
  return results;
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { modelStakeImpact, runStakeSensitivity };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — STRATEGIC MINORITY STAKE MODEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = runStakeSensitivity();

  let currentType = '';
  for (const r of results) {
    if (r.partner_type !== currentType) {
      currentType = r.partner_type;
      console.log(`\n  Partner Type: ${currentType.toUpperCase()}`);
      console.log('  Stake    Sponsor Eq    Sponsor IRR   Partner IRR   Multiple   Spread   Saving/yr');
      console.log('  ' + '─'.repeat(75));
    }
    console.log(
      `  ${(r.partner_pct * 100).toFixed(0).padStart(4)}%  ` +
      `$${(r.sponsor_equity / 1e6).toFixed(1).padStart(6)}M     ` +
      `${(r.sponsor_irr * 100).toFixed(1).padStart(6)}%     ` +
      `${(r.partner_irr * 100).toFixed(1).padStart(6)}%     ` +
      `${r.sponsor_multiple.toFixed(1).padStart(5)}x   ` +
      `${r.spread_benefit_bps.toString().padStart(4)}bp   ` +
      `$${(r.annual_debt_saving / 1000).toFixed(0).padStart(5)}K`
    );
  }
  console.log();
}
