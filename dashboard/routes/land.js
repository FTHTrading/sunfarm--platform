/* dashboard/routes/land.js — Land Monetization page */
const { layout } = require('../components/layout');
const { nav } = require('../components/nav');
const { kpiCard, kpiRow, barChart, doughnutChart, table } = require('../components/charts');
const land = require('../../models/land-monetization');

function landPage(req, res) {
  const result = land.runLandModel ? land.runLandModel() : null;

  // Calculate from exported functions
  const frontage = land.frontageRevenue();
  const agLease = land.agLeaseRevenue();
  const energyLease = land.energyLeaseRevenue();
  const expansion = land.expansionValue();
  const landIRRResult = land.landOnlyIRR();
  const landIRR = landIRRResult.irr;
  const LAND = land.LAND;

  const totalAnnual = agLease.annual + energyLease.annual;
  const total25yr = frontage.total + agLease.total25yr + energyLease.total25yr + expansion.value25yr;

  const kpis = kpiRow([
    kpiCard('Total Land', LAND.totalHa + ' ha', '440 hectares'),
    kpiCard('Frontage Revenue', '$' + (frontage.total / 1e6).toFixed(2) + 'M', 'One-time sale'),
    kpiCard('Annual Lease Income', '$' + Math.round(totalAnnual).toLocaleString(), 'Ag + Energy'),
    kpiCard('25-Year Total', '$' + (total25yr / 1e6).toFixed(1) + 'M', 'All streams'),
    kpiCard('Land-Only IRR', (landIRR * 100).toFixed(1) + '%', 'LandCo returns'),
  ]);

  // Revenue breakdown doughnut
  const revLabels = ['Highway Frontage', 'Agricultural Lease', 'Energy SPV Lease', 'Expansion Value'];
  const revData = [frontage.total, agLease.total25yr, energyLease.total25yr, expansion.value25yr];
  const revColors = ['#e67e22', '#27ae60', '#2980b9', '#8e44ad'];
  const revChart = doughnutChart('land-rev', revLabels, revData, revColors, { title: '25-Year Revenue Breakdown' });

  // Land zone breakdown
  const zoneHeaders = ['Zone', 'Hectares', 'Use', 'Revenue Model'];
  const zoneRows = [
    ['Solar Array', LAND.solarHa + ' ha', 'PV Installation', 'Energy SPV lease @ $' + LAND.energyLeasePerHa + '/ha/yr'],
    ['Agricultural', LAND.agHa + ' ha', 'Agrivoltaic / Grazing', 'Ag lease @ $' + LAND.agLeasePerHa + '/ha/yr'],
    ['Highway Frontage', LAND.frontageMeters + ' m', 'Commercial Sale', '40% sellable @ $' + LAND.frontagePerM2 + '/m²'],
    ['Expansion Reserve', LAND.expansionHa + ' ha', 'Future Development', LAND.expansionAppreciation * 100 + '%/yr appreciation'],
  ];
  const zoneTable = table(zoneHeaders, zoneRows);

  // Stream detail
  const detailHeaders = ['Revenue Stream', 'Annual', '25-Year Total', 'Escalation', 'Notes'];
  const detailRows = [
    ['Highway Frontage', 'One-time', '$' + (frontage.total / 1e6).toFixed(2) + 'M', 'N/A', frontage.sellable + ' m² sellable'],
    ['Agricultural Lease', '$' + Math.round(agLease.annual).toLocaleString(), '$' + Math.round(agLease.total25yr).toLocaleString(), (LAND.agEscalation * 100).toFixed(1) + '%/yr', LAND.agHa + ' ha at $' + LAND.agLeasePerHa + '/ha'],
    ['Energy SPV Lease', '$' + Math.round(energyLease.annual).toLocaleString(), '$' + Math.round(energyLease.total25yr).toLocaleString(), (LAND.energyLeaseEscalation * 100).toFixed(1) + '%/yr', LAND.solarHa + ' ha at $' + LAND.energyLeasePerHa + '/ha'],
    ['Expansion Value', 'Appreciation', '$' + (expansion.value25yr / 1e6).toFixed(2) + 'M', (LAND.expansionAppreciation * 100).toFixed(0) + '%/yr', LAND.expansionHa + ' ha from $' + LAND.expansionBasePerHa + '/ha'],
  ];
  const detailTable = table(detailHeaders, detailRows);

  // Ag + Energy lease 25-year projection bar
  const leaseLabels = [];
  const agData = [];
  const energyData = [];
  for (let yr = 1; yr <= 25; yr++) {
    leaseLabels.push('Y' + yr);
    agData.push(LAND.agHa * LAND.agLeasePerHa * Math.pow(1 + LAND.agEscalation, yr - 1));
    energyData.push(LAND.solarHa * LAND.energyLeasePerHa * Math.pow(1 + LAND.energyLeaseEscalation, yr - 1));
  }
  const leaseChart = barChart('lease-chart', leaseLabels, [
    { label: 'Agricultural Lease', data: agData, backgroundColor: '#27ae60' },
    { label: 'Energy SPV Lease', data: energyData, backgroundColor: '#2980b9' },
  ], { title: 'Annual Lease Income (25 Years)', yLabel: 'USD', stacked: true });

  const body = `
    ${kpis}
    <div class="grid-2">
      <div class="card">${revChart}</div>
      <div class="card">
        <h3>Land Zone Breakdown</h3>
        ${zoneTable}
      </div>
    </div>
    <div class="card">${leaseChart}</div>
    <div class="card">
      <h3>Revenue Stream Details</h3>
      ${detailTable}
    </div>
    <div class="card">
      <h3>LandCo Structural Notes</h3>
      <ul style="padding-left:20px;line-height:2.2">
        <li>LandCo holds titled land — <strong>never</strong> transferred to Token SPV</li>
        <li>Energy SPV leases 161 ha at $1,200/ha/yr with 2% annual escalation</li>
        <li>Agricultural lease income flows directly to LandCo</li>
        <li>Highway frontage sale requires HoldCo board approval</li>
        <li>Expansion land reserved for Phase 2 or third-party development</li>
        <li>No encumbrance from token structure on land title</li>
      </ul>
    </div>`;

  res.send(layout('Land Monetization', nav('/land'), body));
}

module.exports = landPage;
