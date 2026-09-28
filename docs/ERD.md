# ERD — valostock.id

**Source of Truth: Data Structure** · Version 7.0 (prototype)

The prototype data model is documented with the **Data Flow approach** in `docs/modeling/`:

| Document | Content |
|---|---|
| [modeling/03-erd.md](modeling/03-erd.md) | Entity Relationship Diagram — 19 tables |
| [modeling/04-basis-data-konseptual.md](modeling/04-basis-data-konseptual.md) | Entities, relationships, cardinalities, business rules |
| [modeling/05-struktur-tabel.md](modeling/05-struktur-tabel.md) | Physical table structure (MySQL types, keys, descriptions) |
| [`back/database/schema.sql`](../back/database/schema.sql) | Executable schema — imported through phpMyAdmin |

`schema.sql` and `05-struktur-tabel.md` must always match. Change the schema **there first**, then update the code.

## Prototype tables

`users` · `stores` · `store_balances` · `store_ledger` · `store_vouchers` · `games` · `catalogs` · `topup_products` · `promo_codes` · `topup_orders` · `balance_topups` · `balance_ledger` · `orders` · `payments` · `webhook_events` · `withdrawals` · `rekber_messages` · `help_articles` · `audit_logs`

## Not in the prototype (future work)

The earlier full design (v6) also planned these tables. They are intentionally left out of the prototype. The related UI pages show demo data only:

- Identity & trust: `STORE_KYC` (provider KYC), `STORE_SUBSCRIPTION`, `TRUST_SCORES`, `SANCTIONS`, `EXTERNAL_SELLERS`, `NOTIFICATION_CHANNELS`
- Commerce: `OFFERS`, `LOCKS`, `ORDER_PROTECTIONS`, `PAYOUT_SPLITS`, `TRANSFER_REQUESTS`, `DISPUTES`, `DISPUTE_TIMELINE`, `RATINGS`, `ACCOUNT_INSPECTIONS`
- Engagement: `WISHLISTS`, `STORE_FOLLOWS`, `RECENTLY_VIEWED`, `LOYALTY_LEDGER`, `VOUCHER_REDEMPTIONS`, `FLASH_SALES`, `BUNDLES`, `FEATURED_LISTINGS`, `BANNER_ADS`
- Content & admin: `ARTICLES`, `ADMIN_ROLES`, `PERMISSIONS`, `AFFILIATES`, `REFERRALS`, `REPORTS`, `NOTIFICATIONS`
- Infrastructure: `REFRESH_TOKENS`, `JOBS`
