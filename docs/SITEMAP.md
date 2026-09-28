# SITEMAP — valostock.id

**Page map, route tree, per-page contents and guards (as implemented)**
Version 4.0 (v8) · Next.js 16 web (`front/`) over the Express API (`back/`) · local Supabase project `valostock`

> Every page below exists and reads/writes real data through the API. Admin pages are specified in detail in [`ADMIN_PANEL.md`](ADMIN_PANEL.md); the API contract is in [`ARCHITECTURE.md`](ARCHITECTURE.md) §3.1. Simulated external services: Midtrans Iris payouts, Digiflazz delivery, WhatsApp/Discord/Telegram (in-app notifications are real); Midtrans Snap runs in Sandbox or simulation mode.

> **Guards:** `public` · `auth` (logged in) · `store` (owner of a store in ACTIVE / PENDING_REVIEW / SUSPENDED) · `admin:<perm>`. The Next.js guard is only a redirect convenience — **every API endpoint re-checks** the session, ownership (buyer / store owner) or admin permission.

---

## 0. Route tree

```
/                                   Home: hero, popular games, featured + newest listings, recommendations, news     public
├── search                          Search all listings (game, rank, price, skins, region, badges, store level)      public
├── [game]/account                  Listings of one game + filters generated from the game's field templates         public
├── [game]/topup                    Top-up for one game                                                              public
├── catalog/[id]                    Listing detail + buy panel                                                       public (actions → auth)
├── store/[slug]                    Storefront: badges, service score, vouchers, listings, bundles, reviews          public
├── topup                           Top-up hub (game → UID → nominal → promo → contact → method)                     public
│   └── invoice                     "Cek Invoice" by invoice number (game ID masked)                                 public
├── balance                         Buy BLC vouchers (closed-loop Balance)                                           auth
│   └── history                     Balance ledger                                                                   auth
├── news · news/[slug]              News (CMS)                                                                       public
├── help · help/[slug]              Help center (CMS) + "helpful" vote                                               public
├── legal/ terms privacy refund     Legal pages                                                                      public
├── (auth)/ login register forgot-password reset-password                                                            public
├── payment/ simulate finish        Payment simulator (simulation mode) · return page from Midtrans                  public
│
├── checkout/[orderId]/pay          Payment method → Midtrans Snap / simulator                                       auth (buyer)
├── orders/[id]                     Order: timeline, money breakdown, Rekber Room, safe/complete, rating, dispute     auth (buyer · store · admin)
├── disputes/[id]                   Dispute: timeline, evidence, statements, admin ruling                            auth (parties · admin)
│
├── account/                        BUYER AREA                                                                       auth
│   ├── (dashboard)                 Balance, points, referral code, recent top-ups, open-a-store banner
│   ├── orders/my                   My orders
│   ├── orders/insured              Disputes + orders still under protection
│   ├── messages/ order system chat Notifications (order · system/store) and store chat
│   ├── transactions  mutation      Top-up history · Balance + points ledgers
│   ├── balance  affiliate  points  Balance · referral (Rp10.000 reward) · loyalty points + redeem
│   ├── offers  wishlist  following My offers (accept counter / buy / cancel) · wishlist (+ price-drop alert, recently viewed) · followed stores
│   ├── reports                     My reports + moderator response
│   └── profile                     Profile, edit name/phone, change password
│
├── sell                            Store onboarding: profile → deposit Rp500.000 → admin review                     auth
│
├── store-dashboard/                STORE SHELL (sidebar, badges for offers / paid orders / chat)                     store
│   ├── (overview)                  Net revenue 30 d, balance, pending offers, orders to act on, rejected catalogs
│   ├── catalogs · catalogs/new · catalogs/[id]   Status tabs · template-driven form · photos · submit / resubmit / withdraw · history
│   ├── inspections/[catalogId]     Login-only checklist + private media → Account Checked
│   ├── offers                      Accept / counter / reject
│   ├── orders                      Orders grouped by what needs action → Rekber Room on /orders/[id]
│   ├── disputes                    Disputes against the store (72 h deadline)
│   ├── balance                     Escrow + available, ledger, withdrawal (name must match the verified owner)
│   ├── subscription  ads           Free / Pro / Business · featured listings (free first week, plan slots, paid)
│   ├── vouchers  flash-sales  bundles
│   ├── external-sellers · external-sellers/[id]   Reseller stores only: sellers + transfer requests
│   ├── homepage-editor  settings   Storefront banner/description · profile, verification, deposit top-up, request closure
│   ├── analytics  ratings  chat  notifications
│
└── admin/                          ADMIN PANEL (ADMIN_PANEL.md)                                                     admin:<perm>
    ├── (dashboard)                 dashboard:view
    ├── catalogs · catalogs/[id]    catalogs:view / moderate / takedown
    ├── stores · stores/[id]        stores:view / verify / suspend
    ├── reports                     reports:manage
    ├── orders                      orders:view / intervene   (detail = /orders/[id])
    ├── disputes                    disputes:resolve          (detail = /disputes/[id])
    ├── topups  payments            payments:view
    ├── withdrawals  transfers  refunds  finance   finance:view / payments:view · payouts:approve
    ├── ads                         ads:manage
    ├── games · games/[id]  topup-products  promo-codes   master:manage
    ├── news  help                  content:manage
    ├── users · users/[id]          users:view / ban
    ├── admins                      rbac:manage
    └── audit  analytics            audit:view
```

---

## 1. Public & marketplace

| Page | Route | Contents | Actions |
|---|---|---|---|
| Home | `/` | Hero, trust points, popular games, featured listings (paid/free ads first), newest listings, **recommendations** (logged in: games of recently viewed / wishlisted accounts), latest news | Open game / listing / news |
| Search | `/search` | Sidebar filters over all listings (game, rank group, price range, skins, server, badges, store level), sort, pagination | Filter, open listing |
| Game accounts | `/[game]/account` | Game banner; **filters generated from the game's field templates** (`filterable` columns: SELECT → exact, NUMBER → minimum) + text, price range, sort — filtered by the API | Filter, open listing |
| Listing detail | `/catalog/[id]` | Gallery, VS code, store badges, description; Valorant: spec tiles, skin collection, agents; other games: attribute sheet from templates; Account Checked banner (only when the store's inspection passed); bundles containing this account; real store reviews; FAQ | **Buy** (with store voucher), **offer / accept counter / buy at agreed price**, **paid lock Rp5.000 / 30 min**, wishlist, chat store, report |
| Storefront | `/store/[slug]` | Banner (store gradient), badges, service score, vouchers, listings, **bundles** (buy bundle), reviews with store replies | Follow, chat, buy bundle, report |
| News / Help | `/news`, `/help` + `[slug]` | CMS articles (paragraph / heading / list / image blocks) | Read, "helpful" vote |

**Buy flow:** `/catalog/[id]` → Buy → `POST /api/orders` (price = agreed offer / flash sale / bundle − store voucher; catalogs LOCKED) → `/checkout/[orderId]/pay` → Midtrans Snap or simulator → PAID (escrow hold, rekber opens) → store sends the account in the Rekber Room (`IN_REKBER`) → buyer "Akun aman" (`SAFE`) → "Selesai" or automatically 5 h later (`COMPLETED`: escrow released minus plan commission, points, referral reward) → rating. Disputes: while escrow is held, or during the 14/30-day protection window.

---

## 2. Auth (Supabase Auth behind the API)

| Page | Route | Contents |
|---|---|---|
| Login | `/login` | Email **or phone** + password. If only the access cookie expired, the page refreshes the session in the browser and continues to `?next=` |
| Register | `/register` | Name, phone (optional), email, password, **referral code** (pre-filled from `?ref=`), terms |
| Forgot password | `/forgot-password` | Email → Supabase sends the reset link (locally visible in Mailpit, `http://127.0.0.1:55324`) |
| Reset password | `/reset-password` | Opened from the email (`#access_token=…`), sets the new password |

No OTP, no Google login in v8 (future work).

---

## 3. Top-up & Balance

| Page | Route | Contents |
|---|---|---|
| Top-up | `/topup`, `/[game]/topup` | Game, UID (+ zone), nominal, promo code, contact email/WhatsApp, method (QRIS / VA / retail / e-wallet / card / **Balance**) with surcharge |
| Invoice check | `/topup/invoice` | Status by invoice number; game ID masked |
| Balance | `/balance`, `/balance/history` | Buy BLC vouchers via Midtrans (idempotency key), ledger. **Closed-loop:** top-up only — never accounts, cash-out or transfers |

---

## 4. Buyer area (`/account`)

See the route tree. Notes:
- **Orders** `/account/orders/my` and `/orders/[id]` (Rekber Room with private attachments, rating form after completion, dispute form while allowed).
- **Disputes & protection** `/account/orders/insured` → `/disputes/[id]`.
- **Notifications** are real in-app rows (order, system, store); "mark all read".
- **Points:** 1 point per Rp1.000 of completed orders and successful top-ups; 100 points → Rp1.000 Balance.
- **Referral:** code + link `/register?ref=CODE`; Rp10.000 Balance when the referred user's first order completes or first top-up succeeds.

---

## 5. Store onboarding (`/sell`)

Single-page wizard: **profile** (name, type Owner/Reseller, owner legal name as on the ID card, description, accept rules) → **deposit Rp500.000** via Midtrans → `PENDING_REVIEW` (the owner may already prepare draft catalogs in the dashboard) → admin approves (`ACTIVE`, balance + FREE plan created) or rejects with a reason (deposit refund simulated).

---

## 6. Store dashboard (`/store-dashboard`)

| Page | Contents | Key rules |
|---|---|---|
| Catalogs | Tabs per status (Draft · Menunggu Verifikasi · Ditolak · Tayang · Dalam Pesanan · Terjual · Diturunkan); **bulk submit / hide** for Pro & Business | Only admin-approved catalogs are sold |
| Catalog form | Game → **fields from the admin-managed template**, title, description, price, crossed-out price, instant; photos (≤ 10, ≤ 2 MB, PNG/JPG/WebP) | Required fields + ≥ 1 photo + plan quota to submit; VS code issued at first submission; edits of a LISTED catalog go back to review; no contact details / off-platform links |
| Inspection | 5-item login-only checklist, notes, private media | All ticked = PASSED → Account Checked badge |
| Offers | Pending + history | Offer valid 24 h; agreed price valid 24 h |
| Orders | Needs action / unpaid / done / cancelled-refunded | First store message in rekber = delivery |
| Balance | Escrow, available, ledger, withdrawals | Fee Rp4.000 + Rp2.500; account name MATCH/REVIEW (MISMATCH refused); admin approves |
| Subscription | Free 5% / Pro 4.5% / Business 4% | Paid via Midtrans, 30 days |
| Ads | Free first week (once), plan slots, paid 1/3/7/14/30 days | Featured listings go first in search and on the home page |
| Vouchers · Flash sales · Bundles | CRUD | Flash sale ≤ 7 days; bundle 2–5 accounts, cheaper than the sum |
| External sellers | Reseller stores only | One transfer per completed order, fee Rp4.000, admin approves |
| Analytics | Free: funnel · Pro: + daily GMV, most viewed · Business: + sales per game | Tier from the subscription |
| Settings | Profile, verification data, deposit (top up a shortfall), **request closure** | Closure needs no pending orders/disputes/payouts, balance withdrawn; admin decides and refunds the deposit |
| Ratings · Chat · Notifications · Etalase | — | Reply to each review once; chat blocks contact details |

---

## 7. Admin panel (`/admin`)

Designed in [`ADMIN_PANEL.md`](ADMIN_PANEL.md): dashboard with queues, catalog moderation (approve / reject with template reasons / takedown), store verification (approve / reject / suspend / reactivate / level), user reports (resolve with takedown or suspension), orders (cancel unpaid, admin messages in rekber), disputes (ruling + optional sanction), top-ups, payments + webhook log, withdrawals, transfers, finance summary, ads & subscriptions, games + field templates, top-up products, promo codes, news & help CMS, users (ban / unban), admins & roles, audit log, top-up analytics. The sidebar shows only the menus the admin's roles allow; every action is re-checked by the API and written to `audit_logs`.

---

## 8. Shared components

Dashboard kit (`components/dashboard`: header, stat card, panel, table, status tabs, action button, API form, review history) · account sidebar · store sidebar · admin shell · chat panel (polling) · Rekber Room (polling, attachments) · payment start (method → Snap) · buy panel · report button · follow button · store badges.

## 9. Page states

Every list has an empty state; admin pages without the needed permission show "Tidak ada akses" (the API answers 403); unauthenticated visits to `auth` pages redirect to `/login?next=…`; non-admins get 404 on `/admin`.
