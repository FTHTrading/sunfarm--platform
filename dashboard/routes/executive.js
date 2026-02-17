/* dashboard/routes/executive.js — Executive Overview page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, doughnutChart, table, barChart } = require('../components/charts');
const { runScenario } = require('../../models/25-year-cashflow');
const { runBESSModel } = require('../../models/bess-revenue-engine');
const { runCarbon } = require('../../models/carbon-credit-engine');

function executive(req, res) {
  const base = runScenario('Base');
  const cons = runScenario('Conservative');
  const agg = runScenario('Aggressive');
  const bess = runBESSModel('all');
  const carbon = runCarbon('Verra VCS');

  const yr1 = base.years[0];
  const totalPPA = base.years.reduce((s, y) => s + y.ppaRevenue, 0);
  const totalRev = base.years.reduce((s, y) => s + y.totalRevenue, 0);

  const kpis = kpiRow([
    kpiCard('Levered IRR', (base.leveredIRR * 100).toFixed(1) + '%', 'Base Case'),
    kpiCard('Equity Multiple', base.equityMultiple.toFixed(2) + 'x', '25-Year'),
    kpiCard('DSCR (Min)', base.minDSCR.toFixed(2) + 'x', 'Debt Service Coverage'),
    kpiCard('NPV @ 8%', '$' + (base.npv8 / 1e6).toFixed(1) + 'M', 'Net Present Value'),
    kpiCard('Payback', base.paybackYear + ' years', 'Simple Payback'),
    kpiCard('Total Revenue', '$' + (totalRev / 1e6).toFixed(0) + 'M', '25-Year Cumulative'),
  ]);

  // Revenue breakdown doughnut
  const revLabels = ['PPA', 'BESS', 'Carbon', 'Agriculture'];
  const revData = [yr1.ppaRevenue, yr1.bessRevenue, yr1.carbonRevenue, yr1.agRevenue];
  const revColors = ['#2980b9', '#27ae60', '#8e44ad', '#f39c12'];
  const revChart = doughnutChart('rev-breakdown', revLabels, revData, revColors, { title: 'Year 1 Revenue Breakdown' });

  // Scenario comparison
  const scenarioHeaders = ['Metric', 'Conservative', 'Base', 'Aggressive'];
  const scenarioRows = [
    ['Levered IRR', (cons.leveredIRR * 100).toFixed(1) + '%', (base.leveredIRR * 100).toFixed(1) + '%', (agg.leveredIRR * 100).toFixed(1) + '%'],
    ['Unlevered IRR', (cons.unleveredIRR * 100).toFixed(1) + '%', (base.unleveredIRR * 100).toFixed(1) + '%', (agg.unleveredIRR * 100).toFixed(1) + '%'],
    ['Equity Multiple', cons.equityMultiple.toFixed(2) + 'x', base.equityMultiple.toFixed(2) + 'x', agg.equityMultiple.toFixed(2) + 'x'],
    ['Min DSCR', cons.minDSCR.toFixed(2) + 'x', base.minDSCR.toFixed(2) + 'x', agg.minDSCR.toFixed(2) + 'x'],
    ['NPV @ 8%', '$' + (cons.npv8 / 1e6).toFixed(1) + 'M', '$' + (base.npv8 / 1e6).toFixed(1) + 'M', '$' + (agg.npv8 / 1e6).toFixed(1) + 'M'],
    ['Payback', cons.paybackYear + ' yrs', base.paybackYear + ' yrs', agg.paybackYear + ' yrs'],
  ];
  const scenarioTable = table(scenarioHeaders, scenarioRows);

  // CAPEX allocation doughnut
  const capexLabels = ['Solar Array', 'BESS', 'BOS & Grid', 'Land & Dev', 'Contingency'];
  const capexData = [30000000, 12500000, 5500000, 4250000, 2750000];
  const capexColors = ['#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#95a5a6'];
  const capexChart = doughnutChart('capex-breakdown', capexLabels, capexData, capexColors, { title: 'CAPEX Allocation ($55M)' });

  // Regulatory status
  const regHeaders = ['Approval', 'Status', 'Reference'];
  const regRows = [
    ['CNE Concession', '<span class="badge badge-success">✅ Definitive</span>', 'CNE-CP-0012-2020'],
    ['Land Title', '<span class="badge badge-success">✅ Certified</span>', 'No Superposición'],
    ['ETED Grid Access', '<span class="badge badge-success">✅ Approved</span>', 'Feb 2024'],
    ['Environmental License', '<span class="badge badge-success">✅ Granted</span>', '0379-20'],
    ['SIE Registration', '<span class="badge badge-success">✅ Active</span>', 'SIE-EP-0045'],
    ['BESS Mandate', '<span class="badge badge-warning">⚡ Required</span>', 'Decreto 517-25'],
  ];
  const regTable = table(regHeaders, regRows);

  const body = `
    ${kpis}
    <div class="grid-2">
      <div class="card">${revChart}</div>
      <div class="card">${capexChart}</div>
    </div>
    <div class="card">
      <h3>Scenario Comparison</h3>
      ${scenarioTable}
    </div>
    <div class="card">
      <h3>Regulatory Status</h3>
      ${regTable}
    </div>
    <div class="card">
      <h3>Project Highlights</h3>
      <ul style="padding-left:20px;line-height:2">
        <li><strong>50 MW AC / 59.69 MWp DC</strong> — Bifacial 760W modules on 440 ha</li>
        <li><strong>25 MW / 100 MWh BESS</strong> — LFP chemistry, 5 revenue streams</li>
        <li><strong>25-year definitive concession</strong> — CNE-CP-0012-2020</li>
        <li><strong>4+ revenue streams</strong> — PPA, BESS, Carbon, Agriculture</li>
        <li><strong>Ley 57-07 tax exemption</strong> — 10-year income tax holiday</li>
        <li><strong>Tokenization ready</strong> — Reg D 506(c), revenue participation model</li>
      </ul>
    </div>`;

  res.send(layout('Executive Overview', nav('/'), body));
}

module.exports = executive;
