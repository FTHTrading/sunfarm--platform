/* dashboard/routes/carbon.js — Carbon Revenue page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, barChart, lineChart, table } = require('../components/charts');
const { runCarbon, forwardSale, SCENARIOS } = require('../../models/carbon-credit-engine');

function carbon(req, res) {
  const selected = req.query.market || 'Verra VCS';
  const result = runCarbon(selected);
  const years = result.years;
  const labels = years.map(y => 'Y' + y.year);

  const yr1 = years[0];
  const totalRev = years.reduce((s, y) => s + y.netRevenue, 0);

  const kpis = kpiRow([
    kpiCard('Annual Credits', Math.round(yr1.credits).toLocaleString(), 'tCO₂e (Year 1)'),
    kpiCard('Price / tCO₂', '$' + yr1.price.toFixed(0), selected),
    kpiCard('Year 1 Revenue', '$' + (yr1.grossRevenue / 1e6).toFixed(2) + 'M', 'Gross'),
    kpiCard('Year 1 Net', '$' + (yr1.netRevenue / 1e6).toFixed(2) + 'M', 'After costs'),
    kpiCard('25-Year Total', '$' + (totalRev / 1e6).toFixed(1) + 'M', 'Net Revenue'),
  ]);

  // Revenue by year
  const revenueChart = barChart('carbon-rev', labels, [
    { label: 'Gross Revenue', data: years.map(y => y.grossRevenue), backgroundColor: '#27ae60' },
    { label: 'Costs', data: years.map(y => -y.costs), backgroundColor: '#e74c3c' },
  ], { title: 'Carbon Revenue — ' + selected, yLabel: 'USD' });

  // Multi-market comparison
  const marketNames = Object.keys(SCENARIOS);
  const marketTotals = marketNames.map(m => {
    const r = runCarbon(m);
    return r.years.reduce((s, y) => s + y.netRevenue, 0);
  });
  const compChart = barChart('market-comp', marketNames, [
    { label: '25-Year Net Revenue', data: marketTotals, backgroundColor: ['#27ae60', '#2980b9', '#8e44ad', '#f39c12'] },
  ], { title: 'Market Comparison — 25-Year Net Revenue', yLabel: 'USD' });

  // Market comparison table
  const compHeaders = ['Market', 'Base Price', 'Escalation', 'Year 1 Net', '25-Year Net', 'Avg $/tCO₂'];
  const compRows = marketNames.map(m => {
    const sc = SCENARIOS[m];
    const r = runCarbon(m);
    const total = r.years.reduce((s, y) => s + y.netRevenue, 0);
    const totalCredits = r.years.reduce((s, y) => s + y.credits, 0);
    return [
      m,
      '$' + sc.basePrice.toFixed(0),
      (sc.escalation * 100).toFixed(1) + '%',
      '$' + (r.years[0].netRevenue / 1e6).toFixed(2) + 'M',
      '$' + (total / 1e6).toFixed(1) + 'M',
      '$' + (total / totalCredits).toFixed(2),
    ];
  });
  const compTable = table(compHeaders, compRows);

  // Forward sale analysis
  const fwd = forwardSale(selected);
  const fwdHeaders = ['Vintage', 'Credits', 'Spot Price', 'Forward Price', 'Forward Revenue', 'Discount'];
  const fwdRows = fwd.vintages.map(v => [
    'Year ' + v.year,
    Math.round(v.credits).toLocaleString(),
    '$' + v.spotPrice.toFixed(2),
    '$' + v.forwardPrice.toFixed(2),
    '$' + Math.round(v.forwardRevenue).toLocaleString(),
    (v.discountRate * 100).toFixed(0) + '%',
  ]);
  const fwdTable = table(fwdHeaders, fwdRows);

  // Market selector
  const marketSelector = marketNames.map(m =>
    `<a href="/carbon?market=${encodeURIComponent(m)}" style="margin-left:12px;padding:6px 16px;border-radius:4px;text-decoration:none;${m === selected ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text)'}">${m}</a>`
  ).join('');

  const body = `
    <div class="card" style="margin-bottom:20px">
      <strong>Carbon Market:</strong> ${marketSelector}
    </div>
    ${kpis}
    <div class="card">${revenueChart}</div>
    <div class="card">${compChart}</div>
    <div class="card">
      <h3>Market Comparison</h3>
      ${compTable}
    </div>
    <div class="card">
      <h3>Forward Sale Analysis — ${selected} (5-Year Strip)</h3>
      <p style="margin-bottom:8px;color:var(--text-light)">Total Forward Value: <strong>$${Math.round(fwd.totalForwardValue).toLocaleString()}</strong></p>
      ${fwdTable}
    </div>`;

  res.send(layout('Carbon Revenue', nav('/carbon'), body));
}

module.exports = carbon;
