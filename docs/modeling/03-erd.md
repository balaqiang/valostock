# 3. Entity Relationship Diagram (ERD)

Basis data PostgreSQL 17 pada project Supabase lokal **valostock** (schema `public`). Terdiri dari **53 tabel** dalam 7 domain. Supaya tetap terbaca, ERD dipecah per domain; tabel yang muncul di lebih dari satu diagram adalah tabel yang sama.

- Tipe data: `uuid`, `text`, `int` (uang dalam Rupiah bulat), `numeric` (rasio/skor), `bool`, `timestamptz`, `jsonb`, `enum`.
- Kardinalitas (crow's foot): `||` tepat satu · `o|` nol/satu · `|{` satu/lebih · `o{` nol/lebih.
- Tipe fisik lengkap ada di [05-struktur-tabel.md](05-struktur-tabel.md) (dibuat otomatis dari database).
- Akun login disimpan oleh **Supabase Auth** di `auth.users`. Setiap akun punya tepat satu baris `profiles` dengan id yang sama.

---

## 3.A Identitas, Akses & Toko

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1 akun = 1 profil"
    PROFILES |o--o{ PROFILES : "mereferensikan"
    PROFILES ||--o{ ADMIN_USER_ROLES : "diberi peran"
    ADMIN_ROLES ||--o{ ADMIN_USER_ROLES : "dimiliki"
    ADMIN_ROLES ||--o{ ROLE_PERMISSIONS : "berisi"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "termasuk"
    PROFILES ||--o| STORES : "memiliki"
    STORES ||--|| STORE_SUBSCRIPTIONS : "berlangganan"
    STORES ||--|| STORE_BALANCES : "punya saldo"
    STORES ||--o{ STORE_LEDGER : "mutasi"
    STORES ||--o{ STORE_SANCTIONS : "dikenai"
    STORES ||--o{ EXTERNAL_SELLERS : "mengelola"
    STORES ||--o{ WITHDRAWALS : "menarik"
    STORES ||--o{ TRANSFER_REQUESTS : "mentransfer"
    EXTERNAL_SELLERS ||--o{ TRANSFER_REQUESTS : "menerima"

    PROFILES {
        uuid id PK "= auth.users.id"
        text email "disalin dari Supabase Auth"
        text name
        text phone UK
        enum role "USER / ADMIN"
        int balance "Balance BLC (ringkasan balance_ledger)"
        int loyalty_points "ringkasan loyalty_ledger"
        text referral_code UK
        uuid referred_by FK
        bool is_banned
        timestamptz created_at
    }
    ADMIN_ROLES {
        uuid id PK
        text key UK "SUPER_ADMIN, CATALOG_MODERATOR, ..."
        text name
    }
    PERMISSIONS {
        text key PK "mis. catalogs:moderate"
        text module
    }
    ROLE_PERMISSIONS {
        uuid role_id PK,FK
        text permission_key PK,FK
    }
    ADMIN_USER_ROLES {
        uuid user_id PK,FK
        uuid role_id PK,FK
        uuid assigned_by FK
    }
    STORES {
        uuid id PK
        uuid owner_id FK,UK
        text slug UK
        text name
        enum type "OWNER / RESELLER"
        enum level "AUTHORIZED / VERIFIED / PLATINUM"
        enum status "PENDING_DEPOSIT / PENDING_REVIEW / ACTIVE / REJECTED / SUSPENDED / CLOSING / CLOSED"
        text owner_legal_name "diverifikasi manual admin"
        enum deposit_status
        numeric rating
        int sold
        uuid reviewed_by FK
        timestamptz created_at
    }
    STORE_SUBSCRIPTIONS {
        uuid store_id PK,FK
        enum tier "FREE / PRO / BUSINESS"
        numeric commission_rate
        int max_listings
        int free_featured_slots
        timestamptz current_period_end
    }
    STORE_BALANCES {
        uuid store_id PK,FK
        int escrow
        int available
        int deposit "deposit yang ditahan"
    }
    STORE_LEDGER {
        bigint id PK
        uuid store_id FK
        enum bucket "ESCROW / AVAILABLE / DEPOSIT"
        enum type
        int amount
        int balance_after
        text ref_type
        uuid ref_id
    }
    STORE_SANCTIONS {
        uuid id PK
        uuid store_id FK
        enum type "WARNING / SUSPEND / FINE"
        int amount
        text reason
        uuid created_by FK
    }
    EXTERNAL_SELLERS {
        uuid id PK
        uuid store_id FK
        text alias
        text payout_bank
        text payout_account
        text payout_name
    }
    WITHDRAWALS {
        uuid id PK
        text withdrawal_number UK
        uuid store_id FK
        int amount
        int fee
        text account_name
        enum name_match
        enum status "PENDING / COMPLETED / REJECTED"
    }
    TRANSFER_REQUESTS {
        uuid id PK
        text transfer_number UK
        uuid store_id FK
        uuid external_seller_id FK
        uuid order_id FK
        int amount
        int fee
        enum name_match
        enum status
    }
```

## 3.B Game, Katalog & Moderasi

```mermaid
erDiagram
    GAMES ||--o{ GAME_FIELD_TEMPLATES : "mendefinisikan kolom"
    GAMES ||--o{ CATALOGS : "mengelompokkan"
    GAMES ||--o{ TOPUP_PRODUCTS : "punya"
    STORES ||--o{ CATALOGS : "menjual"
    CATALOGS ||--o{ CATALOG_IMAGES : "foto"
    CATALOGS ||--o{ CATALOG_REVIEWS : "riwayat moderasi"
    PROFILES ||--o{ CATALOG_REVIEWS : "memutuskan"
    CATALOGS ||--o| ACCOUNT_INSPECTIONS : "diinspeksi"

    GAMES {
        int id PK
        text slug UK
        text name
        bool supports_account
        bool supports_topup
        bool is_active
        int sort_order
    }
    GAME_FIELD_TEMPLATES {
        uuid id PK
        int game_id FK
        text key "mis. rank, server, skin_count"
        text label
        enum type "TEXT / NUMBER / SELECT / TAGS"
        bool required
        jsonb options "untuk SELECT"
        bool filterable
    }
    CATALOGS {
        uuid id PK
        text vs_code UK "diterbitkan saat pertama diajukan"
        uuid store_id FK
        int game_id FK
        text title
        int price
        enum status "DRAFT / PENDING_REVIEW / REJECTED / LISTED / LOCKED / IN_ORDER / SOLD / DELISTED"
        jsonb attributes "nilai kolom sesuai template (index GIN)"
        bool account_checked
        text review_note
        timestamptz submitted_at
        timestamptz listed_at
    }
    CATALOG_IMAGES {
        uuid id PK
        uuid catalog_id FK
        text storage_path "bucket catalog-images"
        int sort_order
    }
    CATALOG_REVIEWS {
        uuid id PK
        uuid catalog_id FK
        uuid actor_id FK
        enum decision "SUBMITTED / APPROVED / REJECTED / TAKEDOWN"
        text_array reasons
        text note
        timestamptz created_at
    }
    ACCOUNT_INSPECTIONS {
        uuid id PK
        uuid catalog_id FK,UK
        uuid inspected_by FK
        jsonb checklist "login, restriksi, inventori, rank, 2FA"
        jsonb media "path privat"
        enum result "PASSED / FAILED"
    }
```

## 3.C Transaksi Akun: Tawar, Pesanan, Rekber, Sengketa, Rating, Chat

```mermaid
erDiagram
    CATALOGS ||--o{ OFFERS : "ditawar"
    CATALOGS ||--o{ CATALOG_LOCKS : "dikunci"
    PROFILES ||--o{ CATALOG_LOCKS : "mengunci"
    PROFILES ||--o{ OFFERS : "menawar"
    PROFILES ||--o{ ORDERS : "membeli"
    STORES ||--o{ ORDERS : "menerima"
    ORDERS ||--|{ ORDER_ITEMS : "berisi"
    CATALOGS ||--o{ ORDER_ITEMS : "dipesan"
    OFFERS |o--o| ORDERS : "menjadi"
    ORDERS ||--o{ REKBER_MESSAGES : "rekber"
    ORDERS ||--o| DISPUTES : "disengketakan"
    DISPUTES ||--o{ DISPUTE_EVENTS : "timeline"
    ORDERS ||--o| RATINGS : "dinilai"
    PROFILES ||--o{ CONVERSATIONS : "chat pembeli"
    STORES ||--o{ CONVERSATIONS : "chat toko"
    CONVERSATIONS ||--o{ CHAT_MESSAGES : "berisi"

    OFFERS {
        uuid id PK
        uuid catalog_id FK
        uuid buyer_id FK
        int amount
        int counter_amount
        enum status "PENDING / COUNTERED / ACCEPTED / REJECTED / EXPIRED / CANCELLED / USED"
        timestamptz expires_at
    }
    CATALOG_LOCKS {
        uuid id PK
        uuid catalog_id FK
        uuid buyer_id FK
        int fee "Rp5.000"
        enum status "PENDING_PAYMENT / ACTIVE / USED / EXPIRED"
        timestamptz expires_at "30 menit"
    }
    ORDERS {
        uuid id PK
        text order_number UK
        uuid buyer_id FK
        uuid store_id FK
        uuid offer_id FK
        uuid bundle_id FK
        uuid voucher_id FK
        uuid lock_id FK
        int items_subtotal
        int voucher_discount
        int item_price "dasar escrow & komisi"
        int handling_fee
        int protection_fee
        int total_paid
        numeric commission_rate
        int commission
        int store_receives
        enum status "PENDING_PAYMENT / PAID / IN_REKBER / SAFE / COMPLETED / CANCELLED / DISPUTED / REFUNDED"
        timestamptz protection_until
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid catalog_id FK
        int price
    }
    REKBER_MESSAGES {
        bigint id PK
        uuid order_id FK
        uuid sender_id FK
        enum sender_role "BUYER / STORE / ADMIN / SYSTEM"
        text body
        jsonb attachments "path privat"
    }
    DISPUTES {
        uuid id PK
        uuid order_id FK,UK
        uuid opened_by FK
        enum reason "NOT_DELIVERED / NOT_AS_DESCRIBED / RECALLED / OTHER"
        enum status "OPEN / STORE_RESPONDED / IN_REVIEW / RESOLVED_BUYER / RESOLVED_STORE / CANCELLED"
        timestamptz store_deadline "72 jam"
        int refund_amount
        uuid resolved_by FK
    }
    DISPUTE_EVENTS {
        bigint id PK
        uuid dispute_id FK
        uuid actor_id FK
        enum type "OPENED / STATEMENT / EVIDENCE / ADMIN_NOTE / RESOLVED"
        text body
    }
    RATINGS {
        uuid id PK
        uuid order_id FK,UK
        uuid store_id FK
        uuid buyer_id FK
        int overall "-1 / 0 / 1"
        int desc_accuracy "1-5"
        int attitude "1-5"
        int delivery_speed "1-5"
        text comment
        text store_reply
    }
    CONVERSATIONS {
        uuid id PK
        uuid buyer_id FK
        uuid store_id FK
        timestamptz last_message_at
    }
    CHAT_MESSAGES {
        bigint id PK
        uuid conversation_id FK
        uuid sender_id FK
        text body
        uuid catalog_id FK "konteks (opsional)"
    }
```

## 3.D Pembayaran, Top-up & Balance

```mermaid
erDiagram
    PROFILES |o--o{ PAYMENTS : "membayar"
    PAYMENTS ||--o{ WEBHOOK_EVENTS : "dikonfirmasi"
    TOPUP_PRODUCTS ||--o{ TOPUP_ORDERS : "dibeli"
    PROMO_CODES |o--o{ TOPUP_ORDERS : "dipakai"
    PROFILES |o--o{ TOPUP_ORDERS : "memesan"
    PROFILES ||--o{ BALANCE_TOPUPS : "mengisi"
    PROFILES ||--o{ BALANCE_LEDGER : "mutasi"
    PAYMENTS ||--o| REFUNDS : "dikembalikan"
    PROFILES |o--o{ REFUNDS : "menerima"

    PAYMENTS {
        uuid id PK
        text midtrans_order_id UK
        enum purpose "TOPUP / BALANCE_FILL / ORDER / STORE_DEPOSIT / SUBSCRIPTION / AD / LOCK"
        uuid ref_id "tabel tujuan sesuai purpose"
        int amount
        enum status "PENDING / PAID / EXPIRED / FAILED"
    }
    WEBHOOK_EVENTS {
        bigint id PK
        uuid payment_id FK
        text external_id "UK bersama source"
        jsonb payload
        bool processed
    }
    TOPUP_PRODUCTS {
        text id PK
        int game_id FK
        text amount_label
        int retail_price
        bool is_active
    }
    PROMO_CODES {
        int id PK
        text code UK
        enum kind
        int value
        int quota
        int used_count
    }
    TOPUP_ORDERS {
        uuid id PK
        text invoice_number UK
        uuid user_id FK
        text product_id FK
        text user_game_id
        int amount
        enum pay_source "MIDTRANS / BALANCE"
        enum status
    }
    BALANCE_TOPUPS {
        uuid id PK
        text invoice_number UK
        uuid user_id FK
        int credit
        int amount
        enum status
    }
    BALANCE_LEDGER {
        bigint id PK
        uuid user_id FK
        enum type "TOPUP_CREDIT / SPEND_TOPUP / REFUND_CREDIT / LOYALTY_CREDIT / REFERRAL_CREDIT / ADJUSTMENT"
        int amount
        int balance_after
        text reference
    }
    REFUNDS {
        uuid id PK
        uuid payment_id FK,UK
        uuid user_id FK
        int amount
        enum source "PAID_AFTER_CANCEL / LOCK_UNAVAILABLE / TOPUP_UNDELIVERED"
        enum status "PENDING / COMPLETED"
        uuid handled_by FK
    }
```

## 3.E Promosi & Iklan Toko

```mermaid
erDiagram
    STORES ||--o{ STORE_VOUCHERS : "menerbitkan"
    STORE_VOUCHERS ||--o{ VOUCHER_REDEMPTIONS : "dipakai"
    ORDERS ||--o| VOUCHER_REDEMPTIONS : "memakai"
    STORES ||--o{ FLASH_SALES : "mengadakan"
    CATALOGS ||--o{ FLASH_SALES : "didiskon"
    STORES ||--o{ BUNDLES : "membuat"
    BUNDLES ||--|{ BUNDLE_ITEMS : "berisi"
    CATALOGS ||--o{ BUNDLE_ITEMS : "masuk bundle"
    STORES ||--o{ FEATURED_LISTINGS : "membeli iklan"
    CATALOGS ||--o{ FEATURED_LISTINGS : "dipromosikan"

    STORE_VOUCHERS {
        uuid id PK
        uuid store_id FK
        text code "UK per toko"
        enum kind "PERCENT / FIXED"
        int value
        int min_spend
        int quota
        int used
        timestamptz expires_at
    }
    VOUCHER_REDEMPTIONS {
        uuid id PK
        uuid voucher_id FK
        uuid user_id FK
        uuid order_id FK,UK
        int discount
    }
    FLASH_SALES {
        uuid id PK
        uuid store_id FK
        uuid catalog_id FK
        int sale_price
        timestamptz starts_at
        timestamptz ends_at
    }
    BUNDLES {
        uuid id PK
        uuid store_id FK
        text title
        int bundle_price
        enum status "ACTIVE / INACTIVE / SOLD"
    }
    BUNDLE_ITEMS {
        uuid bundle_id PK,FK
        uuid catalog_id PK,FK
    }
    FEATURED_LISTINGS {
        uuid id PK
        uuid store_id FK
        uuid catalog_id FK
        int duration_days
        int price
        bool is_free
        enum status "PENDING_PAYMENT / ACTIVE / EXPIRED / STOPPED"
        timestamptz ends_at
    }
```

## 3.F Engagement: Wishlist, Ikuti Toko, Notifikasi, Poin, Afiliasi

```mermaid
erDiagram
    PROFILES ||--o{ WISHLISTS : "menyimpan"
    CATALOGS ||--o{ WISHLISTS : "disimpan"
    PROFILES ||--o{ STORE_FOLLOWS : "mengikuti"
    STORES ||--o{ STORE_FOLLOWS : "diikuti"
    PROFILES ||--o{ RECENTLY_VIEWED : "melihat"
    CATALOGS ||--o{ RECENTLY_VIEWED : "dilihat"
    PROFILES ||--o{ NOTIFICATIONS : "menerima"
    PROFILES ||--o{ LOYALTY_LEDGER : "mutasi poin"
    PROFILES ||--o{ REFERRAL_REWARDS : "mereferensikan"

    WISHLISTS {
        uuid user_id PK,FK
        uuid catalog_id PK,FK
        bool notify_price_drop
        int price_at_save "pembanding turun harga"
    }
    STORE_FOLLOWS {
        uuid user_id PK,FK
        uuid store_id PK,FK
    }
    RECENTLY_VIEWED {
        uuid user_id PK,FK
        uuid catalog_id PK,FK
        timestamptz viewed_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        enum kind "ORDER / SYSTEM / STORE"
        text title
        text body
        text link
        bool is_read
    }
    LOYALTY_LEDGER {
        bigint id PK
        uuid user_id FK
        enum type "EARN / REDEEM / ADJUSTMENT"
        int points
        int balance_after
        text reference
    }
    REFERRAL_REWARDS {
        uuid id PK
        uuid referrer_id FK
        uuid referred_id FK,UK
        int reward
        enum status "PENDING / REWARDED"
    }
```

## 3.G Konten & Operasional

```mermaid
erDiagram
    PROFILES ||--o{ NEWS_ARTICLES : "menulis"
    PROFILES ||--o{ REPORTS : "melapor"
    PROFILES |o--o{ AUDIT_LOGS : "melakukan"

    NEWS_ARTICLES {
        uuid id PK
        text slug UK
        text title
        jsonb body
        enum status "DRAFT / PUBLISHED"
        uuid author_id FK
        timestamptz published_at
    }
    HELP_ARTICLES {
        int id PK
        text slug UK
        enum category
        jsonb body
        bool is_published
    }
    REPORTS {
        uuid id PK
        uuid reporter_id FK
        enum target_type "CATALOG / STORE / USER"
        uuid target_id
        enum reason
        enum status "OPEN / REVIEWING / RESOLVED / DISMISSED"
        uuid handled_by FK
    }
    AUDIT_LOGS {
        bigint id PK
        uuid actor_id FK
        text action
        text target_type
        text target_id
        jsonb detail
        text ip
    }
```

---

## 3.H Catatan Desain

1. **Profil terhubung ke Supabase Auth.** Trigger `on_auth_user_created` membuat baris `profiles` otomatis saat akun mendaftar. Email dan password dikelola Supabase Auth dan tidak disalin ke tabel aplikasi.
2. **Moderasi katalog.** Katalog hanya tampil di marketplace jika berstatus `LISTED`. Setiap pengajuan, persetujuan, penolakan, dan penurunan dicatat di `catalog_reviews`. Perubahan data penting pada katalog `LISTED` mengembalikannya ke `PENDING_REVIEW`.
3. **Kolom katalog per game dikendalikan data.** `game_field_templates` menentukan isi `catalogs.attributes` dan filter pencarian, sehingga menambah game atau kolom baru tidak memerlukan perubahan tabel.
4. **Pesanan bisa berisi lebih dari satu akun** (untuk bundle) melalui `order_items`. Harga final (`item_price`) sudah memperhitungkan tawaran, flash sale, bundle, dan voucher. Harga final ini menjadi dasar escrow dan komisi.
5. **Relasi polimorfik `PAYMENTS`.** `purpose` + `ref_id` menunjuk ke `topup_orders`, `balance_topups`, `orders`, `stores` (deposit), `store_subscriptions`, `featured_listings`, atau `catalog_locks`. Integritasnya dijaga aplikasi.
6. **Tiga ledger.** `store_ledger` (escrow & saldo toko), `balance_ledger` (Balance pembeli), dan `loyalty_ledger` (poin). Kolom ringkasan (`store_balances`, `profiles.balance`, `profiles.loyalty_points`) hanya berubah bersama baris ledger dalam satu transaksi.
7. **Keamanan data.** RLS aktif di semua tabel tanpa policy, sehingga REST API publik Supabase tidak bisa membaca apa pun. Hanya API Express yang mengakses database. Foto katalog ada di bucket publik; media inspeksi, lampiran rekber, dan bukti sengketa ada di bucket privat (signed URL).
