# Financial Documentation

## Project Economics Summary

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Revenue Factor | 85% | 100% | 115% |
| Total CAPEX | $55M | $55M | $55M |
| Levered IRR | ~11% | ~14% | ~17% |
| Unlevered IRR | ~9% | ~11% | ~13% |
| Equity Multiple | ~2.4x | ~3.2x | ~4.0x |
| Min DSCR | ~1.15x | ~1.38x | ~1.60x |
| Payback | ~9 yrs | ~7 yrs | ~6 yrs |

---

## CAPEX Allocation ($55M)

| Category | Amount | % |
|---|---|---|
| Solar Array (modules, racking, inverters) | $30,000,000 | 54.5% |
| BESS (25 MW / 100 MWh LFP) | $12,500,000 | 22.7% |
| BOS & Grid (transmission, substation) | $5,500,000 | 10.0% |
| Land & Development | $4,250,000 | 7.7% |
| Contingency (5%) | $2,750,000 | 5.0% |

## Capital Structure (Baseline)

| Source | Amount | % | Terms |
|---|---|---|---|
| Senior Debt | $33,000,000 | 60% | 6.5%, 18-yr amortization |
| Sponsor Equity | $7,000,000 | 13% | Common equity |
| Token Raise | $15,000,000 | 27% | 8% pref, 20% NDC participation |

## Revenue Streams (Year 1)

| Stream | Annual | % of Total |
|---|---|---|
| PPA (50 MW @ $70/MWh) | $7,140,000 | 69% |
| BESS (5 streams) | $2,060,000 | 20% |
| Carbon Credits | $1,097,000 | 11% |
| Agriculture | $80,000 | <1% |
| **Total** | **$10,377,000** | **100%** |

## Financial Models (this repo)

All models in `models/` directory, consuming from `config/project.js`:

1. **25-year-cashflow.js** — Full pro forma with EBITDA, FCF, DSCR, IRR, NPV
2. **capital-stack-sensitivity.js** — 42-combo D/E × interest rate matrix
3. **token-waterfall.js** — O&M → Debt → Reserve → Preferred → Common
4. **bess-revenue-engine.js** — 5-stream revenue stacking
5. **carbon-credit-engine.js** — 4 market scenarios + forward sales
6. **land-monetization.js** — LandCo 4-stream model

## Key Assumptions

- PPA: $70/MWh, 1.5% annual escalation
- Degradation: 0.4%/yr
- O&M: $12/kW/yr (2% escalation)
- Insurance: 0.5% of CAPEX
- Tax: 0% for 10 years (Ley 57-07), 27% thereafter
- Discount rate: 8% (NPV base), 10% (NPV sensitivity)
