# HYBRID TOKEN-BOND STRUCTURE

## SunFarm PV 50 MW — Digital Bond Wrapper

---

## Concept

A hybrid structure that issues a conventional green bond and tokenizes the bond instrument for digital distribution, secondary market trading, and fractional ownership. The underlying economics remain identical to a traditional bond — the token wrapper adds liquidity and distribution efficiency.

This is not a speculative token. This is a digital bond.

---

## Structure Overview

```
┌───────────────────────────────────────────────────────────┐
│                    Green Bond (Issuer)                      │
│               SunFarm Energy SPV                           │
│          $25-50M, 15-year, semi-annual coupon              │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  Traditional Tranche ──────── 70-80%  │  Direct placement │
│  Institutional buyers: IFC, pension    │  to qualified      │
│  funds, insurance companies            │  investors          │
│                                                            │
│  Digital Bond Tranche ─────── 20-30%  │  Tokenized on      │
│  Token wrapper: Reg D 506(c)          │  compliant          │
│  secondary trading enabled            │  platform           │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## Regulatory Framework

| Jurisdiction | Framework | Requirements |
|---|---|---|
| **United States** | Reg D 506(c) | Accredited investors only, general solicitation permitted |
| **International** | Reg S | Non-U.S. persons, offshore transaction |
| **Combined** | Reg D / Reg S dual structure | U.S. accredited + international qualified investors |

### Compliance Requirements

- Transfer agent registration
- KYC/AML verification for all token holders
- Transfer restrictions enforced at smart contract level
- Accredited investor verification (Rule 506(c) requirements)
- Reg S lockup period for flowback prevention (40 days / 1 year)

---

## Platform Assessment

| Platform | Type | Strengths | Considerations |
|---|---|---|---|
| **Securitize** | U.S.-regulated transfer agent, ATS | SEC-registered, institutional adoption, Reg D/S compliant | Market leader for tokenized securities |
| **tZERO** | Alternative trading system | SEC-registered ATS, secondary trading | Owned by Overstock, institutional focus |
| **Centrifuge** | DeFi-native RWA protocol | On-chain origination, MakerDAO integration | More crypto-native, less institutional |
| **XRPL** | Layer 1 blockchain | Low fees, institutional adoption (Ripple partnerships) | Fewer compliance tooling options |
| **Polygon** | Layer 2 Ethereum | Institutional partnerships, low fees | Requires compliance overlay |

**Recommendation**: Securitize — most mature regulatory framework, SEC-registered, proven track record with real estate and infrastructure tokenization.

---

## Digital Bond Economics

| Parameter | Value |
|---|---|
| Total bond size | $25,000,000 (illustrative) |
| Digital tranche | $5,000,000 - $7,500,000 (20-30%) |
| Minimum digital bond purchase | $10,000 |
| Token denomination | $1,000 per token |
| Total digital bond tokens | 5,000 - 7,500 |
| Coupon pass-through | Semi-annual, same as traditional tranche |
| Secondary trading | Platform ATS (Securitize Markets or tZERO) |
| Settlement | T+1 (vs T+2 traditional) |

---

## Liquidity Premium Analysis

| Scenario | Traditional Bond Spread | Digital Bond Spread | Liquidity Benefit |
|---|---|---|---|
| No secondary market | SOFR + 300 bps | N/A | N/A |
| ATS secondary trading | SOFR + 300 bps | SOFR + 275 bps | -25 bps |
| Active secondary market | SOFR + 300 bps | SOFR + 250 bps | -50 bps |
| Deep secondary + DeFi composability | SOFR + 300 bps | SOFR + 225 bps | -75 bps |

Estimated liquidity premium for the digital tranche: -25 to -50 bps vs. comparable non-traded instruments.

---

## Compliance Architecture

```
Investor Onboarding
├── KYC/AML Verification (Securitize ID)
├── Accredited Investor Verification (Verify Investor / Parallel Markets)
├── Subscription Agreement Execution (DocuSign)
└── Wallet Provisioning (Custodial or self-custody)

Token Transfer Rules
├── Whitelist-only transfers (smart contract enforced)
├── Reg D transfer restrictions (1-year holding period for U.S.)
├── Reg S flowback prevention (40-day distribution compliance period)
├── Maximum holder limits (configurable per offering)
└── Forced transfer capability (regulatory compliance, estate settlement)
```

---

## Comparison: Pure Token vs. Digital Bond

| Feature | Token SPV (Current) | Digital Bond (Proposed) |
|---|---|---|
| Instrument | Revenue-share security | Fixed-income debt security |
| Return structure | 8% preferred + 20% participation | Fixed coupon (6.5-8.5%) |
| Maturity | 25-year life | 15-year with amortization |
| Senior/subordinated | Subordinated to debt | Senior secured (pari passu with bonds) |
| Investor base | Accredited individuals | Institutions + accredited individuals |
| Market perception | Alternative / emerging | Established / institutional |
| Regulatory clarity | Moderate (Reg D security token) | High (digital bond = bond) |

---

## Implementation Path

| Phase | Duration | Deliverable |
|---|---|---|
| 1. Platform selection | 4 weeks | Signed agreement with Securitize or tZERO |
| 2. Legal structuring | 8-12 weeks | Offering memorandum, transfer agent agreement |
| 3. Smart contract development | 4-6 weeks | ERC-1400 or platform-native token contract |
| 4. Compliance integration | 4 weeks | KYC/AML, accreditation, transfer restrictions |
| 5. Investor onboarding | 4-8 weeks | Marketing (Reg D 506(c) permits general solicitation) |
| 6. Issuance | 2 weeks | Token minting, distribution to investors |
| 7. Secondary trading | Post-issuance | ATS listing, market making |

---

*Structure is indicative. Final terms subject to securities counsel review, platform selection, and regulatory confirmation. Digital bond issuance must not conflict with green bond covenants or SPV restrictions.*
