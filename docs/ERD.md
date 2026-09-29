# ERD — valostock.id

**Source of Truth: Data Structure** · Version 8.0 · PostgreSQL 17 (own local Supabase project)

The data model is documented with the **Data Flow approach** in `docs/modeling/`:

| Document | Content |
|---|---|
| [modeling/03-erd.md](modeling/03-erd.md) | Entity Relationship Diagram — 55 tables in 7 domains |
| [modeling/04-basis-data-konseptual.md](modeling/04-basis-data-konseptual.md) | Entities, relationships, cardinalities, business rules |
| [modeling/05-struktur-tabel.md](modeling/05-struktur-tabel.md) | Physical table structure (generated from the database) |
| `supabase/migrations/*.sql` | Executable schema (applied with `npx supabase db reset`) |
| `supabase/seed.sql` | Demo data (generated from `front/src/lib/mock` by `back/scripts/generate-seed.ts`) |

Change the schema with a **new migration file first**, regenerate `05-struktur-tabel.md`, update the ERD/DFD if relations change, then update the code.

## Domains

- **A. Identity, access & stores:** `profiles` (1:1 with Supabase `auth.users`), `admin_roles`, `permissions`, `role_permissions`, `admin_user_roles`, `stores`, `store_subscriptions`, `store_balances`, `store_ledger`, `store_sanctions`, `external_sellers`, `withdrawals`, `transfer_requests`
- **B. Games, catalogs & moderation:** `games`, `game_field_templates`, `catalogs`, `catalog_images`, `catalog_reviews`, `account_inspections`
- **C. Account transactions:** `offers`, `catalog_locks`, `orders`, `order_items`, `rekber_messages`, `disputes`, `dispute_events`, `ratings`, `conversations`, `chat_messages`
- **D. Payments, top-up & Balance:** `payments`, `webhook_events`, `topup_products`, `promo_codes`, `topup_orders`, `balance_topups`, `balance_ledger`
- **E. Store promotions & ads:** `store_vouchers`, `voucher_redemptions`, `flash_sales`, `bundles`, `bundle_items`, `featured_listings`
- **F. Engagement:** `wishlists`, `store_follows`, `recently_viewed`, `notifications`, `loyalty_ledger`, `referral_rewards`
- **G. Content & operations:** `news_articles`, `help_articles`, `reports`, `audit_logs`

## Not modelled (future work)

Banner ads (homepage banner campaigns), provider KYC, external notification channels (WhatsApp/Discord/Telegram bots), skin master sync from a 3rd-party API, admin 2FA.
