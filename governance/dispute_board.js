/**
 * SUNFARM PV — DISPUTE RESOLUTION BOARD
 *
 * Implements a Dispute Resolution Board (DRB) module for adjudicating
 * covenant breaches, stakeholder disputes, and escalation handling.
 *
 * Modeled on FIDIC DAB / ICC DRB structures adapted for project finance.
 */

const { STATUS } = require('./covenants.js');

// ── DRB CONFIGURATION ───────────────────────────────────────────

const DRB_CONFIG = {
  board_size: 3,
  quorum: 2,
  decision_deadline_days: 30,
  appeal_deadline_days: 28,
  governing_law: 'Dominican Republic',
  arbitration_rules: 'ICC International Court of Arbitration',
  seat_of_arbitration: 'Santo Domingo, DR (primary) / New York, NY (international)',
  language: 'English & Spanish',
};

// ── DISPUTE CATEGORIES ───────────────────────────────────────────

const DISPUTE_CATEGORIES = [
  {
    category: 'COVENANT_BREACH',
    description: 'Financial covenant threshold violation requiring adjudication.',
    escalation_from: STATUS.EVENT_OF_DEFAULT,
    typical_resolution: ['Waiver with conditions', 'Restructuring plan', 'Step-in rights confirmation'],
    deadline_days: 30,
  },
  {
    category: 'PPA_DISPUTE',
    description: 'Dispute with offtaker regarding payment, curtailment, or force majeure.',
    escalation_from: null,
    typical_resolution: ['Mediation', 'Tariff recalculation', 'Compensation claim'],
    deadline_days: 60,
  },
  {
    category: 'CONSTRUCTION_DISPUTE',
    description: 'EPC contractor claim — delay, defect, variation order.',
    escalation_from: null,
    typical_resolution: ['DAB determination', 'Amicable settlement', 'Arbitration'],
    deadline_days: 84,
  },
  {
    category: 'REGULATORY_CHANGE',
    description: 'Change in DR law, regulation, or tax policy affecting project economics.',
    escalation_from: null,
    typical_resolution: ['Stabilization clause invocation', 'Tariff adjustment', 'Compensation claim'],
    deadline_days: 90,
  },
  {
    category: 'TOKEN_HOLDER_DISPUTE',
    description: 'Token holder claim regarding distributions, yield, or governance rights.',
    escalation_from: null,
    typical_resolution: ['Waterfall audit', 'Distribution recalculation', 'Mediation'],
    deadline_days: 45,
  },
  {
    category: 'INSURANCE_CLAIM_DISPUTE',
    description: 'Dispute with insurers regarding coverage, quantum, or subrogation.',
    escalation_from: null,
    typical_resolution: ['Expert determination', 'Mediation', 'Arbitration'],
    deadline_days: 90,
  },
];

// ── DISPUTE TRACKING ─────────────────────────────────────────────

/** @type {Array<Object>} In-memory dispute register */
const disputeRegister = [];

/**
 * File a new dispute.
 *
 * @param {string} category - One of the DISPUTE_CATEGORIES category values
 * @param {string} description - Detailed description of the dispute
 * @param {string} filed_by - Party filing the dispute
 * @param {Object} [evidence] - Supporting evidence/data
 * @returns {Object} The created dispute record
 */
function fileDispute(category, description, filed_by, evidence = {}) {
  const categoryDef = DISPUTE_CATEGORIES.find((c) => c.category === category);
  if (!categoryDef) throw new Error(`Unknown dispute category: ${category}`);

  const dispute = {
    id: `DRB-${String(disputeRegister.length + 1).padStart(4, '0')}`,
    category,
    description,
    filed_by,
    filed_date: new Date().toISOString(),
    status: 'FILED',
    deadline: new Date(Date.now() + categoryDef.deadline_days * 86_400_000).toISOString(),
    deadline_days: categoryDef.deadline_days,
    board_assigned: false,
    resolution: null,
    evidence,
    history: [
      { date: new Date().toISOString(), action: 'FILED', by: filed_by, notes: description },
    ],
  };

  disputeRegister.push(dispute);
  return dispute;
}

/**
 * Assign the DRB to the dispute (convene the board).
 *
 * @param {string} disputeId - Dispute ID
 * @returns {Object} Updated dispute
 */
function assignBoard(disputeId) {
  const dispute = disputeRegister.find((d) => d.id === disputeId);
  if (!dispute) throw new Error(`Dispute not found: ${disputeId}`);

  dispute.board_assigned = true;
  dispute.status = 'UNDER_REVIEW';
  dispute.history.push({
    date: new Date().toISOString(),
    action: 'BOARD_ASSIGNED',
    by: 'DRB',
    notes: `Board of ${DRB_CONFIG.board_size} members convened.`,
  });

  return dispute;
}

/**
 * Record a DRB decision.
 *
 * @param {string} disputeId - Dispute ID
 * @param {string} outcome - 'BREACH_CONFIRMED' | 'WAIVER_GRANTED' | 'RESTRUCTURE_REQUIRED' | 'DISMISSED'
 * @param {string} reasoning - Board's reasoning
 * @param {Object} [conditions] - Conditions attached to the decision
 * @returns {Object} Updated dispute
 */
function recordDecision(disputeId, outcome, reasoning, conditions = {}) {
  const dispute = disputeRegister.find((d) => d.id === disputeId);
  if (!dispute) throw new Error(`Dispute not found: ${disputeId}`);

  const validOutcomes = ['BREACH_CONFIRMED', 'WAIVER_GRANTED', 'RESTRUCTURE_REQUIRED', 'DISMISSED'];
  if (!validOutcomes.includes(outcome)) {
    throw new Error(`Invalid outcome: ${outcome}. Must be one of: ${validOutcomes.join(', ')}`);
  }

  dispute.status = 'DECIDED';
  dispute.resolution = {
    outcome,
    reasoning,
    conditions,
    decided_date: new Date().toISOString(),
    appeal_deadline: new Date(Date.now() + DRB_CONFIG.appeal_deadline_days * 86_400_000).toISOString(),
  };
  dispute.history.push({
    date: new Date().toISOString(),
    action: 'DECISION',
    by: 'DRB',
    notes: `Outcome: ${outcome}. ${reasoning}`,
  });

  return dispute;
}

/**
 * Auto-escalate a covenant breach to the DRB.
 *
 * @param {Object} covenantResult - Result from evaluateCovenant()
 * @returns {Object} The created dispute record
 */
function escalateCovenantBreach(covenantResult) {
  if (covenantResult.status !== STATUS.EVENT_OF_DEFAULT) {
    return null;
  }

  return fileDispute(
    'COVENANT_BREACH',
    `${covenantResult.covenant}: value ${covenantResult.value} breaches default threshold ${covenantResult.threshold}. Margin: ${covenantResult.margin}.`,
    'ENFORCEMENT_ENGINE',
    { covenant: covenantResult }
  );
}

/**
 * Get all disputes, optionally filtered by status.
 *
 * @param {string} [status] - Optional status filter
 * @returns {Array<Object>}
 */
function getDisputes(status = null) {
  if (status) return disputeRegister.filter((d) => d.status === status);
  return [...disputeRegister];
}

// ── CLI EXECUTION ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SUNFARM — DISPUTE RESOLUTION BOARD                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('Board Configuration:');
  console.log(`  Size: ${DRB_CONFIG.board_size} members`);
  console.log(`  Quorum: ${DRB_CONFIG.quorum}`);
  console.log(`  Governing Law: ${DRB_CONFIG.governing_law}`);
  console.log(`  Arbitration: ${DRB_CONFIG.arbitration_rules}`);
  console.log(`  Seat: ${DRB_CONFIG.seat_of_arbitration}\n`);

  console.log('Dispute Categories:');
  DISPUTE_CATEGORIES.forEach((cat) => {
    console.log(`  ${cat.category}: ${cat.description}`);
    console.log(`    Deadline: ${cat.deadline_days} days | Resolutions: ${cat.typical_resolution.join(', ')}\n`);
  });

  // Simulate a covenant breach escalation
  console.log('─── Simulating Covenant Breach Escalation ───\n');

  const breach = {
    status: STATUS.EVENT_OF_DEFAULT,
    covenant: 'Debt Service Coverage Ratio',
    metric: 'dscr',
    value: 0.95,
    threshold: 1.05,
    margin: -0.1,
  };

  const dispute = escalateCovenantBreach(breach);
  console.log(`Filed: ${dispute.id}`);
  console.log(`Category: ${dispute.category}`);
  console.log(`Status: ${dispute.status}`);
  console.log(`Deadline: ${dispute.deadline}\n`);

  const reviewed = assignBoard(dispute.id);
  console.log(`Board assigned. Status: ${reviewed.status}\n`);

  const decided = recordDecision(
    dispute.id,
    'RESTRUCTURE_REQUIRED',
    'DSCR breach is material and persistent. Board recommends capital restructuring within 90 days.',
    { restructure_deadline_days: 90, equity_injection_required: true }
  );
  console.log(`Decision: ${decided.resolution.outcome}`);
  console.log(`Reasoning: ${decided.resolution.reasoning}`);
  console.log(`Appeal deadline: ${decided.resolution.appeal_deadline}`);
}

module.exports = {
  DRB_CONFIG,
  DISPUTE_CATEGORIES,
  fileDispute,
  assignBoard,
  recordDecision,
  escalateCovenantBreach,
  getDisputes,
};
