# 5. Struktur Tabel

> **Dibuat otomatis** oleh `back/scripts/generate-table-docs.ts` dari database Supabase `valostock` (PostgreSQL 17). Jangan diedit manual; ubah migrasi di `supabase/migrations/` lalu jalankan `npm run docs:tables`.

Kolom **Kunci**: **PK** = primary key · **FK** = foreign key (`schema.tabel.kolom`) · **UK** = unique. **Null** = boleh kosong. Uang dalam **Rupiah bulat** (`integer`). Semua tabel memakai **Row Level Security** tanpa policy, sehingga hanya API yang bisa mengakses.

Jumlah tabel: **55**.

## 5.1 Tabel `profiles`

Data aplikasi untuk setiap akun Supabase Auth (`auth.users`). `balance` dan `loyalty_points` adalah ringkasan dari ledger masing-masing.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | — | PK | Sama dengan auth.users.id (Supabase Auth) |
| 2 | `email` | text | Tidak | — | — | Email login (disalin dari Supabase Auth) |
| 3 | `name` | text | Tidak | — | — | Nama |
| 4 | `phone` | text | Ya | — | UK | Nomor HP (unik, opsional) |
| 5 | `role` | enum user_role | Tidak | 'USER' | — | USER atau ADMIN |
| 6 | `balance` | integer | Tidak | 0 | — | Saldo Balance BLC (ringkasan balance_ledger) |
| 7 | `loyalty_points` | integer | Tidak | 0 | — | Poin loyalti (ringkasan loyalty_ledger) |
| 8 | `referral_code` | text | Tidak | — | UK | Kode referral milik pengguna |
| 9 | `referred_by` | uuid | Ya | — | FK → `public.profiles.id` | Pengguna yang mengajak (referral) |
| 10 | `is_banned` | boolean | Tidak | false | — | Diblokir admin |
| 11 | `ban_reason` | text | Ya | — | — | Alasan pemblokiran |
| 12 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.2 Tabel `admin_roles`

Peran admin (Super Admin, Moderator Katalog, dll.).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `key` | text | Tidak | — | UK | Kode peran (unik) |
| 3 | `name` | text | Tidak | — | — | Nama |
| 4 | `description` | text | Ya | — | — | Deskripsi |
| 5 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.3 Tabel `permissions`

Daftar izin berformat `modul:aksi`.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `key` | text | Tidak | — | PK | Izin modul:aksi |
| 2 | `module` | text | Tidak | — | — | Modul |
| 3 | `description` | text | Tidak | — | — | Deskripsi |

## 5.4 Tabel `role_permissions`

Izin yang dimiliki setiap peran.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `role_id` | uuid | Tidak | — | PK, FK → `public.admin_roles.id` | Peran |
| 2 | `permission_key` | text | Tidak | — | PK, FK → `public.permissions.key` | Izin |

## 5.5 Tabel `admin_user_roles`

Peran yang diberikan kepada akun admin.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `user_id` | uuid | Tidak | — | PK, FK → `public.profiles.id` | Pengguna terkait |
| 2 | `role_id` | uuid | Tidak | — | PK, FK → `public.admin_roles.id` | Peran |
| 3 | `assigned_by` | uuid | Ya | — | FK → `public.profiles.id` | Super Admin yang memberi peran |
| 4 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.6 Tabel `stores`

Toko penjual. Aktif hanya setelah deposit lunas dan diverifikasi manual oleh admin.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `owner_id` | uuid | Tidak | — | FK → `public.profiles.id`, UK | Pemilik toko (satu pengguna satu toko) |
| 3 | `slug` | text | Tidak | — | UK | Pengenal di URL |
| 4 | `name` | text | Tidak | — | — | Nama |
| 5 | `type` | enum store_type | Tidak | 'OWNER' | — | OWNER (akun sendiri) / RESELLER (akun titipan) |
| 6 | `level` | enum store_level | Tidak | 'AUTHORIZED' | — | Level reputasi |
| 7 | `status` | enum store_status | Tidak | 'PENDING_DEPOSIT' | — | Status (lihat nilai ENUM) |
| 8 | `owner_legal_name` | text | Tidak | — | — | Nama pemilik sesuai KTP — diverifikasi manual oleh admin (pengganti KYC), dipakai untuk mencocokkan nama rekening. |
| 9 | `description` | text | Ya | — | — | Deskripsi |
| 10 | `gradient` | text | Tidak | 'from-violet-600 to-fuchsia-600' | — | Kelas warna gradien (Tailwind) |
| 11 | `deposit_amount` | integer | Tidak | 500000 | — | Nominal deposit keamanan |
| 12 | `deposit_status` | enum deposit_status | Tidak | 'UNPAID' | — | Status deposit |
| 13 | `identity_verified` | boolean | Tidak | false | — | Identitas pemilik diverifikasi admin |
| 14 | `rating` | numeric(3,2) | Tidak | 0 | — | Rata-rata rating |
| 15 | `reviews` | integer | Tidak | 0 | — | Jumlah ulasan |
| 16 | `sold` | integer | Tidak | 0 | — | Jumlah akun terjual |
| 17 | `followers` | integer | Tidak | 0 | — | Jumlah pengikut |
| 18 | `score_desc` | numeric(3,2) | Tidak | 0 | — | Skor akurasi deskripsi (1–5) |
| 19 | `score_attitude` | numeric(3,2) | Tidak | 0 | — | Skor sikap pelayanan (1–5) |
| 20 | `score_delivery` | numeric(3,2) | Tidak | 0 | — | Skor kecepatan pengiriman (1–5) |
| 21 | `review_note` | text | Ya | — | — | Catatan admin saat meninjau |
| 22 | `reviewed_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang meninjau |
| 23 | `reviewed_at` | timestamptz | Ya | — | — | Waktu ditinjau admin |
| 24 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 25 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.7 Tabel `store_subscriptions`

Paket langganan toko (Free/Pro/Business): tarif komisi, kuota katalog, slot iklan gratis.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `store_id` | uuid | Tidak | — | PK, FK → `public.stores.id` | Toko terkait |
| 2 | `tier` | enum subscription_tier | Tidak | 'FREE' | — | FREE / PRO / BUSINESS |
| 3 | `commission_rate` | numeric(5,4) | Tidak | 0.0500 | — | Tarif komisi platform (5% / 4,5% / 4%) |
| 4 | `max_listings` | integer | Ya | — | — | Kuota katalog aktif (null = tanpa batas) |
| 5 | `free_featured_slots` | integer | Tidak | 0 | — | Slot iklan gratis per periode |
| 6 | `used_featured_slots` | integer | Tidak | 0 | — | Slot iklan gratis yang sudah dipakai |
| 7 | `current_period_end` | timestamptz | Ya | — | — | Akhir periode langganan (null untuk FREE) |
| 8 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.8 Tabel `store_balances`

Ringkasan saldo toko: escrow (ditahan), tersedia (bisa ditarik), dan deposit keamanan.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `store_id` | uuid | Tidak | — | PK, FK → `public.stores.id` | Toko terkait |
| 2 | `escrow` | integer | Tidak | 0 | — | Dana ditahan untuk pesanan berjalan |
| 3 | `available` | integer | Tidak | 0 | — | Dana yang bisa ditarik |
| 4 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |
| 5 | `deposit` | integer | Tidak | 0 | — | Deposit keamanan yang ditahan (DEPOSIT_HOLD − DEPOSIT_DEDUCTION − DEPOSIT_REFUND). |

## 5.9 Tabel `store_ledger`

Buku besar saldo toko (append-only).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `bucket` | enum ledger_bucket | Tidak | — | — | ESCROW atau AVAILABLE |
| 4 | `type` | enum store_ledger_type | Tidak | — | — | Jenis (lihat nilai ENUM) |
| 5 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 6 | `balance_after` | integer | Tidak | — | — | Saldo setelah mutasi (jejak audit) |
| 7 | `ref_type` | text | Tidak | — | — | Jenis data referensi |
| 8 | `ref_id` | uuid | Ya | — | — | ID data referensi |
| 9 | `note` | text | Ya | — | — | Catatan |
| 10 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.10 Tabel `store_sanctions`

Sanksi yang diberikan admin kepada toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `type` | enum sanction_type | Tidak | — | — | Jenis (lihat nilai ENUM) |
| 4 | `amount` | integer | Tidak | 0 | — | Denda (Rupiah, 0 jika bukan denda) |
| 5 | `reason` | text | Tidak | — | — | Alasan |
| 6 | `created_by` | uuid | Tidak | — | FK → `public.profiles.id` | Admin pemberi sanksi |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.11 Tabel `external_sellers`

Penjual eksternal yang dikelola toko reseller.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `alias` | text | Tidak | — | — | Nama panggilan penjual eksternal |
| 4 | `payout_bank` | text | Tidak | — | — | Bank/e-wallet tujuan |
| 5 | `payout_account` | text | Tidak | — | — | Nomor rekening tujuan |
| 6 | `payout_name` | text | Tidak | — | — | Nama pemilik rekening |
| 7 | `note` | text | Ya | — | — | Catatan |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.12 Tabel `withdrawals`

Pengajuan penarikan dana toko (transfer bank disimulasikan).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `withdrawal_number` | text | Tidak | — | UK | Nomor penarikan |
| 3 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 4 | `amount` | integer | Tidak | — | — | Total didebit dari saldo tersedia (termasuk biaya) |
| 5 | `fee` | integer | Tidak | — | — | Biaya (Rupiah) |
| 6 | `bank_name` | text | Tidak | — | — | Bank tujuan |
| 7 | `account_number` | text | Tidak | — | — | Nomor rekening |
| 8 | `account_name` | text | Tidak | — | — | Nama pemilik rekening |
| 9 | `name_match` | enum name_match | Tidak | — | — | Hasil pencocokan nama rekening |
| 10 | `status` | enum payout_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 11 | `review_note` | text | Ya | — | — | Catatan admin saat meninjau |
| 12 | `reviewed_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang meninjau |
| 13 | `reviewed_at` | timestamptz | Ya | — | — | Waktu ditinjau admin |
| 14 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.13 Tabel `transfer_requests`

Pembayaran toko reseller kepada penjual eksternal, satu per pesanan selesai.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `transfer_number` | text | Tidak | — | UK | Nomor transfer |
| 3 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 4 | `external_seller_id` | uuid | Tidak | — | FK → `public.external_sellers.id` | Penjual eksternal penerima |
| 5 | `order_id` | uuid | Tidak | — | FK → `public.orders.id`, UK | Pesanan terkait |
| 6 | `amount` | integer | Tidak | — | — | Total didebit dari saldo toko (termasuk biaya) |
| 7 | `fee` | integer | Tidak | — | — | Biaya (Rupiah) |
| 8 | `name_match` | enum name_match | Tidak | — | — | Hasil pencocokan nama rekening |
| 9 | `status` | enum payout_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 10 | `review_note` | text | Ya | — | — | Catatan admin saat meninjau |
| 11 | `reviewed_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang meninjau |
| 12 | `reviewed_at` | timestamptz | Ya | — | — | Waktu ditinjau admin |
| 13 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.14 Tabel `games`

Master data game.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | integer | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `slug` | text | Tidak | — | UK | Pengenal di URL |
| 3 | `name` | text | Tidak | — | — | Nama |
| 4 | `publisher` | text | Tidak | — | — | Penerbit game |
| 5 | `tagline` | text | Tidak | — | — | Deskripsi singkat |
| 6 | `description` | text | Tidak | — | — | Deskripsi |
| 7 | `supports_account` | boolean | Tidak | false | — | Menjual akun |
| 8 | `supports_topup` | boolean | Tidak | false | — | Menjual top-up |
| 9 | `has_skin_api` | boolean | Tidak | false | — | Punya sumber data skin pihak ketiga |
| 10 | `is_hot` | boolean | Tidak | false | — | Tampil sebagai game populer |
| 11 | `is_active` | boolean | Tidak | true | — | Aktif (true/false) |
| 12 | `uid_label` | text | Tidak | — | — | Label ID akun saat top-up |
| 13 | `uid_hint` | text | Tidak | — | — | Petunjuk pengisian ID akun |
| 14 | `uid_extra_label` | text | Ya | — | — | Label kolom tambahan (mis. Zone ID) |
| 15 | `gradient` | text | Tidak | — | — | Kelas warna gradien (Tailwind) |
| 16 | `topup_currency` | text | Ya | — | — | Mata uang dalam game |
| 17 | `image` | text | Ya | — | — | Banner game (kartu + header halaman game): /images/… statis atau cms/… di bucket site-media. |
| 18 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 19 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 20 | `uid_extra_options` | text[] | Ya | — | — | Pilihan tetap untuk kolom tambahan (mis. server Genshin); kosong = isian bebas. |

## 5.15 Tabel `game_field_templates`

Kolom katalog per game (form toko, isi `catalogs.attributes`, filter pencarian).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `game_id` | integer | Tidak | — | FK → `public.games.id` | Game terkait |
| 3 | `key` | text | Tidak | — | — | Kunci atribut di catalogs.attributes |
| 4 | `label` | text | Tidak | — | — | Label |
| 5 | `type` | enum field_type | Tidak | — | — | TEXT / NUMBER / SELECT / TAGS |
| 6 | `required` | boolean | Tidak | false | — | Wajib diisi toko |
| 7 | `options` | jsonb | Ya | — | — | Pilihan (JSON) |
| 8 | `filterable` | boolean | Tidak | false | — | Dipakai sebagai filter pencarian |
| 9 | `help_text` | text | Ya | — | — | Petunjuk pengisian |
| 10 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |

## 5.16 Tabel `catalogs`

Akun game yang dijual toko, dengan status moderasi.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `vs_code` | text | Ya | — | UK | Kode katalog platform (unik, terbit saat diajukan) |
| 3 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 4 | `game_id` | integer | Tidak | — | FK → `public.games.id` | Game terkait |
| 5 | `title` | text | Tidak | — | — | Judul |
| 6 | `description` | text | Ya | — | — | Deskripsi |
| 7 | `price` | integer | Tidak | — | — | Harga (Rupiah) |
| 8 | `old_price` | integer | Ya | — | — | Harga coret |
| 9 | `status` | enum catalog_status | Tidak | 'DRAFT' | — | DRAFT → PENDING_REVIEW → LISTED/REJECTED (admin). LISTED → LOCKED → IN_ORDER → SOLD. Lihat ARCHITECTURE §5.1. |
| 10 | `attributes` | jsonb | Tidak | '{}' | — | Nilai kolom sesuai template game (JSONB, index GIN) |
| 11 | `account_checked` | boolean | Tidak | false | — | Sudah diinspeksi (badge Account Checked) |
| 12 | `instant` | boolean | Tidak | false | — | Bisa serah terima instan |
| 13 | `views` | integer | Tidak | 0 | — | Jumlah dilihat |
| 14 | `review_note` | text | Ya | — | — | Alasan penolakan/penurunan terakhir |
| 15 | `submitted_at` | timestamptz | Ya | — | — | Waktu terakhir diajukan |
| 16 | `listed_at` | timestamptz | Ya | — | — | Waktu disetujui admin |
| 17 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 18 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 19 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.17 Tabel `catalog_images`

Foto katalog (Supabase Storage bucket `catalog-images`).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 3 | `storage_path` | text | Tidak | — | — | Path objek di bucket catalog-images, atau /images/... untuk data seed |
| 4 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 5 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.18 Tabel `catalog_reviews`

Riwayat moderasi katalog: pengajuan toko dan keputusan admin.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 3 | `actor_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pelaku |
| 4 | `decision` | enum review_decision | Tidak | — | — | SUBMITTED / APPROVED / REJECTED / TAKEDOWN |
| 5 | `reasons` | text[] | Tidak | '{}'[] | — | Daftar alasan |
| 6 | `note` | text | Ya | — | — | Catatan |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.19 Tabel `account_inspections`

Inspeksi akun oleh toko (badge Account Checked).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id`, UK | Katalog terkait |
| 3 | `inspected_by` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna toko yang menginspeksi |
| 4 | `checklist` | jsonb | Tidak | — | — | Checklist inspeksi (JSON) |
| 5 | `media` | jsonb | Tidak | '[]' | — | Media bukti (path privat) |
| 6 | `notes` | text | Ya | — | — | Catatan inspeksi |
| 7 | `result` | enum inspection_result | Tidak | — | — | PASSED / FAILED |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.20 Tabel `offers`

Tawar-menawar harga antara pembeli dan toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 3 | `buyer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli |
| 4 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 5 | `amount` | integer | Tidak | — | — | Nominal tawaran pembeli |
| 6 | `counter_amount` | integer | Ya | — | — | Tawaran balik toko |
| 7 | `status` | enum offer_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 8 | `expires_at` | timestamptz | Tidak | — | — | PENDING/COUNTERED: kedaluwarsa 24 jam. ACCEPTED: harga berlaku 24 jam untuk dibayar. |
| 9 | `responded_at` | timestamptz | Ya | — | — | Waktu toko merespons |
| 10 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.21 Tabel `catalog_locks`

Lock opsional Rp5.000 selama 30 menit.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id`, UK | Katalog terkait |
| 3 | `buyer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli |
| 4 | `fee` | integer | Tidak | 5000 | — | Biaya lock (Rp5.000) |
| 5 | `status` | enum lock_status | Tidak | 'PENDING_PAYMENT' | — | Status (lihat nilai ENUM) |
| 6 | `expires_at` | timestamptz | Ya | — | — | Waktu kedaluwarsa |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.22 Tabel `orders`

Pesanan akun dengan escrow.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `order_number` | text | Tidak | — | UK | Nomor pesanan untuk pengguna |
| 3 | `buyer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli |
| 4 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 5 | `offer_id` | uuid | Ya | — | FK → `public.offers.id` | Tawaran yang dipakai (opsional) |
| 6 | `bundle_id` | uuid | Ya | — | FK → `public.bundles.id` | Bundle yang dibeli (opsional) |
| 7 | `voucher_id` | uuid | Ya | — | FK → `public.store_vouchers.id` | Voucher toko yang dipakai (opsional) |
| 8 | `lock_id` | uuid | Ya | — | FK → `public.catalog_locks.id` | Lock yang dipakai (opsional) |
| 9 | `items_subtotal` | integer | Tidak | — | — | Jumlah harga item sebelum voucher |
| 10 | `voucher_discount` | integer | Tidak | 0 | — | Potongan voucher toko |
| 11 | `item_price` | integer | Tidak | — | — | Harga final (tawaran/flash sale/bundle − voucher): dasar escrow dan komisi. |
| 12 | `handling_fee` | integer | Tidak | — | — | Biaya penanganan maks(3,5%, Rp4.000) |
| 13 | `protection_fee` | integer | Tidak | — | — | Biaya proteksi Rp5.000 |
| 14 | `total_paid` | integer | Tidak | — | — | Total dibayar pembeli |
| 15 | `commission_rate` | numeric(5,4) | Tidak | — | — | Tarif komisi sesuai langganan toko |
| 16 | `commission` | integer | Tidak | — | — | Komisi platform |
| 17 | `store_receives` | integer | Tidak | — | — | Bagian toko (item_price − komisi) |
| 18 | `payment_method` | enum gateway_method | Ya | — | — | Metode pembayaran |
| 19 | `status` | enum order_status | Tidak | 'PENDING_PAYMENT' | — | Status (lihat nilai ENUM) |
| 20 | `room_code` | text | Tidak | — | — | Kode Rekber Room |
| 21 | `protection_until` | timestamptz | Ya | — | — | Akhir masa proteksi (14/30 hari setelah selesai) |
| 22 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 23 | `paid_at` | timestamptz | Ya | — | — | Waktu lunas |
| 24 | `delivered_at` | timestamptz | Ya | — | — | Waktu toko mengirim data akun |
| 25 | `safe_at` | timestamptz | Ya | — | — | Waktu pembeli konfirmasi akun aman |
| 26 | `completed_at` | timestamptz | Ya | — | — | Waktu selesai (escrow dilepas) |
| 27 | `cancelled_at` | timestamptz | Ya | — | — | Waktu dibatalkan |

## 5.23 Tabel `order_items`

Katalog yang termasuk dalam satu pesanan (lebih dari satu untuk bundle).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `order_id` | uuid | Tidak | — | FK → `public.orders.id` | Pesanan terkait |
| 3 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 4 | `vs_code` | text | Tidak | — | — | Kode VS saat dipesan |
| 5 | `title` | text | Tidak | — | — | Judul katalog saat dipesan |
| 6 | `price` | integer | Tidak | — | — | Harga item pada pesanan |

## 5.24 Tabel `voucher_redemptions`

Pemakaian voucher toko pada pesanan.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `voucher_id` | uuid | Tidak | — | FK → `public.store_vouchers.id` | Voucher yang dipakai |
| 3 | `user_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna terkait |
| 4 | `order_id` | uuid | Tidak | — | FK → `public.orders.id`, UK | Pesanan terkait |
| 5 | `discount` | integer | Tidak | — | — | Potongan harga |
| 6 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.25 Tabel `rekber_messages`

Pesan Rekber Room (bukti serah terima).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `order_id` | uuid | Tidak | — | FK → `public.orders.id` | Pesanan terkait |
| 3 | `sender_id` | uuid | Ya | — | FK → `public.profiles.id` | Pengirim |
| 4 | `sender_role` | enum sender_role | Tidak | — | — | Peran pengirim |
| 5 | `body` | text | Tidak | — | — | Isi pesan |
| 6 | `attachments` | jsonb | Tidak | '[]' | — | Lampiran (path di bucket private-media) |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.26 Tabel `disputes`

Sengketa pesanan (tenggat tanggapan toko 72 jam).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `order_id` | uuid | Tidak | — | FK → `public.orders.id`, UK | Pesanan terkait |
| 3 | `opened_by` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli yang membuka sengketa |
| 4 | `reason` | enum dispute_reason | Tidak | — | — | Alasan |
| 5 | `description` | text | Tidak | — | — | Deskripsi |
| 6 | `status` | enum dispute_status | Tidak | 'OPEN' | — | Status (lihat nilai ENUM) |
| 7 | `store_deadline` | timestamptz | Tidak | — | — | Tenggat tanggapan toko (72 jam) |
| 8 | `opened_after_completion` | boolean | Tidak | false | — | Dibuka dalam masa proteksi setelah selesai |
| 9 | `refund_amount` | integer | Tidak | 0 | — | Jumlah refund/kompensasi ke pembeli |
| 10 | `resolution_note` | text | Ya | — | — | Catatan penyelesaian |
| 11 | `resolved_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang memutus |
| 12 | `resolved_at` | timestamptz | Ya | — | — | Waktu diputus |
| 13 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.27 Tabel `dispute_events`

Timeline sengketa: pernyataan, bukti, catatan admin, putusan.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `dispute_id` | uuid | Tidak | — | FK → `public.disputes.id` | Sengketa terkait |
| 3 | `actor_id` | uuid | Ya | — | FK → `public.profiles.id` | Pelaku |
| 4 | `actor_role` | enum sender_role | Tidak | — | — | Peran pelaku |
| 5 | `type` | enum dispute_event_type | Tidak | — | — | Jenis (lihat nilai ENUM) |
| 6 | `body` | text | Tidak | — | — | Isi (JSON blok paragraf/judul/daftar) |
| 7 | `attachments` | jsonb | Tidak | '[]' | — | Lampiran (path di bucket private-media) |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.28 Tabel `ratings`

Rating pembeli (±1) + 3 skor layanan + balasan toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `order_id` | uuid | Tidak | — | FK → `public.orders.id`, UK | Pesanan terkait |
| 3 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 4 | `buyer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli |
| 5 | `overall` | smallint | Tidak | — | — | Rating keseluruhan (-1 / 0 / 1) |
| 6 | `desc_accuracy` | smallint | Tidak | — | — | Akurasi deskripsi (1–5) |
| 7 | `attitude` | smallint | Tidak | — | — | Sikap pelayanan (1–5) |
| 8 | `delivery_speed` | smallint | Tidak | — | — | Kecepatan pengiriman (1–5) |
| 9 | `comment` | text | Ya | — | — | Komentar pembeli |
| 10 | `store_reply` | text | Ya | — | — | Balasan toko (sekali) |
| 11 | `replied_at` | timestamptz | Ya | — | — | Waktu toko membalas |
| 12 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.29 Tabel `conversations`

Percakapan chat antara pembeli dan toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `buyer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pembeli |
| 3 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 4 | `last_message_at` | timestamptz | Tidak | now() | — | Waktu pesan terakhir |
| 5 | `buyer_unread` | integer | Tidak | 0 | — | Pesan belum dibaca pembeli |
| 6 | `store_unread` | integer | Tidak | 0 | — | Pesan belum dibaca toko |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.30 Tabel `chat_messages`

Isi chat pembeli–toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `conversation_id` | uuid | Tidak | — | FK → `public.conversations.id` | Percakapan |
| 3 | `sender_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengirim |
| 4 | `sender_role` | enum sender_role | Tidak | — | — | Peran pengirim |
| 5 | `body` | text | Tidak | — | — | Isi pesan |
| 6 | `catalog_id` | uuid | Ya | — | FK → `public.catalogs.id` | Katalog yang dibicarakan (opsional) |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.31 Tabel `payments`

Transaksi Midtrans untuk semua jenis pembayaran (relasi polimorfik lewat `purpose` + `ref_id`).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `midtrans_order_id` | text | Tidak | — | UK | order_id yang dikirim ke Midtrans |
| 3 | `purpose` | enum payment_purpose | Tidak | — | — | Jenis pembayaran |
| 4 | `ref_id` | uuid | Tidak | — | — | Tujuan sesuai purpose: topup_orders / balance_topups / orders / stores (deposit, langganan) / featured_listings / catalog_locks. |
| 5 | `user_id` | uuid | Ya | — | FK → `public.profiles.id` | Pengguna terkait |
| 6 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 7 | `payment_method` | enum gateway_method | Tidak | — | — | Metode pembayaran |
| 8 | `meta` | jsonb | Tidak | '{}' | — | Data tambahan (mis. tier langganan) |
| 9 | `snap_token` | text | Ya | — | — | Token Midtrans Snap |
| 10 | `redirect_url` | text | Ya | — | — | URL halaman pembayaran |
| 11 | `status` | enum payment_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 12 | `midtrans_transaction_id` | text | Ya | — | — | ID transaksi Midtrans |
| 13 | `payment_type` | text | Ya | — | — | Tipe pembayaran menurut Midtrans |
| 14 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 15 | `paid_at` | timestamptz | Ya | — | — | Waktu lunas |

## 5.32 Tabel `webhook_events`

Notifikasi Midtrans (anti-duplikat lewat UNIQUE `source` + `external_id`).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `source` | text | Tidak | 'MIDTRANS' | — | Pengirim notifikasi |
| 3 | `external_id` | text | Tidak | — | — | ID notifikasi (transaction_id:status) |
| 4 | `payment_id` | uuid | Ya | — | FK → `public.payments.id` | Pembayaran terkait |
| 5 | `payload` | jsonb | Tidak | — | — | Isi notifikasi mentah |
| 6 | `signature_valid` | boolean | Tidak | false | — | Tanda tangan SHA512 valid |
| 7 | `processed` | boolean | Tidak | false | — | Sudah diproses |
| 8 | `received_at` | timestamptz | Tidak | now() | — | Waktu diterima |

## 5.33 Tabel `refunds`

Antrean refund: uang yang masuk tetapi tujuannya sudah tidak ada (dibayar setelah dibatalkan, lock tidak tersedia, top-up tamu gagal).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `payment_id` | uuid | Tidak | — | FK → `public.payments.id`, UK | Pembayaran yang dikembalikan (satu refund per pembayaran) |
| 3 | `user_id` | uuid | Ya | — | FK → `public.profiles.id` | Pengguna terkait |
| 4 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 5 | `source` | enum refund_source | Tidak | — | — | Asal refund |
| 6 | `reference` | text | Tidak | — | — | Referensi (nomor invoice/pesanan) |
| 7 | `status` | enum refund_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 8 | `note` | text | Ya | — | — | Catatan |
| 9 | `handled_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang menyelesaikan |
| 10 | `handled_at` | timestamptz | Ya | — | — | Waktu diselesaikan |
| 11 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.34 Tabel `topup_products`

Nominal top-up per game.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | text | Tidak | — | PK | Kode produk top-up |
| 2 | `game_id` | integer | Tidak | — | FK → `public.games.id` | Game terkait |
| 3 | `name` | text | Tidak | — | — | Nama |
| 4 | `amount_label` | text | Tidak | — | — | Label nominal (mis. 475 VP) |
| 5 | `retail_price` | integer | Tidak | — | — | Harga jual (>= harga modal) |
| 6 | `popular` | boolean | Tidak | false | — | Ditandai populer |
| 7 | `is_active` | boolean | Tidak | true | — | Aktif (true/false) |
| 8 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 9 | `supplier_price` | integer | Tidak | — | — | Harga modal Digiflazz (Harga Terbaik); harga jual tidak boleh di bawahnya. |
| 10 | `section` | enum topup_section | Tidak | 'INSTANT' | — | Bagian di halaman top-up: SPECIAL (pass, membership, Welkin) atau INSTANT (paket mata uang). |
| 11 | `icon` | text | Ya | — | — | Ikon item di public/images (mis. /images/topup-icon/valorant/vp.webp). |

## 5.35 Tabel `promo_codes`

Kode promo top-up.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | integer | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `code` | text | Tidak | — | UK | Kode |
| 3 | `kind` | enum discount_kind | Tidak | — | — | Jenis |
| 4 | `value` | integer | Tidak | — | — | Nilai diskon (persen/Rupiah) |
| 5 | `min_spend` | integer | Tidak | 0 | — | Minimal belanja |
| 6 | `label` | text | Tidak | — | — | Label |
| 7 | `quota` | integer | Ya | — | — | Kuota pemakaian (null = tanpa batas) |
| 8 | `used_count` | integer | Tidak | 0 | — | Jumlah terpakai |
| 9 | `expires_at` | timestamptz | Ya | — | — | Waktu kedaluwarsa |
| 10 | `is_active` | boolean | Tidak | true | — | Aktif (true/false) |
| 11 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.36 Tabel `topup_orders`

Invoice top-up game (boleh tanpa login).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `invoice_number` | text | Tidak | — | UK | Nomor invoice untuk pengguna |
| 3 | `user_id` | uuid | Ya | — | FK → `public.profiles.id` | Pengguna terkait |
| 4 | `product_id` | text | Tidak | — | FK → `public.topup_products.id` | Produk top-up |
| 5 | `promo_code_id` | integer | Ya | — | FK → `public.promo_codes.id` | Kode promo (opsional) |
| 6 | `user_game_id` | text | Tidak | — | — | ID akun game tujuan |
| 7 | `game_zone_id` | text | Ya | — | — | Zone/server ID |
| 8 | `contact_email` | text | Ya | — | — | Email penerima bukti |
| 9 | `contact_whatsapp` | text | Ya | — | — | Nomor WhatsApp |
| 10 | `base_price` | integer | Tidak | — | — | Harga produk |
| 11 | `discount` | integer | Tidak | 0 | — | Potongan harga |
| 12 | `surcharge` | integer | Tidak | 0 | — | Biaya metode pembayaran |
| 13 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 14 | `pay_source` | text | Tidak | — | — | MIDTRANS atau BALANCE |
| 15 | `payment_method` | enum topup_method | Tidak | — | — | Metode pembayaran |
| 16 | `status` | enum topup_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 17 | `provider_ref` | text | Ya | — | — | Referensi penyedia top-up (simulasi) |
| 18 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 19 | `paid_at` | timestamptz | Ya | — | — | Waktu lunas |

## 5.37 Tabel `balance_topups`

Invoice pembelian voucher Balance.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `invoice_number` | text | Tidak | — | UK | Nomor invoice untuk pengguna |
| 3 | `user_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna terkait |
| 4 | `nominal` | integer | Tidak | — | — | Nominal per voucher |
| 5 | `qty` | integer | Tidak | — | — | Jumlah voucher |
| 6 | `credit` | integer | Tidak | — | — | BLC yang ditambahkan (nominal × qty) |
| 7 | `payment_method` | enum gateway_method | Tidak | — | — | Metode pembayaran |
| 8 | `surcharge` | integer | Tidak | 0 | — | Biaya metode pembayaran |
| 9 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 10 | `idempotency_key` | text | Tidak | — | — | Kunci anti klik ganda |
| 11 | `status` | enum balance_topup_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 12 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 13 | `paid_at` | timestamptz | Ya | — | — | Waktu lunas |

## 5.38 Tabel `balance_ledger`

Buku besar Balance pengguna (closed-loop, append-only).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `user_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna terkait |
| 3 | `type` | enum balance_ledger_type | Tidak | — | — | Jenis (lihat nilai ENUM) |
| 4 | `amount` | integer | Tidak | — | — | Jumlah uang (Rupiah) |
| 5 | `balance_after` | integer | Tidak | — | — | Saldo setelah mutasi (jejak audit) |
| 6 | `reference` | text | Tidak | — | — | Referensi (nomor invoice/pesanan) |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.39 Tabel `store_vouchers`

Voucher diskon yang diterbitkan toko.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `code` | text | Tidak | — | — | Kode |
| 4 | `kind` | enum discount_kind | Tidak | — | — | Jenis |
| 5 | `value` | integer | Tidak | — | — | Nilai diskon (persen/Rupiah) |
| 6 | `min_spend` | integer | Tidak | 0 | — | Minimal belanja |
| 7 | `quota` | integer | Ya | — | — | Kuota pemakaian (null = tanpa batas) |
| 8 | `used` | integer | Tidak | 0 | — | Jumlah terpakai |
| 9 | `starts_at` | timestamptz | Tidak | now() | — | Waktu mulai |
| 10 | `expires_at` | timestamptz | Ya | — | — | Waktu kedaluwarsa |
| 11 | `is_active` | boolean | Tidak | true | — | Aktif (true/false) |
| 12 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.40 Tabel `flash_sales`

Harga promo berjangka untuk satu katalog.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 4 | `sale_price` | integer | Tidak | — | — | Harga promo |
| 5 | `starts_at` | timestamptz | Tidak | — | — | Waktu mulai |
| 6 | `ends_at` | timestamptz | Tidak | — | — | Waktu selesai |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.41 Tabel `bundles`

Paket beberapa katalog dengan satu harga.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `title` | text | Tidak | — | — | Judul |
| 4 | `bundle_price` | integer | Tidak | — | — | Harga paket |
| 5 | `status` | enum bundle_status | Tidak | 'ACTIVE' | — | Status (lihat nilai ENUM) |
| 6 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.42 Tabel `bundle_items`

Katalog dalam bundle.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `bundle_id` | uuid | Tidak | — | PK, FK → `public.bundles.id` | Bundle |
| 2 | `catalog_id` | uuid | Tidak | — | PK, FK → `public.catalogs.id` | Katalog terkait |

## 5.43 Tabel `featured_listings`

Iklan featured listing (berbayar atau slot gratis).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `store_id` | uuid | Tidak | — | FK → `public.stores.id` | Toko terkait |
| 3 | `catalog_id` | uuid | Tidak | — | FK → `public.catalogs.id` | Katalog terkait |
| 4 | `duration_days` | integer | Tidak | — | — | Durasi iklan (hari) |
| 5 | `price` | integer | Tidak | — | — | Harga (Rupiah) |
| 6 | `is_free` | boolean | Tidak | false | — | Memakai slot gratis |
| 7 | `status` | enum featured_status | Tidak | 'PENDING_PAYMENT' | — | Status (lihat nilai ENUM) |
| 8 | `starts_at` | timestamptz | Ya | — | — | Waktu mulai |
| 9 | `ends_at` | timestamptz | Ya | — | — | Waktu selesai |
| 10 | `stop_reason` | text | Ya | — | — | Alasan dihentikan admin |
| 11 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.44 Tabel `wishlists`

Katalog yang disimpan pembeli (dengan notifikasi turun harga).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `user_id` | uuid | Tidak | — | PK, FK → `public.profiles.id` | Pengguna terkait |
| 2 | `catalog_id` | uuid | Tidak | — | PK, FK → `public.catalogs.id` | Katalog terkait |
| 3 | `notify_price_drop` | boolean | Tidak | true | — | Kirim notifikasi jika harga turun |
| 4 | `price_at_save` | integer | Tidak | — | — | Harga saat disimpan (pembanding turun harga) |
| 5 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.45 Tabel `store_follows`

Toko yang diikuti pembeli.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `user_id` | uuid | Tidak | — | PK, FK → `public.profiles.id` | Pengguna terkait |
| 2 | `store_id` | uuid | Tidak | — | PK, FK → `public.stores.id` | Toko terkait |
| 3 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.46 Tabel `recently_viewed`

Katalog yang baru dilihat pembeli.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `user_id` | uuid | Tidak | — | PK, FK → `public.profiles.id` | Pengguna terkait |
| 2 | `catalog_id` | uuid | Tidak | — | PK, FK → `public.catalogs.id` | Katalog terkait |
| 3 | `viewed_at` | timestamptz | Tidak | now() | — | Waktu terakhir dilihat |

## 5.47 Tabel `notifications`

Notifikasi in-app.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `user_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna terkait |
| 3 | `kind` | enum notification_kind | Tidak | — | — | Jenis |
| 4 | `title` | text | Tidak | — | — | Judul notifikasi |
| 5 | `body` | text | Tidak | — | — | Isi notifikasi |
| 6 | `link` | text | Ya | — | — | Tautan tujuan |
| 7 | `is_read` | boolean | Tidak | false | — | Sudah dibaca |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.48 Tabel `loyalty_ledger`

Buku besar poin loyalti (append-only).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `user_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna terkait |
| 3 | `type` | enum loyalty_type | Tidak | — | — | Jenis (lihat nilai ENUM) |
| 4 | `points` | integer | Tidak | — | — | Poin (+ masuk, − keluar) |
| 5 | `balance_after` | integer | Tidak | — | — | Saldo setelah mutasi (jejak audit) |
| 6 | `reference` | text | Tidak | — | — | Referensi (nomor invoice/pesanan) |
| 7 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.49 Tabel `referral_rewards`

Hadiah referral untuk pengguna yang mengajak.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `referrer_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pengguna yang mengajak |
| 3 | `referred_id` | uuid | Tidak | — | FK → `public.profiles.id`, UK | Pengguna yang diajak |
| 4 | `reward` | integer | Tidak | 10000 | — | Hadiah Balance (Rupiah) |
| 5 | `status` | enum referral_status | Tidak | 'PENDING' | — | Status (lihat nilai ENUM) |
| 6 | `reference` | text | Ya | — | — | Referensi (nomor invoice/pesanan) |
| 7 | `rewarded_at` | timestamptz | Ya | — | — | Waktu hadiah dikreditkan |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.50 Tabel `news_articles`

Artikel berita (CMS).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `slug` | text | Tidak | — | UK | Pengenal di URL |
| 3 | `title` | text | Tidak | — | — | Judul |
| 4 | `category` | text | Tidak | — | — | Kategori |
| 5 | `excerpt` | text | Tidak | — | — | Ringkasan |
| 6 | `cover` | text | Ya | — | — | Gambar sampul |
| 7 | `body` | jsonb | Tidak | '[]' | — | Isi (JSON blok paragraf/judul/daftar) |
| 8 | `status` | enum article_status | Tidak | 'DRAFT' | — | Status (lihat nilai ENUM) |
| 9 | `author_id` | uuid | Ya | — | FK → `public.profiles.id` | Admin penulis |
| 10 | `published_at` | timestamptz | Ya | — | — | Waktu terbit |
| 11 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 12 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.51 Tabel `site_settings`

Teks situs yang diubah lewat CMS; kunci yang tidak ada memakai nilai bawaan API.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `key` | text | Tidak | — | PK | Kunci teks terdaftar (mis. home.hero.title) |
| 2 | `value` | text | Tidak | — | — | Nilai diskon (persen/Rupiah) |
| 3 | `updated_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin yang terakhir mengubah |
| 4 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.52 Tabel `banners`

Banner beranda milik platform (promosi internal, bukan iklan berbayar) dengan jadwal tampil.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `placement` | enum banner_placement | Tidak | 'HOME_HERO' | — | Posisi banner |
| 3 | `title` | text | Tidak | — | — | Judul |
| 4 | `subtitle` | text | Ya | — | — | Subjudul |
| 5 | `image` | text | Tidak | — | — | Gambar |
| 6 | `cta_label` | text | Ya | — | — | Label tombol (wajib bersama link) |
| 7 | `link_url` | text | Ya | — | — | Tujuan tombol: path situs atau https:// |
| 8 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 9 | `is_active` | boolean | Tidak | true | — | Aktif (true/false) |
| 10 | `starts_at` | timestamptz | Ya | — | — | Waktu mulai |
| 11 | `ends_at` | timestamptz | Ya | — | — | Waktu selesai |
| 12 | `created_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin pembuat |
| 13 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |
| 14 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.53 Tabel `help_articles`

Artikel pusat bantuan (CMS).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | integer | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `slug` | text | Tidak | — | UK | Pengenal di URL |
| 3 | `title` | text | Tidak | — | — | Judul |
| 4 | `category` | enum help_category | Tidak | — | — | Kategori |
| 5 | `excerpt` | text | Tidak | — | — | Ringkasan |
| 6 | `body` | jsonb | Tidak | '[]' | — | Isi (JSON blok paragraf/judul/daftar) |
| 7 | `popular` | boolean | Tidak | false | — | Ditandai populer |
| 8 | `is_published` | boolean | Tidak | true | — | Tampil di pusat bantuan |
| 9 | `helpful_count` | integer | Tidak | 0 | — | Jumlah "bermanfaat" |
| 10 | `sort_order` | integer | Tidak | 0 | — | Urutan tampil |
| 11 | `updated_at` | timestamptz | Tidak | now() | — | Waktu terakhir diubah |

## 5.54 Tabel `reports`

Laporan pengguna terhadap katalog, toko, atau pengguna lain.

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | Tidak | gen_random_uuid() | PK | ID unik baris |
| 2 | `reporter_id` | uuid | Tidak | — | FK → `public.profiles.id` | Pelapor |
| 3 | `target_type` | enum report_target | Tidak | — | — | CATALOG / STORE / USER |
| 4 | `target_id` | uuid | Tidak | — | — | ID yang dilaporkan |
| 5 | `reason` | enum report_reason | Tidak | — | — | Alasan |
| 6 | `detail` | text | Ya | — | — | Detail (JSON) |
| 7 | `status` | enum report_status | Tidak | 'OPEN' | — | Status (lihat nilai ENUM) |
| 8 | `resolution_note` | text | Ya | — | — | Catatan penyelesaian |
| 9 | `handled_by` | uuid | Ya | — | FK → `public.profiles.id` | Admin penangan |
| 10 | `handled_at` | timestamptz | Ya | — | — | Waktu ditangani |
| 11 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## 5.55 Tabel `audit_logs`

Jejak keputusan admin dan aksi sensitif (append-only).

| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint | Tidak | IDENTITY | PK | ID unik baris |
| 2 | `actor_id` | uuid | Ya | — | FK → `public.profiles.id` | Pelaku |
| 3 | `action` | text | Tidak | — | — | Aksi (mis. catalog.approve) |
| 4 | `target_type` | text | Tidak | — | — | Jenis target |
| 5 | `target_id` | text | Tidak | — | — | ID target |
| 6 | `detail` | jsonb | Ya | — | — | Detail (JSON) |
| 7 | `ip` | text | Ya | — | — | Alamat IP pelaku |
| 8 | `created_at` | timestamptz | Tidak | now() | — | Waktu dibuat |

## Tipe ENUM

| Tipe | Nilai |
|---|---|
| `article_status` | DRAFT, PUBLISHED |
| `balance_ledger_type` | TOPUP_CREDIT, SPEND_TOPUP, REFUND_CREDIT, LOYALTY_CREDIT, REFERRAL_CREDIT, ADJUSTMENT |
| `balance_topup_status` | PENDING, PAID, FAILED, EXPIRED |
| `banner_placement` | HOME_HERO |
| `bundle_status` | ACTIVE, INACTIVE, SOLD |
| `catalog_status` | DRAFT, PENDING_REVIEW, REJECTED, LISTED, LOCKED, IN_ORDER, SOLD, DELISTED |
| `deposit_status` | UNPAID, HELD, RELEASED |
| `discount_kind` | PERCENT, FIXED |
| `dispute_event_type` | OPENED, STATEMENT, EVIDENCE, ADMIN_NOTE, RESOLVED |
| `dispute_reason` | NOT_DELIVERED, NOT_AS_DESCRIBED, RECALLED, OTHER |
| `dispute_status` | OPEN, STORE_RESPONDED, IN_REVIEW, RESOLVED_BUYER, RESOLVED_STORE, CANCELLED |
| `featured_status` | PENDING_PAYMENT, ACTIVE, EXPIRED, STOPPED |
| `field_type` | TEXT, NUMBER, SELECT, TAGS |
| `gateway_method` | QRIS, VA, RETAIL, EWALLET, CC |
| `help_category` | GETTING_STARTED, BECOMING_STORE, FEES_WITHDRAWAL, BEFORE_SALE, AFTER_SALE, DISPUTES, TOPUP, BALANCE, PENALTIES, SECURITY |
| `inspection_result` | PASSED, FAILED |
| `ledger_bucket` | ESCROW, AVAILABLE, DEPOSIT |
| `lock_status` | PENDING_PAYMENT, ACTIVE, USED, EXPIRED |
| `loyalty_type` | EARN, REDEEM, ADJUSTMENT |
| `name_match` | MATCH, REVIEW, MISMATCH |
| `notification_kind` | ORDER, SYSTEM, STORE |
| `offer_status` | PENDING, COUNTERED, ACCEPTED, REJECTED, EXPIRED, CANCELLED, USED |
| `order_status` | PENDING_PAYMENT, PAID, IN_REKBER, SAFE, COMPLETED, CANCELLED, DISPUTED, REFUNDED |
| `payment_purpose` | TOPUP, BALANCE_FILL, ORDER, STORE_DEPOSIT, SUBSCRIPTION, AD, LOCK |
| `payment_status` | PENDING, PAID, EXPIRED, FAILED |
| `payout_status` | PENDING, COMPLETED, REJECTED |
| `referral_status` | PENDING, REWARDED |
| `refund_source` | PAID_AFTER_CANCEL, LOCK_UNAVAILABLE, TOPUP_UNDELIVERED |
| `refund_status` | PENDING, COMPLETED |
| `report_reason` | SCAM, FAKE, OFF_PLATFORM, ABUSE, OTHER |
| `report_status` | OPEN, REVIEWING, RESOLVED, DISMISSED |
| `report_target` | CATALOG, STORE, USER |
| `review_decision` | SUBMITTED, APPROVED, REJECTED, TAKEDOWN |
| `sanction_type` | WARNING, SUSPEND, FINE |
| `sender_role` | BUYER, STORE, ADMIN, SYSTEM |
| `store_ledger_type` | ESCROW_HOLD, ESCROW_RELEASE, COMMISSION, REFUND, COMPENSATION, WITHDRAW, WITHDRAW_FEE, TRANSFER, TRANSFER_FEE, PAYOUT_REVERSAL, ADJUSTMENT, DEPOSIT_HOLD, DEPOSIT_DEDUCTION, DEPOSIT_REFUND |
| `store_level` | AUTHORIZED, VERIFIED, PLATINUM |
| `store_status` | PENDING_DEPOSIT, PENDING_REVIEW, ACTIVE, REJECTED, SUSPENDED, CLOSING, CLOSED |
| `store_type` | OWNER, RESELLER |
| `subscription_tier` | FREE, PRO, BUSINESS |
| `topup_method` | QRIS, VA, RETAIL, EWALLET, CC, BALANCE |
| `topup_section` | SPECIAL, INSTANT |
| `topup_status` | PENDING, PAID, PROCESSING, SUCCESS, FAILED, EXPIRED, REFUNDED |
| `user_role` | USER, ADMIN |

## Constraint CHECK

| Tabel | Constraint | Aturan |
|---|---|---|
| balance_ledger | `balance_ledger_balance_after_check` | `CHECK ((balance_after >= 0))` |
| balance_topups | `balance_topups_check` | `CHECK ((credit = (nominal * qty)))` |
| balance_topups | `balance_topups_check1` | `CHECK ((amount = (credit + surcharge)))` |
| balance_topups | `balance_topups_nominal_check` | `CHECK ((nominal > 0))` |
| balance_topups | `balance_topups_qty_check` | `CHECK (((qty >= 1) AND (qty <= 10)))` |
| banners | `banners_cta_check` | `CHECK (((cta_label IS NULL) = (link_url IS NULL)))` |
| banners | `banners_cta_label_check` | `CHECK ((char_length(cta_label) <= 40))` |
| banners | `banners_image_check` | `CHECK ((image ~ '^(/images/\|cms/)[A-Za-z0-9/_.()-]+$'::text))` |
| banners | `banners_link_url_check` | `CHECK (((link_url IS NULL) OR (link_url ~ '^(/\|https://)'::text)))` |
| banners | `banners_subtitle_check` | `CHECK ((char_length(subtitle) <= 240))` |
| banners | `banners_title_check` | `CHECK (((char_length(title) >= 2) AND (char_length(title) <= 120)))` |
| banners | `banners_window_check` | `CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (ends_at > starts_at)))` |
| bundles | `bundles_bundle_price_check` | `CHECK ((bundle_price >= 10000))` |
| bundles | `bundles_title_check` | `CHECK (((char_length(title) >= 5) AND (char_length(title) <= 200)))` |
| catalogs | `catalogs_old_price_check` | `CHECK (((old_price IS NULL) OR (old_price > 0)))` |
| catalogs | `catalogs_price_check` | `CHECK ((price >= 10000))` |
| catalogs | `catalogs_title_check` | `CHECK (((char_length(title) >= 5) AND (char_length(title) <= 200)))` |
| chat_messages | `chat_messages_body_check` | `CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))` |
| disputes | `disputes_refund_amount_check` | `CHECK ((refund_amount >= 0))` |
| external_sellers | `external_sellers_alias_check` | `CHECK (((char_length(alias) >= 2) AND (char_length(alias) <= 60)))` |
| external_sellers | `external_sellers_payout_account_check` | `CHECK ((payout_account ~ '^[0-9]{6,20}$'::text))` |
| featured_listings | `featured_listings_duration_days_check` | `CHECK ((duration_days = ANY (ARRAY[1, 3, 7, 14, 30])))` |
| featured_listings | `featured_listings_price_check` | `CHECK ((price >= 0))` |
| flash_sales | `flash_sales_check` | `CHECK ((ends_at > starts_at))` |
| flash_sales | `flash_sales_sale_price_check` | `CHECK ((sale_price >= 10000))` |
| game_field_templates | `game_field_templates_key_check` | `CHECK ((key ~ '^[a-zA-Z][a-zA-Z0-9_]{0,40}$'::text))` |
| games | `games_image_check` | `CHECK (((image IS NULL) OR (image ~ '^(/images/\|cms/)[A-Za-z0-9/_.()-]+$'::text)))` |
| games | `games_slug_check` | `CHECK ((slug ~ '^[a-z0-9-]{2,50}$'::text))` |
| games | `games_uid_extra_options_check` | `CHECK (((uid_extra_options IS NULL) OR ((cardinality(uid_extra_options) >= 1) AND (cardinality(uid_extra_options) <= 20))))` |
| help_articles | `help_articles_slug_check` | `CHECK ((slug ~ '^[a-z0-9-]{2,120}$'::text))` |
| loyalty_ledger | `loyalty_ledger_balance_after_check` | `CHECK ((balance_after >= 0))` |
| news_articles | `news_articles_slug_check` | `CHECK ((slug ~ '^[a-z0-9-]{2,120}$'::text))` |
| offers | `offers_amount_check` | `CHECK ((amount >= 10000))` |
| offers | `offers_counter_amount_check` | `CHECK (((counter_amount IS NULL) OR (counter_amount >= 10000)))` |
| order_items | `order_items_price_check` | `CHECK ((price > 0))` |
| orders | `orders_check` | `CHECK ((item_price = (items_subtotal - voucher_discount)))` |
| orders | `orders_check1` | `CHECK ((total_paid = ((item_price + handling_fee) + protection_fee)))` |
| orders | `orders_check2` | `CHECK ((store_receives = (item_price - commission)))` |
| orders | `orders_commission_check` | `CHECK ((commission >= 0))` |
| orders | `orders_handling_fee_check` | `CHECK ((handling_fee >= 0))` |
| orders | `orders_item_price_check` | `CHECK ((item_price > 0))` |
| orders | `orders_items_subtotal_check` | `CHECK ((items_subtotal > 0))` |
| orders | `orders_protection_fee_check` | `CHECK ((protection_fee >= 0))` |
| orders | `orders_voucher_discount_check` | `CHECK ((voucher_discount >= 0))` |
| payments | `payments_amount_check` | `CHECK ((amount > 0))` |
| profiles | `profiles_balance_check` | `CHECK ((balance >= 0))` |
| profiles | `profiles_loyalty_points_check` | `CHECK ((loyalty_points >= 0))` |
| profiles | `profiles_name_check` | `CHECK (((char_length(name) >= 2) AND (char_length(name) <= 100)))` |
| promo_codes | `promo_codes_code_check` | `CHECK ((code ~ '^[A-Z0-9]{3,30}$'::text))` |
| promo_codes | `promo_codes_quota_check` | `CHECK (((quota IS NULL) OR (quota > 0)))` |
| promo_codes | `promo_codes_value_check` | `CHECK ((value > 0))` |
| ratings | `ratings_attitude_check` | `CHECK (((attitude >= 1) AND (attitude <= 5)))` |
| ratings | `ratings_delivery_speed_check` | `CHECK (((delivery_speed >= 1) AND (delivery_speed <= 5)))` |
| ratings | `ratings_desc_accuracy_check` | `CHECK (((desc_accuracy >= 1) AND (desc_accuracy <= 5)))` |
| ratings | `ratings_overall_check` | `CHECK ((overall = ANY (ARRAY['-1'::integer, 0, 1])))` |
| refunds | `refunds_amount_check` | `CHECK ((amount > 0))` |
| rekber_messages | `rekber_messages_body_check` | `CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))` |
| site_settings | `site_settings_key_check` | `CHECK ((key ~ '^[a-z0-9_.]{3,60}$'::text))` |
| site_settings | `site_settings_value_check` | `CHECK ((char_length(value) <= 2000))` |
| store_balances | `store_balances_available_check` | `CHECK ((available >= 0))` |
| store_balances | `store_balances_deposit_check` | `CHECK ((deposit >= 0))` |
| store_balances | `store_balances_escrow_check` | `CHECK ((escrow >= 0))` |
| store_sanctions | `store_sanctions_amount_check` | `CHECK ((amount >= 0))` |
| store_vouchers | `store_vouchers_check` | `CHECK (((kind <> 'PERCENT'::discount_kind) OR (value <= 90)))` |
| store_vouchers | `store_vouchers_code_check` | `CHECK ((code ~ '^[A-Z0-9]{3,30}$'::text))` |
| store_vouchers | `store_vouchers_min_spend_check` | `CHECK ((min_spend >= 0))` |
| store_vouchers | `store_vouchers_quota_check` | `CHECK (((quota IS NULL) OR (quota > 0)))` |
| store_vouchers | `store_vouchers_used_check` | `CHECK ((used >= 0))` |
| store_vouchers | `store_vouchers_value_check` | `CHECK ((value > 0))` |
| stores | `stores_name_check` | `CHECK (((char_length(name) >= 3) AND (char_length(name) <= 100)))` |
| stores | `stores_slug_check` | `CHECK ((slug ~ '^[a-z0-9-]{2,60}$'::text))` |
| topup_orders | `topup_orders_amount_check` | `CHECK ((amount > 0))` |
| topup_orders | `topup_orders_check` | `CHECK ((amount = ((base_price - discount) + surcharge)))` |
| topup_orders | `topup_orders_pay_source_check` | `CHECK ((pay_source = ANY (ARRAY['MIDTRANS'::text, 'BALANCE'::text])))` |
| topup_products | `topup_products_icon_check` | `CHECK (((icon IS NULL) OR (icon ~ '^/images/[a-z0-9/_.-]+$'::text)))` |
| topup_products | `topup_products_id_check` | `CHECK ((id ~ '^[a-z0-9-]{2,36}$'::text))` |
| topup_products | `topup_products_margin_check` | `CHECK ((retail_price >= supplier_price))` |
| topup_products | `topup_products_retail_price_check` | `CHECK ((retail_price > 0))` |
| topup_products | `topup_products_supplier_price_check` | `CHECK ((supplier_price > 0))` |
| transfer_requests | `transfer_requests_check` | `CHECK ((amount > fee))` |
| transfer_requests | `transfer_requests_name_match_check` | `CHECK ((name_match <> 'MISMATCH'::name_match))` |
| voucher_redemptions | `voucher_redemptions_discount_check` | `CHECK ((discount > 0))` |
| withdrawals | `withdrawals_account_number_check` | `CHECK ((account_number ~ '^[0-9]{6,20}$'::text))` |
| withdrawals | `withdrawals_check` | `CHECK ((amount > fee))` |
| withdrawals | `withdrawals_name_match_check` | `CHECK ((name_match <> 'MISMATCH'::name_match))` |
