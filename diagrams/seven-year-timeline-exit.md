# 7-Year Timeline & Exit Flow

> Mermaid diagram showing the SunFarm PV project lifecycle from development through Year 7 exit, including capital raises, milestones, and exit pathways.

```mermaid
gantt
    title SunFarm PV — 7-Year Development to Exit Timeline
    dateFormat YYYY-MM
    axisFormat %Y

    section Development
    Concession Secured (CNE-CD-003-2023)       :done, dev1, 2023-03, 2023-04
    EIA License (0379-20)                       :done, dev2, 2020-06, 2020-07
    Land Acquisition & Catastro                 :done, dev3, 2023-01, 2023-06
    ETED Interconnection Study                  :active, dev4, 2025-01, 2025-06
    PPA Negotiation                             :active, dev5, 2025-01, 2025-09
    Ley 57-07 Certification                     :dev6, 2025-03, 2025-09

    section Capital Raise
    DFI Outreach (IFC/IDB/DFC)                  :cap1, 2025-06, 2026-03
    Green Bond / Fideicomiso Framework           :cap2, 2025-09, 2026-03
    SPO Engagement                               :cap3, 2026-01, 2026-03
    Financial Close                              :milestone, cap4, 2026-06, 2026-07

    section Construction
    EPC Award & NTP                             :con1, 2026-07, 2026-08
    Civil Works & Foundations                    :con2, 2026-08, 2027-02
    PV Module Installation                       :con3, 2027-01, 2027-06
    BESS Installation                            :con4, 2027-03, 2027-07
    Substation & Interconnection                 :con5, 2027-02, 2027-06
    Commissioning & Testing                      :con6, 2027-06, 2027-09
    COD (Commercial Operation Date)              :milestone, con7, 2027-09, 2027-10

    section Operations (Years 1-5)
    Year 1 Operations                            :op1, 2027-10, 2028-10
    Year 2 Operations                            :op2, 2028-10, 2029-10
    Year 3 — Payback Achieved                    :milestone, op3, 2030-07, 2030-10
    Year 4 Operations                            :op4, 2030-10, 2031-10
    Year 5 — Exit Window Opens                   :milestone, op5, 2032-07, 2032-10

    section Exit (Years 5-7)
    Asset Valuation & Market Sounding            :exit1, 2032-07, 2032-12
    YieldCo Drop-Down Negotiation                :exit2, 2032-10, 2033-06
    Partial or Full Exit Execution               :exit3, 2033-03, 2033-09
    Year 7 — Target Exit Complete                :milestone, exit4, 2034-09, 2034-10
```

---

## Exit Pathway Options

```mermaid
flowchart TD
    YEAR5["Year 5<br/>Exit Window Opens<br/>18-20 years remaining<br/>on concession"] --> EVAL["Asset Valuation<br/>(Independent)"]
    
    EVAL --> PATH_A["Path A: YieldCo<br/>Drop-Down"]
    EVAL --> PATH_B["Path B: Strategic<br/>Sale"]
    EVAL --> PATH_C["Path C: Secondary<br/>Market"]
    EVAL --> PATH_D["Path D: Partial<br/>Recapitalization"]

    PATH_A --> YIELDCO["Listed Infrastructure<br/>YieldCo/Trust<br/>(e.g., Brookfield, CSAN)"]
    PATH_B --> STRAT["Strategic Acquirer<br/>(Utility, IPP, Sovereign)"]
    PATH_C --> SECOND["Infrastructure Fund<br/>(Secondary market<br/>transaction)"]
    PATH_D --> RECAP["Refinance +<br/>Dividend Recap<br/>(Retain partial ownership)"]

    YIELDCO --> VAL_A["Valuation: 8-10x<br/>Fwd EBITDA<br/>$65-80M"]
    STRAT --> VAL_B["Valuation: 9-12x<br/>Fwd EBITDA<br/>$70-95M"]
    SECOND --> VAL_C["Valuation: 7-9x<br/>Fwd EBITDA<br/>$55-70M"]
    RECAP --> VAL_D["Proceeds: $30-40M<br/>(Retain upside)"]

    subgraph PRECEDENT["DR Market Precedent"]
        DOM["Dominion Energética<br/>→ Sale: $88M<br/>(2019)"]
    end

    VAL_A -.-> PRECEDENT
    VAL_B -.-> PRECEDENT

    style YEAR5 fill:#0d6efd,color:#fff
    style EVAL fill:#6f42c1,color:#fff
    style YIELDCO fill:#198754,color:#fff
    style STRAT fill:#fd7e14,color:#fff
    style SECOND fill:#dc3545,color:#fff
    style RECAP fill:#20c997,color:#fff
    style PRECEDENT fill:#495057,color:#fff
```

---

## Key Milestones Summary

| Year | Milestone | Significance |
|---|---|---|
| **2023** | Definitive concession granted | 25-year development right secured |
| **2025-26** | Financial close | Capital stack assembled; construction begins |
| **2027** | COD | Revenue generation starts |
| **2030** | Payback achieved (~Year 3) | Equity fully returned |
| **2032** | Exit window opens (Year 5) | Optimal disposition timing |
| **2034** | Target exit (Year 7) | Maximum sponsor value realization |

---

## Financial Trajectory

| Metric | Year 1 | Year 3 | Year 5 | Year 7 |
|---|---|---|---|---|
| **Annual Revenue** | $12.1M | $12.4M | $12.7M | $13.0M |
| **Cumulative FCF** | $8.5M | $28.2M | $48.8M | $69.5M |
| **DSCR** | 3.90x | 3.72x | 3.55x | 3.38x |
| **Equity Multiple** | 0.39x | 1.28x | 2.22x | 3.16x |
| **Remaining Concession** | 24 years | 22 years | 20 years | 18 years |
| **Asset Valuation** | ~$80M | ~$78M | ~$75M | ~$72M |

---

*This timeline assumes financial close in mid-2026. All dates are indicative and subject to PPA execution, regulatory approvals, and market conditions.*
