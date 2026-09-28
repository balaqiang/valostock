# SITEMAP (DETAILED) — valostock.id

**Complete page map, route tree, per-page contents, guards & RBAC**
Version 3.0 · Store-only marketplace + top-up + closed-loop balance · Express.js API + Midtrans

> **Prototype scope (v7).** This project is a college-assignment prototype running locally on XAMPP. Implemented: auth (email + password), catalog, top-up + closed-loop Balance + invoice check, account purchase → escrow → rekber → complete, store onboarding with **manual admin verification** (no KYC provider), store catalogs/orders/balance/withdrawal requests, admin approvals. **Simulated:** Digiflazz fulfilment and Midtrans Iris payouts. **Midtrans Snap** runs in Sandbox (or a built-in simulation mode). Everything else in this document is **future work** — see `ARCHITECTURE.md` §10. System modelling: `docs/modeling/` (Data Flow approach). Prototype-only routes: `/payment/finish` (return from Midtrans → status check), `/payment/simulate` (simulation mode), `/sell` (store form + deposit, no KYC step), `/admin/stores` and `/admin/withdrawals` (manual approvals).


> Guard legend: `public` · `auth` (logged-in buyer) · `store` (store admin) · `admin:PERM` (permission-gated). Every money/data page is checked **server-side** (Express middleware: `auth` → `require-permission` → `require-ownership`), never UI-only. The Next.js page guard is only a redirect convenience.

---

## 0. ROUTE TREE

```
/                                  Home / marketplace          public
├── search                         Advanced search/filter       public
├── [game]/                        Game namespace (slug)        public
│   ├── account                    Accounts for this game       public
│   └── topup                      Top-up for this game         public
├── catalog/[id]                   Listing detail (VS id)       public
├── store/[slug]                   Store storefront             public
├── topup                          Top-up hub (all games)       public
│   └── invoice                    "Cek Invoice Kamu"           public
├── balance                        Buy BLC voucher (closed-loop) auth
│   └── history                    Balance mutation             auth
├── news                           News list                    public
│   └── [slug]                     News detail                  public
├── help                           Help center                  public
│   └── [slug]                     Help article                 public
├── (auth)/ login register verify-otp forgot-password          public
│
├── checkout/[orderId]/pay         Payment method + pay         auth
├── orders/[id]                    Order status + rekber entry  auth
│
├── account/                       BUYER ACCOUNT SHELL          auth
│   ├── (dashboard)                Dashboard
│   ├── orders/ my  insured        Orders + protection claims
│   ├── messages/ order system chat
│   ├── transactions               Purchase history
│   ├── mutation                   Balance + points ledger
│   ├── balance                    BLC wallet
│   ├── affiliate                  Referral
│   ├── reports                    My reports
│   ├── offers                     My offers
│   ├── wishlist  following  points
│   └── profile                    Basic/Security/Lang/Avatar
│
├── sell                          STORE ONBOARDING (profile → deposit → admin review) auth
│
├── store-dashboard/               STORE SHELL                  store
│   ├── (overview)                 Revenue, orders, balance
│   ├── catalogs/ list new [id] bulk
│   ├── inspections/[catalogId]
│   ├── offers                     Accept/counter/reject
│   ├── orders/ [id] rekber
│   ├── external-sellers/ list [id] transfers
│   ├── balance/ withdraw
│   ├── subscription  ads  vouchers  flash-sales  bundles
│   ├── homepage-editor  analytics  ratings  chat
│   └── settings
│
└── admin/                         ADMIN SHELL                  admin:*
    ├── (dashboard)                KPIs
    ├── finance/ revenue payouts transfers float reconcile
    ├── stores/ [id] deposit levels   (manual verification queue)
    ├── users/ [id]
    ├── catalogs                   moderation
    ├── inspections                audit
    ├── orders/ [id]
    ├── rekber                     supervision
    ├── disputes/ [id]
    ├── fraud/ sanctions blacklists
    ├── topup-products
    ├── balance                    float + refunds
    ├── vouchers  promo-codes  ads
    ├── games  skins
    ├── affiliate
    ├── articles/ list create [id]        (news CMS)
    ├── help/ list create [id]            (help CMS)
    ├── support                    admin chat / tickets
    ├── broadcast
    ├── rbac/ roles permissions admins
    ├── settings                   fees/constants/keys
    ├── logs/ webhooks audit
    └── reports                    user reports queue
```

---

## 1. PUBLIC & NAVIGATION

**Top nav (all public):** Logo · Search · Games ▾ · Top-Up · News · Help · [Login / Register] · Cart? (no — single-item) · Language.
**Mobile:** hamburger → same items + account entry.
**Footer:** Terms · Privacy · Refund · About · Contact · social.

| Page | Route | Sections / components | Key actions | Guard |
|---|---|---|---|---|
| Home | `/` | Hero/banner ads, **product-type buttons (Accounts · Top-Up)**, "Your Games" (followed), "Hot Games" per-game cards → link to `/[game]/account` & `/[game]/topup`, featured/trending/newest listings, news strip | Open game, search, filter | public |
| Search / Explore | `/search` | Filter sidebar (game, rank, price range, skins/VP, region, badges, store level), sort, result grid, pagination/infinite scroll | Apply filters, save search, wishlist | public |
| Game — Accounts | `/[game]/account` | Game banner, account listings for this game, **game-specific filters from `attributes`** (rank, level, server, skin count), sort | Filter, open listing, buy | public |
| Game — Top-Up | `/[game]/topup` | Game banner, top-up nominal grid, UID input, promo, contact, payment | Top-up | public |
| News list | `/news` | Article cards, categories, search, featured | Open article | public |
| News detail | `/news/[slug]` | Cover, body, author, date, related | Share | public |
| Help center | `/help` | Category groups, search, popular articles | Open article | public |
| Help article | `/help/[slug]` | Body, breadcrumbs, related, "was this helpful" | — | public |

> **Product types (Phase 1):** Accounts + Top-Up. Games and product types are **seeded by code** now; an admin CMS to add games/fields no-code is Phase 2. Game-specific listing fields live in `CATALOGS.attributes` (MySQL JSON, hot keys as indexed generated columns) so new games need no table redesign. Skin data (image + VP price) is synced from a 3rd-party API into the `SKINS` master; stores pick skins when listing.

---

## 2. AUTH

| Page | Route | Contents |
|---|---|---|
| Login | `/login` | Email/phone + password, **Sign in with Google**, links |
| Register | `/register` | Email + password **or Google**; agree Terms/Privacy → then phone OTP |
| Verify OTP | `/verify-otp` | Code input, resend timer |
| Forgot password | `/forgot-password` | Email/phone → reset link/code |

> **Google login:** one-tap entry (buyer-friendly). If the Google email matches an existing account, it's **linked** (no duplicate). **Phone OTP is still required before transacting** (order notifications & dispute contact). Google users have no password.

---

## 3. MARKETPLACE & BUYING FLOW

| Page | Route | Sections / components | Actions | Guard |
|---|---|---|---|---|
| Listing detail | `/catalog/[id]` | Gallery, VS id, price, **badges** (Owner/Reseller, Identity Verified, Verified/Platinum, Account Checked, Deposit Secured), recovery/spec info, skins/VP list, store card + rating, description | **Buy now**, **Tawar (offer)**, **Lock (Rp5.000)**, wishlist, chat store, report | public (buy → auth) |
| Offer modal | (in chat) | Offer amount form, current price, expiry note | Submit offer, view counter, accept | auth |
| Store storefront | `/store/[slug]` | Custom banner/homepage, type/trust badges, service score, listings grid, vouchers, follow | Follow, filter store, open listing | public |
| **Payment method** | `/checkout/[orderId]/pay` | Order summary (item + handling + protection), **method selector** (QRIS / VA / e-wallet / CC / **Balance**), fee per method, total | **Pay** → API creates Midtrans Snap transaction → redirect to Snap (or Balance) → return | auth |
| Order status | `/orders/[id]` | Timeline (Unpaid→Paid→In Rekber→Safe→Completed), **enter Rekber Room**, inspect checklist, **Complete**, **Report/Dispute**, rating after | Enter rekber, complete, dispute, rate | auth |

**Buy-account flow:** `/catalog/[id]` → Buy → order created (`PENDING_PAYMENT`) → `/checkout/[orderId]/pay` (choose method) → Pay → Midtrans Snap → Midtrans webhook PAID (signature + status re-check) → escrow → `/orders/[id]` → **Rekber Room** → deliver → safe → complete → rate.

---

## 4. TOP-UP & BALANCE

| Page | Route | Sections / components | Actions | Guard |
|---|---|---|---|---|
| Top-Up | `/topup` | Game picker, UID input (+validate), nominal grid, **promo code**, **contact (email + WhatsApp)** with notes ("dihubungi jika ada masalah", "bukti dikirim ke email/WA"), **inline payment method** (QRIS/VA/retail/e-wallet/CC/**Balance**) | **Pay** → invoice no + Midtrans Snap redirect (or Balance deduct) | public (Balance pay → auth) |
| Invoice check | `/topup/invoice` | "Cek Invoice Kamu dengan Mudah dan Cepat", invoice-no input, status result | Check status | public |
| Balance (BLC) | `/balance` | **Balance card** (0 BLC + note "Redeem agar Balance bertambah"), **voucher denominations** (Rp1.000 … Rp5.000.000), qty stepper, **Riwayat** link | Buy voucher (Midtrans) → redeem, view history | auth |
| Balance history | `/balance/history` | Ledger (TOPUP_CREDIT / SPEND / REFUND), filters, balance-after | Filter, export | auth |

**Top-up flow:** `/topup` (game/UID/nominal/promo/contact + method) → Pay → **invoice no** → Midtrans Snap (webhook PAID) / Balance deduct → Digiflazz → success (receipt to email/WA) → `/topup/invoice` to track. Balance is a pay source for top-up **only** (closed-loop).

---

## 5. BUYER ACCOUNT (`/account`, iGV-modeled)

Sidebar shell: **Orders · Messages · [wallet items] · My Profile · Help Center**.

### 5.1 Orders
| Page | Route | Tabs / content |
|---|---|---|
| My Orders | `/account/orders/my` | Tabs: **Unpaid · Awaiting Delivery · In Rekber · To Review · Completed · After-Sales · All** · search Order No./product · date/game filter |
| Insured Orders (claims) | `/account/orders/insured` | Every order has protection (14/30d); this lists claims. Tabs: **All · Under Review · Approved · Denied · Submit Claim** |

### 5.2 Messages
| Page | Route | Content |
|---|---|---|
| Order Notifications | `/account/messages/order` | Paid, delivered, dispute, completed alerts |
| System Notifications | `/account/messages/system` | Announcements, policy updates |
| Chat | `/account/messages/chat` | Store conversations (normal chat) + rekber entry |

### 5.3 Wallet & Activity
| Page | Route | Content |
|---|---|---|
| Dashboard | `/account` | Cards: recent orders, balance, points, affiliate; quick actions |
| Transaction | `/account/transactions` | All purchases (accounts + top-ups), filter, detail |
| Mutation | `/account/mutation` | Balance (BLC) + points ledger movements |
| Balance | `/account/balance` | BLC wallet (links to `/balance`) |
| Affiliate | `/account/affiliate` | Referral link/code, referred users, earnings → **credited to Balance**, stats |
| Report | `/account/reports` | Submit report + my reports with status |
| My Offers | `/account/offers` | Pending / countered / accepted / expired |
| Wishlist | `/account/wishlist` | Saved catalogs + price-drop toggle |
| Following | `/account/following` | Followed stores + new-listing feed |
| Points | `/account/points` | Loyalty earn/redeem |

### 5.4 My Profile (`/account/profile`) — each block has Edit
- **Basic Information:** Nickname, Customer ID (read-only), Country/Region, Phone Number
- **Account Security:** Email, Password, 2FA
- **Notification Language:** push/email language
- **Avatar:** image upload

---

## 6. STORE ONBOARDING (registration)

Multi-step wizard (iGV-style 4 steps). Route shell `/sell/...`. Guard: `auth` (logged-in user becoming a store).

| Step | Route | Contents / fields | Actions |
|---|---|---|---|
| **Step 1 — Create Account** | `/sell/start` | Uses existing user account (OTP/email already done) or prompts register | Continue |
| **Step 2 — Complete Profile** | `/sell/profile` | **Store Name** (note: no personal contact info), **Product Categories** (multi-select: Accounts, Top-Up — Phase 1; more later), **Estimated Monthly Revenue** (select), **Online Contact Information**, **"Operate external business website?"** (Yes/No → if Yes, this store is likely a **Reseller Store**), **accept Seller Policies & Rules** | Save & continue |
| **Step 3 — Pay Security Deposit** | `/sell` (same page) | **Rp500.000** deposit via Midtrans Snap; explains refundable/deductible terms; activation ~15 min | Pay → webhook PAID → store ACTIVE + store balance (escrow/available ledger) opened |

**Store onboarding flow:** `/sell` → store profile (name, type, **owner legal name**, description) → deposit Rp500K via Midtrans → status **PENDING_REVIEW** → admin approves in `/admin/stores` → **Store ACTIVE** → `/store-dashboard`. Store **type** (Owner/Reseller) is set from the "external website / resell" answer and editable later in settings.

> Product categories drive what the store can list. Phase 1: Accounts + Top-Up. The "external business website" question flags reseller stores (which manage external sellers and carry full responsibility for them).

## 7. STORE DASHBOARD (`/store-dashboard`)

| Page | Route | Sections / components | Actions |
|---|---|---|---|
| Overview | `/store-dashboard` | Revenue, orders, store balance (escrow + available), pending payouts, alerts | — |
| Catalogs | `/store-dashboard/catalogs` | List (status filter), search | New, edit, delist, **bulk ops** (Premium) |
| New/Edit listing | `/store-dashboard/catalogs/new` `/[id]` | Pick **game** → **game-specific fields** (level, rank, server, region… from `attributes`), price, photos, **skin picker** (from API-synced SKINS master → auto image + VP), description, delivery notes | Save draft, publish (gets VS id) |
| Inspection | `/store-dashboard/inspections/[catalogId]` | Login-only checklist + upload media | Pass/fail → Account Checked |
| Offers | `/store-dashboard/offers` | Incoming offers list | Accept / counter / reject |
| Orders & Rekber | `/store-dashboard/orders` `/[id]` | Active orders, **rekber room**, delivery | Deliver, resolve |
| External Sellers | `/store-dashboard/external-sellers` `/[id]` | Seller records (KTP held by store), payout accounts | Add seller, **Transfer Request** (after safe 5h) + name validation |
| Balance & Withdraw | `/store-dashboard/balance` | Escrow + available balance, ledger history | **Withdraw** (Iris account validation → admin approval) |
| Subscription | `/store-dashboard/subscription` | Free/Pro/Business, benefits, billing | Upgrade/downgrade |
| Ads / Featured | `/store-dashboard/ads` | Featured slots, banner campaigns | Buy/schedule |
| Vouchers | `/store-dashboard/vouchers` | Store voucher list | Create (percent/fixed, quota) |
| Flash Sales / Bundles | `/store-dashboard/flash-sales` `/bundles` | Time-limited promos, bundles | Create/schedule |
| Homepage Editor | `/store-dashboard/homepage-editor` | Banner, description, showcase | Save |
| Analytics | `/store-dashboard/analytics` | Views, conversion, best-sellers (Premium) | Export |
| Ratings | `/store-dashboard/ratings` | Reviews + service scores | Reply once |
| Chat | `/store-dashboard/chat` | Buyer conversations | — |
| Settings | `/store-dashboard/settings` | Store profile, type, verification status, deposit, notifications (WA/Discord/Telegram) | Edit, connect channels |

---

## 8. ADMIN PANEL (`/admin`) — full management

Each row is permission-gated (see §9).

**Overview & Finance**
| Page | Route | Contents | Perm |
|---|---|---|---|
| Dashboard | `/admin` | KPIs: revenue, GMV, orders, users, stores | `dashboard:view` |
| Revenue | `/admin/finance/revenue` | Commission, handling, top-up margin, ads/subscription; charts | `finance:view` |
| Payouts & Transfers | `/admin/finance/payouts` | Store withdrawals, external-seller transfers, holds; **approve Iris payouts** (maker-checker) | `payouts:manage` |
| Balance Float | `/admin/finance/float` | Closed-loop BLC liability, movements | `finance:view` |
| Reconciliation | `/admin/finance/reconcile` | Store ledgers / escrow / BLC float vs Midtrans Snap + Iris reports | `finance:export` |

**Marketplace & Trust**
| Page | Route | Contents | Perm |
|---|---|---|---|
| Stores | `/admin/stores` `/[id]` | Manual verification (approve/reject + note), levels, deposit, suspend | `stores:*` |
| Users | `/admin/users` `/[id]` | Ban, trust, reports | `users:manage` |
| Catalog moderation | `/admin/catalogs` | Review/remove/flag | `catalogs:moderate` |
| Inspection audit | `/admin/inspections` | Review store inspections | `inspections:view` |
| Orders | `/admin/orders` `/[id]` | Lookup, intervene, refund | `orders:view` |
| Rekber supervision | `/admin/rekber` | Monitor rooms | `rekber:view` |
| Disputes | `/admin/disputes` `/[id]` | Resolve 72h, arbitrate, deposit deduction | `disputes:resolve` |
| Fraud/Sanctions | `/admin/fraud` | Tiered sanctions, blacklists (device/identity/bank) | `fraud:manage` |

**Commerce Config**
| Page | Route | Contents | Perm |
|---|---|---|---|
| Top-Up Products | `/admin/topup-products` | Digiflazz sync, pricing, margins | `topup:manage` |
| Balance mgmt | `/admin/balance` | Float oversight, refunds to balance, adjust | `balance:manage` |
| Vouchers | `/admin/vouchers` | Platform vouchers | `vouchers:manage` |
| Promo codes | `/admin/promo-codes` | Top-up promo codes | `promos:manage` |
| Ads/Banners | `/admin/ads` | Placements, approvals | `ads:manage` |
| Games | `/admin/games` | Games, servers, regions | `catalog:config` |
| Skins | `/admin/skins` | VP master data | `catalog:config` |
| Affiliate | `/admin/affiliate` | Rules, commissions, payouts to balance | `affiliate:manage` |

**Content**
| Page | Route | Contents | Perm |
|---|---|---|---|
| Articles (news) | `/admin/articles` `/create` `/[id]` | CMS: create/edit/publish/schedule, categories, cover | `articles:*` |
| Help center | `/admin/help` `/create` `/[id]` | CMS: help articles + categories | `help:*` |

**Communication**
| Page | Route | Contents | Perm |
|---|---|---|---|
| Support / Tickets | `/admin/support` | Admin ↔ user/store chat, report queue | `support:manage` |
| Broadcast | `/admin/broadcast` | Announcements (push/email/WA) | `broadcast:send` |
| Reports queue | `/admin/reports` | User-submitted reports triage | `reports:manage` |

**System**
| Page | Route | Contents | Perm |
|---|---|---|---|
| RBAC | `/admin/rbac/roles` `/permissions` `/admins` | Roles, permission matrix, admin users | `rbac:manage` |
| Settings | `/admin/settings` | Fees/constants (commission, handling, protection, deposit), gateway keys | `settings:manage` |
| Webhook logs | `/admin/logs/webhooks` | Midtrans (and future Iris/Digiflazz) events, retries | `logs:view` |
| Audit logs | `/admin/logs/audit` | Every sensitive action + actor + IP | `logs:view` |

---

## 9. RBAC — ROLES & PERMISSIONS

**Model:** `module:action` permissions → bundled into **roles** → assigned to **admin users** (one or more). Enforced by Express middleware (`require-permission`) per route. Only Super Admin manages RBAC. Every assignment is audit-logged.

**Actions:** `view · create · edit · delete · publish · approve · resolve · export · manage · send · moderate`

### Recommended roles
| Role | Permissions |
|---|---|
| **Super Admin** | `*` (incl. `rbac:manage`) |
| **Finance Admin** | `finance:* · payouts:manage · balance:view · logs:view` |
| **Store Verification Admin** | `stores:* · stores:verify · deposit:manage · inspections:view` |
| **Dispute/Support Admin** | `disputes:resolve · rekber:view · support:manage · reports:manage · orders:view` |
| **Fraud Admin** | `fraud:manage · sanctions:* · blacklists:* · users:manage` |
| **Catalog Moderator** | `catalogs:moderate · catalogs:delete · catalogs:view` |
| **Marketing Admin** | `vouchers:manage · promos:manage · ads:manage · affiliate:manage · broadcast:send` |
| **Article Creator** | `articles:create · articles:edit_own` — sees only `/admin/articles/create` + own drafts |
| **Article Manager** | `articles:*` — inspect ALL, edit, publish, **delete** |
| **Help Center Editor** | `help:create · help:edit · help:publish` |

### Permission matrix (excerpt)
| Module | view | create | edit | delete | publish | approve | resolve |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| articles | Mgr | Creator/Mgr | own(Creator)/Mgr | Mgr | Mgr | — | — |
| help | Editor | Editor | Editor | Super | Editor | — | — |
| stores | Store | — | Store | — | — | Store(verify) | — |
| disputes | Dispute | — | — | — | — | — | Dispute |
| finance | Finance | — | — | — | — | — | — |

---

## 10. SHARED COMPONENTS

- **Nav shell** (public) · **Account sidebar** · **Store sidebar** · **Admin sidebar** — role-aware.
- **Chat panel** (future: Socket.IO) — normal chat (rules: no txn/email/phone) + offer modal.
- **Rekber Room** (prototype: stored messages + polling; future: Socket.IO; code = VS id) — delivery + evidence.
- **Payment method selector** — reused by checkout, top-up, balance top-up.
- **Notification bell** — in-app alerts (order/system).
- **Badge components** — store type + trust badges.
- **Invoice component** — order/top-up/balance invoices.

---

## 11. PAGE STATES & GUARDS

- **States per list page:** loading (skeleton) · empty ("No orders found" etc.) · error · paginated/infinite.
- **Guards:** `public` open · `auth` redirects to login · `store` requires active verified store · `admin:PERM` requires the permission (server-checked; UI hides what's not permitted).
- **Empty-state examples:** My Orders "No orders found", Insured "No more records", Balance "0 BLC — Redeem agar Balance bertambah".

---

## 12. PAGE COUNT

Public/Nav ~9 · Auth 4 · Marketplace/Payment ~5 · Top-Up/Balance ~4 · Buyer Account ~20 (orders 2, messages 3, wallet 10, profile 5) · Store Dashboard ~17 · Admin ~30 · RBAC 10 roles.

> All pages link through shared shells; every money/data route is permission-gated server-side.
