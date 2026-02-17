/* dashboard/routes/token.js — Token Waterfall Simulation page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, barChart, lineChart, table } = require('../components/charts');
const { runWaterfall } = require('../../models/token-waterfall');

function token(req, res) {
  const raise = parseFloat(req.query.raise) || 15000000;
  const result = runWaterfall(raise);
  const years = result.years;
  const labels = years.map(y => 'Y' + y.year);

  const kpis = kpiRow([
    kpiCard('Token Raise', '$' + (raise / 1e6).toFixed(0) + 'M', result.tokenCount.toLocaleString() + ' tokens'),
    kpiCard('Token IRR', (result.tokenIRR * 100).toFixed(1) + '%', 'Internal Rate of Return'),
    kpiCard('Token Multiple', result.tokenMultiple.toFixed(2) + 'x', '25-Year'),
    kpiCard('Token Payback', result.tokenPayback + ' years', 'Simple Payback'),
    kpiCard('Common IRR', (result.commonIRR * 100).toFixed(1) + '%', 'Equity IRR'),
    kpiCard('Common Multiple', result.commonMultiple.toFixed(2) + 'x', '25-Year'),
  ]);

  // Waterfall stacked bar
  const waterfallChart = barChart('waterfall-chart', labels, [
    { label: 'O&M', data: years.map(y => y.omAllocation), backgroundColor: '#95a5a6' },
    { label: 'Debt Service', data: years.map(y => y.debtAllocation), backgroundColor: '#e74c3c' },
    { label: 'Reserve', data: years.map(y => y.reserveAllocation), backgroundColor: '#f39c12' },
    { label: 'Preferred Token', data: years.map(y => y.preferredAllocation), backgroundColor: '#27ae60' },
    { label: 'Common Equity', data: years.map(y => y.commonAllocation), backgroundColor: '#2980b9' },
  ], { title: 'Annual Waterfall Distribution', yLabel: 'USD', stacked: true });

  // Token cumulative returns
  let cumToken = 0;
  const cumTokenData = years.map(y => { cumToken += y.preferredAllocation; return cumToken; });
  const cumChart = lineChart('cum-chart', labels, [
    { label: 'Cumulative Token Distributions', data: cumTokenData, borderColor: '#27ae60', fill: true, backgroundColor: 'rgba(39,174,96,0.1)' },
    { label: 'Token Raise ($' + (raise / 1e6).toFixed(0) + 'M)', data: Array(25).fill(raise), borderColor: '#e74c3c', borderDash: [5,5], pointRadius: 0 },
  ], { title: 'Cumulative Token Return vs. Investment', yLabel: 'USD' });

  // Sensitivity table
  const sensHeaders = ['Token Raise', 'Token Count', 'Token IRR', 'Token Multiple', 'Payback', 'Common IRR'];
  const raises = [5000000, 10000000, 15000000, 20000000];
  const sensRows = raises.map(r => {
    const s = runWaterfall(r);
    const active = r === raise ? ' style="background:#eaf2f8;font-weight:600"' : '';
    return [
      '$' + (r / 1e6).toFixed(0) + 'M',
      s.tokenCount.toLocaleString(),
      (s.tokenIRR * 100).toFixed(1) + '%',
      s.tokenMultiple.toFixed(2) + 'x',
      s.tokenPayback + ' yrs',
      (s.commonIRR * 100).toFixed(1) + '%',
    ];
  });
  const sensTable = table(sensHeaders, sensRows);

  // Stress test table
  const stressHeaders = ['Scenario', 'Token IRR', 'Token Multiple', 'Common IRR', 'Min DSCR'];
  const stressRows = result.stressTests.map(st => [
    st.label,
    (st.tokenIRR * 100).toFixed(1) + '%',
    st.tokenMultiple.toFixed(2) + 'x',
    (st.commonIRR * 100).toFixed(1) + '%',
    st.minDSCR.toFixed(2) + 'x',
  ]);
  const stressTable = table(stressHeaders, stressRows);

  // Raise selector
  const raiseOptions = raises.map(r =>
    `<a href="/token?raise=${r}" style="margin-left:12px;padding:6px 16px;border-radius:4px;text-decoration:none;${r === raise ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text)'}">\$${(r/1e6).toFixed(0)}M</a>`
  ).join('');

  const body = `
    <div class="card" style="margin-bottom:20px">
      <strong>Token Raise Amount:</strong> ${raiseOptions}
    </div>
    ${kpis}
    <div class="card">${waterfallChart}</div>
    <div class="card">${cumChart}</div>
    <div class="card">
      <h3>Token Raise Sensitivity</h3>
      ${sensTable}
    </div>
    <div class="card">
      <h3>Stress Tests (${('$' + (raise / 1e6).toFixed(0) + 'M')} Raise)</h3>
      ${stressTable}
    </div>
    <div class="card">
      <h3>Waterfall Priority</h3>
      <ol style="padding-left:20px;line-height:2.2">
        <li><strong>O&M / Operating Costs</strong> — Fixed + variable operations, insurance, land lease</li>
        <li><strong>Senior Debt Service</strong> — Principal + interest per amortization schedule</li>
        <li><strong>Maintenance Reserve</strong> — 1% of revenue to reserve fund</li>
        <li><strong>Preferred Token Return</strong> — 8% preferred on token principal + 20% NDC participation</li>
        <li><strong>Common Equity</strong> — All residual cash to sponsor equity</li>
      </ol>
    </div>`;

  res.send(layout('Token Waterfall', nav('/token'), body));
}

module.exports = token;
