/* dashboard/routes/cashflow.js — 25-Year Cash Flow page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, lineChart, barChart, table } = require('../components/charts');
const { runScenario } = require('../../models/25-year-cashflow');

function cashflow(req, res) {
  const scenario = req.query.scenario || 'Base';
  const result = runScenario(scenario);
  const years = result.years;

  const labels = years.map(y => 'Y' + y.year);

  const kpis = kpiRow([
    kpiCard('Levered IRR', (result.leveredIRR * 100).toFixed(1) + '%', scenario),
    kpiCard('Unlevered IRR', (result.unleveredIRR * 100).toFixed(1) + '%', scenario),
    kpiCard('Equity Multiple', result.equityMultiple.toFixed(2) + 'x', '25-Year'),
    kpiCard('Min DSCR', result.minDSCR.toFixed(2) + 'x', 'Debt Service Coverage'),
    kpiCard('NPV @ 8%', '$' + (result.npv8 / 1e6).toFixed(1) + 'M', ''),
    kpiCard('NPV @ 10%', '$' + (result.npv10 / 1e6).toFixed(1) + 'M', ''),
  ]);

  // Revenue stacked bar
  const revenueChart = barChart('revenue-chart', labels, [
    { label: 'PPA', data: years.map(y => y.ppaRevenue), backgroundColor: '#2980b9' },
    { label: 'BESS', data: years.map(y => y.bessRevenue), backgroundColor: '#27ae60' },
    { label: 'Carbon', data: years.map(y => y.carbonRevenue), backgroundColor: '#8e44ad' },
    { label: 'Agriculture', data: years.map(y => y.agRevenue), backgroundColor: '#f39c12' },
  ], { title: 'Annual Revenue by Stream (' + scenario + ')', yLabel: 'Revenue', stacked: true });

  // EBITDA + FCF line
  const profitChart = lineChart('profit-chart', labels, [
    { label: 'EBITDA', data: years.map(y => y.ebitda), borderColor: '#2980b9', backgroundColor: 'rgba(41,128,185,0.1)', fill: true },
    { label: 'Free Cash Flow', data: years.map(y => y.fcf), borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.1)', fill: true },
    { label: 'Debt Service', data: years.map(y => y.debtService), borderColor: '#e74c3c', borderDash: [5,5] },
  ], { title: 'EBITDA, FCF & Debt Service', yLabel: 'USD' });

  // DSCR line
  const dscrData = years.map(y => y.dscr);
  const dscrChart = `<canvas id="dscr-chart" height="200"></canvas>
<script>
(function() {
  const ctx = document.getElementById('dscr-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ${JSON.stringify(labels)},
      datasets: [
        { label: 'DSCR', data: ${JSON.stringify(dscrData)}, borderColor: '#2980b9', fill: false, tension: 0.3 },
        { label: 'Min Threshold (1.25x)', data: Array(25).fill(1.25), borderColor: '#e74c3c', borderDash: [5,5], fill: false, pointRadius: 0 },
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Debt Service Coverage Ratio', font: { size: 16 } } },
      scales: { y: { title: { display: true, text: 'DSCR' }, min: 0 } }
    }
  });
})();
</script>`;

  // Yearly detail table (first 10 years + last 5)
  const displayYears = [...years.slice(0, 10), ...years.slice(20)];
  const detailHeaders = ['Year', 'Revenue', 'OPEX', 'EBITDA', 'Debt Svc', 'FCF', 'DSCR'];
  const detailRows = displayYears.map(y => [
    y.year,
    '$' + (y.totalRevenue / 1e6).toFixed(2) + 'M',
    '$' + (y.opex / 1e6).toFixed(2) + 'M',
    '$' + (y.ebitda / 1e6).toFixed(2) + 'M',
    '$' + (y.debtService / 1e6).toFixed(2) + 'M',
    '$' + (y.fcf / 1e6).toFixed(2) + 'M',
    y.dscr.toFixed(2) + 'x',
  ]);

  // Scenario selector
  const scenarios = ['Conservative', 'Base', 'Aggressive'];
  const selector = `<div class="card" style="margin-bottom:20px">
    <strong>Select Scenario:</strong>
    ${scenarios.map(s => `<a href="/cashflow?scenario=${s}" style="margin-left:12px;padding:6px 16px;border-radius:4px;text-decoration:none;${s === scenario ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text)'}">${s}</a>`).join('')}
  </div>`;

  const body = `
    ${selector}
    ${kpis}
    <div class="card">${revenueChart}</div>
    <div class="card">${profitChart}</div>
    <div class="card">${dscrChart}</div>
    <div class="card">
      <h3>Yearly Detail (Years 1-10, 21-25) — ${scenario}</h3>
      ${table(detailHeaders, detailRows)}
    </div>`;

  res.send(layout('25-Year Cash Flow', nav('/cashflow'), body));
}

module.exports = cashflow;
