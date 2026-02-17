/**
 * SUNFARM PV — LAND MONETIZATION MODEL
 * ─────────────────────────────────────
 * LandCo asset: 440 hectares, Parcela 59.
 *
 * Revenue streams:
 *   1. Highway Frontage Sales (immediate liquidity)
 *   2. Agricultural Leasing (10-year cash flow)
 *   3. Expansion Phase Valuation
 *   4. Lease-to-Energy SPV
 *
 * Outputs: Immediate liquidity, 10-year lease CF, IRR from land-only.
 */

'use strict';

const { PROJECT } = require('../config/project');

const LAND = {
  total_ha: PROJECT.land.total_area_ha,
  total_m2: PROJECT.land.total_area_m2,
  concession_ha: PROJECT.land.concession_area_ha,
  excess_ha: PROJECT.land.total_area_ha - PROJECT.land.concession_area_ha,

  // Zone breakdown from appraisal
  zones: PROJECT.land.zones,

  // Monetization parameters
  frontage: {
    total_m2: 267_675,
    sellable_pct: 0.40,        // keep 60% for project access
    price_per_m2_usd: 90,     // highway frontage commercial value
    escalation: 0.05,
    sales_schedule: [0.30, 0.30, 0.20, 0.20], // % sold per year
  },

  ag_lease: {
    leasable_ha: 200,          // non-concession, non-frontage
    rate_per_ha_yr: 400,       // USD/ha/yr
    escalation: 0.03,
    term_years: 10,
  },

  energy_lease: {
    area_ha: 161,              // concession area leased to Energy SPV
    rate_per_ha_yr: 1200,      // USD/ha/yr
    escalation: 0.02,
    term_years: 25,
  },

  expansion: {
    area_ha: 80,               // reserved for Phase 2
    value_per_ha_current: 20_000,
    appreciation: 0.08,        // annual appreciation if solar proven
    realization_year: 8,
  },
};

// ── FRONTAGE SALES ─────────────────────────────────────────────

function frontageRevenue() {
  const sellable = LAND.frontage.total_m2 * LAND.frontage.sellable_pct;
  const rows = [];
  let totalRevenue = 0;
  let remainingM2 = sellable;

  for (let i = 0; i < LAND.frontage.sales_schedule.length; i++) {
    const year = i + 1;
    const pct = LAND.frontage.sales_schedule[i];
    const m2 = sellable * pct;
    const price = LAND.frontage.price_per_m2_usd * Math.pow(1 + LAND.frontage.escalation, i);
    const revenue = m2 * price;
    remainingM2 -= m2;
    totalRevenue += revenue;
    rows.push({ year, m2_sold: m2, price_per_m2: price, revenue, remaining_m2: remainingM2 });
  }

  return {
    rows, totalRevenue, totalM2Sold: sellable, avgPricePerM2: totalRevenue / sellable,
    // Dashboard aliases
    total: totalRevenue,
    sellable: sellable,
  };
}

// ── AG LEASE ───────────────────────────────────────────────────

function agLeaseRevenue() {
  const rows = [];
  let totalRevenue = 0;

  for (let y = 1; y <= LAND.ag_lease.term_years; y++) {
    const rate = LAND.ag_lease.rate_per_ha_yr * Math.pow(1 + LAND.ag_lease.escalation, y - 1);
    const revenue = LAND.ag_lease.leasable_ha * rate;
    totalRevenue += revenue;
    rows.push({ year: y, ha: LAND.ag_lease.leasable_ha, rate, revenue });
  }

  // Dashboard: annual = year 1 revenue, total25yr = full term total
  const annual = LAND.ag_lease.leasable_ha * LAND.ag_lease.rate_per_ha_yr;

  return { rows, totalRevenue, annual, total25yr: totalRevenue };
}

// ── ENERGY LEASE ───────────────────────────────────────────────

function energyLeaseRevenue() {
  const rows = [];
  let totalRevenue = 0;

  for (let y = 1; y <= LAND.energy_lease.term_years; y++) {
    const rate = LAND.energy_lease.rate_per_ha_yr * Math.pow(1 + LAND.energy_lease.escalation, y - 1);
    const revenue = LAND.energy_lease.area_ha * rate;
    totalRevenue += revenue;
    rows.push({ year: y, ha: LAND.energy_lease.area_ha, rate, revenue });
  }

  const annual = LAND.energy_lease.area_ha * LAND.energy_lease.rate_per_ha_yr;

  return { rows, totalRevenue, annual, total25yr: totalRevenue };
}

// ── EXPANSION VALUE ────────────────────────────────────────────

function expansionValue() {
  const currentValue = LAND.expansion.area_ha * LAND.expansion.value_per_ha_current;
  const futureValue = currentValue * Math.pow(1 + LAND.expansion.appreciation, LAND.expansion.realization_year);
  return {
    currentValue, futureValue, gain: futureValue - currentValue,
    year: LAND.expansion.realization_year,
    value25yr: futureValue,
  };
}

// ── LAND IRR ───────────────────────────────────────────────────

function landOnlyIRR() {
  // Initial investment = appraised value
  const investment = PROJECT.land.appraisal_total_usd;
  const flows = [-investment];
  const frontage = frontageRevenue();
  const agLease = agLeaseRevenue();
  const eLease = energyLeaseRevenue();
  const expansion = expansionValue();

  for (let y = 1; y <= 25; y++) {
    let cf = 0;
    // Frontage sales
    const fRow = frontage.rows.find(r => r.year === y);
    if (fRow) cf += fRow.revenue;
    // Ag lease
    const aRow = agLease.rows.find(r => r.year === y);
    if (aRow) cf += aRow.revenue;
    // Energy lease
    const eRow = eLease.rows.find(r => r.year === y);
    if (eRow) cf += eRow.revenue;
    // Expansion sale
    if (y === expansion.year) cf += expansion.futureValue;
    flows.push(cf);
  }

  // Newton-Raphson IRR
  let rate = 0.05;
  for (let iter = 0; iter < 1000; iter++) {
    let f = 0, df = 0;
    for (let i = 0; i < flows.length; i++) {
      f += flows[i] / Math.pow(1 + rate, i);
      df -= i * flows[i] / Math.pow(1 + rate, i + 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-8) { rate = next; break; }
    rate = next;
  }

  return { irr: rate, flows };
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(2); }
function fmtK(n) { return (n / 1000).toFixed(0); }

function main() {
  console.log('═'.repeat(90));
  console.log('  SUNFARM PV — LAND MONETIZATION MODEL (LandCo)');
  console.log(`  Total: ${LAND.total_ha} ha | Concession: ${LAND.concession_ha} ha | Excess: ${LAND.excess_ha.toFixed(0)} ha`);
  console.log('═'.repeat(90));

  // 1. Frontage Sales
  const frontage = frontageRevenue();
  console.log('\n  1. HIGHWAY FRONTAGE SALES');
  console.log('  ' + '─'.repeat(60));
  console.log('  Year | m² Sold    | Price $/m² | Revenue $M  | Remaining m²');
  console.log('  ' + '─'.repeat(60));
  for (const r of frontage.rows) {
    console.log(
      `  ${String(r.year).padStart(4)} ` +
      `| ${r.m2_sold.toFixed(0).padStart(10)} ` +
      `| $${r.price_per_m2.toFixed(2).padStart(9)} ` +
      `| $${fmt(r.revenue).padStart(10)} ` +
      `| ${r.remaining_m2.toFixed(0).padStart(12)}`
    );
  }
  console.log(`\n  Total Frontage Revenue: $${fmt(frontage.totalRevenue)}M`);
  console.log(`  Avg Price/m²: $${frontage.avgPricePerM2.toFixed(2)}`);

  // 2. Ag Lease
  const agLease = agLeaseRevenue();
  console.log('\n  2. AGRICULTURAL LEASING (10-Year)');
  console.log('  ' + '─'.repeat(50));
  console.log('  Year | Hectares | Rate $/ha | Revenue $K');
  console.log('  ' + '─'.repeat(50));
  for (const r of agLease.rows) {
    console.log(
      `  ${String(r.year).padStart(4)} ` +
      `| ${String(r.ha).padStart(8)} ` +
      `| $${r.rate.toFixed(2).padStart(8)} ` +
      `| $${fmtK(r.revenue).padStart(7)}K`
    );
  }
  console.log(`\n  Total Ag Lease Revenue: $${fmt(agLease.totalRevenue)}M`);

  // 3. Energy Lease
  const eLease = energyLeaseRevenue();
  console.log('\n  3. ENERGY SPV LEASE (25-Year)');
  console.log(`  ${LAND.energy_lease.area_ha} ha @ $${LAND.energy_lease.rate_per_ha_yr}/ha/yr + ${(LAND.energy_lease.escalation * 100).toFixed(0)}% escalation`);
  console.log(`  Total Energy Lease Revenue: $${fmt(eLease.totalRevenue)}M`);

  // 4. Expansion
  const expansion = expansionValue();
  console.log('\n  4. EXPANSION PHASE VALUATION');
  console.log('  ' + '─'.repeat(50));
  console.log(`  Reserved Area:      ${LAND.expansion.area_ha} ha`);
  console.log(`  Current Value:      $${fmt(expansion.currentValue)}M`);
  console.log(`  Year ${expansion.year} Value:    $${fmt(expansion.futureValue)}M`);
  console.log(`  Appreciation Gain:  $${fmt(expansion.gain)}M`);

  // 5. Total Summary
  const totalLandRevenue = frontage.totalRevenue + agLease.totalRevenue + eLease.totalRevenue + expansion.futureValue;
  const landIRR = landOnlyIRR();

  console.log('\n' + '═'.repeat(90));
  console.log('  LANDCO SUMMARY');
  console.log('═'.repeat(90));
  console.log(`  Appraised Value:         $${fmt(PROJECT.land.appraisal_total_usd)}M`);
  console.log(`  Frontage Sales:          $${fmt(frontage.totalRevenue)}M`);
  console.log(`  Ag Lease (10yr):         $${fmt(agLease.totalRevenue)}M`);
  console.log(`  Energy Lease (25yr):     $${fmt(eLease.totalRevenue)}M`);
  console.log(`  Expansion (Yr ${expansion.year}):       $${fmt(expansion.futureValue)}M`);
  console.log(`  ──────────────────────────────────`);
  console.log(`  Total Land Revenue:      $${fmt(totalLandRevenue)}M`);
  console.log(`  Land-Only IRR:           ${(landIRR.irr * 100).toFixed(2)}%`);
  console.log('═'.repeat(90));
}

module.exports = { frontageRevenue, agLeaseRevenue, energyLeaseRevenue, expansionValue, landOnlyIRR, LAND };

// Dashboard-compatible camelCase aliases on LAND
LAND.totalHa = LAND.total_ha;
LAND.solarHa = LAND.energy_lease.area_ha;
LAND.agHa = LAND.ag_lease.leasable_ha;
LAND.frontageMeters = Math.round(LAND.frontage.total_m2 / 20); // approx meters of frontage
LAND.expansionHa = LAND.expansion.area_ha;
LAND.energyLeasePerHa = LAND.energy_lease.rate_per_ha_yr;
LAND.agLeasePerHa = LAND.ag_lease.rate_per_ha_yr;
LAND.frontagePerM2 = LAND.frontage.price_per_m2_usd;
LAND.expansionAppreciation = LAND.expansion.appreciation;
LAND.agEscalation = LAND.ag_lease.escalation;
LAND.energyLeaseEscalation = LAND.energy_lease.escalation;
LAND.expansionBasePerHa = LAND.expansion.value_per_ha_current;

if (require.main === module) main();
