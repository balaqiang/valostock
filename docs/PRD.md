# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# valostock.id

**Store-Only Marketplace for Game Accounts & Top-Up (Shopee-style)**
Version 6.0 · Status: Prototype (college assignment)

> **Prototype scope (v7).** This project is a college-assignment prototype running locally on XAMPP. Implemented: auth (email + password), catalog, top-up + closed-loop Balance + invoice check, account purchase → escrow → rekber → complete, store onboarding with **manual admin verification** (no KYC provider), store catalogs/orders/balance/withdrawal requests, admin approvals. **Simulated:** Digiflazz fulfilment and Midtrans Iris payouts. **Midtrans Snap** runs in Sandbox (or a built-in simulation mode). Everything else in this document is **future work** — see `ARCHITECTURE.md` §10. System modelling: `docs/modeling/` (Data Flow approach).


> **v5.0:** Tech reset — Express.js API + MySQL (XAMPP, local-first) + **Midtrans-only payments** (Snap in, Iris out). Xendit, NestJS, PostgreSQL, Redis/BullMQ, DOKU and SQLite removed. Product scope unchanged.

---

## 1. EXECUTIVE SUMMARY

valostock.id is a **store-only marketplace** for game accounts (Valorant, MLBB, etc.) plus **top-up**. Only **admin-verified Stores** sell; buyers browse and buy freely with no identity check — like Shopee. The platform provides escrow, a direct-offer/negotiation system, an admin-supervised **rekber room**, in-app chat, dispute arbitration, reputation, and multi-channel notifications. It is a **service provider**, not the seller.

Money runs through **Midtrans** — Snap for payments, Iris for payouts — with every store's escrow and available balance tracked in an append-only ledger. Revenue is a clean **5% commission** (from stores) plus a **~3.5% handling fee** (from buyers, covering payment cost), store premium, ads, and top-up margin. Positioned as Itemku / iGV / G2G (marketplace) + Codashop (top-up), rebuilt around evidence, accountability, and a smooth negotiation UX.

---

## 2. PROBLEM

Account trading today is manual (admin bottleneck via WhatsApp groups), scam-prone (double-sell, recall, takeover), and opaque (no objective trust signals). Buyers can't tell a safe store from a risky one; deals happen off-platform with no protection. valostock.id systemizes the proven store/reseller model with escrow, verifiable trust, and a built-in negotiation + rekber flow.

---

## 3. GOALS & OBJECTIVES

**Goals:**
1. Safe transactions via ledger-tracked escrow + store accountability (funds reconciled 1:1 against Midtrans).
2. Clean, ungameable revenue (5% commission on final price + handling fee).
3. Transparent, measurable trust (store badges, ratings, service scores — no absolute claims).
4. A smooth core: direct offers/negotiation + supervised rekber room.

**KPIs:**
- Break-even ~207 transactions/month (~7/day).
- Payout ~5 hours after account is safe.
- Buyer-harming double-sell = 0 (platform-issued VS catalog IDs).
- Commission = pure profit (Midtrans costs covered by buyer/store).

**Non-Goals:** game-account custody (the platform never holds account credentials); individual (non-store) sellers; universal fund holds; WhatsApp *transaction* bot (WA is notifications only); open-loop wallet / cash-out balance (Balance is closed-loop, top-up only); crypto (later); live streaming / paylater / affiliate (deferred).

---

## 4. ACTORS

- **Buyer** — buys accounts / top-up. No identity check. Has a **Buyer Trust Score** (false disputes hurt it). Uses wishlist, follows, vouchers, loyalty.
- **Store** — the only seller type. Manual identity verification by an admin + Rp500K deposit. Two types: **Owner Store** (own accounts) or **Reseller Store** (manages external sellers off-platform). Premium tiers Free/Pro/Business.
- **External Seller** — an off-platform person who consigns an account to a reseller store. **Managed entirely by the store** (identity, payout); the platform never deals with them directly.
- **Platform Admin** — verifies stores manually (owner legal name + store data), supervises rekber rooms, resolves/arbitrates disputes, oversees finance & fraud, enforces sanctions.

---

## 5. FUNCTIONAL REQUIREMENTS

### 5.1 Auth
- Register via phone OTP + email. Buyers shop immediately.

### 5.2 Becoming a Store
- Register → fill store info (name, type Owner/Reseller, **owner legal name**) + accept Terms → pay **Rp500K deposit** via Midtrans Snap → **admin verifies manually** (approve/reject, audit-logged) → ACTIVE → list.

### 5.3 Store — Listing & Inspection
- Create listing → platform issues **VS catalog ID** (one account = one catalog → no double-sell).
- Choose category/game/region accurately; clear description (rank, skins/VP, access, delivery).
- Optional **Account Inspection** (login-only checklist + media, seller keeps 2FA) → **Account Checked** badge.
- Manage catalog (bulk ops on Premium), vouchers, flash sales, bundles, ads/featured, custom store homepage.

### 5.4 Reseller — External Sellers & Transfer
- Register external sellers (alias, KTP held by store, payout account) — store-managed.
- After an account is **safe (5h)**, add a **Transfer Request** → input seller bank/e-wallet → **Iris account validation** recognizes the name → admin approves → Midtrans Iris pays out, **debited from the store's available balance**. Transfer fee Rp4.000.
- Notify external sellers via WhatsApp ("account sold — fill payout form").

### 5.5 Buyer — Discover, Negotiate, Buy
- Browse with **advanced search/filter** (game, rank, price, skins, region); wishlist + price-drop alerts; follow stores; recently viewed; recommendations.
- **Direct offer (core):** tap "Tawar" → offer form → store **Accepts / Counters / Rejects** (offers expire). On accept, price & listing lock.
- Buy directly or after accepted offer. Optional **Lock Rp5.000** (30 min). Pay **item + handling (max 3.5%/Rp4.000) + mandatory protection Rp5.000**.

### 5.6 Order, Rekber & Completion
- Payment (Midtrans Snap, confirmed by webhook) → escrow → **Rekber Room** opens (code = VS id, **admin-supervised**), separate from normal chat.
- Store delivers account; buyer changes email/pass/2FA, inspects. **Complete** → escrow releases to the store's available balance (minus commission); buyer rates (overall + 3-dim service score) + earns loyalty points.
- **Protection:** 14 days (≤Rp10jt) / 30 days (>Rp10jt) support window — not a fund hold.

### 5.7 Payout
- Store withdraws from its **available balance** → **Iris account validation** (name = verified owner legal name) → admin approval → Midtrans Iris transfers (fee Rp4.000, +Rp2.500 bank tax).

### 5.8 Top-Up
- Pick game → UID → nominal → optional **promo code** → enter **contact (email + WhatsApp)** → pay via **Midtrans** (QRIS/VA/retail/e-wallet/CC) → **Digiflazz** fulfillment → success; receipt sent to email/WA.
- **Invoice check page** ("Cek Invoice Kamu") — check top-up status by invoice number. No escrow/dispute.
- **Top-up Balance (closed-loop):** buyers may keep a prepaid Balance (BLC) filled via Midtrans, usable **only for game top-up** — no cash-out, no account purchase, no transfer. Refund only if game currency doesn't arrive (to Balance). Help articles explain the rules.

### 5.9 Notifications
- Store connects **WhatsApp (Baileys) / Discord / Telegram** for one-way alerts (new buyer, offer, order, dispute).

### 5.10 Platform Admin
- Verify stores manually; supervise rekber; resolve disputes (72h) with chat/inspection/timeline evidence + final arbitration; oversee escrow/splits/transfers; enforce sanctions + deposit deductions + blacklists; manage skins/top-up.

### 5.11 Content, Affiliate, Reports & RBAC
- **News + Help Center CMS** (iGV-style) — admins create/edit/publish articles and help categories.
- **Affiliate** — buyers get a referral code; qualified referrals reward the referrer's **Balance** (closed-loop, never cash).
- **Reports** — buyers report stores/listings/users/orders → admin queue.
- **In-app notifications** — Order + System notification tabs.
- **RBAC** — granular `module:action` permissions bundled into roles (e.g. Article Creator, Article Manager, Finance Admin), assigned to admin users; enforced server-side. Only Super Admin manages RBAC.

---

## 6. TRUST & ACCOUNTABILITY (the differentiator)

- **Store type badges:** Owner / Reseller. **Trust badges:** Identity Verified, Verified Store, Platinum Store, Account Checked, Deposit Secured.
- **Reputation:** Seller Rating (±1) + Service Score (description accuracy, attitude, delivery speed) + Buyer Trust Score.
- **Reseller accountability:** the store is fully responsible for its external sellers; buyers report/rate the **store**; the platform sanctions the **store** (deposit deduction, suspension).
- **No absolute claims** ("100% original/safe") anywhere. Deposit + admin-verified identity make sanctions enforceable.

---

## 7. NON-FUNCTIONAL (SECURITY — PRIORITY)

Ledger-tracked funds (escrow/float never used for operations, daily reconciliation vs Midtrans/Iris); Midtrans webhook signature + status re-check + idempotency before money moves; server-side money/trust mutations (auditable); manual store verification by admin (audit-logged); private storage for inspection/evidence/chat media; Account Validation for payouts & transfers; RBAC + 2FA + per-resource authz (anti-IDOR) + audit log; rate limit + CAPTCHA + fraud detection; sanctions + blacklists. See ARCHITECTURE.md → Security & CLAUDE.md → Security & Monitoring.

---

## 8. ARCHITECTURE (summary)

Two services: **`front/`** (Next.js 16, React 19, Tailwind v4, Framer Motion) + **`back/`** (Express.js + TypeScript, **mysql2 without ORM** → **MySQL via XAMPP**, schema imported with phpMyAdmin). Payments: **Midtrans Snap** (Sandbox, or simulation mode); Iris payouts and Digiflazz fulfilment are **simulated** in the prototype. Runs fully local. Detail: **ARCHITECTURE.md**; data model: **docs/modeling/**.

---

## 9. REVENUE MODEL

5% commission (store, Premium 4.5%/4%) · ~3.5% handling fee (buyer) · Rp5.000 protection (buyer) · Store Premium (Pro/Business) · Featured/Banner ads · Top-Up margin · store deposit (security, not revenue). Midtrans costs covered by buyer/store → commission is pure profit. Detail & numbers: **MONEY_RULES.md**. Store rules: **STORE_RULES.md**.

---

## 10. SCOPE & PHASES

- **Prototype (this assignment):** Express + mysql2 + MySQL (XAMPP), email/password auth, catalog, top-up + Balance + invoice check, account purchase → escrow → rekber → complete, store onboarding with manual admin verification + deposit, store catalogs/orders/balance/withdrawals, admin approvals. Iris/Digiflazz simulated.
- **Phase 0 — Foundation (post-prototype):** OTP, refresh tokens, background jobs, realtime chat.
- **Phase 1 — MVP:** provider KYC (optional) + deposit, VS catalog IDs, direct offers/negotiation, Midtrans Snap + ledger escrow, rekber room + chat, mandatory protection, disputes, Account Validation payout, ratings, top-up, basic admin.
- **Phase 2 — Reseller & engagement:** external sellers + transfer requests, notifications (WA/Discord/Telegram), inspections, wishlist/follows/loyalty, vouchers/flash-sales/bundles, ads, analytics, reconciliation, observability.
- **Phase 3 — Scale:** move off XAMPP to a VPS (MySQL server, Nginx, PM2/Docker, optional Redis/BullMQ), infra split & clustering, advanced fraud/trust, (evaluate) crypto & content layer.

---

## 11. RISKS & MITIGATION

| Risk | Mitigation |
|---|---|
| Recall / scam by store | Store deposit deduction + rating/suspension + dispute arbitration |
| Reseller's external seller scams buyer | Store fully responsible; buyer reports/rates store; deposit + admin-verified identity enforce |
| Platform-as-remitter (transfer to ext. seller) | Store-initiated, debited from store's own ledger balance, Iris name validation + admin approval; legal review before live |
| Buyer false dispute | Buyer Trust Score + rekber evidence + 72h + arbitration |
| Off-platform trade (lost commission + protection) | Zero-tolerance + deposit fine + ban; chat forbids contact/txn |
| Fund-holding regulation (Midtrans-only → platform account holds escrow) | 1:1 ledger + daily reconciliation; sandbox only until legal review; PSE registration; consider licensed escrow partner before live |
| Local-only infra (XAMPP) not production-grade | Documented production plan (VPS, MySQL server, backups, monitoring) before any real traffic |
| Duplicate/fake webhook | Signature + idempotency |
| Absolute-claim liability | Measurable badges only; "100% safe" forbidden |
| Chicken-and-egg (no stores) | Recruit 5–10 stores manually; cheap/free deposit for first wave; free first-week ads |

---

## 12. OPEN QUESTIONS

- Confirm Midtrans Iris terms (payouts to stores & external sellers) + custody/escrow legality + PSE/legal validation.
- Current Iris per-payout pricing vs Rp4.000 withdraw/transfer fee.
- Deposit amount over time (Rp500K now); premium commission rates.
- Trust-score & service-score formulas.
- Cancellation-fee amount & valid-reason definition.
- Digiflazz margins; loyalty-point economics.

---

## 13. RELATED DOCUMENTS

MONEY_RULES.md · STORE_RULES.md · ERD.md · ARCHITECTURE.md · VALOSTOCK_OVERVIEW.md · CLAUDE.md · Flowcharts.

---

*Living document. Changes are synced to the related documents.*
