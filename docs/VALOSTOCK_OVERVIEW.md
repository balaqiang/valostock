# valostock.id — Project Overview

**A Store-Only Marketplace for Game Accounts & Top-Up (Shopee-style)**
Version 8.0 · Concept Overview (Express.js + Supabase Postgres/Auth/Storage + Midtrans)

> **Scope (v8).** College-assignment project running locally with its **own Supabase project** (Postgres 17 + Supabase Auth + Storage, Docker, ports 553xx) behind an Express.js API. **Every product feature in this document is implemented**, including admin verification of stores **and of every catalog** before it is sold, offers, ratings, disputes, vouchers, flash sales, bundles, subscriptions, featured ads, inspections, external sellers, wishlist/follows, in-app notifications, loyalty points, referral, store chat and reports. **Simulated external services:** Midtrans Iris payouts, Digiflazz top-up delivery, WhatsApp/Discord/Telegram notifications (in-app notifications are real). Midtrans **Snap** runs in Sandbox or simulation mode. See `ARCHITECTURE.md` (v8), `ADMIN_PANEL.md`, and `docs/modeling/` (Data Flow approach).


---

## 1. In One Line

**valostock.id** is a marketplace where **admin-verified Stores** sell game accounts (Valorant, MLBB, and more) and game **top-up**, while buyers browse and buy freely with no identity check — like Shopee. The platform provides escrow, a built-in negotiation system, an admin-supervised rekber room, dispute arbitration, reputation, and notifications. It is a **service provider**, not the seller.

Money runs through **Midtrans** (Snap for payments, Iris for payouts); every store's escrow and available balance is tracked in an append-only ledger. Revenue is a clean **5% commission** plus a **~3.5% handling fee** on the buyer, store premium, ads, and top-up.

---

## 2. The Problem

Account trading today runs on manual WhatsApp-group admin work — a bottleneck that's scam-prone (double-sell, recall, takeover) and opaque (no objective trust signals). Deals happen off-platform with no protection. valostock.id systemizes the proven store/reseller model with escrow, verifiable trust, and a smooth negotiation + rekber flow.

---

## 3. Core Principles

### 3.1 Store-Only, Buyer-Free
Only verified stores sell (manual admin verification + deposit). Buyers just buy — no friction. Accountability is concentrated on stores, which is what makes trust and sanctions enforceable.

### 3.2 Money You Can Audit
Buyers pay through **Midtrans Snap**; the payment is confirmed only by a signed webhook. The store's share sits in **escrow** in the store's ledger until the account is safe, then moves to **available** minus commission. Withdrawals and external-seller transfers go out through **Midtrans Iris** after name validation and admin approval. Every movement is a ledger row reconciled against Midtrans. (Holding escrow in the platform's account requires legal review before live money — development uses the Midtrans Sandbox.)

### 3.3 Clean, Ungameable Revenue
**5% commission** is always a percentage of the **final** price, so negotiation can't game it. The **~3.5% handling fee** (buyer) covers payment cost. Midtrans in/out fees are covered by handling + withdraw/transfer fees — so **commission is pure profit**.

### 3.4 Trust from Evidence, Not Claims
Badges are measurable and separated by owner (Identity Verified, Store Verified, Account Checked). Never "100% safe". Ratings + service scores are earned. Reseller stores are fully accountable for their external sellers.

---

## 4. How It Works — Store

1. Register → fill store profile + **owner legal name** + type (Owner/Reseller) → pay **Rp500K deposit** → **admin verifies manually** → approved.
2. Create a listing → platform issues the **VS catalog ID** (one account = one catalog → no double-sell).
3. Optionally run an **Account Inspection** (login-only checklist + media) → **Account Checked** badge.
4. Receive offers, **negotiate** (accept/counter/reject), sell.
5. On completion, escrow releases to the store's **available balance**; withdraw via Midtrans Iris after **Account Validation**.

## 5. How It Works — Buyer

1. Discover with **search/filter**, wishlist, follows, recommendations.
2. **Tawar (offer)** in chat → store accepts/counters → price locks. Or buy directly (optional Rp5.000 lock).
3. Pay **item + handling (~3.5%) + mandatory protection (Rp5.000)** via Midtrans Snap → escrow.
4. A **Rekber Room** opens (admin-supervised); the store delivers; buyer changes email/pass/2FA and inspects.
5. **Complete** → funds settle → buyer rates + earns loyalty points. Protection covers **14 days** (≤Rp10jt) / **30 days** (>Rp10jt).

## 6. Reseller Stores & External Sellers

A store may sell its **own** accounts (Owner) or resell accounts consigned by **external sellers** off-platform (Reseller). The **store is fully responsible** for those sellers — identity, authenticity, buyer harm. The platform only knows and sanctions the store. To pay an external seller, the store adds a **Transfer Request** (after the account is safe) — funds are debited from the store's own balance and paid out via Midtrans Iris, with Account Validation on the recipient name.

## 7. Top-Up

Pick game → UID → nominal → optional promo code → contact (email + WhatsApp) → pay via **Midtrans** → **Digiflazz** fulfillment → instant; receipt to email/WA, with an **invoice-check page**. No escrow/dispute. High volume, low risk — the daily cash engine. Buyers may keep a **closed-loop Balance (BLC)** — filled via Midtrans, usable **only for top-up**, never cashed out or used to buy accounts (keeps it legal without a BI e-money licence).

---

## 8. Trust & Accountability

Store type badges (Owner/Reseller) + trust badges (Identity Verified, Verified, Platinum, Account Checked, Deposit Secured) · Seller Rating + 3-dimension Service Score + Buyer Trust Score · Responsibility Matrix for disputes · store deposit (deductible for compensation) · tiered sanctions + blacklists · 72h disputes + final arbitration · zero-tolerance for off-platform trading.

---

## 9. Security Model

Ledger-tracked escrow (never used for operations, reconciled vs Midtrans) · Midtrans webhook signature + status re-check + idempotency · server-side money/trust mutations (auditable) · manual store verification by admin · private storage for inspection/evidence/chat media · Account Validation on payouts & transfers · RBAC + 2FA + per-resource authz (anti-IDOR) + audit log · rate limit + CAPTCHA + fraud detection · sanctions + blacklists.

---

## 10. Technology

Two services: **`front/`** (Next.js 16, React 19, Tailwind v4, Framer Motion) + **`back/`** (Express.js + TypeScript, **pg** + **supabase-js**) on a **dedicated local Supabase project** (Postgres 17, Supabase Auth, Supabase Storage; Docker, managed in Supabase Studio). Payments: **Midtrans Snap** (Sandbox or simulation mode); Iris payouts, Digiflazz fulfilment and WhatsApp/Discord/Telegram delivery are simulated. The Express backend owns all money, trust, and state; the web app renders UI and calls the API. Detail: **ARCHITECTURE.md**, **ADMIN_PANEL.md**; data model: **docs/modeling/**.

---

## 11. Business Model

5% commission (Premium 4.5%/4%) · ~3.5% handling fee (buyer) · Rp5.000 protection (buyer) · Store Premium (Pro/Business) · Featured/Banner ads · Top-Up margin · store deposit (security). Break-even ~207 transactions/month. Detail: **MONEY_RULES.md**; store rulebook: **STORE_RULES.md**.

---

## 12. Roadmap

- **This project (v8):** see the scope note at the top — all features implemented, external services simulated.
- **Phase 1 — MVP:** store verification + deposit, VS catalog IDs, offers/negotiation, Midtrans Snap + ledger escrow, rekber + chat, protection, disputes, payout, ratings, top-up.
- **Phase 2 — Reseller & engagement:** external sellers + transfer, notifications (WA/Discord/Telegram), inspections, wishlist/follows/loyalty, vouchers/flash-sales/bundles, ads, analytics.
- **Phase 3 — Scale:** infra clustering, advanced fraud/trust, (evaluate) crypto & content layer.

---

## 13. Decision Status

**Decided:** store-only (manual admin verification + Rp500K deposit); 5% commission + ~3.5% handling; mandatory 14/30-day protection; Midtrans-only (Snap in, Iris out) with per-store ledger escrow; Owner/Reseller types + external-seller transfer (from store balance via Iris); direct offers/negotiation + rekber rooms; badges + ratings + service scores; VS catalog IDs (anti double-sell); notifications WA/Discord/Telegram (one-way); all Shopee-style engagement features; Express.js + Supabase (Postgres/Auth/Storage) + Next.js; admin moderation of every catalog; Data Flow modelling (docs/modeling).

**Still to validate:** legality of holding escrow in the platform's Midtrans account + Iris payout terms + PSE/legal; Iris per-payout pricing; premium commission rates; trust/service formulas; cancellation-fee; Digiflazz margins; loyalty economics.

---

*High-level overview. Supporting docs: MONEY_RULES.md, STORE_RULES.md, ERD.md, ARCHITECTURE.md, PRD.md, CLAUDE.md.*
