# SunFarm PV — 50 MW Solar Platform

**Institutional-Grade Project Repository**

> 50 MW AC / 59.69 MWp DC Solar PV + 25 MW / 100 MWh BESS  
> Baní, Peravia Province, Dominican Republic  
> Definitive Concession: CNE-CP-0012-2020  
> Entity: Sunfarming Dom Rep Invest, S.R.L. (RNC 1-31-94471-1)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run all financial models
npm run model:cashflow
npm run model:capital
npm run model:waterfall
npm run model:bess
npm run model:carbon
npm run model:land

# Run all models at once
npm run models

# Launch dashboard
npm run dashboard
# → http://localhost:3000

# Generate report
npm run report
```

---

## Repository Structure

```
sunfarm-platform/
│
├── config/
│   └── project.js              # Single source of truth — all models consume from here
│
├── models/
│   ├── 25-year-cashflow.js     # Pro forma: EBITDA, FCF, DSCR, IRR, NPV, payback
│   ├── capital-stack-sensitivity.js  # 42-combo D/E × interest rate sensitivity
│   ├── token-waterfall.js      # O&M → Debt → Reserve → Preferred → Common
│   ├── bess-revenue-engine.js  # 5-stream revenue stacking with scenario toggling
│   ├── carbon-credit-engine.js # 4 market scenarios + forward sale analysis
│   └── land-monetization.js    # LandCo 4-stream model + land-only IRR
│
├── spv/
│   ├── holdco/README.md        # Master holding entity — governance and structure
│   ├── landco/README.md        # Land asset holder — zone breakdown, revenue
│   ├── energy-spv/README.md    # Concession/PPA/BESS/carbon — capital structure
│   └── token-spv/README.md     # Token issuance — waterfall, compliance, returns
│
├── dashboard/
│   ├── server.js               # Express server — 7 pages
│   ├── routes/
│   │   ├── executive.js        # Executive overview
│   │   ├── cashflow.js         # 25-year cash flow chart
│   │   ├── capital.js          # Capital stack breakdown
│   │   ├── token.js            # Token distribution simulation
│   │   ├── carbon.js           # Carbon revenue chart
│   │   ├── bess.js             # BESS revenue chart
│   │   └── land.js             # Land monetization scenario
│   ├── components/
│   │   ├── layout.js           # HTML layout wrapper
│   │   ├── nav.js              # Navigation component
│   │   └── charts.js           # Chart rendering utilities
│   └── public/
│       └── style.css           # Dashboard styles
│
├── data-room/
│   ├── document-index.json     # All documents with status tracking
│   └── diligence-checklist.md  # Institutional diligence checklist
│
├── docs/
│   ├── legal/                  # Entity formation, concession, contracts
│   ├── regulatory/             # CNE, ETED, environmental approvals
│   ├── land/                   # Title, surveys, catastro
│   ├── environmental/          # EIA, licenses, monitoring
│   ├── financial/              # Budgets, projections, term sheets
│   └── technical/              # Engineering, grid studies, BESS specs
│
├── scripts/
│   └── generate-report.js      # Runs all models, outputs summary report
│
├── source-documents/           # Original project documents (A-F folders)
│   ├── A - Entidad Jurídica/
│   ├── B - Titulación del Terreno/
│   ├── C - Concesión y Permisos/
│   ├── D - Grid Access/
│   ├── E - Financial & Planning/
│   └── F - Environmental/
│
├── CAPITAL-STACK.md            # Full capital stack: diagram, waterfall, sensitivity
├── TOKENIZATION-STRUCTURE.md   # Token economics, legal, waterfall, lifecycle
├── RISK-MEMO.md                # 10-risk matrix with mitigations
├── PROJECT-SUMMARY.md          # One-page investor summary
└── package.json
```

---

## SPV Architecture

```
                    ┌──────────────────┐
                    │     HoldCo       │
                    │  Master Holding  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼──────────┐ ┌─▼──────────────┐
     │    LandCo      │ │  Energy SPV  │ │   Token SPV    │
     │  Land Title    │ │  Concession  │ │  Revenue-Share │
     │  440 ha        │ │  PPA / BESS  │ │  Tokens        │
     │  Titled Asset  │ │  Carbon      │ │  Reg D 506(c)  │
     └────────────────┘ └──────────────┘ └────────────────┘
```

**Key Structural Rule**: Land title NEVER enters Token SPV. Token holders receive revenue participation rights only — no equity or asset claims.

---

## Financial Models

All models consume from `config/project.js` — change assumptions once, all outputs update.

| Model | Output | Key Metrics |
|---|---|---|
| 25-Year Cash Flow | Pro forma P&L | EBITDA, FCF, DSCR, IRR, NPV, payback |
| Capital Stack | Sensitivity matrix | 42 combos × 3 scenarios, optimal D/E |
| Token Waterfall | Distribution cascade | Token IRR, multiple, payback, stress tests |
| BESS Revenue | 5-stream stacking | ROI, $/MW, $/MWh, payback |
| Carbon Credit | 4 market scenarios | Revenue by standard, forward sale NPV |
| Land Monetization | LandCo returns | 4 streams, land-only IRR |

### Three Scenarios

| Scenario | Revenue Factor | Description |
|---|---|---|
| Conservative | 85% | Low irradiance, curtailment, off-taker delays |
| Base | 100% | Design-case assumptions |
| Aggressive | 115% | High irradiance, premium PPA, carbon upside |

---

## Key Project Parameters

| Parameter | Value |
|---|---|
| Capacity (AC) | 50 MW |
| Capacity (DC) | 59.69 MWp |
| Land Area | 440 hectares |
| Module | Bifacial 760W |
| BESS | 25 MW / 100 MWh LFP |
| Concession | 25 years (definitive) |
| PPA Rate | $70/MWh (1.5% annual escalation) |
| Total CAPEX | $55,000,000 |
| Capital Structure | 60% Debt / 40% Equity (baseline) |
| Debt Terms | 6.5%, 18-year amortization |
| Tax Exemption | 10 years (Ley 57-07) |
| Module Degradation | 0.4%/year |
| Carbon Credits | ~73,100 tCO₂/year |

---

## Regulatory Status

| Approval | Status | Reference |
|---|---|---|
| CNE Concession | ✅ Definitive | CNE-CP-0012-2020 |
| Land Title | ✅ Registered | Certificación de No Superposición |
| ETED Grid Access | ✅ Approved | Feb 2024, revalidated May 2025 |
| Environmental License | ✅ Granted | License 0379-20 |
| SIE Registration | ✅ Active | SIE-EP-0045 |
| BESS Mandate | ⚡ Required | Decreto 517-25 |

---

## For Investors

- **CAPITAL-STACK.md** — Full capital structure, waterfall, sensitivity analysis
- **TOKENIZATION-STRUCTURE.md** — Token economics, legal framework, projected returns
- **RISK-MEMO.md** — 10-category risk matrix with institutional mitigations
- **PROJECT-SUMMARY.md** — One-page summary for initial screening

---

## For Diligence Teams

- **data-room/** — Document index with status tracking, diligence checklist
- **source-documents/** — Original regulatory, legal, land, and environmental documents
- **spv/** — Entity structure, governance, restrictions for each SPV
- **models/** — Deterministic models with transparent assumptions

---

## License

Proprietary. All rights reserved. This repository and its contents are confidential.

---

*Built for institutional diligence. Every number traces to an assumption. Every assumption traces to a source document.*
