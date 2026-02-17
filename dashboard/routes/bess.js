/* dashboard/routes/bess.js — BESS Revenue page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, barChart, doughnutChart, table } = require('../components/charts');
const { runBESSModel, STREAMS, BESS } = require('../../models/bess-revenue-engine');

function bess(req, res) {
  // Parse active streams from query — default all
  const activeParam = req.query.streams || 'all';
  let activeStreams;
  if (activeParam === 'all') {
    activeStreams = Object.keys(STREAMS);
  } else {
    activeStreams = activeParam.split(',');
  }

  const result = runBESSModel(activeStreams);
  const years = result.years;
  const labels = years.map(y => 'Y' + y.year);

  const kpis = kpiRow([
    kpiCard('BESS Capacity', BESS.powerMW + ' MW / ' + BESS.energyMWh + ' MWh', 'LFP'),
    kpiCard('BESS CAPEX', '$' + (BESS.capex / 1e6).toFixed(1) + 'M', '$' + BESS.costPerKWh + '/kWh'),
    kpiCard('Year 1 Revenue', '$' + (years[0].totalRevenue / 1e6).toFixed(2) + 'M', activeStreams.length + ' streams'),
    kpiCard('25-Year Revenue', '$' + (result.totalRevenue25yr / 1e6).toFixed(1) + 'M', 'Cumulative'),
    kpiCard('ROI', (result.roi * 100).toFixed(0) + '%', 'On BESS CAPEX'),
    kpiCard('Payback', result.paybackYear + ' years', 'Simple'),
  ]);

  // Revenue by stream - Year 1 doughnut
  const yr1 = years[0];
  const streamNames = activeStreams.map(s => STREAMS[s] ? STREAMS[s].name : s);
  const streamRevs = activeStreams.map(s => yr1.streams[s] || 0);
  const streamColors = ['#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#e74c3c'];
  const pieChart = doughnutChart('bess-pie', streamNames, streamRevs, streamColors.slice(0, activeStreams.length), { title: 'Year 1 Revenue by Stream' });

  // Revenue stacked bar by stream
  const datasets = activeStreams.map((s, i) => ({
    label: STREAMS[s] ? STREAMS[s].name : s,
    data: years.map(y => y.streams[s] || 0),
    backgroundColor: streamColors[i % streamColors.length],
  }));
  const stackChart = barChart('bess-stack', labels, datasets, { title: 'BESS Revenue by Stream (25 Years)', yLabel: 'Revenue', stacked: true });

  // Stream detail table
  const detailHeaders = ['Stream', 'Year 1 Revenue', 'Key Driver', 'Escalation'];
  const detailRows = activeStreams.map(s => {
    const st = STREAMS[s];
    if (!st) return [s, 'N/A', 'N/A', 'N/A'];
    return [
      st.name,
      '$' + Math.round(yr1.streams[s]).toLocaleString(),
      st.driver || 'N/A',
      (st.escalation * 100).toFixed(1) + '%/yr',
    ];
  });
  const detailTable = table(detailHeaders, detailRows);

  // Scenario toggles
  const allStreamKeys = Object.keys(STREAMS);
  const toggles = allStreamKeys.map(s => {
    const active = activeStreams.includes(s);
    const newStreams = active
      ? activeStreams.filter(x => x !== s)
      : [...activeStreams, s];
    const param = newStreams.length === allStreamKeys.length ? 'all' : newStreams.join(',');
    return `<a href="/bess?streams=${param}" style="margin-left:8px;padding:6px 14px;border-radius:4px;text-decoration:none;${active ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text)'}">${STREAMS[s].name}</a>`;
  }).join('');

  // Yearly summary (every 5 years)
  const summaryYears = [0, 4, 9, 14, 19, 24].map(i => years[i]).filter(Boolean);
  const sumHeaders = ['Year', 'Total Revenue', 'Degradation', ...activeStreams.map(s => STREAMS[s] ? STREAMS[s].name : s)];
  const sumRows = summaryYears.map(y => [
    y.year,
    '$' + Math.round(y.totalRevenue).toLocaleString(),
    (y.degradationFactor * 100).toFixed(1) + '%',
    ...activeStreams.map(s => '$' + Math.round(y.streams[s] || 0).toLocaleString()),
  ]);
  const sumTable = table(sumHeaders, sumRows);

  const body = `
    <div class="card" style="margin-bottom:20px">
      <strong>Toggle Revenue Streams:</strong> ${toggles}
      <a href="/bess?streams=all" style="margin-left:16px;padding:6px 14px;border-radius:4px;text-decoration:none;background:var(--accent);color:white">All Streams</a>
    </div>
    ${kpis}
    <div class="grid-2">
      <div class="card">${pieChart}</div>
      <div class="card">
        <h3>Stream Details</h3>
        ${detailTable}
      </div>
    </div>
    <div class="card">${stackChart}</div>
    <div class="card">
      <h3>Revenue Summary (Every 5 Years)</h3>
      ${sumTable}
    </div>`;

  res.send(layout('BESS Revenue', nav('/bess'), body));
}

module.exports = bess;
