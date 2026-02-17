/**
 * SUNFARM PV — COVENANT DEFINITIONS & BREACH DETECTION
 *
 * Implements project-finance-grade financial covenants with
 * threshold monitoring, cure-period tracking, and breach classification.
 *
 * Consumes from: config/project.js
 * Used by: enforcement.js, dispute_board.js, governance-adapter.js
 */

const { ASSUMPTIONS } = require('../config/project.js');

// ── COVENANT THRESHOLDS ─────────────────────────────────────────

/**
 * @typedef {Object} CovenantThreshold
 * @property {string} name - Human-readable covenant name
 * @property {string} metric - Metric key (e.g., 'dscr', 'llcr')
 * @property {number} warning - Warning threshold
 * @property {number} default_threshold - Event of Default threshold
 * @property {string} direction - 'min' if breach is below, 'max' if breach is above
 * @property {number} cure_days - Cure period in days
 * @property {string} remedy - Description of required remedy
 */

const COVENANTS = [
  {
    name: 'Debt Service Coverage Ratio',
    metric: 'dscr',
    warning: 1.20,
    default_threshold: 1.05,
    direction: 'min',
    cure_days: 90,
    remedy: 'Cash sweep activated; distributions suspended; excess cash applied to debt service.',
  },
  {
    name: 'Loan Life Coverage Ratio',
    metric: 'llcr',
    warning: 1.15,
    default_threshold: 1.00,
    direction: 'min',
    cure_days: 90,
    remedy: 'Cash sweep triggered; accelerated repayment schedule activated.',
  },
  {
    name: 'Debt-to-Equity Ratio',
    metric: 'debt_to_equity',
    warning: 0.80,
    default_threshold: 0.90,
    direction: 'max',
    cure_days: 60,
    remedy: 'No additional indebtedness permitted; equity injection required.',
  },
  {
    name: 'Reserve Ratio',
    metric: 'reserve_months',
    warning: 3.0,
    default_threshold: 1.0,
    direction: 'min',
    cure_days: 30,
    remedy: 'Reserve top-up from excess cash; distributions halted until reserve restored.',
  },
  {
    name: 'BESS Availability',
    metric: 'bess_availability',
    warning: 0.90,
    default_threshold: 0.80,
    direction: 'min',
    cure_days: 60,
    remedy: 'BESS O&M escalation; vendor warranty claim; replacement evaluation.',
  },
];

// ── COVENANT STATUS ENUM ─────────────────────────────────────────

const STATUS = Object.freeze({
  COMPLIANT: 'COMPLIANT',
  WARNING: 'WARNING',
  CURE_PERIOD: 'CURE_PERIOD',
  EVENT_OF_DEFAULT: 'EVENT_OF_DEFAULT',
});

// ── BREACH DETECTION ─────────────────────────────────────────────

/**
 * Evaluate a single covenant against a metric value.
 *
 * @param {CovenantThreshold} covenant - Covenant definition
 * @param {number} value - Current metric value
 * @returns {{ status: string, covenant: string, value: number, threshold: number, margin: number }}
 */
function evaluateCovenant(covenant, value) {
  const isMin = covenant.direction === 'min';

  const breachesDefault = isMin
    ? value < covenant.default_threshold
    : value > covenant.default_threshold;

  const breachesWarning = isMin
    ? value < covenant.warning
    : value > covenant.warning;

  let status = STATUS.COMPLIANT;
  let threshold = isMin ? covenant.warning : covenant.warning;

  if (breachesDefault) {
    status = STATUS.EVENT_OF_DEFAULT;
    threshold = covenant.default_threshold;
  } else if (breachesWarning) {
    status = STATUS.WARNING;
    threshold = covenant.warning;
  }

  const margin = isMin
    ? value - covenant.default_threshold
    : covenant.default_threshold - value;

  return {
    status,
    covenant: covenant.name,
    metric: covenant.metric,
    value,
    threshold,
    margin: Math.round(margin * 1000) / 1000,
    cure_days: breachesWarning ? covenant.cure_days : null,
    remedy: breachesWarning ? covenant.remedy : null,
  };
}

/**
 * Evaluate all covenants against a set of metric values.
 *
 * @param {Object} metrics - Object with keys matching covenant metric names
 * @returns {{ results: Array, overall_status: string, breaches: number, warnings: number }}
 */
function evaluateAllCovenants(metrics) {
  const results = COVENANTS.map((covenant) => {
    const value = metrics[covenant.metric];
    if (value === undefined || value === null) {
      return {
        status: 'MISSING_DATA',
        covenant: covenant.name,
        metric: covenant.metric,
        value: null,
        threshold: null,
        margin: null,
        cure_days: null,
        remedy: null,
      };
    }
    return evaluateCovenant(covenant, value);
  });

  const breaches = results.filter((r) => r.status === STATUS.EVENT_OF_DEFAULT).length;
  const warnings = results.filter((r) => r.status === STATUS.WARNING).length;

  let overall_status = STATUS.COMPLIANT;
  if (breaches > 0) overall_status = STATUS.EVENT_OF_DEFAULT;
  else if (warnings > 0) overall_status = STATUS.WARNING;

  return { results, overall_status, breaches, warnings };
}

/**
 * Generate a covenant compliance report for a given year.
 *
 * @param {number} year - Year number (1-25)
 * @param {Object} metrics - Financial metrics for the year
 * @returns {Object} Formatted compliance report
 */
function generateComplianceReport(year, metrics) {
  const evaluation = evaluateAllCovenants(metrics);

  return {
    report_date: new Date().toISOString(),
    year,
    metrics,
    evaluation,
    summary: {
      total_covenants: COVENANTS.length,
      compliant: evaluation.results.filter((r) => r.status === STATUS.COMPLIANT).length,
      warnings: evaluation.warnings,
      defaults: evaluation.breaches,
      missing: evaluation.results.filter((r) => r.status === 'MISSING_DATA').length,
    },
  };
}

// ── CLI EXECUTION ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SUNFARM — COVENANT COMPLIANCE ENGINE                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Example: Year 1 baseline metrics
  const year1Metrics = {
    dscr: 3.90,
    llcr: 3.50,
    debt_to_equity: ASSUMPTIONS.debt_ratio / ASSUMPTIONS.equity_ratio,
    reserve_months: 6,
    bess_availability: 0.95,
  };

  const report = generateComplianceReport(1, year1Metrics);

  console.log(`Year: ${report.year}`);
  console.log(`Overall Status: ${report.evaluation.overall_status}\n`);

  report.evaluation.results.forEach((r) => {
    const icon = r.status === STATUS.COMPLIANT ? '✅' :
                 r.status === STATUS.WARNING ? '⚠️' :
                 r.status === STATUS.EVENT_OF_DEFAULT ? '❌' : '❓';
    console.log(`${icon} ${r.covenant}`);
    console.log(`   Value: ${r.value} | Threshold: ${r.threshold} | Margin: ${r.margin}`);
    if (r.remedy) console.log(`   Remedy: ${r.remedy}`);
    console.log();
  });

  console.log(`Summary: ${report.summary.compliant}/${report.summary.total_covenants} compliant`);
}

module.exports = { COVENANTS, STATUS, evaluateCovenant, evaluateAllCovenants, generateComplianceReport };
