-- valostock v8.1 · 1/2 — new enum values for the deposit ledger, store closure and refunds
-- (docs/MONEY_RULES.md §12, §12b; ARCHITECTURE.md §5.4). Enum values added here are only
-- usable after this migration commits, so the tables that use them live in 2/2.

alter type public.store_status add value if not exists 'CLOSING';
alter type public.store_status add value if not exists 'CLOSED';

alter type public.ledger_bucket add value if not exists 'DEPOSIT';

alter type public.store_ledger_type add value if not exists 'DEPOSIT_HOLD';
alter type public.store_ledger_type add value if not exists 'DEPOSIT_DEDUCTION';
alter type public.store_ledger_type add value if not exists 'DEPOSIT_REFUND';
