/**
 * SUNFARM PV — BESS REVENUE STACKING ENGINE
 * ──────────────────────────────────────────
 * 25 MW / 100 MWh LFP Battery Energy Storage System
 *
 * Revenue streams:
 *   1. Energy Arbitrage
 *   2. Frequency Regulation (AGC)
 *   3. Capacity Payments
 *   4. Peak Shaving
 *   5. Curtailment Mitigation
 *
 * Scenario toggling. ROI and payback on BESS CAPEX.
 */

'use strict';

const { PROJECT, ASSUMPTIONS } = require('../config/project');

const BESS = {
  power_mw: PROJECT.bess.power_mw,         // 25 MW
  energy_mwh: PROJECT.bess.energy_mwh,      // 100 MWh
  duration_h: PROJECT.bess.duration_hours,   // 4 hours
  efficiency: 0.88,                          // round-trip
  capex_per_kwh: PROJECT.bess.capex_per_kwh, // $/kWh
  get capex() { return this.energy_mwh * 1000 * this.capex_per_kwh; },
  degradation: 0.02,                         // % capacity loss per year
  useful_life: 15,                           // years before augmentation
  augmentation_cost: 0.30,                   // % of original CAPEX at year 15
  om_per_kw_yr: 8,                           // $/kW/yr
};

// ── REVENUE STREAM CALCULATORS ─────────────────────────────────

const STREAMS = {
  arbitrage: {
    name: 'Energy Arbitrage',
    description: 'Buy low / sell high across daily price spread',
    driver: 'Daily price spread × usable capacity',
    base_spread_usd_mwh: 35,             // avg off-peak to on-peak spread
    cycles_per_day: 1.0,
    escalation: 0.02,
    calc(year) {
      const deg = Math.pow(1 - BESS.degradation, year - 1);
      const usable = BESS.energy_mwh * deg * BESS.efficiency;
      const spread = this.base_spread_usd_mwh * Math.pow(1 + this.escalation, year - 1);
      return usable * this.cycles_per_day * 365 * spread;
    },
  },

  frequency: {
    name: 'Frequency Regulation',
    description: 'Automatic Generation Control (AGC) ancillary service',
    driver: 'MW capacity × availability × regulation price',
    price_per_mw_hr: 12,                 // $/MW-hr regulation capacity
    availability_pct: 0.85,
    hours_per_year: 8760,
    escalation: 0.015,
    calc(year) {
      const price = this.price_per_mw_hr * Math.pow(1 + this.escalation, year - 1);
      return BESS.power_mw * price * this.hours_per_year * this.availability_pct;
    },
  },

  capacity: {
    name: 'Capacity Payments',
    description: 'Firm capacity credit from grid operator',
    driver: 'Rated kW × qualifying % × capacity price',
    price_per_kw_yr: 45,                 // $/kW-yr
    qualifying_pct: 0.80,                // BESS qualifies at 80% of rated
    escalation: 0.02,
    calc(year) {
      const price = this.price_per_kw_yr * Math.pow(1 + this.escalation, year - 1);
      return BESS.power_mw * 1000 * this.qualifying_pct * price;
    },
  },

  peak_shaving: {
    name: 'Peak Shaving',
    description: 'Demand charge avoidance for co-located consumers',
    driver: 'Fixed annual savings with escalation',
    annual_savings: 180_000,
    escalation: 0.03,
    calc(year) {
      return this.annual_savings * Math.pow(1 + this.escalation, year - 1);
    },
  },

  curtailment: {
    name: 'Curtailment Mitigation',
    description: 'Capture otherwise-curtailed solar generation',
    driver: 'Curtailed MWh × value × round-trip efficiency',
    curtailed_mwh_yr: 2500,              // estimated annual curtailment
    value_per_mwh: 55,
    escalation: 0.015,
    calc(year) {
      const value = this.value_per_mwh * Math.pow(1 + this.escalation, year - 1);
      return this.curtailed_mwh_yr * value * BESS.efficiency;
    },
  },
};

// ── SCENARIO ENGINE ────────────────────────────────────────────

function runBESSModel(activeStreams = null) {
  // Handle 'all' string or null → all streams
  const streams = (activeStreams === 'all' || activeStreams === null)
    ? Object.keys(STREAMS)
    : Array.isArray(activeStreams) ? activeStreams : Object.keys(STREAMS);

  const numYears = PROJECT.concession_years;
  const years = [];
  let totalRevenue = 0;
  let totalOM = 0;
  const cashFlows = [-BESS.capex];
  let cumCF = -BESS.capex;
  let payback = null;

  for (let y = 1; y <= numYears; y++) {
    const streamRevenues = {};
    let yearRevenue = 0;

    for (const key of streams) {
      const rev = STREAMS[key].calc(y);
      streamRevenues[key] = rev;
      yearRevenue += rev;
    }

    // Augmentation at year 15
    let augCost = 0;
    if (y === BESS.useful_life) {
      augCost = BESS.capex * BESS.augmentation_cost;
    }

    const om = BESS.power_mw * 1000 * BESS.om_per_kw_yr * Math.pow(1 + 0.02, y - 1);
    const netCF = yearRevenue - om - augCost;
    const degradationFactor = Math.pow(1 - BESS.degradation, y - 1);

    cumCF += netCF;
    if (!payback && cumCF > 0) payback = y;
    totalRevenue += yearRevenue;
    totalOM += om;
    cashFlows.push(netCF);

    years.push({
      year: y,
      streams: { ...streamRevenues },
      totalRevenue: yearRevenue,
      degradationFactor,
      om, augCost, netCF, cumCF,
      rev_per_mw: yearRevenue / BESS.power_mw,
      rev_per_mwh: yearRevenue / BESS.energy_mwh,
    });
  }

  // IRR
  let bessIRR;
  try {
    let rate = 0.10;
    for (let iter = 0; iter < 1000; iter++) {
      let f = 0, df = 0;
      for (let i = 0; i < cashFlows.length; i++) {
        f += cashFlows[i] / Math.pow(1 + rate, i);
        df -= i * cashFlows[i] / Math.pow(1 + rate, i + 1);
      }
      const next = rate - f / df;
      if (Math.abs(next - rate) < 1e-8) { rate = next; break; }
      rate = next;
    }
    bessIRR = rate;
  } catch { bessIRR = NaN; }

  return {
    streams,
    years,
    totalRevenue,
    totalRevenue25yr: totalRevenue,
    totalOM,
    capex: BESS.capex,
    roi: (cumCF + BESS.capex) / BESS.capex,
    irr: bessIRR,
    payback,
    paybackYear: payback,
    cashFlows,
  };
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(2); }
function fmtK(n) { return (n / 1000).toFixed(0); }

function printModel(result) {
  const W = 140;
  const streamNames = result.streams.map(k => STREAMS[k].name);

  console.log('\n' + '═'.repeat(W));
  console.log(`  BESS REVENUE — Active: ${streamNames.join(' + ')}`);
  console.log(`  ${BESS.power_mw} MW / ${BESS.energy_mwh} MWh | CAPEX $${fmt(BESS.capex)}M | ${BESS.duration_h}h Duration`);
  console.log('═'.repeat(W));

  // Header
  const cols = result.streams.map(k => STREAMS[k].name.substring(0, 12).padStart(12));
  console.log('Yr | ' + cols.join(' | ') + ' | Total $M   | O&M $M   | Net CF $M  | $/MW    | $/MWh  | Cum $M');
  console.log('─'.repeat(W));

  for (const r of result.years) {
    const vals = result.streams.map(k => `$${fmtK(r.streams[k] || 0).padStart(7)}K`);
    const aug = r.augCost > 0 ? ` [Aug -$${fmt(r.augCost)}M]` : '';
    console.log(
      `${String(r.year).padStart(2)} | ${vals.join(' | ')} ` +
      `| $${fmt(r.totalRevenue).padStart(8)} ` +
      `| $${fmt(r.om).padStart(7)} ` +
      `| $${fmt(r.netCF).padStart(9)} ` +
      `| $${fmtK(r.rev_per_mw).padStart(5)}K ` +
      `| $${fmtK(r.rev_per_mwh).padStart(4)}K ` +
      `| $${fmt(r.cumCF).padStart(7)}${aug}`
    );
  }

  console.log('─'.repeat(W));
  console.log('\n  BESS SUMMARY');
  console.log('  ' + '─'.repeat(50));
  console.log(`  CAPEX:              $${fmt(BESS.capex)}M ($${BESS.capex_per_kwh}/kWh)`);
  console.log(`  25-Year Revenue:    $${fmt(result.totalRevenue)}M`);
  console.log(`  25-Year O&M:        $${fmt(result.totalOM)}M`);
  console.log(`  ROI:                ${(result.roi * 100).toFixed(1)}%`);
  console.log(`  IRR:                ${isNaN(result.irr) ? 'N/A' : (result.irr * 100).toFixed(2) + '%'}`);
  console.log(`  Payback:            Year ${result.payback || 'N/A'}`);
  console.log(`  Avg $/MW:           $${fmtK(result.totalRevenue / 25 / BESS.power_mw)}K/yr`);
  console.log(`  Avg $/MWh:          $${fmtK(result.totalRevenue / 25 / BESS.energy_mwh)}K/yr`);
}

// ── MAIN ───────────────────────────────────────────────────────

function main() {
  console.log('═'.repeat(80));
  console.log('  SUNFARM PV — BESS REVENUE STACKING ENGINE');
  console.log(`  25 MW / 100 MWh | LFP | ${PROJECT.location.municipality}, ${PROJECT.location.country}`);
  console.log('═'.repeat(80));

  // Full stack
  printModel(runBESSModel());

  // Arbitrage + Frequency only
  printModel(runBESSModel(['arbitrage', 'frequency']));

  // Capacity + Peak Shaving only
  printModel(runBESSModel(['capacity', 'peak_shaving']));

  // Solo scenarios table
  console.log('\n\n' + '═'.repeat(80));
  console.log('  PER-STREAM 25-YEAR TOTAL');
  console.log('═'.repeat(80));
  for (const [key, stream] of Object.entries(STREAMS)) {
    let total = 0;
    for (let y = 1; y <= 25; y++) total += stream.calc(y);
    console.log(`  ${stream.name.padEnd(25)} $${fmt(total).padStart(8)}M  (${stream.description})`);
  }
  console.log('═'.repeat(80));
}

module.exports = { runBESSModel, STREAMS, BESS };

// Dashboard-compatible camelCase aliases
BESS.powerMW = BESS.power_mw;
BESS.energyMWh = BESS.energy_mwh;
BESS.costPerKWh = BESS.capex_per_kwh;

if (require.main === module) main();
