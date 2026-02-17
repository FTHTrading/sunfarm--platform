/**
 * SUNFARM PV — TOKEN WATERFALL ENGINE
 * ────────────────────────────────────
 * Pure-math waterfall: O&M → Debt → Reserve → Preferred Token → Common Equity
 * Stress-tests under 10% revenue decline.
 */

'use strict';

const { PROJECT, ASSUMPTIONS, TOKEN_DEFAULTS } = require('../config/project');
const { generation, ppaRevenue, carbonRevenue, bessRevenue, agRevenue, opex, debtService } =
  require('./25-year-cashflow');

// ── WATERFALL LOGIC ────────────────────────────────────────────

/**
 * @param {number|Object} optsOrRaise — Raise amount (number) or options object
 */
function runWaterfall(optsOrRaise = {}) {
  // Accept plain number (raise amount) or options object
  const opts = typeof optsOrRaise === 'number' ? { raise: optsOrRaise } : optsOrRaise;

  const raise = opts.raise || TOKEN_DEFAULTS.raise_amount;
  const prefReturn = opts.preferredReturn || TOKEN_DEFAULTS.preferred_return;
  const revPart = opts.revenueParticipation || TOKEN_DEFAULTS.revenue_participation;
  const reserveMonths = opts.reserveMonths || TOKEN_DEFAULTS.operating_reserve_months;
  const revenueMultiplier = opts.revenueMultiplier || 1.0;

  const ds = debtService();
  const equity = ASSUMPTIONS.capex_usd * ASSUMPTIONS.equity_ratio;
  const tokenEquity = raise;
  const commonEquity = equity - tokenEquity;
  const tokenCount = Math.round(raise / TOKEN_DEFAULTS.token_price);

  const years = [];
  let reserveBalance = 0;
  let cumTokenDist = 0;
  let cumCommonDist = 0;
  const tokenFlows = [-tokenEquity];
  const commonFlows = [-commonEquity];
  let tokenPayback = null;

  for (let y = 1; y <= PROJECT.concession_years; y++) {
    const rev = (ppaRevenue(y) + carbonRevenue(y) + bessRevenue(y) + agRevenue(y)) * revenueMultiplier;
    const ox = opex(y);
    const debt = y <= ASSUMPTIONS.loan_term_years ? ds : 0;

    // Step 1: Pay O&M
    let remaining = rev - ox;

    // Step 2: Pay debt service
    const debtPaid = Math.min(remaining, debt);
    remaining -= debtPaid;

    // Step 3: Fund operating reserve (target = reserveMonths of OpEx)
    const reserveTarget = (ox / 12) * reserveMonths;
    const reserveNeeded = Math.max(0, reserveTarget - reserveBalance);
    const reserveFund = Math.min(remaining, reserveNeeded);
    reserveBalance += reserveFund;
    remaining -= reserveFund;

    // Net Distributable Cash
    const ndc = remaining;

    // Step 4: Preferred token distribution
    const tokenShare = ndc * revPart;
    const prefMin = tokenEquity * prefReturn;
    const tokenDist = Math.max(tokenShare, Math.min(prefMin, ndc));
    remaining -= tokenDist;
    cumTokenDist += tokenDist;
    tokenFlows.push(tokenDist);

    if (!tokenPayback && cumTokenDist >= tokenEquity) tokenPayback = y;

    // Step 5: Common equity gets the rest
    const commonDist = Math.max(0, remaining);
    cumCommonDist += commonDist;
    commonFlows.push(commonDist);

    years.push({
      year: y, revenue: rev,
      omAllocation: ox, debtAllocation: debtPaid,
      reserveAllocation: reserveFund, reserveBalance,
      ndc, preferredAllocation: tokenDist, commonAllocation: commonDist,
      cumTokenDist, cumCommonDist,
    });
  }

  // Compute IRRs
  let tokenIRR;
  try { tokenIRR = computeIRR(tokenFlows); } catch { tokenIRR = NaN; }
  let commonIRR;
  try { commonIRR = computeIRR(commonFlows); } catch { commonIRR = NaN; }

  // Stress tests
  const stressScenarios = [
    { label: 'Base Case', revenueMultiplier: 1.0 },
    { label: '10% Revenue Decline', revenueMultiplier: 0.90 },
    { label: '20% Revenue Decline', revenueMultiplier: 0.80 },
    { label: '15% Revenue Increase', revenueMultiplier: 1.15 },
  ];
  const stressTests = stressScenarios.map(st => {
    const stResult = st.revenueMultiplier === revenueMultiplier
      ? null // skip self, we'll reconstruct below
      : runWaterfallInternal({ raise, preferredReturn: prefReturn, revenueParticipation: revPart, reserveMonths, revenueMultiplier: st.revenueMultiplier });
    const r = stResult || { tokenIRR, tokenMultiple: cumTokenDist / tokenEquity, commonIRR, minDSCR: computeMinDSCR(years) };
    return {
      label: st.label,
      tokenIRR: r.tokenIRR,
      tokenMultiple: r.tokenMultiple,
      commonIRR: r.commonIRR,
      minDSCR: r.minDSCR,
    };
  });

  return {
    raise, prefReturn, revPart, revenueMultiplier,
    years, tokenFlows, commonFlows,
    tokenIRR, commonIRR,
    tokenMultiple: cumTokenDist / tokenEquity,
    commonMultiple: cumCommonDist / commonEquity,
    tokenPayback,
    tokenCount,
    totalTokenDist: cumTokenDist,
    totalCommonDist: cumCommonDist,
    stressTests,
  };
}

/** Lightweight internal runner for stress tests (no recursion into stressTests) */
function runWaterfallInternal(opts) {
  const raise = opts.raise || TOKEN_DEFAULTS.raise_amount;
  const prefReturn = opts.preferredReturn || TOKEN_DEFAULTS.preferred_return;
  const revPart = opts.revenueParticipation || TOKEN_DEFAULTS.revenue_participation;
  const reserveMonths = opts.reserveMonths || TOKEN_DEFAULTS.operating_reserve_months;
  const revenueMultiplier = opts.revenueMultiplier || 1.0;

  const ds = debtService();
  const equity = ASSUMPTIONS.capex_usd * ASSUMPTIONS.equity_ratio;
  const tokenEquity = raise;
  const commonEquity = equity - tokenEquity;
  let reserveBalance = 0;
  let cumTokenDist = 0, cumCommonDist = 0;
  const tokenFlows = [-tokenEquity];
  const commonFlows = [-commonEquity];
  let minDSCR = Infinity;

  for (let y = 1; y <= PROJECT.concession_years; y++) {
    const rev = (ppaRevenue(y) + carbonRevenue(y) + bessRevenue(y) + agRevenue(y)) * revenueMultiplier;
    const ox = opex(y);
    const debt = y <= ASSUMPTIONS.loan_term_years ? ds : 0;
    let remaining = rev - ox;
    const debtPaid = Math.min(remaining, debt);
    remaining -= debtPaid;
    if (debt > 0) { const dscr = (rev - ox) / debt; if (dscr < minDSCR) minDSCR = dscr; }
    const reserveTarget = (ox / 12) * reserveMonths;
    const reserveNeeded = Math.max(0, reserveTarget - reserveBalance);
    const reserveFund = Math.min(remaining, reserveNeeded);
    reserveBalance += reserveFund;
    remaining -= reserveFund;
    const ndc = remaining;
    const tokenShare = ndc * revPart;
    const prefMin = tokenEquity * prefReturn;
    const tokenDist = Math.max(tokenShare, Math.min(prefMin, ndc));
    remaining -= tokenDist;
    cumTokenDist += tokenDist;
    tokenFlows.push(tokenDist);
    const commonDist = Math.max(0, remaining);
    cumCommonDist += commonDist;
    commonFlows.push(commonDist);
  }

  let tokenIRR, commonIRR;
  try { tokenIRR = computeIRR(tokenFlows); } catch { tokenIRR = NaN; }
  try { commonIRR = computeIRR(commonFlows); } catch { commonIRR = NaN; }

  return {
    tokenIRR, commonIRR,
    tokenMultiple: cumTokenDist / tokenEquity,
    commonMultiple: cumCommonDist / commonEquity,
    minDSCR,
  };
}

function computeMinDSCR(years) {
  let min = Infinity;
  for (const y of years) {
    if (y.debtAllocation > 0) {
      const ebitda = y.revenue - y.omAllocation;
      const dscr = ebitda / y.debtAllocation;
      if (dscr < min) min = dscr;
    }
  }
  return min;
}

function computeIRR(flows, guess = 0.10) {
  let rate = guess;
  for (let iter = 0; iter < 1000; iter++) {
    let f = 0, df = 0;
    for (let i = 0; i < flows.length; i++) {
      f += flows[i] / Math.pow(1 + rate, i);
      df -= i * flows[i] / Math.pow(1 + rate, i + 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-8) return next;
    rate = next;
  }
  return rate;
}

// ── DISPLAY ────────────────────────────────────────────────────

function fmt(n) { return (n / 1e6).toFixed(2); }

function printWaterfall(w) {
  const label = w.revenueMultiplier === 1.0 ? 'BASE CASE' :
    w.revenueMultiplier < 1.0 ? `STRESS TEST (${((1 - w.revenueMultiplier) * 100).toFixed(0)}% Revenue Decline)` :
    `UPSIDE (${((w.revenueMultiplier - 1) * 100).toFixed(0)}% Revenue Increase)`;

  console.log('\n' + '═'.repeat(140));
  console.log(`  TOKEN WATERFALL — ${label}`);
  console.log(`  Raise: $${fmt(w.raise)}M | Pref Return: ${(w.prefReturn * 100).toFixed(0)}% | Rev Part: ${(w.revPart * 100).toFixed(0)}%`);
  console.log('═'.repeat(140));

  console.log(
    'Yr | Revenue $M | OpEx $M  | Debt $M  | Reserve $M | NDC $M    | Token Dist $M | Common Dist $M | Cum Token $M | Cum Common $M'
  );
  console.log('─'.repeat(140));

  for (const r of w.years) {
    console.log(
      `${String(r.year).padStart(2)} ` +
      `| $${fmt(r.revenue).padStart(8)} ` +
      `| $${fmt(r.omAllocation).padStart(7)} ` +
      `| $${fmt(r.debtAllocation).padStart(7)} ` +
      `| $${fmt(r.reserveAllocation).padStart(9)} ` +
      `| $${fmt(r.ndc).padStart(8)} ` +
      `| $${fmt(r.preferredAllocation).padStart(12)} ` +
      `| $${fmt(r.commonAllocation).padStart(13)} ` +
      `| $${fmt(r.cumTokenDist).padStart(11)} ` +
      `| $${fmt(r.cumCommonDist).padStart(12)}`
    );
  }

  console.log('─'.repeat(140));
  console.log('\n  WATERFALL SUMMARY');
  console.log('  ' + '─'.repeat(50));
  console.log(`  Token Raise:            $${fmt(w.raise)}M`);
  console.log(`  Token IRR:              ${isNaN(w.tokenIRR) ? 'N/A' : (w.tokenIRR * 100).toFixed(2) + '%'}`);
  console.log(`  Token Multiple:         ${w.tokenMultiple.toFixed(2)}x`);
  console.log(`  Token Payback:          Year ${w.tokenPayback || 'N/A'}`);
  console.log(`  Total Token Dist:       $${fmt(w.totalTokenDist)}M`);
  console.log(`  Common IRR:             ${isNaN(w.commonIRR) ? 'N/A' : (w.commonIRR * 100).toFixed(2) + '%'}`);
  console.log(`  Common Multiple:        ${w.commonMultiple.toFixed(2)}x`);
  console.log(`  Total Common Dist:      $${fmt(w.totalCommonDist)}M`);
}

// ── MAIN ───────────────────────────────────────────────────────

function main() {
  console.log('═'.repeat(80));
  console.log('  SUNFARM PV — TOKENIZED REVENUE WATERFALL ENGINE');
  console.log('═'.repeat(80));

  const base = runWaterfall();
  printWaterfall(base);

  const stress10 = runWaterfall({ revenueMultiplier: 0.90 });
  printWaterfall(stress10);

  const stress20 = runWaterfall({ revenueMultiplier: 0.80 });
  printWaterfall(stress20);

  // Token raise sensitivity
  console.log('\n\n' + '═'.repeat(80));
  console.log('  TOKEN RAISE SENSITIVITY');
  console.log('═'.repeat(80));
  console.log('  Raise $M  | Token IRR | Token Mult | Payback | Common IRR | Common Mult');
  console.log('  ' + '─'.repeat(72));

  for (const amt of [5_000_000, 10_000_000, 15_000_000, 20_000_000]) {
    const w = runWaterfall({ raise: amt });
    console.log(
      `  $${fmt(amt).padStart(7)} ` +
      `| ${isNaN(w.tokenIRR) ? '    N/A' : (w.tokenIRR * 100).toFixed(2).padStart(6) + '%'} ` +
      `| ${w.tokenMultiple.toFixed(2).padStart(9)}x ` +
      `| ${String(w.tokenPayback || 'N/A').padStart(6)}y ` +
      `| ${isNaN(w.commonIRR) ? '     N/A' : (w.commonIRR * 100).toFixed(2).padStart(7) + '%'} ` +
      `| ${w.commonMultiple.toFixed(2).padStart(10)}x`
    );
  }
  console.log('═'.repeat(80));
}

module.exports = { runWaterfall };

if (require.main === module) main();
