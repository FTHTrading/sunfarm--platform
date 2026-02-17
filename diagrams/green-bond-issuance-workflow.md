# Green Bond Issuance Workflow

> Mermaid diagram showing the full green bond issuance workflow from framework to reporting, integrating ICMA GBP, TVRD, and SPO processes.

```mermaid
flowchart TD
    subgraph PREP["Phase 1: Preparation (Month 1-2)"]
        GF["Draft Green<br/>Bond Framework"]
        UOP["Define Use of<br/>Proceeds Categories"]
        TVRD["Confirm TVRD<br/>Alignment"]
        GF --> UOP
        UOP --> TVRD
    end

    subgraph SPO_PHASE["Phase 2: SPO (Month 2-4)"]
        SELECT["Select SPO Provider<br/>(Sustainalytics rec.)"]
        SUBMIT["Submit Framework +<br/>Documentation"]
        ASSESS["Provider Assessment<br/>(3-4 weeks)"]
        DRAFT_SPO["Draft SPO Report"]
        FINAL_SPO["Final SPO<br/>Published"]
        SELECT --> SUBMIT
        SUBMIT --> ASSESS
        ASSESS --> DRAFT_SPO
        DRAFT_SPO --> FINAL_SPO
    end

    subgraph LEGAL["Phase 3: Legal & Rating (Month 3-5)"]
        COUNSEL["Engage Int'l +<br/>DR Counsel"]
        DOCS["Prepare<br/>Offering Docs"]
        RATING["Credit Rating<br/>(if applicable)"]
        OPINION["Legal<br/>Opinions"]
        COUNSEL --> DOCS
        DOCS --> RATING
        DOCS --> OPINION
    end

    subgraph MARKET["Phase 4: Marketing (Month 5-6)"]
        DECK["Investor<br/>Presentation"]
        ROAD["Roadshow<br/>(DFIs, ESG funds,<br/>infra funds)"]
        OTM["One-to-Many<br/>Investor Calls"]
        DECK --> ROAD
        ROAD --> OTM
    end

    subgraph EXEC["Phase 5: Execution (Month 6-7)"]
        BOOK["Book Building"]
        PRICE["Pricing &<br/>Allocation"]
        SIGN["Signing"]
        SETTLE["Settlement &<br/>Proceeds Receipt"]
        BOOK --> PRICE
        PRICE --> SIGN
        SIGN --> SETTLE
    end

    subgraph POST["Phase 6: Post-Issuance (Ongoing)"]
        ACCOUNT["Dedicated Proceeds<br/>Account Management"]
        ALLOC_RPT["Annual Allocation<br/>Report"]
        IMPACT_RPT["Annual Impact<br/>Report"]
        VERIFY["External Verification<br/>of Allocation"]
        ACCOUNT --> ALLOC_RPT
        ACCOUNT --> IMPACT_RPT
        IMPACT_RPT --> VERIFY
    end

    PREP --> SPO_PHASE
    SPO_PHASE --> LEGAL
    LEGAL --> MARKET
    MARKET --> EXEC
    EXEC --> POST

    %% Cross-references
    TVRD -.->|"Required for<br/>DR issuance"| SIMV_REG["SIMV<br/>Registration"]
    FINAL_SPO -.->|"Included in<br/>offering docs"| DOCS
    RATING -.->|"Enhances<br/>distribution"| ROAD

    style PREP fill:#0d6efd,color:#fff
    style SPO_PHASE fill:#198754,color:#fff
    style LEGAL fill:#6f42c1,color:#fff
    style MARKET fill:#fd7e14,color:#fff
    style EXEC fill:#dc3545,color:#fff
    style POST fill:#20c997,color:#fff
```

---

## Key Compliance Gates

| Gate | Standard | Pass Criteria |
|---|---|---|
| **ICMA GBP Pillar 1** | Use of Proceeds | ≥90% CAPEX mapped to eligible categories ✅ |
| **ICMA GBP Pillar 2** | Project Evaluation & Selection | TVRD alignment + EIA + exclusion criteria ✅ |
| **ICMA GBP Pillar 3** | Management of Proceeds | Dedicated account + fiduciary oversight ⬜ |
| **ICMA GBP Pillar 4** | Reporting | Annual allocation + impact reports ⬜ |
| **TVRD** | DR Green Taxonomy | Solar + BESS eligible categories ✅ |
| **SPO** | Second Party Opinion | Independent verification ⬜ |

---

*This workflow should be used as the master schedule for green bond issuance. All phases can be parallelized where noted by dotted lines.*
