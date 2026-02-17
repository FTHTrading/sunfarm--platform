# Fideicomiso Workflow

> Mermaid diagram showing the cashflow routing from SunFarm PV through the fideicomiso de oferta pública to DR institutional investors.

```mermaid
flowchart LR
    subgraph REVENUE["Revenue Sources"]
        PPA["PPA Revenue<br/>$7.6M/yr"]
        BESS_REV["BESS Revenue<br/>$4.56M/yr"]
        CARBON["Carbon Credits<br/>$0.95M/yr"]
    end

    subgraph SPV_LAYER["SPV Structure"]
        ESVP["Energy SPV<br/>(Generator)"]
    end

    subgraph TRUST["Fideicomiso de Oferta Pública"]
        FIDU["Fiduciary Agent<br/>(Universal / Popular /<br/>Reservas / BHD)"]
        COLL["Collection<br/>Account"]
        DSRA["Debt Service<br/>Reserve (6mo)"]
        MAINT["Maintenance<br/>Reserve"]
        DIST["Distribution<br/>Account"]
    end

    subgraph WATERFALL["Payment Waterfall"]
        W1["1. Operating Expenses<br/>& Taxes"]
        W2["2. Senior Debt<br/>Service (P+I)"]
        W3["3. DSRA Top-Up<br/>(to 6-month minimum)"]
        W4["4. Maintenance<br/>Reserve Top-Up"]
        W5["5. Cash Sweep<br/>(if DSCR < 1.15x LLCR)"]
        W6["6. Investor<br/>Distributions"]
    end

    subgraph INVESTORS["DR Institutional Investors"]
        AFP_INV["AFPs<br/>(40-50% allocation)<br/>$15B+ AUM"]
        INS_INV["Insurance Companies<br/>(15-25% allocation)"]
        BANK_INV["Banks<br/>(15-20% allocation)"]
        FO_INV["Family Offices<br/>(10-15% allocation)"]
    end

    subgraph MARKET["Market Infrastructure"]
        SIMV_REG["SIMV<br/>Regulates"]
        BVRD_LIST["BVRD<br/>Lists Securities"]
        CEVALDOM_CUST["CEVALDOM<br/>Custodies"]
        RISK_RATE["Rating Agency<br/>(Feller Rate /<br/>Pacific Credit)"]
    end

    %% Revenue into SPV
    PPA --> ESVP
    BESS_REV --> ESVP
    CARBON -.->|"Conditional"| ESVP

    %% SPV to Trust
    ESVP -->|"Revenue Assignment<br/>(irrevocable)"| COLL

    %% Trust internal flows
    COLL --> FIDU
    FIDU --> W1
    W1 --> W2
    W2 --> W3
    W3 --> W4
    W4 --> W5
    W5 --> W6
    W3 --> DSRA
    W4 --> MAINT
    W6 --> DIST

    %% Distribution to investors
    DIST --> AFP_INV
    DIST --> INS_INV
    DIST --> BANK_INV
    DIST --> FO_INV

    %% Market infrastructure
    SIMV_REG -.->|"Approves"| FIDU
    FIDU -.->|"Lists certificates"| BVRD_LIST
    BVRD_LIST -.->|"Custody"| CEVALDOM_CUST
    RISK_RATE -.->|"Rates trust<br/>certificates"| FIDU

    %% DSCR Triggers
    W2 -.->|"If DSCR ≥ 1.50x →<br/>Normal distribution"| DIST
    W2 -.->|"If DSCR 1.30-1.50x →<br/>Cash trap"| DSRA
    W2 -.->|"If DSCR < 1.10x →<br/>Cure period"| CURE["Cure Event<br/>(90 days)"]

    style REVENUE fill:#198754,color:#fff
    style SPV_LAYER fill:#c41e3a,color:#fff
    style TRUST fill:#0d6efd,color:#fff
    style WATERFALL fill:#6f42c1,color:#fff
    style INVESTORS fill:#fd7e14,color:#fff
    style MARKET fill:#495057,color:#fff
```

---

## Trust Certificate Structure

| Attribute | Detail |
|---|---|
| **Instrument** | Cuotas de Participación (Participation Certificates) |
| **Type** | Senior Fixed-Income — Green Labeled (TVRD) |
| **Currency** | USD |
| **Target Size** | $15–30M |
| **Tenor** | 10–15 years |
| **Coupon** | 7.5–9.5% fixed (USD) |
| **Rating** | Target: investment-grade (DR scale) |
| **Listing** | BVRD |
| **Custody** | CEVALDOM |
| **Tax** | Exempt under Ley 57-07 (subject to counsel confirmation) |

---

*This diagram should be used in investor presentations and fideicomiso structuring discussions with fiduciary providers.*
