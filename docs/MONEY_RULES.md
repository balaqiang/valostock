# MONEY RULES — valostock.id (Store-Only Marketplace)

**Single Source of Truth**
Version 6.0 · Shopee-style · All flowcharts, ERD, state machine, and code MUST follow this document.

> **Scope (v8).** College-assignment project running locally with its **own Supabase project** (Postgres 17 + Supabase Auth + Storage, Docker, ports 553xx) behind an Express.js API. **Every product feature in this document is implemented**, including admin verification of stores **and of every catalog** before it is sold, offers, ratings, disputes, vouchers, flash sales, bundles, subscriptions, featured ads, inspections, external sellers, wishlist/follows, in-app notifications, loyalty points, referral, store chat and reports. **Simulated external services:** Midtrans Iris payouts, Digiflazz top-up delivery, WhatsApp/Discord/Telegram notifications (in-app notifications are real). Midtrans **Snap** runs in Sandbox or simulation mode. See `ARCHITECTURE.md` (v8), `ADMIN_PANEL.md`, and `docs/modeling/` (Data Flow approach).


> **v6.0 changes:** **Midtrans is the only payment provider** — **Snap** for every incoming payment (orders, top-up, Balance fill, deposit, subscription, ads) and **Iris** for every payout (store withdrawal, transfer to external seller) incl. Iris account validation. Xendit (and the DOKU prototype) removed. Store funds are tracked in an internal ledger (`STORE_BALANCES` + `STORE_LEDGER`). **All fee numbers are unchanged.**
>
> **v5.0 changes:** Store-only model. Only verified **Stores** sell; buyers are free (no identity check). Revenue = **5% commission** (store) + **~3.5% handling fee** (buyer) + store premium + ads + top-up. **Store deposit Rp500K**, store verification free. Added **reseller stores** (manage external sellers) with a safe **transfer-request** flow, mandatory **14/30-day protection**, and full Shopee-style engagement features. Gateway fees fully covered by buyer/store — commission is pure profit.

---

## 1. MONEY CONSTANTS

Live in `back/src/config/constants.ts` (integer Rupiah, rates as decimals). The web app only displays them.

| Constant | Value | Notes |
|---|---|---|
| `COMMISSION_RATE` | 5% | Platform commission (from store). Premium lowers it |
| `HANDLING_FEE_RATE` | ~3.5% | Payment/handling fee (from buyer) |
| `HANDLING_FEE_MIN` | Rp 4.000 | Floor, so small orders still cover Midtrans-in (see §3 note on VA) |
| `STORE_DEPOSIT` | Rp 500.000 | One-time security deposit |
| `PROTECTION_FEE` | Rp 5.000 | Mandatory per order (buyer) |
| `PROTECTION_DAYS_STD` | 14 days | Support window, account ≤ Rp 10jt |
| `PROTECTION_DAYS_HIGH` | 30 days | Support window, account > Rp 10jt |
| `WITHDRAW_FEE` | Rp 4.000 | Store withdrawal (covers Iris payout) |
| `TRANSFER_FEE` | Rp 4.000 | Transfer to external seller (covers Iris payout) |
| `BANK_TAX` | Rp 2.500 | Inter-bank withdrawal |
| `LOCK_FEE` | Rp 5.000 | Optional account lock (30 min) |
| `PAYOUT_RELEASE` | 5 hours | After buyer receives email code / account safe |

## 2. FEE STRUCTURE (Final)

| Charge | Amount | Paid by | How |
|---|---|---|---|
| **Platform commission** | 5% of item price | Store (deducted) | On order completion (escrow release) |
| **Handling fee** | max(3.5%, Rp4.000) | Buyer (added) | At checkout ("biaya penanganan") |
| **Store deposit** | Rp 500.000 | Store (once) | Security, refundable (§12) — paid via Midtrans Snap |
| **Protection** | Rp 5.000 (mandatory) | Buyer (added) | Support 14/30 days (§6) |
| Store verification | Free | — | Manual review by admin |
| Withdraw fee | Rp 4.000 | Store | On withdrawal |
| Transfer fee | Rp 4.000 | Store/ext. seller | On transfer request (§11) |
| Bank tax | Rp 2.500 | Store | Inter-bank withdrawal |

## 3. MIDTRANS COST COVERAGE (commission stays pure profit)

Every rupiah moves through Midtrans: **Snap** (in) and **Iris** (out). Their costs are covered by buyer + store:

| Midtrans cost | ~Amount (incl. PPN 11%) | Covered by |
|---|---|---|
| IN — Snap (buyer pays) | QRIS 0,7% · VA Rp4.440 · e-wallet ~1,5% · CC 2,9% + Rp2.000 | Handling fee max(3,5%, Rp4.000) |
| OUT — Iris (store withdraw) | per-payout fee (confirm current Iris pricing) | Withdraw fee Rp4.000 |
| OUT — Iris (transfer to external seller) | per-payout fee | Transfer fee Rp4.000 |

**Result:** the 5% commission stays **platform profit** — not eroded by gateway fees. Known gap: the handling-fee floor (Rp4.000) is slightly below the VA fee (Rp4.440); on small VA orders the difference is an accepted cost (review before launch).

### Why one gateway (Midtrans) — and what it implies
- **Simpler integration:** one merchant account, one webhook format, one reconciliation source (Snap + Iris reports).
- **Custody trade-off:** without per-store sub-accounts, buyer funds sit in the **platform's Midtrans account** until release. The platform therefore keeps a **1:1 ledger** per store (`escrow` vs `available`), never uses escrow/float for operations, reconciles daily against Midtrans/Iris, and pays out only via Iris after name validation + admin approval.
- **Regulatory note:** holding and forwarding third-party funds is a regulated activity in Indonesia. This design is for development/**Midtrans Sandbox**; obtain legal/fintech advice (and, if needed, a licensed escrow/sub-account arrangement) **before handling real money**.

## 4. WORKED EXAMPLE — account sold Rp 500.000

```
Buyer pays:      500.000 + handling 17.500 + protection 5.000 = 522.500   (Midtrans Snap)
Midtrans IN:     QRIS 0,7% ≈ 3.658 · VA 4.440  (covered by handling)
Escrow:          STORE_LEDGER ESCROW_HOLD +500.000  (store's escrow bucket)
Commission:      5% × 500.000 = 25.000  ← platform profit (at completion)
Store receives:  500.000 − 25.000 = 475.000  (ESCROW_RELEASE → available bucket)
Store withdraws: −4.000 fee (covers Iris payout)
```
Commission is always % of the **final** price → negotiation up/down is auto-handled; no gaming.

## 5. STORE PREMIUM (subscription)

| Benefit | Free | Pro (Rp99K/mo) | Business (Rp299K/mo) |
|---|---|---|---|
| Commission | 5% | 4.5% | 4% |
| Active listings | 15 | 60 | Unlimited |
| Badge | — | Pro | Business |
| Analytics | — | ✓ | Advanced |
| Bulk upload | — | ✓ | ✓ |
| Free featured slots/mo | — | 2 | 6 |
| Ranking boost | — | Small | Priority |
| API access | — | — | ✓ |
| Priority support & dispute | — | Standard | ✓ |

**In the prototype:** commission, listing quota and free featured slots as above; **ranking boost** = featured first, then Business before Pro before Free on the default (newest / popular) sort; **analytics** — Free: traffic funnel only, Pro: + daily GMV and most-viewed catalogs, Business ("Advanced"): + sales per game; **bulk actions** (Pro/Business): submit or hide many catalogs at once; **plan badge** on the storefront and listings. *API access* and *priority support* are not part of the prototype.

Strongest lever = lower commission + more listings + free featured (Power-Merchant logic). Paid via Midtrans Snap (`payments.purpose = SUBSCRIPTION`), valid 30 days; the tier's commission rate is copied into each new order.

## 6. PROTECTION (Mandatory)

- Every order includes **Rp5.000 protection** (buyer-paid) = **support & security handling** (dispute help, recall assistance), NOT a fund hold.
- Duration by account price: **≤ Rp10jt → 14 days**, **> Rp10jt → 30 days**.
- **Payout is still fast** (5 hours after account safe) — protection is a service window, not a delay.
- **Optional extra protection** (checklist item, e.g. extended rekber window) may be sold on top.

## 7. ADS / FEATURED LISTING

| Duration | Price |
|---|---|
| First week (per store, once) | Free |
| 1 day | ~Rp 3.000 (20K ÷ 7) |
| 3 days | Rp 9.000 |
| 7 days | Rp 20.000 |
| 14 days | Rp 35.000 |
| 30 days | Rp 60.000 |

Plus banner ads (homepage/category/search, per campaign). Premium stores get free featured slots (§5). Paid via Midtrans Snap.

## 8. TOP-UP (Digiflazz + Midtrans)

Separate flow, **paid via Midtrans Snap** (or Balance). No escrow/dispute — once PAID, the order goes straight to fulfilment (Digiflazz).

Flow: pick game → enter UID → pick nominal → (optional promo code) → enter **contact (email + WhatsApp)** → pay (Midtrans Snap) → webhook PAID → Digiflazz API → success → receipt sent to email/WA. Buyers can check status on the **invoice-check page** using the invoice number.

**Payment method fee (charge to customer, take minimal profit):**

| Method | Real Midtrans fee (+PPN 11%) | Charge to customer | Platform net |
|---|---|---|---|
| QRIS | 0,7% | 1,5%–2% | 0,8%–1,3% of value |
| Virtual Account | Rp 4.440 | Flat Rp 5.000 | Rp 560 / txn |
| Retail (Alfamart/Alfamidi/DAN+DAN) | partner + Rp 1.000 | Flat Rp 5.000 | Rp 500 / txn |
| E-Wallet (GoPay/ShopeePay/DANA/OVO) | ~1,5% | 2,5% | 1% of value |
| Credit Card | 2,9% + Rp 2.000 | 4% + Rp 3.000 | ~1,1% + Rp 1.000 |

**Top-up product margin** = retail − wholesale (Digiflazz), kept minimal for competitiveness. The payment-method surcharge above is the platform's thin extra on top.

**Promo codes:** top-up supports promo codes (percent/fixed discount, quota, expiry) to drive volume.

## 8b. TOP-UP BALANCE (Closed-Loop, top-up only)

Buyers may keep a prepaid **Balance (BLC, 1:1 Rupiah)** to pay for top-ups faster. **Strictly closed-loop** — this is what keeps it legal without a BI e-money licence:

- **Usable ONLY for game top-up** inside valostock.id. **Cannot buy accounts.**
- **Cannot be cashed out** (no withdrawal to bank/e-wallet).
- **Cannot be transferred** to other users.
- Filled via **Midtrans Snap** (same payment-method surcharge table as §8). Preset denominations (Rp1.000 … Rp5.000.000). Credited **only by the Midtrans webhook** (PAID), never by the browser.
- Every change recorded in `BALANCE_LEDGER` (append-only, `balance_after`, idempotency key).

**Legal & operational guardrails:**
- Float (unspent balance) is a **liability owed to buyers**, not revenue — held separately, never used for operations.
- ToS must state clearly: *"Balance is an internal payment tool for top-up only, not electronic money, and cannot be cashed out."*
- The closed-loop boundary must be enforced in code and never quietly relaxed (any cash-out/transfer would reclassify it as e-money → licence required).

**Refund process (prototype):** an admin with `payouts:approve` marks an undelivered top-up as `REFUNDED`: a logged-in buyer gets the amount back as Balance (`REFUND_CREDIT` ledger row, loyalty points of that invoice reversed); a guest has no Balance, so a refund to the original payment method is queued (see §12b). Audit-logged.

**Refund policy (top-up):**
- **No refund for a successful top-up** (diamonds/VP delivered).
- **Refund only if the game currency does not arrive** in the player's account → refunded **to Balance** (not cash).
- Detailed rules published as **help-center articles** (incl. "why you can't buy accounts with top-up balance").

> Validate the closed-loop model and float handling with a legal/fintech advisor before launch. Not legal advice.

## 9. PAYOUT & ACCOUNT VALIDATION

- Store withdraws from its **available ledger balance** (`STORE_BALANCES.available`). **Account Validation** (Midtrans Iris `account_validation`) required: holder name must match the store's verified owner legal name (fuzzy; partial → review; mismatch → reject).
- Withdraw fee Rp4.000 (+Rp2.500 bank tax if bank). The payout is created in **Iris** and **approved by a platform admin** (maker-checker) before Iris sends it. A failed payout writes a `PAYOUT_REVERSAL` ledger row that returns the funds to `available`.
- Payout release: **5 hours** after the account is safe (buyer received email code) — `ESCROW_RELEASE` moves the store share from `escrow` to `available`. Risk-based holds only for suspicious stores.

## 10. RESELLER STORES & EXTERNAL SELLERS

Stores may sell **their own** accounts (Owner Store) or **manage external sellers** who consign accounts off-platform (Reseller Store). See badges in §13.

- The **store carries full responsibility** for its external sellers: their identity (KTP), authenticity checks, and any buyer harm. If a buyer is scammed, it is the **store's** fault → buyer reports/rates the **store**; the platform sanctions the **store** (rating, deposit deduction, suspension). The platform never deals with the external seller directly.

## 11. TRANSFER REQUEST (Store → External Seller)

For reseller stores to pay their external sellers, **safely**:

- The store's funds sit in its **available ledger balance**. A **Transfer Request** = the store instructs the platform to pay its external seller **out of that store's balance** via Midtrans Iris. The store (not the platform) is the responsible party toward the external seller.
- Available **after the account is safe (5h)**, per sold catalog.
- Store inputs the external seller's **bank/e-wallet**; **Iris account validation recognizes the holder name** before sending.
- **Transfer fee Rp4.000** (covers the Iris payout), deducted from the seller payout or borne by the store. Admin approval required (same as withdrawals).

> Paying out to third parties from a platform account is a remittance-like activity — confirm Iris terms with Midtrans and validate with a lawyer before live use.

## 12. STORE DEPOSIT — RIGHTS & REFUND

- Rp500.000 one-time (Midtrans Snap); unlocks listing rights (activation ~15 min after the PAID webhook). A **security measure**, not a service prepayment.
- **Refundable only if:** account in good standing · no active disputes · all orders completed & out of warranty · no penalties/debts owed · store formally closed.
- **Non-refundable / deductible when:** permanent ban · used to offset penalties or buyer compensation · fraud/serious complaints · legal retention.
- **Platform may deduct** from the deposit any amount the store owes (penalties, buyer compensation, unpaid fees) — each deduction is a ledger row + audit log.

**Implementation (prototype):**
- The deposit is a third bucket of the store ledger: `store_balances.deposit` + `store_ledger` bucket `DEPOSIT`. When an admin approves the store, the paid deposit is booked as `DEPOSIT_HOLD`.
- **Fines** (admin sanction `FINE`, or the part of a dispute compensation the store's available balance cannot cover) are booked as `DEPOSIT_DEDUCTION`, capped at the deposit held; any rest stays recorded in `store_sanctions`.
- When the deposit falls below Rp500.000 the **Deposit Secured** badge disappears and the store can pay the shortfall via Midtrans (`STORE_DEPOSIT` payment → `DEPOSIT_HOLD`).
- **Closure:** the store requests closure (store `CLOSING`) only when it has no unfinished order, no open dispute, no order still inside the protection window, no pending payout and zero escrow/available balance (withdraw first); its catalogs are hidden. An admin approves → store `CLOSED`, remaining deposit booked as `DEPOSIT_REFUND` (refund to the original method, simulated) and `deposit_status = RELEASED`; or rejects with a reason → store back to `ACTIVE`.

## 12b. REFUND QUEUE (money received that can no longer be delivered)

Payments that arrive after their purpose is gone are never kept silently: a row in `refunds` (status `PENDING`) is created for **order payments received after the order was cancelled**, **lock payments when the account was no longer available**, and **undelivered top-ups of guests**. An admin with `payouts:approve` completes the refund (Midtrans refund simulated) with a note → `COMPLETED`, audit-logged, buyer notified.

**Balance adjustments:** an admin with `payouts:approve` may correct a buyer's Balance (`ADJUSTMENT` ledger row, reason required, audit-logged, buyer notified). This is a correction tool only — never a cash-out or a transfer between users.

## 13. STORE TYPES, BADGES & REPUTATION

**Type badges:** 🏷️ **Owner Store** (sells own accounts) · 🔄 **Reseller Store** (sells external sellers' accounts).
**Trust badges:** Identity Verified (admin-verified owner) · Verified Store (reputation) · Platinum Store (top) · Account Checked (this account inspected) · Deposit Secured (active deposit).
**Reputation:** Seller Rating (±1 per review) + Service Score (description accuracy, attitude, delivery speed). Earned, not bought. Review manipulation forbidden.

## 13b. LOYALTY POINTS & REFERRAL (closed-loop)

- **Earn:** 1 point per Rp1.000 of the final item price when an account order is **COMPLETED**, and 1 point per Rp1.000 of a **SUCCESS** game top-up.
- **Redeem:** 100 points → Rp1.000 **Balance** (`balance_ledger` type `LOYALTY_CREDIT`), in multiples of 100 points. Points and the resulting Balance stay closed-loop (top-up only, no cash-out).
- **Referral:** a new user who registers with a referral code links to the referrer. When the referred user's **first** account order completes or first top-up succeeds, the referrer receives **Rp10.000 Balance** (`REFERRAL_CREDIT`), once per referred user.
- Every change writes `loyalty_ledger` / `balance_ledger` with `balance_after`.

## 14. SANCTIONS & PENALTIES

Tiered (scaling with severity): warning → listing restriction → **fine from deposit** → suspension (30d) → permanent ban → blacklist (device/identity/bank) → legal action. **Prototype:** admins issue warnings, fines (booked against the deposit, §12) and suspensions from the store detail page or a dispute ruling; permanent ban / blacklists are handled as suspension + user ban. Store-error buyer refund may incur a fine (e.g. 10% of refund). Off-platform trading, fake delivery, false listings → deposit fine + ban.

## 15. COSTS (Year-1 Baseline)

| Item | Cost |
|---|---|
| Local development (Docker Supabase + Midtrans Sandbox) | Rp 0 |
| VPS (production) | Rp 9.840.000 / year |
| Cloudflare Pro | Rp 3.960.000 / year |
| Email (Resend) | Rp 3.960.000 / year |
| Backup | Rp 1.800.000 / year |
| Domain | Rp 300.000 / year |
| **Fixed total (production)** | **Rp 19.860.000 / year** |
| Midtrans | Snap in per method (§3/§8) + Iris out per payout (covered by buyer/store) |

## 16. NUMBER SUMMARY

| | |
|---|---|
| Commission | 5% (Premium 4.5% / 4%) — platform profit |
| Handling fee | max(3.5%, Rp4.000) — buyer |
| Protection | Rp5.000 mandatory, 14/30 days — buyer |
| Store deposit | Rp500.000 (refundable, deductible) |
| Store verification | Free (manual admin review) |
| Withdraw / Transfer fee | Rp4.000 each (cover Iris payout) |
| Lock | Rp5.000 optional (30 min) |
| Payout release | 5 hours after account safe |
| Store types | Owner / Reseller |
| Fund model | Midtrans Snap in + Iris out; per-store escrow/available ledger in platform account (legal review before live money) |

---

*Changes to numbers/policy are updated here FIRST, then in code.*
