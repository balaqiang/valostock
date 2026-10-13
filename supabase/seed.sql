-- =====================================================================
-- valostock.id (top-up) — demo data. Applied after supabase/migrations by
-- `npx supabase db reset` (local) or `npm run cloud:setup` (Supabase Cloud).
-- Demo accounts and passwords: README.md → "Akun demo".
-- =====================================================================

-- Password of the API role (local only; cloud:setup replaces it with a random one).
alter role valostock_api with password 'valostock_api_dev';

-- ── Supabase Auth users (the on_auth_user_created trigger creates public.profiles) ──
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'aba098e4-9d38-40ec-89ed-85c59e566191', 'authenticated', 'authenticated', 'admin@valostock.test',
  extensions.crypt('valostock-demo', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Admin valostock","phone":""}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'aba098e4-9d38-40ec-89ed-85c59e566191', 'aba098e4-9d38-40ec-89ed-85c59e566191',
  '{"sub":"aba098e4-9d38-40ec-89ed-85c59e566191","email":"admin@valostock.test","email_verified":true}'::jsonb, 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'cf177261-39e6-4802-9e4b-fd16befc8c2c', 'authenticated', 'authenticated', 'adminjati@email.com',
  extensions.crypt('adminjati123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Admin Jati","phone":""}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'cf177261-39e6-4802-9e4b-fd16befc8c2c', 'cf177261-39e6-4802-9e4b-fd16befc8c2c',
  '{"sub":"cf177261-39e6-4802-9e4b-fd16befc8c2c","email":"adminjati@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'dfd471ff-a0ab-42f9-8759-709231c59538', 'authenticated', 'authenticated', 'nightfall@email.com',
  extensions.crypt('valostock-demo', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Nightfall","phone":"081234567890"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'dfd471ff-a0ab-42f9-8759-709231c59538', 'dfd471ff-a0ab-42f9-8759-709231c59538',
  '{"sub":"dfd471ff-a0ab-42f9-8759-709231c59538","email":"nightfall@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '11bb11d0-7a6a-433c-9c6a-3e4af1460b35', 'authenticated', 'authenticated', 'buyersatya@email.com',
  extensions.crypt('buyersatya123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Satya","phone":""}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11bb11d0-7a6a-433c-9c6a-3e4af1460b35', '11bb11d0-7a6a-433c-9c6a-3e4af1460b35',
  '{"sub":"11bb11d0-7a6a-433c-9c6a-3e4af1460b35","email":"buyersatya@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());

update public.profiles set role = 'ADMIN' where id in ('aba098e4-9d38-40ec-89ed-85c59e566191', 'cf177261-39e6-4802-9e4b-fd16befc8c2c');
update public.profiles set referral_code = 'NIGHTFALL10' where id = 'dfd471ff-a0ab-42f9-8759-709231c59538';

-- ── Games (D2) ──
insert into public.games (slug, name, publisher, tagline, is_hot, uid_label, uid_hint, uid_extra_label, uid_extra_options, gradient, topup_currency, sort_order, image) values
  ('valorant', 'Valorant', 'Riot Games', 'Tactical shooter 5v5', true, 'Riot ID', 'Contoh: NamaKamu#TAG, lihat di profil dalam game', null, null, 'from-rose-500/80 via-red-500/70 to-violet-600/80', 'VP', 1, '/images/Astra_--_TEASER_01.png'),
  ('mobile-legends', 'Mobile Legends', 'Moonton', 'MOBA 5v5 mobile', true, 'User ID', 'Lihat di profil dalam game, contoh: 12345678', 'Zone ID', null, 'from-sky-500/80 via-blue-600/70 to-indigo-600/80', 'Diamond', 2, '/images/games/mobile-legends-1.png'),
  ('genshin-impact', 'Genshin Impact', 'HoYoverse', 'Open-world action RPG', false, 'UID', 'UID 9 digit, lihat di pojok kanan bawah layar game', 'Server', array['Asia', 'America', 'Europe', 'TW, HK, MO']::text[], 'from-amber-400/80 via-orange-500/70 to-emerald-500/70', 'Genesis Crystal', 3, null),
  ('free-fire', 'Free Fire', 'Garena', 'Battle royale mobile', false, 'Player ID', 'Lihat di profil dalam game', null, null, 'from-orange-500/80 via-amber-500/70 to-red-600/80', 'Diamond', 4, null);

-- ── Top-up products (D3): Digiflazz price list, retail = supplier + 3% rounded up to Rp100 ──
insert into public.topup_products (id, game_id, name, amount_label, supplier_price, retail_price, section, icon, popular, sort_order) values
  ('vp-475', (select id from public.games where slug = 'valorant'), 'Valorant Points', '475 VP', 51145, 52700, 'INSTANT', '/images/topup-icon/valorant/vp.webp', false, 0),
  ('vp-1000', (select id from public.games where slug = 'valorant'), 'Valorant Points', '1.000 VP', 102264, 105400, 'INSTANT', '/images/topup-icon/valorant/vp.webp', true, 1),
  ('vp-2050', (select id from public.games where slug = 'valorant'), 'Valorant Points', '2.050 VP', 204502, 210700, 'INSTANT', '/images/topup-icon/valorant/vp.webp', false, 2),
  ('vp-3650', (select id from public.games where slug = 'valorant'), 'Valorant Points', '3.650 VP', 355147, 365900, 'INSTANT', '/images/topup-icon/valorant/vp.webp', false, 3),
  ('vp-5350', (select id from public.games where slug = 'valorant'), 'Valorant Points', '5.350 VP', 510356, 525700, 'INSTANT', '/images/topup-icon/valorant/vp.webp', false, 4),
  ('vp-11000', (select id from public.games where slug = 'valorant'), 'Valorant Points', '11.000 VP', 1003289, 1033400, 'INSTANT', '/images/topup-icon/valorant/vp.webp', false, 5),
  ('ml-weekly', (select id from public.games where slug = 'mobile-legends'), 'Weekly Diamond Pass', 'Weekly Diamond Pass', 23256, 24000, 'SPECIAL', '/images/topup-icon/mlbb/weeklypass.webp', false, 6),
  ('ml-5', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '5 Diamond', 1425, 1500, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 7),
  ('ml-12', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '12 Diamond', 3348, 3500, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 8),
  ('ml-19', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '19 Diamond', 5210, 5400, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 9),
  ('ml-28', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '28 Diamond', 7570, 7800, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 10),
  ('ml-44', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '44 Diamond', 11410, 11800, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 11),
  ('ml-59', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '59 Diamond', 14899, 15400, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 12),
  ('ml-85', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '85 Diamond', 19300, 19900, 'INSTANT', '/images/topup-icon/mlbb/diamond.png', false, 13),
  ('ml-170', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '170 Diamond', 43000, 44300, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', true, 14),
  ('ml-240', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '240 Diamond', 52320, 53900, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', false, 15),
  ('ml-296', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '296 Diamond', 54388, 56100, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', false, 16),
  ('ml-408', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '408 Diamond', 98000, 101000, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', false, 17),
  ('ml-568', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '568 Diamond', 140800, 145100, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', false, 18),
  ('ml-875', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '875 Diamond', 212975, 219400, 'INSTANT', '/images/topup-icon/mlbb/diamond-150.png', false, 19),
  ('ml-2010', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '2.010 Diamond', 468375, 482500, 'INSTANT', '/images/topup-icon/mlbb/diamond-1000.png', false, 20),
  ('ml-4830', (select id from public.games where slug = 'mobile-legends'), 'Diamonds', '4.830 Diamond', 1125475, 1159300, 'INSTANT', '/images/topup-icon/mlbb/diamond-4800.png', false, 21),
  ('gi-welkin', (select id from public.games where slug = 'genshin-impact'), 'Blessing of the Welkin Moon', 'Blessing of the Welkin Moon', 76817, 79200, 'SPECIAL', '/images/topup-icon/genshin/blessing-of-welkin-moon.webp', false, 22),
  ('gi-60', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '60 Crystals', 15655, 16200, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', false, 23),
  ('gi-330', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '330 (300+30) Crystals', 76817, 79200, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', true, 24),
  ('gi-1090', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '1.090 (980+110) Crystals', 241775, 249100, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', false, 25),
  ('gi-2240', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '2.240 (1.980+260) Crystals', 463616, 477600, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', false, 26),
  ('gi-3880', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '3.880 (3.280+600) Crystals', 772676, 795900, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', false, 27),
  ('gi-8080', (select id from public.games where slug = 'genshin-impact'), 'Genesis Crystals', '8.080 (6.480+1.600) Crystals', 1629000, 1677900, 'INSTANT', '/images/topup-icon/genshin/crystals.webp', false, 28),
  ('ff-weekly', (select id from public.games where slug = 'free-fire'), 'Membership Mingguan', 'Membership Mingguan', 25177, 26000, 'SPECIAL', '/images/topup-icon/freefire/diamond.webp', false, 29),
  ('ff-monthly', (select id from public.games where slug = 'free-fire'), 'Membership Bulanan', 'Membership Bulanan', 75398, 77700, 'SPECIAL', '/images/topup-icon/freefire/diamond.webp', false, 30),
  ('ff-5', (select id from public.games where slug = 'free-fire'), 'Diamonds', '5 Diamond', 750, 800, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 31),
  ('ff-12', (select id from public.games where slug = 'free-fire'), 'Diamonds', '12 Diamond', 1601, 1700, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 32),
  ('ff-50', (select id from public.games where slug = 'free-fire'), 'Diamonds', '50 Diamond', 4945, 5100, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 33),
  ('ff-70', (select id from public.games where slug = 'free-fire'), 'Diamonds', '70 Diamond', 7000, 7300, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 34),
  ('ff-140', (select id from public.games where slug = 'free-fire'), 'Diamonds', '140 Diamond', 11000, 11400, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', true, 35),
  ('ff-355', (select id from public.games where slug = 'free-fire'), 'Diamonds', '355 Diamond', 28500, 29400, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 36),
  ('ff-720', (select id from public.games where slug = 'free-fire'), 'Diamonds', '720 Diamond', 58800, 60600, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 37),
  ('ff-1450', (select id from public.games where slug = 'free-fire'), 'Diamonds', '1.450 Diamond', 151377, 156000, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 38),
  ('ff-2180', (select id from public.games where slug = 'free-fire'), 'Diamonds', '2.180 Diamond', 234025, 241100, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 39),
  ('ff-3640', (select id from public.games where slug = 'free-fire'), 'Diamonds', '3.640 Diamond', 399025, 411000, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 40),
  ('ff-7290', (select id from public.games where slug = 'free-fire'), 'Diamonds', '7.290 Diamond', 807536, 831800, 'INSTANT', '/images/topup-icon/freefire/diamond.webp', false, 41);

-- ── Promo codes (D4) ──
insert into public.promo_codes (code, kind, value, min_spend, label, quota) values
  ('VALO10', 'PERCENT', 10, 50000, 'Diskon 10% (min. Rp 50.000)', 1000),
  ('HEMAT5K', 'FIXED', 5000, 100000, 'Potongan Rp 5.000 (min. Rp 100.000)', 1000);

-- ── Opening Balance of the demo member: one paid 100.000 BLC voucher (D6 + payment + D7) ──
insert into public.balance_topups (id, invoice_number, user_id, nominal, qty, credit, payment_method, surcharge, amount, idempotency_key, status, paid_at) values
  ('00000000-0000-4000-8000-000000000001', 'BL-261013-SEED01', 'dfd471ff-a0ab-42f9-8759-709231c59538', 100000, 1, 100000, 'QRIS', 1500, 101500, 'seed-opening-balance', 'PAID', now());
insert into public.payments (midtrans_order_id, purpose, ref_id, amount, payment_method, status, midtrans_transaction_id, paid_at) values
  ('BL-261013-SEED01', 'BALANCE_FILL', '00000000-0000-4000-8000-000000000001', 101500, 'QRIS', 'PAID', 'SIM-BL-261013-SEED01', now());
update public.profiles set balance = 100000 where id = 'dfd471ff-a0ab-42f9-8759-709231c59538';
insert into public.balance_ledger (user_id, type, amount, balance_after, reference) values
  ('dfd471ff-a0ab-42f9-8759-709231c59538', 'TOPUP_CREDIT', 100000, 100000, 'BL-261013-SEED01');
