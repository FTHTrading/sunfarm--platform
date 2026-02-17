# CAPITAL STACK — SunFarm PV 50 MW

## Structure

```
┌─────────────────────────────────────────────────┐
│                   TOTAL CAPEX                    │
│                    $55.0M                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  SENIOR SECURED DEBT       $33.0M (60%) │    │
│  │  Rate: 6.5% fixed                       │    │
│  │  Tenor: 18 years                        │    │
│  │  Annual Service: ~$3.16M                │    │
│  │  Security: PPA + BESS + Revenue Accts   │    │
│  │  Min DSCR: 1.25x                        │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  TOKEN EQUITY             $15.0M (27%)  │    │
│  │  Revenue participation tokens           │    │
│  │  8% preferred return                    │    │
│  │  20% of NDC                             │    │
│  │  Issued via Token SPV                   │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  SPONSOR EQUITY            $7.0M (13%)  │    │
│  │  Common equity via HoldCo               │    │
│  │  Residual after debt + token pref       │    │
│  │  Full governance control                │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Capital Stack Breakdown

| Layer | Amount | % of Total | Cost | Priority |
|---|---|---|---|---|
| Senior Secured Debt | $33.0M | 60% | 6.5% | 1st |
| Token Equity | $15.0M | 27% | 8.0% pref + upside | 2nd |
| Sponsor Equity | $7.0M | 13% | Residual | 3rd |
| **Total** | **$55.0M** | **100%** | | |

## CAPEX Allocation

| Component | Amount | % |
|---|---|---|
| Solar Array (modules, racking, inverters) | $32.0M | 58.2% |
| BESS (25 MW / 100 MWh LFP) | $25.0M | 45.5% |
| Grid Interconnection (4.5 km 138kV) | $4.5M | 8.2% |
| BOS, Civil, Site Prep | $5.5M | 10.0% |
| Engineering & Design | $2.0M | 3.6% |
| Development & Permitting | $1.5M | 2.7% |
| Contingency (5%) | $2.75M | 5.0% |
| Working Capital & Reserves | $1.75M | 3.2% |
| **Note**: BESS is included in total, some components overlap | | |
| **Total CAPEX** | **$55.0M** | **100%** |

## Waterfall Priority

1. **Operating Expenses** — O&M, insurance, land lease, admin
2. **Senior Debt Service** — Principal + Interest (Years 1-18)
3. **Operating Reserve** — Target: 6 months O&M
4. **Token Preferred Distribution** — Max(8% pref, 20% NDC)
5. **Sponsor Common Distribution** — Residual

## Sensitivity Matrix

### Levered IRR by D/E Ratio and Interest Rate

| D/E | 5.5% | 6.0% | 6.5% | 7.0% | 7.5% | 8.0% |
|---|---|---|---|---|---|---|
| 50/50 | Core | Core | Core | Core | Mod | Mod |
| 55/45 | Core+ | Core | Core | Core | Mod | Mod |
| 60/40 | **Optimal** | Core+ | Core | Core | Mod | Stress |
| 65/35 | High | High | Core+ | Core | Mod | Stress |
| 70/30 | High | High | High | Core+ | Stress | Stress |
| 75/25 | Elevated | Elevated | High | Stress | Stress | Distress |
| 80/20 | Elevated | Elevated | Elevated | Stress | Distress | Distress |

*Run `node models/capital-stack-sensitivity.js` for exact IRR, NPV, DSCR values.*

### DSCR Floor Analysis

- **60/40 @ 6.5%**: Min DSCR ~3.4x ✅ (well above 1.25x covenant)
- **70/30 @ 6.5%**: Min DSCR ~2.4x ✅
- **80/20 @ 7.5%**: Min DSCR ~1.3x ⚠️ (barely above covenant)

## Recommended Structure

**60% Debt / 40% Equity at 6.5% — Base Case**

- Levered IRR: ~40%+
- Equity Multiple: ~13x+
- Min DSCR: ~3.4x (2.7x above covenant)
- NPV @ 8%: ~$98M
- Payback: Year 3

### Rationale

1. Conservative leverage maintains 2x+ DSCR cushion over covenant
2. 18-year tenor matches concession with 7-year tail
3. Non-recourse to HoldCo — project cash flows only
4. Token layer ($15M) reduces sponsor equity to $7M while maintaining control
5. Ley 57-07 tax exemption (10 years) amplifies early cash flow

## DFI / Institutional Targets

| Institution | Ticket Size | Instrument | Status |
|---|---|---|---|
| IFC (World Bank) | $15-20M | Senior A-Loan | Target |
| DFC (US) | $10-15M | Political Risk Guarantee | Target |
| OPIC/Proparco | $10M | Mezzanine | Potential |
| Infrastructure Fund | $7-15M | Token Equity | Target |
| Local Bank (BHD/Popular) | $5-10M | Tranche B | Potential |

## Additional Facilities

| Facility | Amount | Purpose |
|---|---|---|
| DSR Account | ~$1.6M | 6-month debt service reserve |
| O&M Reserve | ~$0.5M | 6-month O&M buffer |
| Letter of Credit | $2.0M | Construction performance |
| Working Capital | $1.0M | Pre-COD expenses |
