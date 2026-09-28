# STORE RULES & POLICIES — valostock.id

**Store-Only Marketplace (Shopee-style) · Seller/Store Handbook**
Version 1.0 · Modeled ~90% on iGV, adapted to valostock.id features

> **Prototype scope (v7).** This project is a college-assignment prototype running locally on XAMPP. Implemented: auth (email + password), catalog, top-up + closed-loop Balance + invoice check, account purchase → escrow → rekber → complete, store onboarding with **manual admin verification** (no KYC provider), store catalogs/orders/balance/withdrawal requests, admin approvals. **Simulated:** Digiflazz fulfilment and Midtrans Iris payouts. **Midtrans Snap** runs in Sandbox (or a built-in simulation mode). Everything else in this document is **future work** — see `ARCHITECTURE.md` §10. System modelling: `docs/modeling/` (Data Flow approach).


> On valostock.id, only **verified Stores** sell. Buyers browse and buy freely (no identity check). This document is the complete rulebook for stores: fees, onboarding, membership, reputation, selling, disputes, withdrawal, deposit, penalties, and notifications.

---

## 1. THE MODEL IN ONE LINE

valostock.id is a marketplace where **admin-verified Stores** list and sell game accounts (and top-up). The platform provides escrow, in-app chat, a direct-offer/negotiation system, a supervised "rekber" (escrow) room, dispute arbitration, and notifications. The platform is a **service provider**, not the seller — like Shopee.

---

## 2. FEE STRUCTURE (Final)

Three simple, transparent charges. No posting fees, no hidden tiers.

| Charge | Amount | Paid by | How |
|---|---|---|---|
| **Platform commission** | **5%** of item price | Store (deducted) | Automatically on order completion |
| **Handling fee (payment channel)** | **~3.5%** of item price | Buyer (added) | Shown at checkout as "biaya penanganan" |
| **Store deposit** | **Rp 500.000** | Store (once) | Security guarantee, refundable (see §10) |
| Store verification | **Free** | — | Manual review by a platform admin |
| Withdraw fee | Rp 4.000 | Store | On each withdrawal |
| Bank transfer tax | Rp 2.500 | Store | If withdrawing to bank |

### Worked example — account sold for Rp 500.000
```
Buyer pays:      500.000 + handling 3.5% (17.500)  = 517.500
Payment channel: ~17.500  (covered by buyer, break-even)
Platform commission: 5% × 500.000 = 25.000  ← platform profit
Store receives:  500.000 − 25.000 = 475.000
```
The commission is always a % of the **final** price — so negotiation (offers) up or down is handled automatically, with no way to game it.

> Premium tiers can lower the commission (see §4). All numbers configurable in MONEY_RULES.md.

---

## 3. BECOMING A STORE

1. **Register** with a valid, active email (used for verification, order alerts, withdrawals).
2. **Enter the owner's legal name** (as on the ID card) — used for manual verification and to match withdrawal accounts. **Free.**
3. **Pay the security deposit** (Rp 500.000) via Midtrans — the store then waits for **admin verification**.
4. **Fill store info** — store name (no personal contact info), **product categories** (Accounts, Top-Up — Phase 1), estimated monthly revenue, online contact, and whether you **operate an external business website** (this flags a **Reseller Store**).
5. **Accept** the Transaction Agreement + Privacy Policy.
6. **Admin approves → store ACTIVE → start listing.** (Rejected stores see the admin's note.)

> Age/eligibility: stores must be operated by an adult with valid ID. The deposit + manual identity verification filter out non-serious sellers and scammers.

---

## 4. STORE PREMIUM MEMBERSHIP

A paid subscription that unlocks selling power. Benefits stack upward.

| Benefit | Free | Pro (Rp 99K/mo) | Business (Rp 299K/mo) |
|---|---|---|---|
| **Commission rate** | 5% | 4.5% | 4% |
| Active listings | up to 15 | up to 60 | Unlimited |
| Store badge | — | ✓ Pro badge | ✓ Business badge |
| Analytics (views, conversion, best-sellers) | — | ✓ | ✓ Advanced |
| Bulk upload | — | ✓ | ✓ |
| Free featured/ads slots per month | — | 2 | 6 |
| Search ranking boost | — | Small | Priority |
| API access | — | — | ✓ |
| Priority support | — | Standard | ✓ Priority |
| Priority dispute handling | — | — | ✓ |

**Design logic:** the strongest lever is **lower commission + more listings + free featured slots**. A store selling volume will calculate: "4% vs 5% on millions in sales + 6 free ads = Business pays for itself." This attracts the highest-earning stores — exactly the ones that generate the most for the platform (the Tokopedia Power Merchant model).

> Premium is separate from **reputation** (§5), which is earned, not bought.

---

## 5. REPUTATION — SELLER RATING & SERVICE SCORE

Earned trust, shown to buyers before they order. Cannot be bought.

**Overall Seller Rating** — after each successful order, the buyer leaves one overall review:
- Positive = +1 · Neutral = 0 · Negative = −1.

**Service Score** — buyers rate three dimensions after completion:
1. **Description accuracy** (item matches listing)
2. **Service attitude** (communication)
3. **Delivery speed**

**Where shown:** store homepage + product pages, so buyers can compare stores.

**How to improve:** keep descriptions accurate, reply fast, deliver on time, avoid after-sales issues. Consistent quality lifts both scores over time.

**Review integrity (forbidden):**
- Pressuring/manipulating buyers to change reviews.
- Creating fake orders to inflate own rating or attack a competitor.
- Demanding refunds/gifts in exchange for removing negative feedback.
- Profane/contact-sharing/diverting content in reviews.

Violations → penalties up to permanent ban. Stores may **reply once** to each review professionally.

---

## 6. BEFORE SALE — LISTING RULES

**Choose the right category:** match the real product type (Account / Top-Up / etc.), correct game, server, region, platform. Do not mis-categorize for exposure — it lowers conversion and causes disputes.

**Write a clear description:** state exactly what the buyer receives — rank, skins/VP, region, agents, email access, delivery method, and any requirements. Avoid vague wording.

**Account listing specifics:** the platform issues the **catalog ID** (prefix `VS`, e.g. `VS001`). One account = one catalog; it cannot be listed twice → no double-sell.

**Optional account check (for trust):** the store may submit an account for **inspection** — the store logs in (login only, never changing email/password), verifies authenticity, skin list, no restrictions, matches description; the seller keeps 2FA on. Recorded with checklist + timestamp + media → **"Account Checked"** badge. Never use "100% original/safe".

**Review before publishing:** double-check category, title, price, delivery notes.

---

## 7. SELLING FLOW & FEATURES

1. **Listing goes live** (optionally boosted via ads/featured).
2. **Direct offer / negotiation (core feature):** a buyer taps **"Tawar"** in chat → an offer form opens → submits. The store can **Accept / Counter-offer / Reject**. Offers have an **expiry** and status (PENDING / ACCEPTED / REJECTED / EXPIRED). On Accept (Yes/No popup) → price & listing lock.
3. **Buy:** buyer buys directly, or after an accepted offer. Optional **Lock (Rp 5.000)** reserves the account 30 minutes; buyers may also buy immediately without lock.
4. **Payment → escrow** (buyer pays via Midtrans; the store's share is held in its escrow balance until the account is safe). After payment, a **Rekber Room** opens (ID = catalog ID, e.g. `VS001`), **supervised by admin**, separate from normal chat.
5. **Delivery** happens in the Rekber Room; the store delivers account access. Buyer changes email/password/2FA and inspects.
6. **Complete:** buyer confirms → funds settle to the store; buyer leaves a rating.

**Chat rules (normal chat vs rekber room):**
- **Normal chat** = questions only. Forbidden: transacting, sharing email, sharing phone numbers, off-platform links.
- **Rekber room** = official transaction, supervised, the dispute evidence trail.

**Mandatory buyer protection (Rp 5.000, included every order):**
- Account **≤ Rp 10jt** → **14-day** support & security window.
- Account **> Rp 10jt** → **30-day** window.
- Protection = support/dispute handling & recall assistance — **not** a fund hold. Payout still releases 5 hours after the account is safe.
- **Optional extra protection** (e.g. extended rekber window) may be added on top at checkout.

---

## 8. AFTER SALE

**Buyer hasn't confirmed?** Keep your delivery proof (screenshots, in-game mail, transfer records). Politely follow up in the order. If the buyer doesn't respond, the order **auto-confirms after the warranty/inspection window (default 5 hours after the buyer receives the email code; up to a few days for protected orders)**.

**Delivery evidence (required):** stores must record and keep before/after screenshots (and video kept ≥ 1 month). Evidence is the basis of dispute protection.

**Disputes:** either party must file within **72 hours** of the other's claim, through the in-platform Dispute system only. Submit a complete statement + valid evidence early. If both sides can't agree, the platform **arbitrates as final**. Watch your inbox/email — missing a deadline may be treated as accepting the buyer's claim.

**Dispute outcomes** follow the Responsibility Matrix (store at fault → refund buyer, possible deposit deduction; buyer false claim → release to store + buyer trust down).

---

## 9. WITHDRAWAL

- Stores withdraw only to an account belonging to the **same verified identity** (**Account Validation**: account holder name must match the verified owner legal name).
- Add/select a payout account, enter amount, review, submit → get a request number.
- Withdraw fee Rp 4.000 (+ Rp 2.500 bank tax if bank). After a platform admin approves the request, Midtrans Iris executes the transfer.
- **Delays/cancellations:** gateway issues, wrong account details, insufficient balance, holidays, or maintenance. Failed withdrawals return to available balance — fix account info and resubmit.

---

## 10. DEPOSIT RIGHTS & REFUND POLICY

The deposit is a **security measure**, not a prepayment for services.

**Refund eligibility (ALL must be true):**
- Account in good standing.
- No active disputes/investigations/complaints.
- All orders completed and out of warranty.
- No penalties, debts, chargebacks, or unresolved claims owed.
- Store has formally initiated closure and stopped selling.

**Process:** contact support → platform reviews (sole discretion) → refund to original method within a reasonable period, minus any amounts withheld.

**Non-refundable / deductible when:**
- Permanent ban for rule/law violations.
- Used to offset penalties, fines, or buyer compensation.
- Fraud, deception, or serious verified complaints.
- Legal/regulatory retention required.

**Platform's right to deduct:** the platform may deduct from the deposit any amounts the store owes — penalties, buyer compensation, unpaid fees, damages.

---

## 11. PENALTY RULES

Violations may trigger one or more, scaling with severity:
- Quote/order cancellation.
- Reputation penalty (loss of rating/badge).
- Monetary fine **taken from the deposit**.
- Listing restrictions.
- Account suspension (e.g. 30 days) or **permanent termination**.
- Confiscation of payment, returned to buyer.
- Blacklist (device / identity / bank) for repeat offenders.
- Prosecution for fraud; data provided to authorities per due process.

If a buyer refund results from a **store error**, the store may incur a fine (e.g. 10% of the refund) per the agreement.

---

## 12. ZERO TOLERANCE FOR FRAUD

Prohibited:
- Listing fake accounts or confirming delivery when none happened.
- False prices or duplicate listings to disrupt the market.
- Encouraging **off-platform** transactions/payments (removes protection AND platform commission).
- Advertising other sites or redirecting buyers away.
- Sharing/requesting unnecessary personal info; harassment or threats.

Confirmed fraud → listing restrictions, deposit fine, suspension, or permanent ban + legal action. **Keep all communication, delivery, and payment inside valostock.id.**

---

## 13. NOTIFICATIONS (Store Alerts)

Stores can connect external alerts so they never miss a buyer — **notifications only** (all transactions still happen in-app):

- **WhatsApp notifications** (via WhiskeySockets/Baileys): "You have a new buyer / new offer / order paid / dispute opened." Sent to the store's registered WhatsApp.
- **Discord notifications:** connect a Discord webhook/bot to receive the same alerts in a channel.

> These are one-way alerts. Offers, chat, delivery, and disputes are handled inside the platform (Rekber Room / in-app chat), not over WhatsApp/Discord — keeping the evidence trail intact.

---

## 14. TRANSACTION AGREEMENT (Summary)

By listing on valostock.id, the store agrees to: provide accurate information; deliver within the guaranteed time via the chosen method; keep delivery evidence; communicate only in-order; never confirm delivery before it's done; never solicit off-platform trades; accept the platform's final arbitration; and accept that the deposit secures compliance. The platform: verifies buyers/stores/payments; holds buyer payment until completion; refunds improperly delivered orders; protects stores from payment fraud; pays the store after deducting fees; and reserves legal rights against fraud.

> A full, lawyer-validated Terms of Service is required before launch. This summary is operational guidance, not the final legal text.

## 15. STORE TYPES (Owner vs Reseller)

Buyers must be able to tell how a store operates, so every store carries a **type badge**:

- 🏷️ **Owner Store** — sells accounts it owns itself. Full control, lower risk.
- 🔄 **Reseller Store** — sells accounts consigned by **external sellers** (people who contact the store off-platform to list their account). There is a middleman, so buyers are made aware.

**Responsibility (critical):** for a Reseller Store, the **store carries full responsibility** for its external sellers — verifying their identity (KTP), checking account authenticity, and any buyer harm. The platform deals only with the **store**: buyers report and rate the **store**, and the platform sanctions the **store** (rating, deposit deduction, suspension). The platform never manages the external seller directly. This keeps accountability clean and enforceable via the store's deposit + verified identity.

## 16. RESELLER TOOLING

For Reseller Stores managing external sellers:

- **External seller records** — the store registers its sellers (alias, their KTP held by the store, payout account). Held privately.
- **Transfer Request (pay the external seller):** after an account is **safe (5 hours)**, the store can add a transfer request for that sold catalog → input the seller's bank/e-wallet. **Account Validation recognizes the holder name** before sending. Funds are **debited from the store's own available balance** and paid out via Midtrans Iris after admin approval (the store is the responsible party toward its external seller). **Transfer fee Rp 4.000** (covers the Iris payout), deducted from the payout or borne by the store.
- **External-seller notifications** — the store can send a "your account sold — fill the payout form" alert to its external seller via WhatsApp (Baileys), so off-platform sellers are notified through the store.

## 17. NOTIFICATIONS (Store Alerts, one-way)

Stores connect external alerts so they never miss a buyer — **notifications only** (all transactions stay in-app):

- **WhatsApp** (WhiskeySockets/Baileys) — new buyer, new offer, order paid, dispute opened; and reseller "account sold" alerts to external sellers.
- **Discord** — connect a webhook/bot for the same alerts in a channel.
- **Telegram** — connect a Telegram bot for stores that operate on Telegram.

> One-way alerts only. Offers, chat, delivery, disputes happen inside the platform (Rekber Room / in-app chat), preserving the evidence trail.

## 18. SHOPEE-STYLE FEATURES

Buyer-facing engagement & discovery:

- **Advanced search & filter** — by game, rank, price, skins/VP, region, platform (essential for accounts).
- **Wishlist / favorite** + **price-drop notifications**.
- **Follow store** — updates when a followed store posts new listings.
- **Recently viewed** & **personalized recommendations** ("accounts like this").
- **Category per game** (Valorant / MLBB / …) with game-specific filters.
- **Trending / best-selling** per game.
- **Loyalty points** — buyers earn points per purchase, redeem for discounts.

Store-facing:

- **Store vouchers / discounts** — stores issue their own codes (percent/fixed, min-spend, quota).
- **Flash sale / promo** — time-limited discounts to drive urgency.
- **Bundles** — sell several accounts together.
- **Custom store homepage** — banner, description, curated showcase.
- **Bulk operations** — edit many listings at once (Premium).
- **Auto-reply chat** — automatic reply when the store is offline.

> Deferred (too heavy for now): live streaming, COD, paylater/installments, affiliate program.

---

*Related: MONEY_RULES.md (numbers), PRD.md, ERD.md, ARCHITECTURE.md. This handbook is the store-facing rulebook.*