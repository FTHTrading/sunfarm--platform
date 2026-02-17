# BESS-SPECIFIC FINANCING — STORAGE SPV MODEL

## SunFarm PV 50 MW — 25 MW / 100 MWh BESS Carve-Out

---

## Rationale

Battery energy storage is increasingly financed as a standalone asset class. A BESS carve-out isolates storage-specific revenue streams and risks from PV generation, enabling access to specialized capital sources.

---

## BESS Asset Parameters

| Parameter | Value |
|---|---|
| Power rating | 25 MW |
| Energy capacity | 100 MWh |
| Duration | 4 hours |
| Chemistry | Lithium-ion LFP (lithium iron phosphate) |
| CAPEX | $25,000,000 ($250/kWh) |
| Annual degradation | 2%/yr |
| Round-trip efficiency | 88% |
| Economic life | 20 years (augmentation at Year 15) |
| Augmentation reserve | 30% of BESS CAPEX at Year 15 |

---

## Revenue Stack (From BESS Revenue Engine Model)

| Stream | Year 1 Revenue | 25-Year Total | % of Total |
|---|---|---|---|
| Energy Arbitrage | $1,820,000 | ~$54M | 40% |
| Frequency Regulation | $1,100,000 | ~$33M | 24% |
| Capacity Payments | $910,000 | ~$27M | 20% |
| Peak Shaving | $590,000 | ~$15M | 11% |
| Curtailment Mitigation | $140,000 | ~$5M | 4% |
| **Total** | **$4,560,000** | **$134.2M** | **100%** |

**BESS-specific IRR**: 17.9%
**BESS ROI**: 481%
**BESS payback**: 6 years

---

## Financing Structures

### Option 1: BESS Revenue Bond

| Term | Detail |
|---|---|
| Issuer | SunFarm Storage SPV (subsidiary of Energy SPV) |
| Size | $15-20M |
| Tenor | 12-15 years |
| Security | First lien on BESS equipment, assignment of BESS revenue streams |
| Covenants | BESS-specific DSCR, utilization requirements |

### Option 2: Equipment Lease

| Term | Detail |
|---|---|
| Lessor | BESS manufacturer or financial lessor |
| Term | 10-15 years |
| Payment | Monthly, tied to revenue share or fixed |
| Residual value | Lessor retains or buyout option |
| Balance sheet | Off-balance sheet for SPV (operating lease) |

### Option 3: Tax Equity (U.S. structure, if applicable)

| Term | Detail |
|---|---|
| Investor | U.S. tax equity investor |
| Structure | ITC transfer or sale-leaseback |
| ITC value | 30% of BESS CAPEX = $7.5M |
| Flip date | Year 5-7 |
| Note | Requires U.S. tax nexus — may apply if U.S. parent or equipment |

---

## Target Institutions

| Institution | Type | Relevance |
|---|---|---|
| **Fluence** | BESS manufacturer/integrator | Equipment financing + maintenance wrap |
| **Tesla Energy** | Megapack supplier | Supplier credit, long-term service agreements |
| **Wartsila** | Energy storage integrator | Project finance arm, storage expertise |
| **NextEra Energy Resources** | Developer/operator | Storage acquisition, partnership |
| **Generate Capital** | Infrastructure fund | Storage-specific capital deployment |
| **Hannon Armstrong** | Sustainable infrastructure REIT | Storage + solar portfolio financing |
| **Macquarie Green Investment Group** | Infrastructure fund | Storage asset investment |

---

## BESS Carve-Out vs. Integrated Analysis

| Metric | Integrated (BESS in Energy SPV) | Carve-Out (Storage SPV) |
|---|---|---|
| Financing flexibility | Lower | Higher (specialized lenders) |
| WACC | Blended with PV | Potentially lower (storage-specific) |
| Operational complexity | Simpler | Additional SPV management |
| Revenue isolation | Combined cash flows | Dedicated BESS revenue waterfall |
| Investor appeal | General infrastructure | Storage-specific funds |
| Risk isolation | BESS risk in PV credit | BESS risk ring-fenced |

---

## Capacity Payment Underwriting

Capacity payments from grid operator or off-taker can be structured as contracted revenue:

| Parameter | Value |
|---|---|
| Capacity price | $36,400/MW/year (modeled) |
| Annual capacity revenue | $910,000 |
| Contract term | 10-15 years |
| Bankability | Medium-High (if contracted with CDEEE or EDES) |
| Revenue certainty | Contracted > merchant |

Contracted capacity payments improve BESS bankability and reduce financing cost by providing revenue floor.

---

## Decision Framework

| Question | Answer |
|---|---|
| Is BESS revenue sufficient to support standalone financing? | Yes — $4.56M/yr Year 1, 17.9% IRR |
| Does carve-out improve total project WACC? | Potentially — specialized lenders offer tighter spreads |
| Does carve-out create operational complexity? | Moderate — requires inter-SPV agreements |
| **Recommendation** | Evaluate carve-out at financial close; default to integrated if complexity exceeds benefit |

---

*BESS financial model outputs from `models/bess-revenue-engine.js`. Revenue streams modeled deterministically with 2% annual escalation and 2% degradation.*
