# SPV Structure — Token SPV

## SunFarm Digital, S.R.L.

### Purpose

Token SPV is the sole entity authorized to issue revenue-participation tokens. It receives a defined percentage of Net Distributable Cash from HoldCo and distributes to token holders per waterfall logic. It holds NO land title, NO concession, NO PPA, and NO direct project assets.

### Token Design

| Parameter | Value |
|---|---|
| Entity | SunFarm Digital, S.R.L. |
| Token Type | Revenue-share / Preferred participation |
| Target Raise | $15,000,000 |
| Token Price | $100 |
| Total Tokens | 150,000 |
| Min Investment | $1,000 (10 tokens) |
| Preferred Return | 8.0% annually |
| Revenue Participation | 20% of Net Distributable Cash |
| Distribution | Quarterly |
| Term | Co-terminus with concession (25 years) |

### Waterfall Priority

```
Total Revenue
  │
  ├─ 1. Operating Expenses (O&M, insurance, land lease)
  │
  ├─ 2. Senior Debt Service (principal + interest)
  │
  ├─ 3. Operating Reserve (6 months OpEx buffer)
  │
  ├─ 4. Token Preferred Distribution
  │     → Greater of: (Rev Participation %) OR (Preferred Return × Token Capital)
  │
  └─ 5. Common Equity Distribution
        → Remainder to HoldCo / sponsors
```

### Structural Protections

- **No land title exposure** — Token SPV never owns real property
- **No concession risk** — Concession stays at Energy SPV
- **No construction risk** — Tokens issued post-COD only
- **Reserve protection** — 6-month OpEx buffer before any distribution
- **DSCR gate** — No token distribution if DSCR < 1.20x
- **Distribution cap** — Maximum 30% of FCF in any single quarter
- **Audit requirement** — Annual third-party audit of waterfall calculations

### Token Holder Rights

1. Quarterly distribution per waterfall
2. Access to data room (read-only)
3. Annual project performance report
4. Voting on material modifications to waterfall terms
5. No governance rights over project operations

### Token Holder Restrictions

1. No voting on Energy SPV operations
2. No claim on land assets (LandCo)
3. No acceleration rights
4. Transfer restrictions per applicable securities law
5. Lock-up period: 12 months from issuance

### Tax Treatment

- Token distributions treated as investment income
- Ley 57-07 tax exemptions flow to Energy SPV (not Token SPV)
- Token SPV is a pass-through for DR tax purposes
- US token holders subject to US tax on distributions (1099 reporting)

### Securities Compliance

| Requirement | Approach |
|---|---|
| US Securities | Reg D 506(c) — Accredited investors only |
| KYC/AML | Third-party provider (e.g., Jumio, Onfido) |
| Transfer Agent | Licensed digital transfer agent |
| Custody | Qualified custodian for token issuance |
| Disclosure | PPM with 25-year pro forma, risk factors |

### Projected Returns (Base Case)

| Metric | Value |
|---|---|
| Token IRR | ~12-15% |
| Token Multiple | ~3.5-4.5x |
| Payback Period | Year 5-7 |
| Total 25-Year Distribution | ~$50-65M |

### Stress Test (10% Revenue Decline)

| Metric | Base | Stress |
|---|---|---|
| Token IRR | ~14% | ~10% |
| Token Multiple | ~4.0x | ~3.0x |
| Payback Period | Year 6 | Year 8 |

*See `models/token-waterfall.js` for full deterministic calculations.*
