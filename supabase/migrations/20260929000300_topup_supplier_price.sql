-- valostock v8.2 — top-up catalogue from the Digiflazz price list
-- (docs/MONEY_RULES.md §8; docs/modeling/03-erd.md TOPUP_PRODUCTS).

create type public.topup_section as enum ('SPECIAL', 'INSTANT');

-- Existing rows get supplier = retail (margin 0) so the check below holds; the seed sets real prices.
alter table public.topup_products
  add column supplier_price integer,
  add column section public.topup_section not null default 'INSTANT',
  add column icon text check (icon is null or icon ~ '^/images/[a-z0-9/_.-]+$');
update public.topup_products set supplier_price = retail_price where supplier_price is null;
alter table public.topup_products
  alter column supplier_price set not null,
  add constraint topup_products_supplier_price_check check (supplier_price > 0),
  add constraint topup_products_margin_check check (retail_price >= supplier_price);

comment on column public.topup_products.supplier_price is 'Harga modal Digiflazz (Harga Terbaik); harga jual tidak boleh di bawahnya.';
comment on column public.topup_products.section is 'Bagian di halaman top-up: SPECIAL (pass, membership, Welkin) atau INSTANT (paket mata uang).';
comment on column public.topup_products.icon is 'Ikon item di public/images (mis. /images/topup-icon/valorant/vp.webp).';

-- Fixed choices for the extra account field (e.g. Genshin server); null = free text.
alter table public.games
  add column uid_extra_options text[] check (uid_extra_options is null or cardinality(uid_extra_options) between 1 and 20);
comment on column public.games.uid_extra_options is 'Pilihan tetap untuk kolom tambahan (mis. server Genshin); kosong = isian bebas.';
