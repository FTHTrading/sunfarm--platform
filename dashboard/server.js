/* dashboard/server.js — Express server for SunFarm PV Dashboard */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const executive = require('./routes/executive');
const cashflow = require('./routes/cashflow');
const capital = require('./routes/capital');
const token = require('./routes/token');
const carbon = require('./routes/carbon');
const bess = require('./routes/bess');
const land = require('./routes/land');

app.get('/', executive);
app.get('/cashflow', cashflow);
app.get('/capital', capital);
app.get('/token', token);
app.get('/carbon', carbon);
app.get('/bess', bess);
app.get('/land', land);

// API endpoints — raw JSON for each model
app.get('/api/cashflow', (req, res) => {
  const { runScenario } = require('../models/25-year-cashflow');
  const scenario = req.query.scenario || 'Base';
  res.json(runScenario(scenario));
});

app.get('/api/capital', (req, res) => {
  const { runSensitivity } = require('../models/capital-stack-sensitivity');
  res.json(runSensitivity());
});

app.get('/api/token', (req, res) => {
  const { runWaterfall } = require('../models/token-waterfall');
  const raise = parseFloat(req.query.raise) || 15000000;
  res.json(runWaterfall(raise));
});

app.get('/api/bess', (req, res) => {
  const { runBESSModel } = require('../models/bess-revenue-engine');
  const streams = req.query.streams || 'all';
  res.json(runBESSModel(streams === 'all' ? 'all' : streams.split(',')));
});

app.get('/api/carbon', (req, res) => {
  const { runCarbon } = require('../models/carbon-credit-engine');
  const market = req.query.market || 'Verra VCS';
  res.json(runCarbon(market));
});

app.get('/api/land', (req, res) => {
  const land = require('../models/land-monetization');
  res.json({
    frontage: land.frontageRevenue(),
    agLease: land.agLeaseRevenue(),
    energyLease: land.energyLeaseRevenue(),
    expansion: land.expansionValue(),
    landIRR: land.landOnlyIRR(),
  });
});

app.listen(PORT, () => {
  console.log(`\n  ☀️  SunFarm PV Dashboard`);
  console.log(`  ─────────────────────────`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`\n  Pages:`);
  console.log(`    /           Executive Overview`);
  console.log(`    /cashflow   25-Year Cash Flow`);
  console.log(`    /capital    Capital Stack`);
  console.log(`    /token      Token Waterfall`);
  console.log(`    /carbon     Carbon Revenue`);
  console.log(`    /bess       BESS Revenue`);
  console.log(`    /land       Land Monetization`);
  console.log(`\n  API:`);
  console.log(`    /api/cashflow?scenario=Base`);
  console.log(`    /api/capital`);
  console.log(`    /api/token?raise=15000000`);
  console.log(`    /api/bess?streams=all`);
  console.log(`    /api/carbon?market=Verra%20VCS`);
  console.log(`    /api/land`);
  console.log('');
});
