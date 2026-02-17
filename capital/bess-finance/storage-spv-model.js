/**
 * BESS STORAGE SPV MODEL
 * Models standalone BESS financing: revenue bond, equipment lease, capacity underwriting.
 * Consumes from config/project.js.
 */

const { PROJECT, ASSUMPTIONS } = require('../../config/project.js');

// ── BESS PARAMETERS ──────────────────────────────────────────

const BESS = {
  power_mw:        PROJECT.bess.power_mw,
  energy_mwh:      PROJECT.bess.energy_mwh,
  duration_hours:  PROJECT.bess.duration_hours,
  capex_per_kwh:   PROJECT.bess.capex_per_kwh,
  capex_total:     PROJECT.bess.capex_total,
  degradation:     0.02,
  efficiency:      0.88,
  om_per_kw:       8,
  economic_life:   20,
  augmentation_yr: 15,
  augmentation_pct: 0.30,
};

const REVENUE_STREAMS = {
  arbitrage:    { base: 1_820_000, escalation: 0.02, pct: 0.40 },
  frequency:    { base: 1_100_000, escalation: 0.02, pct: 0.24 },
  capacity:     { base:   910_000, escalation: 0.015, pct: 0.20 },
  peak_shaving: { base:   590_000, escalation: 0.02, pct: 0.11 },
  curtailment:  { base:   140_000, escalation: 0.01, pct: 0.04 },
};

// ── REVENUE BOND MODEL ────────────────────────────────────────

/**
 * Model a BESS revenue bond.
 * @param {Object} [opts]
 * @param {number} [opts.bond_size]     - Bond principal
 * @param {number} [opts.coupon]        - Annual coupon rate
 * @param {number} [opts.tenor]         - Bond tenor in years
 * @returns {Object}
 */
function revenueBondModel(opts = {}) {
  const bondSize = opts.bond_size || BESS.capex_total * 0.70;
  const coupon = opts.coupon || 0.075;
  const tenor = opts.tenor || 12;
  const annualDebtService = bondSize * (coupon * Math.pow(1 + coupon, tenor)) /
                             (Math.pow(1 + coupon, tenor) - 1);

  const years = [];
  let totalRevenue = 0;
  let totalOM = 0;
  let totalDebtService = 0;
  let minDSCR = Infinity;

  for (let y = 1; y <= tenor; y++) {
    const degradation = Math.pow(1 - BESS.degradation, y - 1);
    let revenue = 0;
    for (const stream of Object.values(REVENUE_STREAMS)) {
      revenue += stream.base * Math.pow(1 + stream.escalation, y - 1) * degradation;
    }
    const om = BESS.om_per_kw * BESS.power_mw * 1000 * Math.pow(1.02, y - 1);
    const augCost = (y === BESS.augmentation_yr) ? BESS.capex_total * BESS.augmentation_pct : 0;
    const netCF = revenue - om - augCost;
    const dscr = netCF / annualDebtService;
    if (dscr < minDSCR) minDSCR = dscr;

    totalRevenue += revenue;
    totalOM += om + augCost;
    totalDebtService += annualDebtService;

    years.push({ year: y, revenue: Math.round(revenue), om: Math.round(om + augCost),
                 netCF: Math.round(netCF), debtService: Math.round(annualDebtService),
                 dscr: parseFloat(dscr.toFixed(2)) });
  }

  return {
    structure: 'BESS Revenue Bond',
    bond_size: bondSize,
    coupon,
    tenor,
    annual_debt_service: Math.round(annualDebtService),
    min_dscr: parseFloat(minDSCR.toFixed(2)),
    total_revenue: Math.round(totalRevenue),
    total_om: Math.round(totalOM),
    total_debt_service: Math.round(totalDebtService),
    equity_required: BESS.capex_total - bondSize,
    years,
  };
}

// ── EQUIPMENT LEASE MODEL ─────────────────────────────────────

/**
 * Model an equipment lease for BESS.
 * @param {Object} [opts]
 * @param {number} [opts.lease_rate]  - Annual lease rate as % of equipment value
 * @param {number} [opts.term]        - Lease term in years
 * @param {number} [opts.residual]    - Residual value at end of lease
 * @returns {Object}
 */
function equipmentLeaseModel(opts = {}) {
  const leaseRate = opts.lease_rate || 0.12;
  const term = opts.term || 10;
  const residual = opts.residual || 0.10;
  const equipmentValue = BESS.capex_total;
  const annualLease = (equipmentValue * (1 - residual)) / term * (1 + leaseRate * 0.5);

  const years = [];
  let totalLease = 0;
  let totalRevenue = 0;

  for (let y = 1; y <= term; y++) {
    const degradation = Math.pow(1 - BESS.degradation, y - 1);
    let revenue = 0;
    for (const stream of Object.values(REVENUE_STREAMS)) {
      revenue += stream.base * Math.pow(1 + stream.escalation, y - 1) * degradation;
    }
    const netAfterLease = revenue - annualLease;
    totalLease += annualLease;
    totalRevenue += revenue;

    years.push({
      year: y,
      revenue: Math.round(revenue),
      lease_payment: Math.round(annualLease),
      net_after_lease: Math.round(netAfterLease),
      coverage: parseFloat((revenue / annualLease).toFixed(2)),
    });
  }

  return {
    structure: 'Equipment Lease',
    equipment_value: equipmentValue,
    annual_lease: Math.round(annualLease),
    term,
    residual_value: Math.round(equipmentValue * residual),
    buyout_option: Math.round(equipmentValue * residual),
    total_lease_cost: Math.round(totalLease),
    total_revenue: Math.round(totalRevenue),
    upfront_equity: 0,
    years,
  };
}

// ── CAPACITY UNDERWRITING ─────────────────────────────────────

/**
 * Model capacity payment underwriting.
 * @param {Object} [opts]
 * @param {number} [opts.capacity_price]  - $/MW/year
 * @param {number} [opts.contract_term]   - Years
 * @returns {Object}
 */
function capacityUnderwriting(opts = {}) {
  const capacityPrice = opts.capacity_price || 36_400;
  const contractTerm = opts.contract_term || 15;

  let totalContracted = 0;
  let totalMerchant = 0;
  const years = [];

  for (let y = 1; y <= contractTerm; y++) {
    const degradation = Math.pow(1 - BESS.degradation, y - 1);
    const contractedRevenue = capacityPrice * BESS.power_mw * degradation;
    const merchantRevenue = (REVENUE_STREAMS.arbitrage.base + REVENUE_STREAMS.frequency.base +
                             REVENUE_STREAMS.peak_shaving.base + REVENUE_STREAMS.curtailment.base) *
                             Math.pow(1.02, y - 1) * degradation;
    totalContracted += contractedRevenue;
    totalMerchant += merchantRevenue;

    years.push({
      year: y,
      contracted: Math.round(contractedRevenue),
      merchant: Math.round(merchantRevenue),
      total: Math.round(contractedRevenue + merchantRevenue),
      contracted_pct: parseFloat(((contractedRevenue / (contractedRevenue + merchantRevenue)) * 100).toFixed(1)),
    });
  }

  return {
    structure: 'Capacity Payment Underwriting',
    capacity_price: capacityPrice,
    contract_term: contractTerm,
    total_contracted: Math.round(totalContracted),
    total_merchant: Math.round(totalMerchant),
    contracted_pct: parseFloat(((totalContracted / (totalContracted + totalMerchant)) * 100).toFixed(1)),
    bankability: totalContracted / (totalContracted + totalMerchant) > 0.3 ? 'ENHANCED' : 'STANDARD',
    years,
  };
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { revenueBondModel, equipmentLeaseModel, capacityUnderwriting, BESS, REVENUE_STREAMS };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — BESS STORAGE SPV FINANCIAL MODEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Revenue Bond
  const bond = revenueBondModel();
  console.log(`  ${bond.structure}`);
  console.log('  ' + '─'.repeat(50));
  console.log(`  Bond Size:           $${(bond.bond_size / 1e6).toFixed(1)}M`);
  console.log(`  Coupon:              ${(bond.coupon * 100).toFixed(1)}%`);
  console.log(`  Tenor:               ${bond.tenor} years`);
  console.log(`  Annual Debt Service: $${(bond.annual_debt_service / 1e6).toFixed(2)}M`);
  console.log(`  Min DSCR:            ${bond.min_dscr}x`);
  console.log(`  Equity Required:     $${(bond.equity_required / 1e6).toFixed(1)}M`);

  // Equipment Lease
  const lease = equipmentLeaseModel();
  console.log(`\n  ${lease.structure}`);
  console.log('  ' + '─'.repeat(50));
  console.log(`  Equipment Value:     $${(lease.equipment_value / 1e6).toFixed(1)}M`);
  console.log(`  Annual Lease:        $${(lease.annual_lease / 1e6).toFixed(2)}M`);
  console.log(`  Term:                ${lease.term} years`);
  console.log(`  Buyout Option:       $${(lease.buyout_option / 1e6).toFixed(2)}M`);
  console.log(`  Upfront Equity:      $${lease.upfront_equity}`);

  // Capacity Underwriting
  const cap = capacityUnderwriting();
  console.log(`\n  ${cap.structure}`);
  console.log('  ' + '─'.repeat(50));
  console.log(`  Capacity Price:      $${cap.capacity_price.toLocaleString()}/MW/yr`);
  console.log(`  Contract Term:       ${cap.contract_term} years`);
  console.log(`  Contracted Revenue:  $${(cap.total_contracted / 1e6).toFixed(1)}M (${cap.contracted_pct}%)`);
  console.log(`  Merchant Revenue:    $${(cap.total_merchant / 1e6).toFixed(1)}M`);
  console.log(`  Bankability:         ${cap.bankability}`);
  console.log();
}
