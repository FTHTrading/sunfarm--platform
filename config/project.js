/**
 * SUNFARM PV — MASTER PROJECT CONFIGURATION
 * Single source of truth. All models consume from here.
 * No magic numbers anywhere else in the codebase.
 */

const PROJECT = {
  name: 'SunFarm Photovoltaic Project',
  location: {
    municipality: 'Baní',
    province: 'Peravia',
    country: 'Dominican Republic',
    coordinates: { lat: 18.2, lng: -70.3 },
    address: 'Carretera Sánchez (Baní-Azua), Cerro Gordo, Monte Andrés',
  },

  // ── GENERATION ──────────────────────────────────────────────
  capacity_mw_ac: 50,
  capacity_mwp_dc: 59.69,
  dc_ac_ratio: 1.19,
  capacity_factor: 0.24,
  annual_degradation: 0.004,
  hours_per_year: 8760,
  concession_years: 25,
  module_rating_w: 760,
  module_type: 'Bifacial high-efficiency',
  estimated_modules: 78500,

  // ── LAND ────────────────────────────────────────────────────
  land: {
    total_area_m2: 4_406_824,
    total_area_ha: 440.68,
    concession_area_ha: 161,
    parcela: '59',
    dc: '08',
    title_certificate: '0500009639',
    owners: ['William Meredith Driver', 'Jorge Morales Paulino'],
    appraisal_date: '2025-05-26',
    appraisal_total_rdp: 2_970_114_857,
    appraisal_total_usd: 47_900_000,
    exchange_rate: 62.0,
    zones: [
      { name: 'Highway frontage', area_m2: 267_675, unit_rdp: 5626.32, value_rdp: 1_506_025_206 },
      { name: 'Moderate access', area_m2: 2_019_629, unit_rdp: 651.75, value_rdp: 1_316_293_201 },
      { name: 'Remote/undeveloped', area_m2: 2_019_629, unit_rdp: 73.18, value_rdp: 147_796_450 },
    ],
    no_superposition: { certified: true, date: '2024-10-21' },
  },

  // ── ENTITY ──────────────────────────────────────────────────
  entity: {
    name: 'Sunfarming Dom Rep Invest, S.R.L.',
    rnc: '1-31-94471-1',
    mercantil: '158067SD',
    incorporated: '2019-05-17',
    jurisdiction: 'Dominican Republic',
    parent: 'Alensys Alternative Energiesysteme AG',
    representative: 'Holger Johannes Schonherr',
  },

  // ── GRID ────────────────────────────────────────────────────
  grid: {
    poi: '138kV bar - Peravia Solar I & II',
    alternative_poi: 'Calabaza I',
    transmission_km: 4.5,
    circuit: 'Double-circuit 138kV',
    operator: 'ETED',
    no_objection_date: '2024-02',
    revalidation_date: '2025-05',
  },

  // ── BESS ────────────────────────────────────────────────────
  bess: {
    power_mw: 25,
    energy_mwh: 100,
    duration_hours: 4,
    technology: 'Lithium-ion LFP',
    capex_per_kwh: 250,
    get capex_total() { return this.energy_mwh * 1000 * this.capex_per_kwh; },
  },

  // ── REGULATORY ──────────────────────────────────────────────
  regulatory: {
    concession_resolution: 'CNE-CP-0012-2020',
    concession_type: 'Definitive',
    environmental_license: '0379-20',
    laws: [
      'Ley General de Electricidad 125-01',
      'Ley 186-07',
      'Ley 57-07 (Renewable Energy Incentives)',
      'Decreto 202-08',
      'Decreto 717-08',
      'Decreto 517-25',
    ],
  },

  // ── AYG ASSOCIATED ─────────────────────────────────────────
  ayg: {
    name: 'AYG Insurance and Financial Services LLC',
    valuation: 500_000_000,
    segments: ['Insurance', 'Wellness', 'Financial Education', 'Advisory'],
  },
};

// ── FINANCIAL ASSUMPTIONS ───────────────────────────────────────
const ASSUMPTIONS = {
  // PPA
  ppa_rate_usd_mwh: 70,
  ppa_escalation: 0.015,

  // Carbon
  grid_emission_factor: 0.6,     // tCO2/MWh (DR grid)
  carbon_price_usd: 15,
  carbon_escalation: 0.03,

  // BESS
  bess_annual_revenue: 2_500_000,
  bess_escalation: 0.02,

  // Agricultural
  ag_revenue_annual: 800_000,
  ag_escalation: 0.025,

  // O&M
  om_per_kw: 12,
  om_escalation: 0.02,
  insurance_per_kw: 1.5,
  land_lease_annual: 200_000,

  // Capital Structure — Baseline
  capex_usd: 55_000_000,
  debt_ratio: 0.60,
  equity_ratio: 0.40,
  interest_rate: 0.065,
  loan_term_years: 18,

  // Discount / Tax
  discount_rates: [0.08, 0.10],
  tax_exemption_years: 10,        // Ley 57-07
  tax_rate: 0.27,

  // Scenarios (multiplier on base revenue)
  scenarios: {
    conservative: 0.85,
    base: 1.00,
    aggressive: 1.15,
  },
};

// ── TOKENIZATION DEFAULTS ───────────────────────────────────────
const TOKEN_DEFAULTS = {
  raise_amount: 15_000_000,
  preferred_return: 0.08,
  revenue_participation: 0.20,  // 20% of net distributable cash
  operating_reserve_months: 6,
  token_price: 100,
  min_investment: 1_000,
};

module.exports = { PROJECT, ASSUMPTIONS, TOKEN_DEFAULTS };
