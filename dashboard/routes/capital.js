/* dashboard/routes/capital.js — Capital Stack page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, doughnutChart, table } = require('../components/charts');
const { runSensitivity, DEBT_RATIOS, INTEREST_RATES } = require('../../models/capital-stack-sensitivity');
const { PROJECT, ASSUMPTIONS } = require('../../config/project');

function capital(req, res) {
  const results = runSensitivity();

  // Current structure KPIs
  const baseline = results.Base.find(r => r.debtRatio === 0.60 && r.interestRate === 0.065);

  const kpis = kpiRow([
    kpiCard('Total CAPEX', '$' + (ASSUMPTIONS.capex_usd / 1e6).toFixed(0) + 'M', ''),
    kpiCard('Baseline D/E', '60 / 40', 'Debt / Equity'),
    kpiCard('Baseline Rate', '6.5%', 'Senior Debt'),
    kpiCard('Baseline IRR', baseline ? (baseline.leveredIRR * 100).toFixed(1) + '%' : 'N/A', 'Levered'),
    kpiCard('Baseline DSCR', baseline ? baseline.minDSCR.toFixed(2) + 'x' : 'N/A', 'Minimum'),
  ]);

  // Capital stack doughnut
  const stackLabels = ['Senior Debt (60%)', 'Sponsor Equity (13%)', 'Token Raise (27%)'];
  const stackData = [33000000, 7000000, 15000000];
  const stackColors = ['#2980b9', '#e67e22', '#27ae60'];
  const stackChart = doughnutChart('stack-chart', stackLabels, stackData, stackColors, { title: 'Capital Stack ($55M)' });

  // CAPEX allocation doughnut
  const capexLabels = ['Solar Array', 'BESS (25MW/100MWh)', 'BOS & Grid', 'Land & Development', 'Contingency'];
  const capexData = [30000000, 12500000, 5500000, 4250000, 2750000];
  const capexColors = ['#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#95a5a6'];
  const capexChart = doughnutChart('capex-chart', capexLabels, capexData, capexColors, { title: 'CAPEX Allocation' });

  // Sensitivity matrix for Base case
  const baseResults = results.Base;
  const matrixHeaders = ['D/E Ratio', ...INTEREST_RATES.map(r => (r * 100).toFixed(1) + '%')];
  const matrixRows = DEBT_RATIOS.map(dr => {
    const label = Math.round(dr * 100) + '/' + Math.round((1 - dr) * 100);
    const cells = INTEREST_RATES.map(ir => {
      const r = baseResults.find(x => x.debtRatio === dr && x.interestRate === ir);
      if (!r) return 'N/A';
      const dscr = r.minDSCR;
      const badge = dscr >= 1.25 ? 'badge-success' : dscr >= 1.20 ? 'badge-warning' : 'badge-danger';
      return `<span class="badge ${badge}">${(r.leveredIRR * 100).toFixed(1)}% / ${dscr.toFixed(2)}x</span>`;
    });
    return [label, ...cells];
  });
  const matrixTable = table(matrixHeaders, matrixRows);

  // Optimal structure
  const optimal = results.optimal;
  const optHeaders = ['Scenario', 'Optimal D/E', 'Rate', 'IRR', 'Min DSCR'];
  const optRows = Object.entries(optimal).map(([scenario, o]) => [
    scenario,
    o ? Math.round(o.debtRatio * 100) + '/' + Math.round((1 - o.debtRatio) * 100) : 'N/A',
    o ? (o.interestRate * 100).toFixed(1) + '%' : 'N/A',
    o ? (o.leveredIRR * 100).toFixed(1) + '%' : 'N/A',
    o ? o.minDSCR.toFixed(2) + 'x' : 'N/A',
  ]);
  const optTable = table(optHeaders, optRows);

  // Waterfall priority
  const waterfallHeaders = ['Priority', 'Recipient', 'Description'];
  const waterfallRows = [
    ['1', 'O&M / Operating Costs', 'Fixed + variable O&M, insurance, land lease'],
    ['2', 'Senior Debt Service', 'Principal + interest, 18-year amortization'],
    ['3', 'Maintenance Reserve', '1% of revenue to reserve fund'],
    ['4', 'Preferred Token Return', '8% preferred on $15M token raise'],
    ['5', 'Common Equity', 'Residual cash to sponsor equity'],
  ];
  const waterfallTable = table(waterfallHeaders, waterfallRows);

  const body = `
    ${kpis}
    <div class="grid-2">
      <div class="card">${stackChart}</div>
      <div class="card">${capexChart}</div>
    </div>
    <div class="card">
      <h3>Sensitivity Matrix — Base Case (IRR / Min DSCR)</h3>
      <p style="margin-bottom:12px;color:var(--text-light)">
        <span class="badge badge-success">DSCR ≥ 1.25x</span>
        <span class="badge badge-warning">1.20x ≤ DSCR < 1.25x</span>
        <span class="badge badge-danger">DSCR < 1.20x</span>
      </p>
      ${matrixTable}
    </div>
    <div class="card">
      <h3>Optimal Structure by Scenario</h3>
      <p style="margin-bottom:12px;color:var(--text-light)">Maximum IRR where minimum DSCR ≥ 1.25x</p>
      ${optTable}
    </div>
    <div class="card">
      <h3>Waterfall Priority</h3>
      ${waterfallTable}
    </div>`;

  res.send(layout('Capital Stack', nav('/capital'), body));
}

module.exports = capital;
