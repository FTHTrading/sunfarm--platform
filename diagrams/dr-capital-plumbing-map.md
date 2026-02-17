# DR Capital Plumbing Map

> Mermaid diagram showing all DR regulatory entities, capital channels, and their interconnections for SunFarm PV.

```mermaid
flowchart TB
    subgraph GOV["🇩🇴 Dominican Republic Government"]
        PRES["Presidency<br/>Decreto Confirmatory"]
        MEE["Ministry of<br/>Energy & Mines"]
        MOENV["Ministry of<br/>Environment"]
        DGII["DGII<br/>Tax Authority"]
        DGAPP["DGAPP<br/>PPP Authority"]
    end

    subgraph REG["Energy Regulators"]
        CNE["CNE<br/>Concession Authority"]
        SIE["SIE<br/>Electricity Regulator"]
        ETED["ETED<br/>Transmission Operator"]
    end

    subgraph CAP["Capital Markets"]
        SIMV["SIMV<br/>Securities Regulator"]
        BVRD["BVRD<br/>Stock Exchange"]
        CEVALDOM["CEVALDOM<br/>Central Custody"]
        AFP["AFPs<br/>Pension Funds<br/>$15B+ AUM"]
        INS["Insurance Co.<br/>MAPFRE, Seguros<br/>Reservas, etc."]
    end

    subgraph INTL["International Capital"]
        IFC["IFC<br/>World Bank"]
        IDB["IDB Invest"]
        DFC["U.S. DFC"]
        GCF["Green Climate<br/>Fund"]
        MIGA["MIGA<br/>PRI"]
        ECA["ECAs<br/>(Euler Hermes,<br/>SINOSURE, K-sure)"]
        ESG["ESG / Impact<br/>Funds"]
    end

    subgraph PROJ["SunFarm PV Project"]
        SPV["Energy SPV"]
        LAND["LandCo SPV"]
        HOLD["HoldCo"]
        TRUST["Fideicomiso<br/>de Oferta Pública"]
    end

    %% Regulatory flows
    CNE -->|"Concession<br/>CNE-CD-003-2023"| SPV
    SIE -->|"Tariff oversight<br/>SIE-119-2022-RCD"| SPV
    ETED -->|"Grid connection<br/>138kV POI"| SPV
    MOENV -->|"EIA License<br/>0379-20"| SPV
    DGII -->|"Tax exemption<br/>Ley 57-07"| SPV
    PRES -->|"Decreto"| CNE
    MEE -->|"Policy"| CNE
    MEE -->|"Policy"| SIE

    %% PPP pathway
    DGAPP -.->|"Optional PPP<br/>Law 47-20"| SPV

    %% Capital Markets flows
    SIMV -->|"Regulates"| TRUST
    TRUST -->|"Lists securities"| BVRD
    BVRD -->|"Custody"| CEVALDOM
    AFP -->|"Invests in trust<br/>certificates"| TRUST
    INS -->|"Invests in trust<br/>certificates"| TRUST
    TRUST -->|"Proceeds"| SPV

    %% International flows
    IFC -->|"A/B Loan<br/>$12-30M"| HOLD
    IDB -->|"Senior debt<br/>$10-25M"| HOLD
    DFC -->|"Direct loan<br/>+ PRI"| HOLD
    GCF -->|"Concessional<br/>+ first-loss"| HOLD
    MIGA -->|"Political Risk<br/>Guarantee"| HOLD
    ECA -->|"Equipment<br/>finance"| SPV
    ESG -->|"Green bond /<br/>impact investment"| HOLD

    %% SPV structure
    HOLD -->|"Owns 100%"| SPV
    HOLD -->|"Owns 100%"| LAND
    SPV -->|"Revenue"| TRUST

    style GOV fill:#1e3a5f,color:#fff
    style REG fill:#2d5016,color:#fff
    style CAP fill:#5c2d91,color:#fff
    style INTL fill:#8b4513,color:#fff
    style PROJ fill:#c41e3a,color:#fff
```

---

*This diagram maps the complete regulatory and capital plumbing for SunFarm PV in the Dominican Republic. All entities shown are real institutions with defined roles in the project lifecycle.*
