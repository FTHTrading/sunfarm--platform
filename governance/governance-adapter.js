/**
 * SUNFARM PV — GOVERNANCE ADAPTER
 *
 * DAO-ready governance adapter that provides a standardized interface
 * for covenant monitoring, enforcement actions, and dispute resolution.
 *
 * This adapter can be consumed by:
 * - Dashboard (Express routes)
 * - CLI tools
 * - Future DAO / smart contract bridge
 * - Audit bundle export
 */

const { evaluateAllCovenants, generateComplianceReport, COVENANTS, STATUS } = require('./covenants.js');
const { executeWaterfall, determineEnforcement } = require('./enforcement.js');
const { fileDispute, assignBoard, recordDecision, escalateCovenantBreach, getDisputes } = require('./dispute_board.js');
const { ASSUMPTIONS, PROJECT } = require('../config/project.js');

// ── GOVERNANCE STATE ─────────────────────────────────────────────

/**
 * @typedef {Object} GovernanceState
 * @property {string} status - Current governance status
 * @property {number} active_year - Current operating year
 * @property {Object} metrics - Latest financial metrics
 * @property {Object} covenant_report - Latest covenant compliance report
 * @property {Object} waterfall_result - Latest waterfall execution result
 * @property {Array} active_disputes - Currently active disputes
 * @property {Array} enforcement_actions - Currently active enforcement actions
 * @property {string} last_updated - ISO timestamp
 */

let governanceState = {
  status: STATUS.COMPLIANT,
  active_year: 0,
  metrics: {},
  covenant_report: null,
  waterfall_result: null,
  active_disputes: [],
  enforcement_actions: [],
  last_updated: null,
};

// ── ADAPTER INTERFACE ─────────────────────────────────────────────

/**
 * Update governance state with new financial metrics.
 * This is the primary ingestion point — call this with each period's data.
 *
 * @param {number} year - Operating year (1-25)
 * @param {Object} metrics - Financial metrics for the period
 * @param {Object} cashflow - Cashflow data for the period
 * @returns {GovernanceState} Updated governance state
 */
function updateGovernance(year, metrics, cashflow) {
  // 1. Evaluate covenants
  const covenant_report = generateComplianceReport(year, metrics);

  // 2. Execute appropriate waterfall
  const waterfall_result = executeWaterfall(metrics, cashflow);

  // 3. Auto-escalate any defaults to DRB
  covenant_report.evaluation.results
    .filter((r) => r.status === STATUS.EVENT_OF_DEFAULT)
    .forEach((r) => escalateCovenantBreach(r));

  // 4. Update state
  governanceState = {
    status: covenant_report.evaluation.overall_status,
    active_year: year,
    metrics,
    covenant_report,
    waterfall_result,
    active_disputes: getDisputes().filter((d) => d.status !== 'DECIDED'),
    enforcement_actions: waterfall_result.enforcement.actions,
    last_updated: new Date().toISOString(),
  };

  return governanceState;
}

/**
 * Get current governance state (read-only snapshot).
 *
 * @returns {GovernanceState}
 */
function getGovernanceState() {
  return { ...governanceState };
}

/**
 * Get the full governance dashboard data (for Express routes or CLI).
 *
 * @returns {Object} Dashboard-ready data package
 */
function getDashboardData() {
  return {
    project: {
      name: PROJECT.name,
      entity: PROJECT.entity.name,
      rnc: PROJECT.entity.rnc,
      location: `${PROJECT.location.municipality}, ${PROJECT.location.province}`,
      capacity: `${PROJECT.capacity_mw_ac} MW AC / ${PROJECT.capacity_mwp_dc} MWp DC`,
      concession: PROJECT.regulatory.concession_resolution,
    },
    governance: governanceState,
    covenants: COVENANTS.map((c) => ({
      name: c.name,
      metric: c.metric,
      warning: c.warning,
      default_threshold: c.default_threshold,
      direction: c.direction,
      cure_days: c.cure_days,
    })),
    disputes: getDisputes(),
    waterfall: governanceState.waterfall_result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Submit a dispute through the governance adapter.
 *
 * @param {string} category - Dispute category
 * @param {string} description - Dispute description
 * @param {string} filed_by - Filing party
 * @param {Object} [evidence] - Supporting evidence
 * @returns {Object} Created dispute
 */
function submitDispute(category, description, filed_by, evidence) {
  const dispute = fileDispute(category, description, filed_by, evidence);
  governanceState.active_disputes = getDisputes().filter((d) => d.status !== 'DECIDED');
  return dispute;
}

/**
 * Resolve a dispute through the governance adapter.
 *
 * @param {string} disputeId - Dispute ID
 * @param {string} outcome - Resolution outcome
 * @param {string} reasoning - Board reasoning
 * @param {Object} [conditions] - Conditions
 * @returns {Object} Resolved dispute
 */
function resolveDispute(disputeId, outcome, reasoning, conditions) {
  assignBoard(disputeId);
  const resolved = recordDecision(disputeId, outcome, reasoning, conditions);
  governanceState.active_disputes = getDisputes().filter((d) => d.status !== 'DECIDED');
  return resolved;
}

/**
 * Generate a governance audit trail for export.
 *
 * @returns {Object} Audit trail data
 */
function generateAuditTrail() {
  return {
    export_date: new Date().toISOString(),
    project: PROJECT.name,
    entity: PROJECT.entity.name,
    concession: PROJECT.regulatory.concession_resolution,
    governance_state: governanceState,
    all_disputes: getDisputes(),
    covenant_definitions: COVENANTS,
    assumptions: {
      capex: ASSUMPTIONS.capex_usd,
      debt_ratio: ASSUMPTIONS.debt_ratio,
      interest_rate: ASSUMPTIONS.interest_rate,
      tax_exemption_years: ASSUMPTIONS.tax_exemption_years,
    },
  };
}

// ── CLI EXECUTION ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SUNFARM — GOVERNANCE ADAPTER                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Simulate Year 1 governance cycle
  const year1Metrics = {
    dscr: 3.90,
    llcr: 3.50,
    debt_to_equity: 1.50,
    reserve_months: 6,
    bess_availability: 0.95,
  };

  const year1Cashflow = {
    revenue: 11_600_000,
    opex: 1_200_000,
    debt_service: 3_200_000,
    reserve_target: 1_600_000,
    current_reserve: 1_600_000,
  };

  console.log('─── Year 1: Normal Operations ───\n');
  const state1 = updateGovernance(1, year1Metrics, year1Cashflow);
  console.log(`Status: ${state1.status}`);
  console.log(`Equity Distribution: $${state1.waterfall_result.waterfall.equity_distribution.toLocaleString()}`);
  console.log(`Active Disputes: ${state1.active_disputes.length}\n`);

  // Simulate Year 8 stress scenario
  const year8Metrics = {
    dscr: 1.10,
    llcr: 1.05,
    debt_to_equity: 1.50,
    reserve_months: 2,
    bess_availability: 0.88,
  };

  const year8Cashflow = {
    revenue: 6_000_000,
    opex: 1_400_000,
    debt_service: 3_200_000,
    reserve_target: 1_600_000,
    current_reserve: 500_000,
  };

  console.log('─── Year 8: Stress Scenario ───\n');
  const state8 = updateGovernance(8, year8Metrics, year8Cashflow);
  console.log(`Status: ${state8.status}`);
  console.log(`Enforcement Actions: ${state8.enforcement_actions.map((a) => a.action).join(', ')}`);
  console.log(`Active Disputes: ${state8.active_disputes.length}`);
  console.log(`Cash Sweep: $${state8.waterfall_result.waterfall.cash_sweep?.toLocaleString() || 0}`);
  console.log(`Equity Distribution: $${state8.waterfall_result.waterfall.equity_distribution.toLocaleString()}\n`);

  // Generate audit trail
  console.log('─── Audit Trail Export ───\n');
  const audit = generateAuditTrail();
  console.log(`Export Date: ${audit.export_date}`);
  console.log(`Total Disputes: ${audit.all_disputes.length}`);
  console.log(`Governance Status: ${audit.governance_state.status}`);
}

module.exports = {
  updateGovernance,
  getGovernanceState,
  getDashboardData,
  submitDispute,
  resolveDispute,
  generateAuditTrail,
};
