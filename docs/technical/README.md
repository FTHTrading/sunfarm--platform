# Technical Documentation

## System Design Overview

| Parameter | Specification |
|---|---|
| **Capacity (AC)** | 50 MW |
| **Capacity (DC)** | 59.69 MWp |
| **DC:AC Ratio** | 1.19:1 |
| **Module** | Bifacial 760W (Tier 1) |
| **Module Count** | ~78,540 |
| **Inverters** | String inverters |
| **Tracking** | Fixed-tilt or single-axis (TBD in EPC) |
| **Array Area** | 161 hectares |

---

## BESS Specifications

| Parameter | Specification |
|---|---|
| **Power** | 25 MW |
| **Energy** | 100 MWh |
| **Duration** | 4 hours |
| **Chemistry** | LFP (Lithium Iron Phosphate) |
| **Round-Trip Efficiency** | 88% |
| **Degradation** | 2%/year |
| **Augmentation** | Year 15 (30% of BESS CAPEX) |
| **Cost** | $250/kWh ($12.5M) |
| **O&M** | $8/kW/year |

## Grid Interconnection

| Parameter | Specification |
|---|---|
| **Voltage** | 138 kV |
| **POI** | Peravia Solar I & II Substation |
| **Transmission Line** | 4.5 km, double-circuit |
| **Redundancy** | N-1 (double circuit) |
| **Alternative POI** | Calabaza I (fallback) |
| **ETED Approval** | Feb 2024, revalidated May 2025 |

## Performance Assumptions

| Parameter | Value | Basis |
|---|---|---|
| GHI | ~5.5 kWh/m²/day | AYG data for Baní region |
| Performance Ratio | ~82% | Includes temp, soiling, mismatch |
| Availability | 98% | EPC/O&M warranty target |
| Year 1 Generation | ~102,000 MWh | Capacity × PR × GHI × 365 |
| Degradation | 0.4%/year | Conservative (typical 0.3%) |
| Year 25 Generation | ~92,600 MWh | After 24 years degradation |

## Construction

| Milestone | Target | Duration |
|---|---|---|
| Financial Close | Q3 2025 | — |
| NTP (Notice to Proceed) | Q4 2025 | — |
| Site Preparation | Q4 2025 | 3 months |
| Pile Driving + Racking | Q1 2026 | 4 months |
| Module Installation | Q2 2026 | 3 months |
| BESS Installation | Q2-Q3 2026 | 4 months |
| Grid Connection | Q3 2026 | 2 months |
| Phase 1 COD (25 MW) | Q3 2026 | — |
| Full COD (50 MW + BESS) | Q1 2027 | — |

## Equipment Procurement Strategy

1. **Modules**: Bifacial 760W — advance PO 6 months before NTP
2. **Inverters**: String inverters — standard lead time (8-12 weeks)
3. **BESS**: LFP system — 6-9 month lead time, procure at financial close
4. **Racking**: Fixed-tilt or SAT — procure with EPC
5. **Transformer/Switchgear**: 138kV — 6-month lead time

## O&M Plan

- **Type**: Full-scope O&M contract with availability guarantee
- **Cost**: $12/kW/year (2% annual escalation)
- **BESS O&M**: $8/kW/year additional
- **Scope**: Preventive maintenance, corrective maintenance, monitoring, vegetation, security
- **Monitoring**: Real-time SCADA with remote access
- **Reporting**: Monthly performance reports, quarterly investor reports
