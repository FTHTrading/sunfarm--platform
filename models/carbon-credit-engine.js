/**
 * SUNFARM PV — CARBON CREDIT ENGINE
 * ──────────────────────────────────
 * Calculates avoided emissions, credit revenue across market scenarios,
 * forward sale discounting, and 25-year totals.
 *
 * Scenarios: Verra VCS, Gold Standard, Compliance, Voluntary Premium
 */

'use strict';

const { PROJECT, ASSUMPTIONS } = require('../config/project');

const SCENARIOS = {
  'Verra VCS': {
    name: 'Verra VCS',
    basePrice: 12,
    base_price: 12,
    escalation: 0.03,
    verification_cost_pct: 0.04,
    registration_cost: 25_000,
    annual_monitoring: 15_000,
  },
  'Gold Standard': {
    name: 'Gold Standard',
    basePrice: 20,
    base_price: 20,
    escalation: 0.04,
    verification_cost_pct: 0.05,
    registration_cost: 40_000,
    annual_monitoring: 20_000,
  },
  'Compliance Market': {
    name: 'Compliance Market',
    basePrice: 30,
    base_price: 30,
    escalation: 0.05,
    verification_cost_pct: 0.03,
    registration_cost: 50_000,
    annual_monitoring: 25_000,
  },
  'Voluntary Premium': {
    name: 'Voluntary Premium',
    basePrice: 45,
    base_price: 45,
    escalation: 0.06,
    verification_cost_pct: 0.06,
    registration_cost: 60_000,
    annual_monitoring: 30_000,
  },
};

// Legacy key → name mapping
const KEY_MAP = {
  verra: 'Verra VCS',
  gold_standard: 'Gold Standard',
  compliance: 'Compliance Market',
  voluntary_premium: 'Voluntary Premium',
};

function resolveScenario(keyOrName) {
  if (SCENARIOS[keyOrName]) return SCENARIOS[keyOrName];
  if (KEY_MAP[keyOrName]) return SCENARIOS[KEY_MAP[keyOrName]];
  // Try case-insensitive match
  for (const [k, v] of Object.entries(SCENARIOS)) {
    if (k.toLowerCase() === String(keyOrName).toLowerCase()) return v;
  }
  return SCENARIOS['Verra VCS']; // fallback
}

// ── GENERATION & EMISSIONS ─────────────────────────────────────

function generation(year) {
  const deg = Math.pow(1 - PROJECT.annual_degradation, year - 1);
  return PROJECT.capacity_mwp_dc * PROJECT.capacity_factor * PROJECT.hours_per_year * deg;
}

function avoidedEmissions(year) {
  return generation(year) * ASSUMPTIONS.grid_emission_factor;
}

// ── SCENARIO RUNNER ────────────────────────────────────────────

function runCarbon(scenarioKey) {
  const s = resolveScenario(scenarioKey);
  const years = [];
  let totalCredits = 0, totalGross = 0, totalCosts = 0, totalNet = 0;

  for (let y = 1; y <= PROJECT.concession_years; y++) {
    const gen = generation(y);
    const credits = avoidedEmissions(y);
    const price = s.base_price * Math.pow(1 + s.escalation, y - 1);
    const grossRevenue = credits * price;
    const costs = grossRevenue * s.verification_cost_pct + s.annual_monitoring +
      (y === 1 ? s.registration_cost : 0);
    const netRevenue = grossRevenue - costs;

    totalCredits += credits;
    totalGross += grossRevenue;
    totalCosts += costs;
    totalNet += netRevenue;

    years.push({ year: y, generation: gen, credits, price, grossRevenue, costs, netRevenue });
  }

  return { scenario: s, years, totalCredits, totalGross, totalCosts, totalNet };
}

// ── FORWARD SALE ANALYSIS ──────────────────────────────────────

function forwardSale(scenarioKey, forwardYears = 5, discountRate = 0.10) {
  const s = resolveScenario(scenarioKey);
  let totalDiscounted = 0;
  let totalUndiscounted = 0;
  const vintages = [];

  for (let y = 1; y <= forwardYears; y++) {
    const credits = avoidedEmissions(y);
    const spotPrice = s.base_price * Math.pow(1 + s.escalation, y - 1);
    const grossRevenue = credits * spotPrice;
    const costs = grossRevenue * s.verification_cost_pct + s.annual_monitoring;
    const netRevenue = grossRevenue - costs;
    const forwardPrice = spotPrice / Math.pow(1 + discountRate, y);
    const forwardRevenue = credits * forwardPrice;
    totalUndiscounted += netRevenue;
    totalDiscounted += netRevenue / Math.pow(1 + discountRate, y);
    vintages.push({
      year: y, credits, spotPrice, forwardPrice, forwardRevenue,
      discountRate: 1 - (forwardPrice / spotPrice),
    });
  }

  return {
    scenario: s.name,
    forwardYears,
    discountRate,
    vintages,
    totalUndiscounted,
    totalDiscounted,
    totalForwardValue: totalDiscounted,
    discount: totalUndiscounted - totalDiscounted,
  };
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(2); }

function printScenario(result) {
  const W = 110;
  console.log('\n' + '═'.repeat(W));
  console.log(`  ${result.scenario.name} — Carbon Credit Revenue`);
  console.log(`  Base: $${result.scenario.base_price}/tCO₂ | Escalation: ${(result.scenario.escalation * 100).toFixed(0)}%/yr`);
  console.log('═'.repeat(W));

  console.log('Yr | Gen GWh  | Credits tCO₂ | Price $/t | Gross $M   | Costs $M   | Net $M');
  console.log('─'.repeat(W));

  // Print selected years
  const printYears = [1, 2, 3, 4, 5, 10, 15, 20, 25];
  for (const r of result.years.filter(r => printYears.includes(r.year))) {
    console.log(
      `${String(r.year).padStart(2)} ` +
      `| ${(r.generation / 1000).toFixed(1).padStart(7)} ` +
      `| ${r.credits.toFixed(0).padStart(12)} ` +
      `| $${r.price.toFixed(2).padStart(8)} ` +
      `| $${fmt(r.grossRevenue).padStart(9)} ` +
      `| $${fmt(r.costs).padStart(9)} ` +
      `| $${fmt(r.netRevenue).padStart(7)}`
    );
  }

  console.log('─'.repeat(W));
  console.log(`  25-Yr Total: ${result.totalCredits.toFixed(0).toLocaleString()} tCO₂ | Gross $${fmt(result.totalGross)}M | Costs $${fmt(result.totalCosts)}M | Net $${fmt(result.totalNet)}M`);
}

function main() {
  console.log('═'.repeat(80));
  console.log('  SUNFARM PV — CARBON CREDIT ENGINE');
  console.log(`  ${PROJECT.capacity_mwp_dc} MWp | Grid EF: ${ASSUMPTIONS.grid_emission_factor} tCO₂/MWh`);
  console.log('═'.repeat(80));

  for (const key of Object.keys(SCENARIOS)) {
    printScenario(runCarbon(key));
  }

  // Forward sale analysis
  console.log('\n\n' + '═'.repeat(80));
  console.log('  FORWARD SALE ANALYSIS (5-Year Strip, 10% Discount)');
  console.log('═'.repeat(80));
  console.log('  Scenario                  | Undiscounted $M | Discounted $M | Haircut $M');
  console.log('  ' + '─'.repeat(75));

  for (const key of Object.keys(SCENARIOS)) {
    const fs = forwardSale(key);
    console.log(
      `  ${fs.scenario.padEnd(27)} ` +
      `| $${fmt(fs.totalUndiscounted).padStart(14)} ` +
      `| $${fmt(fs.totalForwardValue).padStart(12)} ` +
      `| $${fmt(fs.discount).padStart(9)}`
    );
  }

  // Comparison table
  console.log('\n\n' + '═'.repeat(80));
  console.log('  SCENARIO COMPARISON — 25-YEAR NET REVENUE');
  console.log('═'.repeat(80));
  for (const key of Object.keys(SCENARIOS)) {
    const r = runCarbon(key);
    console.log(`  ${r.scenario.name.padEnd(25)} $${fmt(r.totalNet).padStart(8)}M`);
  }
  console.log('═'.repeat(80));

  console.log('\n  RECOMMENDATIONS:');
  console.log('  1. Register Verra VCS during pre-construction (lowest barrier)');
  console.log('  2. Pursue Gold Standard for premium pricing (+67% vs VCS)');
  console.log('  3. Sell 3-5 year forward vintages to de-risk early revenue');
  console.log('  4. Bundle credits with PPA for higher combined pricing');
  console.log('  5. Track DR compliance market development for upside');
}

module.exports = { runCarbon, forwardSale, SCENARIOS, avoidedEmissions, generation };

if (require.main === module) main();
