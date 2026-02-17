/**
 * CARBON FORWARD OFFTAKE MODEL
 * Models forward sale of carbon credits with discount, floor/ceiling, revenue smoothing.
 * Consumes from config/project.js.
 */

const { PROJECT, ASSUMPTIONS } = require('../../config/project.js');

// ── FORWARD SALE PARAMETERS ───────────────────────────────────

const FORWARD_TERMS = {
  contract_years:  7,          // Forward sale duration
  floor_price:     10,         // USD/tCO₂ minimum
  ceiling_price:   35,         // USD/tCO₂ maximum
  forward_discount: 0.15,     // 15% discount to spot for forward commitment
  delivery_start_year: 1,     // Delivery begins Year 1 post-COD
};

/**
 * @typedef {Object} ForwardCounterparty
 * @property {string} name
 * @property {string} sector
 * @property {string} type
 * @property {number} estimated_volume - Annual tCO₂ demand
 */

/** @type {ForwardCounterparty[]} */
const COUNTERPARTIES = [
  { name: 'Microsoft Sustainability',   sector: 'Technology',     type: 'Corporate buyer',     estimated_volume: 500_000 },
  { name: 'Shell Carbon Solutions',     sector: 'Energy',         type: 'Trading desk',        estimated_volume: 2_000_000 },
  { name: 'BP Carbon Trading',          sector: 'Energy',         type: 'Trading desk',        estimated_volume: 1_500_000 },
  { name: 'South Pole',                 sector: 'Carbon markets', type: 'Project developer',   estimated_volume: 5_000_000 },
  { name: 'Climate Impact Partners',    sector: 'Carbon markets', type: 'Credit aggregator',   estimated_volume: 3_000_000 },
  { name: 'Trafigura Carbon Desk',      sector: 'Commodities',    type: 'Commodity trader',    estimated_volume: 2_000_000 },
  { name: 'Mercuria Energy Trading',    sector: 'Commodities',    type: 'Commodity trader',    estimated_volume: 1_000_000 },
];

// ── FORWARD SALE MODEL ────────────────────────────────────────

/**
 * Calculate annual carbon credit generation.
 * @param {number} year - Project year (1-based)
 * @returns {number} tCO₂
 */
function annualCredits(year) {
  const gen = PROJECT.capacity_mw_ac * PROJECT.capacity_factor *
              PROJECT.hours_per_year * Math.pow(1 - PROJECT.annual_degradation, year - 1);
  return gen * ASSUMPTIONS.grid_emission_factor;
}

/**
 * Apply floor/ceiling to a price.
 * @param {number} price
 * @returns {number}
 */
function applyCollar(price) {
  return Math.max(FORWARD_TERMS.floor_price, Math.min(FORWARD_TERMS.ceiling_price, price));
}

/**
 * Run forward sale model.
 * @param {Object} [opts]
 * @param {number} [opts.spot_price]       - Starting spot price (default from config)
 * @param {number} [opts.escalation]       - Annual escalation (default from config)
 * @param {number} [opts.discount]         - Forward discount (default 15%)
 * @param {number} [opts.contract_years]   - Forward contract duration
 * @returns {Object}
 */
function runForwardSale(opts = {}) {
  const spotPrice = opts.spot_price || ASSUMPTIONS.carbon_price_usd;
  const escalation = opts.escalation || ASSUMPTIONS.carbon_escalation;
  const discount = opts.discount || FORWARD_TERMS.forward_discount;
  const contractYears = opts.contract_years || FORWARD_TERMS.contract_years;

  const years = [];
  let totalForwardRevenue = 0;
  let totalSpotRevenue = 0;
  let totalCredits = 0;

  for (let y = 1; y <= contractYears; y++) {
    const credits = annualCredits(y);
    const spotAtYear = spotPrice * Math.pow(1 + escalation, y - 1);
    const forwardPrice = applyCollar(spotAtYear * (1 - discount));
    const spotRevenue = credits * spotAtYear;
    const forwardRevenue = credits * forwardPrice;

    years.push({
      year: y,
      credits: Math.round(credits),
      spot_price: parseFloat(spotAtYear.toFixed(2)),
      forward_price: parseFloat(forwardPrice.toFixed(2)),
      spot_revenue: Math.round(spotRevenue),
      forward_revenue: Math.round(forwardRevenue),
      discount_impact: Math.round(spotRevenue - forwardRevenue),
    });

    totalForwardRevenue += forwardRevenue;
    totalSpotRevenue += spotRevenue;
    totalCredits += credits;
  }

  // NPV of forward contract (upfront value)
  const discountRate = 0.08;
  let npvForward = 0;
  for (const y of years) {
    npvForward += y.forward_revenue / Math.pow(1 + discountRate, y.year);
  }

  // Pre-COD raise potential (discounted NPV of forward contract)
  const preCODDiscount = 0.20; // Additional 20% discount for pre-COD risk
  const preCODRaise = npvForward * (1 - preCODDiscount);

  return {
    contract_years: contractYears,
    total_credits: Math.round(totalCredits),
    total_forward_revenue: Math.round(totalForwardRevenue),
    total_spot_revenue: Math.round(totalSpotRevenue),
    discount_cost: Math.round(totalSpotRevenue - totalForwardRevenue),
    npv_forward: Math.round(npvForward),
    pre_cod_raise_potential: Math.round(preCODRaise),
    revenue_smoothing_benefit: 'Floor/ceiling eliminates tail risk',
    years,
  };
}

/**
 * Run sensitivity across different spot prices.
 * @returns {Object[]}
 */
function runPriceSensitivity() {
  const prices = [10, 15, 20, 25, 30, 40, 50];
  return prices.map(p => {
    const result = runForwardSale({ spot_price: p });
    return {
      spot_price: p,
      forward_revenue: result.total_forward_revenue,
      npv: result.npv_forward,
      pre_cod_raise: result.pre_cod_raise_potential,
    };
  });
}

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = { runForwardSale, runPriceSensitivity, annualCredits, COUNTERPARTIES, FORWARD_TERMS };

// ── CLI ───────────────────────────────────────────────────────

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUNFARM — CARBON FORWARD OFFTAKE MODEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const result = runForwardSale();

  console.log(`  Contract Duration:     ${result.contract_years} years`);
  console.log(`  Total Credits:         ${result.total_credits.toLocaleString()} tCO₂`);
  console.log(`  Forward Revenue:       $${(result.total_forward_revenue / 1e6).toFixed(2)}M`);
  console.log(`  Spot Equivalent:       $${(result.total_spot_revenue / 1e6).toFixed(2)}M`);
  console.log(`  Discount Cost:         $${(result.discount_cost / 1e6).toFixed(2)}M`);
  console.log(`  NPV @ 8%:              $${(result.npv_forward / 1e6).toFixed(2)}M`);
  console.log(`  Pre-COD Raise:         $${(result.pre_cod_raise_potential / 1e6).toFixed(2)}M`);
  console.log();

  console.log('  Year  Credits     Spot     Forward  SpotRev     FwdRev     Delta');
  console.log('  ' + '─'.repeat(68));
  for (const y of result.years) {
    console.log(
      `  ${String(y.year).padStart(4)}  ${y.credits.toLocaleString().padStart(8)}  ` +
      `$${y.spot_price.toFixed(2).padStart(6)}  $${y.forward_price.toFixed(2).padStart(6)}  ` +
      `$${(y.spot_revenue / 1e6).toFixed(2).padStart(5)}M  ` +
      `$${(y.forward_revenue / 1e6).toFixed(2).padStart(5)}M  ` +
      `$${(y.discount_impact / 1e3).toFixed(0).padStart(5)}K`
    );
  }

  console.log('\n\n  PRICE SENSITIVITY');
  console.log('  ' + '─'.repeat(55));
  console.log('  Spot Price   Forward Rev   NPV@8%   Pre-COD Raise');
  const sensitivity = runPriceSensitivity();
  for (const s of sensitivity) {
    console.log(
      `  $${String(s.spot_price).padStart(4)}/tCO₂  ` +
      `$${(s.forward_revenue / 1e6).toFixed(2).padStart(6)}M    ` +
      `$${(s.npv / 1e6).toFixed(2).padStart(5)}M   ` +
      `$${(s.pre_cod_raise / 1e6).toFixed(2).padStart(5)}M`
    );
  }

  console.log('\n\n  TARGET COUNTERPARTIES');
  console.log('  ' + '─'.repeat(55));
  for (const c of COUNTERPARTIES) {
    console.log(`  ${c.name.padEnd(30)} ${c.sector.padEnd(16)} ${c.type}`);
  }
  console.log();
}
