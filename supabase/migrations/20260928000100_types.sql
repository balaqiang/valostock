-- valostock v8 · 1/9 — enum types and shared helpers.
-- Source of truth: docs/modeling/03-erd.md, docs/ARCHITECTURE.md (state machines).

create type public.user_role as enum ('USER', 'ADMIN');
create type public.store_type as enum ('OWNER', 'RESELLER');
create type public.store_level as enum ('AUTHORIZED', 'VERIFIED', 'PLATINUM');
create type public.store_status as enum ('PENDING_DEPOSIT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED');
create type public.deposit_status as enum ('UNPAID', 'HELD', 'RELEASED');
create type public.subscription_tier as enum ('FREE', 'PRO', 'BUSINESS');
create type public.ledger_bucket as enum ('ESCROW', 'AVAILABLE');
create type public.store_ledger_type as enum (
  'ESCROW_HOLD', 'ESCROW_RELEASE', 'COMMISSION', 'REFUND', 'COMPENSATION',
  'WITHDRAW', 'WITHDRAW_FEE', 'TRANSFER', 'TRANSFER_FEE', 'PAYOUT_REVERSAL', 'ADJUSTMENT'
);
create type public.sanction_type as enum ('WARNING', 'SUSPEND', 'FINE');
create type public.name_match as enum ('MATCH', 'REVIEW', 'MISMATCH');
create type public.payout_status as enum ('PENDING', 'COMPLETED', 'REJECTED');

create type public.field_type as enum ('TEXT', 'NUMBER', 'SELECT', 'TAGS');
create type public.catalog_status as enum (
  'DRAFT', 'PENDING_REVIEW', 'REJECTED', 'LISTED', 'LOCKED', 'IN_ORDER', 'SOLD', 'DELISTED'
);
create type public.review_decision as enum ('SUBMITTED', 'APPROVED', 'REJECTED', 'TAKEDOWN');
create type public.inspection_result as enum ('PASSED', 'FAILED');

create type public.offer_status as enum ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'USED');
create type public.lock_status as enum ('PENDING_PAYMENT', 'ACTIVE', 'USED', 'EXPIRED');
create type public.order_status as enum (
  'PENDING_PAYMENT', 'PAID', 'IN_REKBER', 'SAFE', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED'
);
create type public.gateway_method as enum ('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC');
create type public.topup_method as enum ('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC', 'BALANCE');
create type public.sender_role as enum ('BUYER', 'STORE', 'ADMIN', 'SYSTEM');
create type public.dispute_reason as enum ('NOT_DELIVERED', 'NOT_AS_DESCRIBED', 'RECALLED', 'OTHER');
create type public.dispute_status as enum (
  'OPEN', 'STORE_RESPONDED', 'IN_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_STORE', 'CANCELLED'
);
create type public.dispute_event_type as enum ('OPENED', 'STATEMENT', 'EVIDENCE', 'ADMIN_NOTE', 'RESOLVED');

create type public.payment_purpose as enum ('TOPUP', 'BALANCE_FILL', 'ORDER', 'STORE_DEPOSIT', 'SUBSCRIPTION', 'AD', 'LOCK');
create type public.payment_status as enum ('PENDING', 'PAID', 'EXPIRED', 'FAILED');
create type public.topup_status as enum ('PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED');
create type public.balance_topup_status as enum ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
create type public.balance_ledger_type as enum (
  'TOPUP_CREDIT', 'SPEND_TOPUP', 'REFUND_CREDIT', 'LOYALTY_CREDIT', 'REFERRAL_CREDIT', 'ADJUSTMENT'
);
create type public.discount_kind as enum ('PERCENT', 'FIXED');

create type public.bundle_status as enum ('ACTIVE', 'INACTIVE', 'SOLD');
create type public.featured_status as enum ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'STOPPED');

create type public.notification_kind as enum ('ORDER', 'SYSTEM', 'STORE');
create type public.loyalty_type as enum ('EARN', 'REDEEM', 'ADJUSTMENT');
create type public.referral_status as enum ('PENDING', 'REWARDED');

create type public.article_status as enum ('DRAFT', 'PUBLISHED');
create type public.help_category as enum (
  'GETTING_STARTED', 'BECOMING_STORE', 'FEES_WITHDRAWAL', 'BEFORE_SALE', 'AFTER_SALE',
  'DISPUTES', 'TOPUP', 'BALANCE', 'PENALTIES', 'SECURITY'
);
create type public.report_target as enum ('CATALOG', 'STORE', 'USER');
create type public.report_reason as enum ('SCAM', 'FAKE', 'OFF_PLATFORM', 'ABUSE', 'OTHER');
create type public.report_status as enum ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- Keeps updated_at current on tables that have it.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
