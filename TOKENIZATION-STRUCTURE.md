# TOKENIZATION STRUCTURE — SunFarm PV

## Overview

SunFarm Digital, S.R.L. (Token SPV) issues revenue-participation tokens representing a defined share of Net Distributable Cash from the 50 MW photovoltaic project. This is NOT equity. This is NOT a security that represents ownership in the project. This is a contractual right to a portion of distributable cash flow.

## Token Economics

| Parameter | Value |
|---|---|
| Issuer | SunFarm Digital, S.R.L. |
| Token Standard | ERC-20 compatible (or book-entry) |
| Target Raise | $15,000,000 |
| Token Price | $100 per token |
| Total Supply | 150,000 tokens |
| Minimum Investment | $1,000 (10 tokens) |
| Preferred Return | 8.0% per annum |
| Revenue Participation | 20.0% of Net Distributable Cash |
| Distribution Frequency | Quarterly |
| Term | 25 years (co-terminus with concession) |
| Lock-up | 12 months |
| Transfer | Restricted — qualified buyers only |

## Legal Framework

### Entity Separation

```
HoldCo (Governance)
  ├── LandCo (Title Holder)         ← No token exposure
  ├── Energy SPV (Concession)       ← No token exposure
  └── Token SPV (Issuer)            ← Only entity with token obligations
```

Token SPV receives cash via intercompany distribution from HoldCo. Token SPV does not own, operate, or have any claim to:
- Land title
- Energy concession
- PPA contract
- BESS assets
- Grid interconnection

### Regulatory Compliance

| Jurisdiction | Framework | Approach |
|---|---|---|
| United States | SEC Reg D 506(c) | Accredited investors, no general solicitation, Form D filing |
| Dominican Republic | CNV | Structured as contractual participation right |
| EU / International | MiFID II consideration | Excluded — non-EU issuer, non-EU assets |

### Required Filings & Documents

1. **Private Placement Memorandum (PPM)** — Full risk disclosure, 25-year pro forma
2. **Subscription Agreement** — Investor suitability, accreditation verification
3. **Operating Agreement (Token SPV)** — Waterfall mechanics, distribution triggers
4. **Servicing Agreement** — Token SPV ↔ HoldCo cash transfer mechanics
5. **Form D** — SEC filing within 15 days of first sale
6. **Blue Sky Filings** — State-by-state as required
7. **KYC/AML Documentation** — Per BSA/AML requirements

## Waterfall Mechanics

### Step-by-Step Cash Flow

```
GROSS REVENUE (Energy SPV)
  │
  ├─ Step 1: Pay Operating Expenses
  │   O&M: ~$600K/yr (escalating)
  │   Insurance: ~$75K/yr
  │   Land lease to LandCo: ~$193K/yr (escalating)
  │   Admin/Legal: ~$100K/yr
  │
  ├─ Step 2: Pay Senior Debt Service
  │   Annual: ~$3.16M (Years 1-18)
  │   Priority: Absolute — no skip, no defer
  │
  ├─ Step 3: Fund Operating Reserve
  │   Target: 6 months of OpEx (~$500K)
  │   Funded from FCF until target reached
  │   Auto-replenish if drawn
  │
  ├─ Step 4: Token Distribution
  │   Calculation: MAX(20% × NDC, 8% × $15M)
  │   Floor: $1.2M per year (8% × $15M)
  │   Ceiling: 30% of quarterly FCF
  │   Gate: No distribution if DSCR < 1.20x
  │
  └─ Step 5: Common Equity Distribution
      Recipient: HoldCo (sponsor/founders)
      Amount: All remaining NDC after Steps 1-4
```

### Distribution Math Example (Year 5 Base Case)

| Line Item | Amount |
|---|---|
| Gross Revenue | $14.02M |
| Less O&M | ($0.92M) |
| EBITDA | $13.10M |
| Less Debt Service | ($3.16M) |
| Less Reserve Funding | ($0.00M) |
| **Net Distributable Cash** | **$9.94M** |
| Token Share (20% of NDC) | $1.99M |
| 8% Preferred Floor | $1.20M |
| **Token Distribution** | **$1.99M** (higher of 20% NDC vs 8% pref) |
| Common Equity | $7.95M |

## Projected Token Returns

### Base Case

| Year | NDC ($M) | Token Dist ($M) | Cum Token ($M) | Token Yield |
|---|---|---|---|---|
| 1 | 9.18 | 1.84 | 1.84 | 12.2% |
| 3 | 9.55 | 1.91 | 5.61 | 12.7% |
| 5 | 9.93 | 1.99 | 9.45 | 13.2% |
| 10 | 10.94 | 2.19 | 19.71 | 14.6% |
| 15 | 12.04 | 2.41 | 30.78 | 16.1% |
| 20 | 16.41 | 3.28 | 44.87 | 21.9% |
| 25 | 17.72 | 3.54 | 62.66 | 23.6% |

### Stress Test — 10% Revenue Reduction

| Metric | Base | Stress |
|---|---|---|
| 25-Year Token IRR | ~14% | ~10% |
| Token Multiple | ~4.2x | ~3.2x |
| Payback Period | Year 6 | Year 8 |
| Min Annual Distribution | $1.2M | $1.2M (floor) |

### Stress Test — 20% Revenue Reduction

| Metric | Base | Stress |
|---|---|---|
| 25-Year Token IRR | ~14% | ~7% |
| Token Multiple | ~4.2x | ~2.5x |
| Payback Period | Year 6 | Year 10 |
| Min Annual Distribution | $1.2M | $1.2M (floor) |

## Token Lifecycle

### Phase 1: Pre-Issuance (Months 0-6)
- Legal entity formation (Token SPV)
- PPM drafting and legal review
- SEC Form D preparation
- KYC/AML infrastructure
- Smart contract audit (if on-chain)

### Phase 2: Offering (Months 6-12)
- Accredited investor outreach
- Subscription processing
- KYC/AML verification
- Fund collection into escrow
- Token issuance upon COD

### Phase 3: Operations (Years 1-25)
- Quarterly waterfall calculation
- Distribution processing
- Annual audit and reporting
- Investor portal access
- Annual performance report

### Phase 4: Wind-Down (Year 25)
- Final distribution
- Token redemption / cancellation
- Token SPV dissolution
- Final reporting

## Risks Specific to Token Holders

1. **Subordination** — Tokens are junior to senior debt
2. **No governance** — No voting on project operations
3. **Revenue dependency** — Distributions reduce with revenue
4. **Illiquidity** — 12-month lock-up, restricted transfer
5. **Regulatory** — SEC classification risk
6. **FX exposure** — Revenue in USD but may shift
7. **Concession risk** — If concession revoked, revenue stops
8. **Technology risk** — Degradation may exceed projections

*Full calculations: `node models/token-waterfall.js`*
