#!/usr/bin/env node
/* scripts/generate-report.js — Runs all models and outputs a consolidated summary report */

const { runScenario } = require('../models/25-year-cashflow');
const { runSensitivity } = require('../models/capital-stack-sensitivity');
const { runWaterfall } = require('../models/token-waterfall');
const { runBESSModel, STREAMS } = require('../models/bess-revenue-engine');
const { runCarbon, SCENARIOS } = require('../models/carbon-credit-engine');
const land = require('../models/land-monetization');
const { PROJECT, ASSUMPTIONS } = require('../config/project');

const sep = '═'.repeat(70);
const line = '─'.repeat(70);

console.log(sep);
console.log('  SUNFARM PV — 50 MW CONSOLIDATED MODEL REPORT');
console.log('  ' + new Date().toISOString().slice(0, 10));
console.log(sep);

// ── 1. Project Parameters ──
console.log('\n1. PROJECT PARAMETERS');
console.log(line);
console.log(`  Capacity:      ${PROJECT.capacity_mw_ac} MW AC / ${PROJECT.capacity_mwp_dc} MWp DC`);
console.log(`  Location:      ${PROJECT.location.municipality}, ${PROJECT.location.country}`);
console.log(`  Land:          ${PROJECT.land.total_area_ha} hectares`);
console.log(`  Concession:    ${PROJECT.regulatory.concession_resolution} (${PROJECT.concession_years} years)`);
console.log(`  CAPEX:         $${(ASSUMPTIONS.capex_usd / 1e6).toFixed(0)}M`);
console.log(`  Entity:        ${PROJECT.entity.name} (RNC ${PROJECT.entity.rnc})`);
console.log(`  BESS:          ${PROJECT.bess.power_mw} MW / ${PROJECT.bess.energy_mwh} MWh LFP`);

// ── 2. Cash Flow Summary ──
console.log('\n2. 25-YEAR CASH FLOW — THREE SCENARIOS');
console.log(line);

['Conservative', 'Base', 'Aggressive'].forEach(scenario => {
  const r = runScenario(scenario);
  const yr1 = r.years[0];
  const totalRev = r.years.reduce((s, y) => s + y.totalRevenue, 0);
  console.log(`\n  ${scenario.toUpperCase()} (${ASSUMPTIONS.scenarios[scenario.toLowerCase()]}x revenue)`);
  console.log(`    Year 1 Revenue:    $${(yr1.totalRevenue / 1e6).toFixed(2)}M`);
  console.log(`    Year 1 EBITDA:     $${(yr1.ebitda / 1e6).toFixed(2)}M`);
  console.log(`    25-Year Revenue:   $${(totalRev / 1e6).toFixed(0)}M`);
  console.log(`    Levered IRR:       ${(r.leveredIRR * 100).toFixed(1)}%`);
  console.log(`    Unlevered IRR:     ${(r.unleveredIRR * 100).toFixed(1)}%`);
  console.log(`    Equity Multiple:   ${r.equityMultiple.toFixed(2)}x`);
  console.log(`    Min DSCR:          ${r.minDSCR.toFixed(2)}x`);
  console.log(`    NPV @ 8%:          $${(r.npv8 / 1e6).toFixed(1)}M`);
  console.log(`    NPV @ 10%:         $${(r.npv10 / 1e6).toFixed(1)}M`);
  console.log(`    Payback:           ${r.paybackYear} years`);
});

// ── 3. Capital Stack Sensitivity ──
console.log('\n\n3. CAPITAL STACK SENSITIVITY');
console.log(line);
const sens = runSensitivity();
Object.entries(sens.optimal).forEach(([scenario, opt]) => {
  if (opt) {
    console.log(`  ${scenario}: Optimal D/E = ${Math.round(opt.debtRatio * 100)}/${Math.round((1 - opt.debtRatio) * 100)} @ ${(opt.interestRate * 100).toFixed(1)}% → IRR ${(opt.leveredIRR * 100).toFixed(1)}%, Min DSCR ${opt.minDSCR.toFixed(2)}x`);
  } else {
    console.log(`  ${scenario}: No structure found with DSCR ≥ 1.25x`);
  }
});
console.log(`  Total combinations tested: ${sens.Base.length * 3}`);

// ── 4. Token Waterfall ──
console.log('\n4. TOKEN WATERFALL');
console.log(line);
[5000000, 10000000, 15000000, 20000000].forEach(raise => {
  const w = runWaterfall(raise);
  console.log(`  $${(raise / 1e6).toFixed(0)}M raise (${w.tokenCount.toLocaleString()} tokens): Token IRR ${(w.tokenIRR * 100).toFixed(1)}%, Multiple ${w.tokenMultiple.toFixed(2)}x, Payback ${w.tokenPayback}yr | Common IRR ${(w.commonIRR * 100).toFixed(1)}%`);
});

console.log('\n  Stress Tests ($15M raise):');
const w15 = runWaterfall(15000000);
w15.stressTests.forEach(st => {
  console.log(`    ${st.label}: Token IRR ${(st.tokenIRR * 100).toFixed(1)}%, DSCR ${st.minDSCR.toFixed(2)}x`);
});

// ── 5. BESS Revenue ──
console.log('\n5. BESS REVENUE ENGINE');
console.log(line);
const bessAll = runBESSModel('all');
console.log(`  Year 1 Revenue:      $${(bessAll.years[0].totalRevenue / 1e6).toFixed(2)}M (all streams)`);
console.log(`  25-Year Revenue:     $${(bessAll.totalRevenue25yr / 1e6).toFixed(1)}M`);
console.log(`  ROI on BESS CAPEX:   ${(bessAll.roi * 100).toFixed(0)}%`);
console.log(`  Payback:             ${bessAll.paybackYear} years`);
console.log('  Stream breakdown (Year 1):');
const yr1bess = bessAll.years[0];
Object.entries(yr1bess.streams).forEach(([key, val]) => {
  const streamName = STREAMS[key] ? STREAMS[key].name : key;
  console.log(`    ${streamName}: $${Math.round(val).toLocaleString()}`);
});

// ── 6. Carbon Credits ──
console.log('\n6. CARBON CREDIT ENGINE');
console.log(line);
Object.keys(SCENARIOS).forEach(market => {
  const c = runCarbon(market);
  const total = c.years.reduce((s, y) => s + y.netRevenue, 0);
  console.log(`  ${market}: Year 1 $${(c.years[0].netRevenue / 1e6).toFixed(2)}M, 25-Year $${(total / 1e6).toFixed(1)}M`);
});

// ── 7. Land Monetization ──
console.log('\n7. LAND MONETIZATION');
console.log(line);
const frontage = land.frontageRevenue();
const ag = land.agLeaseRevenue();
const energy = land.energyLeaseRevenue();
const expansion = land.expansionValue();
const landIRR = land.landOnlyIRR();
console.log(`  Highway Frontage:    $${(frontage.total / 1e6).toFixed(2)}M (one-time)`);
console.log(`  Ag Lease (${land.LAND.ag_lease.term_years}yr):     $${Math.round(ag.total25yr).toLocaleString()}`);
console.log(`  Energy Lease (25yr): $${Math.round(energy.total25yr).toLocaleString()}`);
console.log(`  Expansion Value:     $${(expansion.value25yr / 1e6).toFixed(2)}M`);
console.log(`  Land-Only IRR:       ${(landIRR.irr * 100).toFixed(1)}%`);

console.log('\n' + sep);
console.log('  REPORT COMPLETE — All models deterministic, all assumptions in config/project.js');
console.log(sep + '\n');
