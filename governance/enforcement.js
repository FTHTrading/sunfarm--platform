/**
 * SUNFARM PV — ENFORCEMENT ENGINE
 *
 * Implements cash waterfall rerouting, distribution suspension,
 * and enforcement actions triggered by covenant breaches.
 *
 * Consumes from: governance/covenants.js, config/project.js
 */

const { STATUS, evaluateAllCovenants } = require('./covenants.js');
const { ASSUMPTIONS } = require('../config/project.js');

// ── ENFORCEMENT ACTIONS ─────────────────────────────────────────

/**
 * @typedef {Object} EnforcementAction
 * @property {string} action - Action identifier
 * @property {string} description - Human-readable description
 * @property {string} trigger - Status that triggers this action
 * @property {number} priority - Execution priority (1 = highest)
 */

const ENFORCEMENT_ACTIONS = [
  {
    action: 'DISTRIBUTION_SUSPENSION',
    description: 'All equity distributions halted; cash retained for debt service.',
    trigger: STATUS.WARNING,
    priority: 1,
  },
  {
    action: 'CASH_SWEEP',
    description: 'Excess cash redirected to accelerated debt repayment.',
    trigger: STATUS.WARNING,
    priority: 2,
  },
  {
    action: 'TOKEN_YIELD_REDUCTION',
    description: 'Preferred return on token securities suspended; participation rights deferred.',
    trigger: STATUS.WARNING,
    priority: 3,
  },
  {
    action: 'RESERVE_TOPUP',
    description: 'DSRA must be brought to 6-month minimum from available cash.',
    trigger: STATUS.WARNING,
    priority: 4,
  },
  {
    action: 'STEP_IN_RIGHTS',
    description: 'Lender assumes operational control of Energy SPV.',
    trigger: STATUS.EVENT_OF_DEFAULT,
    priority: 5,
  },
  {
    action: 'FORCED_REFINANCE',
    description: 'Mandatory capital restructuring process initiated.',
    trigger: STATUS.EVENT_OF_DEFAULT,
    priority: 6,
  },
  {
    action: 'DISPUTE_BOARD_REFERRAL',
    description: 'Breach referred to Dispute Resolution Board for adjudication.',
    trigger: STATUS.EVENT_OF_DEFAULT,
    priority: 7,
  },
];

// ── WATERFALL ENGINE ─────────────────────────────────────────────

/**
 * Standard cash waterfall — applies in COMPLIANT state.
 *
 * @param {Object} cashflow - Period cashflow data
 * @param {number} cashflow.revenue - Total revenue for period
 * @param {number} cashflow.opex - Operating expenses
 * @param {number} cashflow.debt_service - Scheduled debt service (P+I)
 * @param {number} cashflow.reserve_target - Target reserve balance
 * @param {number} cashflow.current_reserve - Current reserve balance
 * @returns {Object} Waterfall allocation
 */
function standardWaterfall(cashflow) {
  const available = cashflow.revenue;
  let remaining = available;

  // 1. Operating expenses & taxes
  const opex = Math.min(remaining, cashflow.opex);
  remaining -= opex;

  // 2. Senior debt service
  const debt_service = Math.min(remaining, cashflow.debt_service);
  remaining -= debt_service;

  // 3. DSRA top-up
  const reserve_gap = Math.max(0, cashflow.reserve_target - cashflow.current_reserve);
  const reserve_topup = Math.min(remaining, reserve_gap);
  remaining -= reserve_topup;

  // 4. Maintenance reserve
  const maintenance = Math.min(remaining, cashflow.revenue * 0.02); // 2% of revenue
  remaining -= maintenance;

  // 5. Token preferred return
  const token_preferred = Math.min(remaining, (ASSUMPTIONS.capex_usd * (1 - ASSUMPTIONS.debt_ratio)) * 0.08 * 0.27); // ~8% on token share
  remaining -= token_preferred;

  // 6. Equity distribution
  const equity_distribution = remaining;

  return {
    revenue: available,
    opex,
    debt_service,
    reserve_topup,
    maintenance,
    token_preferred,
    equity_distribution,
    debt_service_shortfall: cashflow.debt_service - debt_service,
  };
}

/**
 * Enforcement waterfall — applies in WARNING or EVENT_OF_DEFAULT state.
 * Reroutes cash from distributions to debt service and reserves.
 *
 * @param {Object} cashflow - Period cashflow data
 * @param {string} status - Current covenant status
 * @returns {Object} Enforced waterfall allocation
 */
function enforcementWaterfall(cashflow, status) {
  const available = cashflow.revenue;
  let remaining = available;

  // 1. Operating expenses (cannot be deferred)
  const opex = Math.min(remaining, cashflow.opex);
  remaining -= opex;

  // 2. Senior debt service (priority)
  const debt_service = Math.min(remaining, cashflow.debt_service);
  remaining -= debt_service;

  // 3. DSRA top-up (mandatory in enforcement)
  const reserve_gap = Math.max(0, cashflow.reserve_target - cashflow.current_reserve);
  const reserve_topup = Math.min(remaining, reserve_gap);
  remaining -= reserve_topup;

  // 4. Cash sweep (50% of remaining in WARNING, 100% in DEFAULT)
  const sweep_rate = status === STATUS.EVENT_OF_DEFAULT ? 1.0 : 0.5;
  const cash_sweep = Math.round(remaining * sweep_rate);
  remaining -= cash_sweep;

  // 5. Token preferred: suspended in enforcement
  const token_preferred = 0;

  // 6. Equity distribution: zero in enforcement
  const equity_distribution = 0;

  // Remaining (if any after partial sweep) goes to reserve
  const additional_reserve = remaining;

  return {
    revenue: available,
    opex,
    debt_service,
    reserve_topup: reserve_topup + additional_reserve,
    cash_sweep,
    token_preferred,
    equity_distribution,
    debt_service_shortfall: cashflow.debt_service - debt_service,
    enforcement_status: status,
    suspended: ['equity_distribution', 'token_preferred'],
  };
}

// ── ENFORCEMENT DETERMINATION ─────────────────────────────────────

/**
 * Determine enforcement actions based on covenant evaluation.
 *
 * @param {Object} metrics - Current financial metrics
 * @returns {{ actions: Array, waterfall_mode: string }}
 */
function determineEnforcement(metrics) {
  const evaluation = evaluateAllCovenants(metrics);
  const triggered = [];

  if (evaluation.overall_status === STATUS.COMPLIANT) {
    return {
      actions: [],
      waterfall_mode: 'STANDARD',
      overall_status: STATUS.COMPLIANT,
    };
  }

  ENFORCEMENT_ACTIONS.forEach((action) => {
    if (
      (action.trigger === STATUS.WARNING && evaluation.warnings > 0) ||
      (action.trigger === STATUS.EVENT_OF_DEFAULT && evaluation.breaches > 0)
    ) {
      triggered.push(action);
    }
  });

  // Filter: only include DEFAULT-level actions if there are actual defaults
  const applicable = triggered.filter((a) => {
    if (a.trigger === STATUS.EVENT_OF_DEFAULT && evaluation.breaches === 0) return false;
    return true;
  });

  return {
    actions: applicable.sort((a, b) => a.priority - b.priority),
    waterfall_mode: evaluation.breaches > 0 ? 'ENFORCEMENT_DEFAULT' : 'ENFORCEMENT_WARNING',
    overall_status: evaluation.overall_status,
    covenant_results: evaluation.results,
  };
}

/**
 * Execute the appropriate waterfall based on covenant status.
 *
 * @param {Object} metrics - Current financial metrics
 * @param {Object} cashflow - Period cashflow data
 * @returns {Object} Waterfall result + enforcement actions
 */
function executeWaterfall(metrics, cashflow) {
  const enforcement = determineEnforcement(metrics);

  let waterfall;
  if (enforcement.waterfall_mode === 'STANDARD') {
    waterfall = standardWaterfall(cashflow);
  } else {
    waterfall = enforcementWaterfall(cashflow, enforcement.overall_status);
  }

  return {
    waterfall,
    enforcement,
    timestamp: new Date().toISOString(),
  };
}

// ── CLI EXECUTION ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           SUNFARM — ENFORCEMENT ENGINE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Scenario 1: Compliant
  console.log('─── Scenario 1: COMPLIANT ───');
  const compliantMetrics = { dscr: 3.90, llcr: 3.50, debt_to_equity: 1.50, reserve_months: 6, bess_availability: 0.95 };
  const compliantCashflow = { revenue: 11_600_000, opex: 1_200_000, debt_service: 3_200_000, reserve_target: 1_600_000, current_reserve: 1_600_000 };
  const r1 = executeWaterfall(compliantMetrics, compliantCashflow);
  console.log(`Mode: ${r1.enforcement.waterfall_mode}`);
  console.log(`Equity Distribution: $${r1.waterfall.equity_distribution.toLocaleString()}\n`);

  // Scenario 2: Warning (DSCR at 1.15)
  console.log('─── Scenario 2: WARNING (DSCR 1.15x) ───');
  const warningMetrics = { dscr: 1.15, llcr: 1.20, debt_to_equity: 1.50, reserve_months: 4, bess_availability: 0.92 };
  const warningCashflow = { revenue: 5_000_000, opex: 1_200_000, debt_service: 3_200_000, reserve_target: 1_600_000, current_reserve: 800_000 };
  const r2 = executeWaterfall(warningMetrics, warningCashflow);
  console.log(`Mode: ${r2.enforcement.waterfall_mode}`);
  console.log(`Actions: ${r2.enforcement.actions.map((a) => a.action).join(', ')}`);
  console.log(`Equity Distribution: $${r2.waterfall.equity_distribution.toLocaleString()}`);
  console.log(`Cash Sweep: $${r2.waterfall.cash_sweep.toLocaleString()}\n`);

  // Scenario 3: Event of Default (DSCR at 0.95)
  console.log('─── Scenario 3: EVENT OF DEFAULT (DSCR 0.95x) ───');
  const defaultMetrics = { dscr: 0.95, llcr: 0.90, debt_to_equity: 1.50, reserve_months: 0.5, bess_availability: 0.75 };
  const defaultCashflow = { revenue: 3_500_000, opex: 1_200_000, debt_service: 3_200_000, reserve_target: 1_600_000, current_reserve: 200_000 };
  const r3 = executeWaterfall(defaultMetrics, defaultCashflow);
  console.log(`Mode: ${r3.enforcement.waterfall_mode}`);
  console.log(`Actions: ${r3.enforcement.actions.map((a) => a.action).join(', ')}`);
  console.log(`Equity Distribution: $${r3.waterfall.equity_distribution.toLocaleString()}`);
  console.log(`Cash Sweep: $${r3.waterfall.cash_sweep.toLocaleString()}`);
  console.log(`Debt Service Shortfall: $${r3.waterfall.debt_service_shortfall.toLocaleString()}`);
}

module.exports = { ENFORCEMENT_ACTIONS, standardWaterfall, enforcementWaterfall, determineEnforcement, executeWaterfall };
