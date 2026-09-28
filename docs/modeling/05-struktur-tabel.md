# 5. Struktur Tabel

Struktur fisik tabel pada database **`valostock`** (MySQL / MariaDB 10.4 di XAMPP). Engine **InnoDB**, charset **utf8mb4_unicode_ci**.
Skema SQL lengkap: [`back/database/schema.sql`](../../back/database/schema.sql). Kedua file ini harus selalu sama.

Keterangan kolom **Kunci**: **PK** = primary key, **FK** = foreign key (mengacu ke `tabel.kolom`), **UK** = unique key. **Null** = boleh kosong.
Semua nilai uang dalam **Rupiah bulat (INT)**.

## 5.1 Tabel `users`

Menyimpan semua akun pengguna: pembeli, pemilik toko, dan admin. Kolom `balance` adalah ringkasan saldo Balance (BLC) yang setiap perubahannya tercatat di `balance_ledger`.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID pengguna (UUID) |
| 2 | `name` | varchar(100) | Tidak | — | — | Nama tampilan pengguna |
| 3 | `email` | varchar(191) | Tidak | — | UK | Email untuk login (unik) |
| 4 | `phone` | varchar(20) | Ya | NULL | UK | Nomor HP (opsional, unik) |
| 5 | `password_hash` | varchar(100) | Tidak | — | — | Hash bcrypt dari password (password asli tidak disimpan) |
| 6 | `role` | enum('USER', 'ADMIN') | Tidak | 'USER' | — | Peran: USER (pembeli/pemilik toko) atau ADMIN |
| 7 | `balance` | int(11) | Tidak | 0 | — | Saldo Balance (BLC), ringkasan dari balance_ledger |
| 8 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.2 Tabel `stores`

Data toko penjual. Toko baru berstatus `PENDING_DEPOSIT`, menjadi `PENDING_REVIEW` setelah deposit lunas, lalu `ACTIVE` setelah diverifikasi manual oleh admin (pengganti KYC).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID toko (UUID) |
| 2 | `owner_id` | varchar(36) | Tidak | — | FK → `users.id`, UK | Pengguna pemilik toko (satu pengguna satu toko) |
| 3 | `slug` | varchar(60) | Tidak | — | UK | Pengenal di URL (huruf kecil, tanpa spasi) |
| 4 | `name` | varchar(100) | Tidak | — | — | Nama toko |
| 5 | `type` | enum('OWNER', 'RESELLER') | Tidak | 'OWNER' | — | OWNER = jual akun sendiri, RESELLER = jual titipan penjual lain |
| 6 | `level` | enum('AUTHORIZED', 'VERIFIED', 'PLATINUM') | Tidak | 'AUTHORIZED' | — | Level reputasi toko |
| 7 | `status` | enum('PENDING_DEPOSIT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED') | Tidak | 'PENDING_DEPOSIT' | — | Tahap toko: menunggu deposit → menunggu verifikasi → aktif / ditolak / ditangguhkan |
| 8 | `owner_legal_name` | varchar(100) | Tidak | — | — | Nama sesuai identitas; diverifikasi manual oleh admin (pengganti KYC) |
| 9 | `description` | text | Ya | NULL | — | Deskripsi toko di halaman etalase |
| 10 | `gradient` | varchar(120) | Tidak | 'from-violet-600 to-fuchsia-600' | — | Kelas warna gradien banner (Tailwind) |
| 11 | `deposit_amount` | int(11) | Tidak | 500000 | — | Nominal deposit keamanan toko |
| 12 | `deposit_status` | enum('UNPAID', 'HELD', 'RELEASED') | Tidak | 'UNPAID' | — | Status deposit: belum dibayar / ditahan / dikembalikan |
| 13 | `identity_verified` | tinyint(1) | Tidak | 0 | — | Identitas sudah diverifikasi admin (1/0) |
| 14 | `rating` | decimal(3,2) | Tidak | 0.00 | — | Rata-rata rating toko |
| 15 | `reviews` | int(11) | Tidak | 0 | — | Jumlah ulasan |
| 16 | `sold` | int(11) | Tidak | 0 | — | Jumlah akun terjual |
| 17 | `followers` | int(11) | Tidak | 0 | — | Jumlah pengikut |
| 18 | `score_desc` | decimal(3,2) | Tidak | 0.00 | — | Service score: akurasi deskripsi (1-5) |
| 19 | `score_attitude` | decimal(3,2) | Tidak | 0.00 | — | Service score: sikap pelayanan (1-5) |
| 20 | `score_delivery` | decimal(3,2) | Tidak | 0.00 | — | Service score: kecepatan pengiriman (1-5) |
| 21 | `review_note` | varchar(255) | Ya | NULL | — | Catatan admin saat meninjau |
| 22 | `reviewed_by` | varchar(36) | Ya | NULL | FK → `users.id` | Admin yang meninjau |
| 23 | `reviewed_at` | datetime | Ya | NULL | — | Waktu ditinjau admin |
| 24 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.3 Tabel `store_balances`

Ringkasan saldo toko: `escrow` (dana pesanan yang belum selesai) dan `available` (bisa ditarik). Dibuat saat toko disetujui.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `store_id` | varchar(36) | Tidak | — | PK, FK → `stores.id` | Toko pemilik saldo (sekaligus primary key) |
| 2 | `escrow` | int(11) | Tidak | 0 | — | Dana ditahan untuk pesanan yang belum selesai |
| 3 | `available` | int(11) | Tidak | 0 | — | Dana yang bisa ditarik |
| 4 | `updated_at` | datetime | Tidak | current_timestamp() (ON UPDATE) | — | Waktu terakhir diubah |

## 5.4 Tabel `store_ledger`

Buku besar saldo toko (append-only). Setiap perubahan `store_balances` wajib menulis satu baris di sini.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(20) | Tidak | AUTO_INCREMENT | PK | Nomor urut mutasi |
| 2 | `store_id` | varchar(36) | Tidak | — | FK → `stores.id` | Toko pemilik data |
| 3 | `bucket` | enum('ESCROW', 'AVAILABLE') | Tidak | — | — | Saldo yang berubah: ESCROW atau AVAILABLE |
| 4 | `type` | enum('ESCROW_HOLD', 'ESCROW_RELEASE', 'COMMISSION', 'REFUND', 'WITHDRAW', 'WITHDRAW_FEE', 'PAYOUT_REVERSAL', 'ADJUSTMENT') | Tidak | — | — | Jenis mutasi saldo toko |
| 5 | `amount` | int(11) | Tidak | — | — | Bertanda: + masuk, - keluar |
| 6 | `balance_after` | int(11) | Tidak | — | — | Saldo setelah mutasi ini (jejak audit) |
| 7 | `ref_type` | varchar(20) | Tidak | — | — | order / withdrawal / adjustment |
| 8 | `ref_id` | varchar(36) | Tidak | — | — | ID data terkait (pesanan / penarikan) |
| 9 | `note` | varchar(255) | Ya | NULL | — | Catatan tambahan |
| 10 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.5 Tabel `store_vouchers`

Voucher diskon yang diterbitkan toko (hanya ditampilkan di prototype).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID unik baris data |
| 2 | `store_id` | varchar(36) | Tidak | — | FK → `stores.id`, UK | Toko pemilik data |
| 3 | `code` | varchar(30) | Tidak | — | UK | Kode voucher (unik per toko) |
| 4 | `kind` | enum('PERCENT', 'FIXED') | Tidak | — | — | Jenis diskon: persen atau nominal tetap |
| 5 | `value` | int(11) | Tidak | — | — | Nilai diskon (persen atau Rupiah) |
| 6 | `min_spend` | int(11) | Tidak | 0 | — | Minimal belanja agar diskon berlaku |
| 7 | `quota` | int(11) | Ya | NULL | — | Batas pemakaian (NULL = tanpa batas) |
| 8 | `used` | int(11) | Tidak | 0 | — | Jumlah voucher yang sudah dipakai |
| 9 | `expires_at` | date | Ya | NULL | — | Tanggal kedaluwarsa |

## 5.6 Tabel `games`

Master data game yang didukung (akun dan/atau top-up).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | int(11) | Tidak | AUTO_INCREMENT | PK | ID game (auto increment) |
| 2 | `slug` | varchar(50) | Tidak | — | UK | Pengenal di URL (huruf kecil, tanpa spasi) |
| 3 | `name` | varchar(100) | Tidak | — | — | Nama game |
| 4 | `publisher` | varchar(100) | Tidak | — | — | Penerbit game |
| 5 | `tagline` | varchar(150) | Tidak | — | — | Deskripsi singkat |
| 6 | `description` | text | Tidak | — | — | Deskripsi lengkap |
| 7 | `supports_account` | tinyint(1) | Tidak | 0 | — | Menjual akun game (1/0) |
| 8 | `supports_topup` | tinyint(1) | Tidak | 0 | — | Menjual top-up (1/0) |
| 9 | `has_skin_api` | tinyint(1) | Tidak | 0 | — | Punya sumber data skin dari API pihak ketiga (1/0) |
| 10 | `is_hot` | tinyint(1) | Tidak | 0 | — | Tampil di bagian game populer (1/0) |
| 11 | `uid_label` | varchar(50) | Tidak | — | — | Label kolom ID akun saat top-up |
| 12 | `uid_hint` | varchar(150) | Tidak | — | — | Petunjuk pengisian ID akun |
| 13 | `uid_extra_label` | varchar(50) | Ya | NULL | — | Label kolom tambahan (mis. Zone ID), NULL jika tidak ada |
| 14 | `gradient` | varchar(120) | Tidak | — | — | Kelas warna gradien kartu game |
| 15 | `topup_currency` | varchar(30) | Ya | NULL | — | Mata uang dalam game (mis. VP, Diamond) |
| 16 | `sort_order` | int(11) | Tidak | 0 | — | Urutan tampil |

## 5.7 Tabel `catalogs`

Akun game yang dijual toko. `vs_code` unik agar satu akun tidak bisa dijual dua kali. Atribut khusus game disimpan di kolom JSON `attributes`.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID katalog |
| 2 | `vs_code` | varchar(20) | Tidak | — | UK | Kode katalog dari platform (anti double-sell) |
| 3 | `store_id` | varchar(36) | Tidak | — | FK → `stores.id` | Toko pemilik data |
| 4 | `game_id` | int(11) | Tidak | — | FK → `games.id` | Game terkait |
| 5 | `title` | varchar(200) | Tidak | — | — | Judul katalog akun |
| 6 | `description` | text | Ya | NULL | — | Deskripsi akun |
| 7 | `price` | int(11) | Tidak | — | — | Harga jual akun (Rupiah) |
| 8 | `old_price` | int(11) | Ya | NULL | — | Harga coret sebelum diskon |
| 9 | `status` | enum('DRAFT', 'LISTED', 'LOCKED', 'IN_ORDER', 'SOLD', 'DELISTED') | Tidak | 'LISTED' | — | Status katalog: DRAFT → LISTED → LOCKED → IN_ORDER → SOLD / DELISTED |
| 10 | `account_checked` | tinyint(1) | Tidak | 0 | — | Sudah diinspeksi toko (badge Account Checked) |
| 11 | `instant` | tinyint(1) | Tidak | 0 | — | Bisa serah terima instan (1/0) |
| 12 | `image` | varchar(255) | Ya | NULL | — | Gambar utama |
| 13 | `images` | longtext | Ya | NULL | — | Array URL gambar |
| 14 | `attributes` | longtext | Ya | NULL | — | Atribut khusus game: rank, skin, region, level, dll. |
| 15 | `views` | int(11) | Tidak | 0 | — | Jumlah dilihat |
| 16 | `sort_order` | int(11) | Tidak | 0 | — | Urutan tampil |
| 17 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.8 Tabel `topup_products`

Nominal top-up per game beserta harga jual.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | Kode produk top-up |
| 2 | `game_id` | int(11) | Tidak | — | FK → `games.id` | Game terkait |
| 3 | `name` | varchar(100) | Tidak | — | — | Nama produk |
| 4 | `amount_label` | varchar(50) | Tidak | — | — | Label nominal, mis. "475 VP" |
| 5 | `retail_price` | int(11) | Tidak | — | — | Harga jual ke pembeli (Rupiah) |
| 6 | `popular` | tinyint(1) | Tidak | 0 | — | Ditandai populer (1/0) |
| 7 | `sort_order` | int(11) | Tidak | 0 | — | Urutan tampil |

## 5.9 Tabel `promo_codes`

Kode promo untuk top-up.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | int(11) | Tidak | AUTO_INCREMENT | PK | ID promo |
| 2 | `code` | varchar(30) | Tidak | — | UK | Kode promo yang diketik pembeli (unik) |
| 3 | `kind` | enum('PERCENT', 'FIXED') | Tidak | — | — | Jenis diskon: persen atau nominal tetap |
| 4 | `value` | int(11) | Tidak | — | — | Nilai diskon (persen atau Rupiah) |
| 5 | `min_spend` | int(11) | Tidak | 0 | — | Minimal belanja agar diskon berlaku |
| 6 | `label` | varchar(100) | Tidak | — | — | Keterangan promo |
| 7 | `quota` | int(11) | Ya | NULL | — | Batas pemakaian (NULL = tanpa batas) |
| 8 | `used_count` | int(11) | Tidak | 0 | — | Jumlah sudah dipakai |
| 9 | `expires_at` | datetime | Ya | NULL | — | Tanggal kedaluwarsa |
| 10 | `is_active` | tinyint(1) | Tidak | 1 | — | Promo aktif (1/0) |

## 5.10 Tabel `topup_orders`

Invoice top-up game. Bisa dibayar lewat Midtrans atau dengan Balance. Boleh tanpa login (`user_id` NULL).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID pesanan top-up (UUID) |
| 2 | `invoice_number` | varchar(30) | Tidak | — | UK | Nomor invoice yang ditampilkan ke pengguna |
| 3 | `user_id` | varchar(36) | Ya | NULL | FK → `users.id` | NULL = tamu (tanpa login) |
| 4 | `product_id` | varchar(36) | Tidak | — | FK → `topup_products.id` | Produk top-up yang dibeli |
| 5 | `promo_code_id` | int(11) | Ya | NULL | FK → `promo_codes.id` | Promo yang dipakai (opsional) |
| 6 | `user_game_id` | varchar(100) | Tidak | — | — | ID akun game tujuan |
| 7 | `game_zone_id` | varchar(30) | Ya | NULL | — | Zone/server ID (jika game membutuhkan) |
| 8 | `contact_email` | varchar(191) | Ya | NULL | — | Email penerima bukti |
| 9 | `contact_whatsapp` | varchar(20) | Ya | NULL | — | Nomor WhatsApp untuk dihubungi |
| 10 | `base_price` | int(11) | Tidak | — | — | Harga produk sebelum diskon |
| 11 | `discount` | int(11) | Tidak | 0 | — | Potongan promo |
| 12 | `surcharge` | int(11) | Tidak | 0 | — | Biaya metode pembayaran (Rupiah) |
| 13 | `amount` | int(11) | Tidak | — | — | Total dibayar |
| 14 | `pay_source` | enum('MIDTRANS', 'BALANCE') | Tidak | — | — | Sumber bayar: Midtrans atau Balance |
| 15 | `payment_method` | enum('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC', 'BALANCE') | Tidak | — | — | Metode pembayaran yang dipilih |
| 16 | `status` | enum('PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED') | Tidak | 'PENDING' | — | Status top-up: PENDING → PAID → SUCCESS (atau FAILED/EXPIRED) |
| 17 | `provider_ref` | varchar(50) | Ya | NULL | — | Referensi penyedia top-up (simulasi) |
| 18 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |
| 19 | `paid_at` | datetime | Ya | NULL | — | Waktu pembayaran lunas |

## 5.11 Tabel `balance_topups`

Invoice pembelian voucher Balance (closed-loop). Balance baru ditambahkan setelah pembayaran lunas.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID isi Balance (UUID) |
| 2 | `invoice_number` | varchar(30) | Tidak | — | UK | Nomor invoice yang ditampilkan ke pengguna |
| 3 | `user_id` | varchar(36) | Tidak | — | FK → `users.id`, UK | Pengguna yang mengisi Balance |
| 4 | `nominal` | int(11) | Tidak | — | — | Nominal satu voucher |
| 5 | `qty` | int(11) | Tidak | — | — | Jumlah voucher |
| 6 | `credit` | int(11) | Tidak | — | — | BLC yang ditambahkan = nominal x qty |
| 7 | `payment_method` | enum('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC') | Tidak | — | — | Metode pembayaran yang dipilih |
| 8 | `surcharge` | int(11) | Tidak | 0 | — | Biaya metode pembayaran (Rupiah) |
| 9 | `amount` | int(11) | Tidak | — | — | Total dibayar |
| 10 | `idempotency_key` | varchar(64) | Tidak | — | UK | Kunci anti klik ganda (unik per pengguna) |
| 11 | `status` | enum('PENDING', 'PAID', 'FAILED', 'EXPIRED') | Tidak | 'PENDING' | — | Status data (lihat nilai ENUM) |
| 12 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |
| 13 | `paid_at` | datetime | Ya | NULL | — | Waktu pembayaran lunas |

## 5.12 Tabel `balance_ledger`

Buku besar saldo Balance pengguna (append-only).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(20) | Tidak | AUTO_INCREMENT | PK | Nomor urut mutasi |
| 2 | `user_id` | varchar(36) | Tidak | — | FK → `users.id` | Pemilik Balance |
| 3 | `type` | enum('TOPUP_CREDIT', 'SPEND_TOPUP', 'REFUND_CREDIT', 'ADJUSTMENT') | Tidak | — | — | Jenis mutasi: isi, bayar top-up, refund, penyesuaian |
| 4 | `amount` | int(11) | Tidak | — | — | Bertanda: + masuk, - keluar |
| 5 | `balance_after` | int(11) | Tidak | — | — | Saldo setelah mutasi ini (jejak audit) |
| 6 | `reference` | varchar(40) | Tidak | — | — | Nomor invoice terkait |
| 7 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.13 Tabel `orders`

Pesanan pembelian akun game dengan escrow dan rekber.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID pesanan (UUID) |
| 2 | `order_number` | varchar(30) | Tidak | — | UK | Nomor pesanan yang ditampilkan |
| 3 | `catalog_id` | varchar(36) | Tidak | — | FK → `catalogs.id` | Katalog akun yang dibeli |
| 4 | `buyer_id` | varchar(36) | Tidak | — | FK → `users.id` | Pembeli |
| 5 | `store_id` | varchar(36) | Tidak | — | FK → `stores.id` | Toko penjual |
| 6 | `item_price` | int(11) | Tidak | — | — | Harga akun saat dipesan |
| 7 | `handling_fee` | int(11) | Tidak | — | — | Biaya penanganan = maks(3,5% harga, Rp4.000) |
| 8 | `protection_fee` | int(11) | Tidak | — | — | Biaya proteksi wajib Rp5.000 |
| 9 | `total_paid` | int(11) | Tidak | — | — | item_price + handling_fee + protection_fee |
| 10 | `commission_rate` | decimal(5,4) | Tidak | 0.0500 | — | Tarif komisi platform saat dipesan |
| 11 | `commission` | int(11) | Tidak | — | — | Komisi platform (Rupiah) |
| 12 | `store_receives` | int(11) | Tidak | — | — | item_price - commission |
| 13 | `payment_method` | enum('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC') | Ya | NULL | — | Metode pembayaran yang dipilih |
| 14 | `status` | enum('PENDING_PAYMENT', 'PAID', 'IN_REKBER', 'SAFE', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED') | Tidak | 'PENDING_PAYMENT' | — | Status pesanan (lihat DFD 6.0) |
| 15 | `room_code` | varchar(20) | Tidak | — | — | Kode rekber = vs_code katalog |
| 16 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |
| 17 | `paid_at` | datetime | Ya | NULL | — | Waktu pembayaran lunas |
| 18 | `safe_at` | datetime | Ya | NULL | — | Waktu pembeli mengonfirmasi akun aman |
| 19 | `completed_at` | datetime | Ya | NULL | — | Waktu pesanan selesai & escrow dilepas |
| 20 | `cancelled_at` | datetime | Ya | NULL | — | Waktu pesanan dibatalkan |

## 5.14 Tabel `payments`

Transaksi Midtrans untuk semua jenis pembayaran. Tabel tujuan ditentukan oleh `purpose` + `ref_id` (relasi polimorfik, dijaga aplikasi).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID pembayaran (UUID) |
| 2 | `midtrans_order_id` | varchar(50) | Tidak | — | UK | order_id yang dikirim ke Midtrans (= nomor invoice/pesanan) |
| 3 | `purpose` | enum('TOPUP', 'BALANCE_FILL', 'ORDER', 'STORE_DEPOSIT') | Tidak | — | — | Jenis pembayaran |
| 4 | `ref_id` | varchar(36) | Tidak | — | — | id di topup_orders / balance_topups / orders / stores (sesuai purpose) |
| 5 | `user_id` | varchar(36) | Ya | NULL | FK → `users.id` | Pembayar (NULL untuk tamu) |
| 6 | `amount` | int(11) | Tidak | — | — | gross_amount, wajib sama dengan notifikasi Midtrans |
| 7 | `payment_method` | enum('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC') | Tidak | — | — | Metode pembayaran yang dipilih |
| 8 | `snap_token` | varchar(100) | Ya | NULL | — | Token Midtrans Snap |
| 9 | `redirect_url` | varchar(255) | Ya | NULL | — | URL halaman pembayaran Midtrans |
| 10 | `status` | enum('PENDING', 'PAID', 'EXPIRED', 'FAILED') | Tidak | 'PENDING' | — | Status pembayaran |
| 11 | `midtrans_transaction_id` | varchar(64) | Ya | NULL | — | ID transaksi dari Midtrans |
| 12 | `payment_type` | varchar(30) | Ya | NULL | — | Tipe pembayaran menurut Midtrans (qris, bank_transfer, …) |
| 13 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |
| 14 | `paid_at` | datetime | Ya | NULL | — | Waktu pembayaran lunas |

## 5.15 Tabel `webhook_events`

Notifikasi status dari Midtrans. UNIQUE (`source`, `external_id`) mencegah notifikasi yang sama diproses dua kali.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(20) | Tidak | AUTO_INCREMENT | PK | Nomor urut notifikasi |
| 2 | `source` | enum('MIDTRANS') | Tidak | 'MIDTRANS' | UK | Pengirim notifikasi |
| 3 | `external_id` | varchar(120) | Tidak | — | UK | transaction_id + status, unik per notifikasi |
| 4 | `payment_id` | varchar(36) | Ya | NULL | FK → `payments.id` | Pembayaran terkait |
| 5 | `payload` | longtext | Tidak | — | — | Isi notifikasi mentah (JSON) |
| 6 | `signature_valid` | tinyint(1) | Tidak | 0 | — | Tanda tangan SHA512 valid (1/0) |
| 7 | `processed` | tinyint(1) | Tidak | 0 | — | Sudah diproses (1/0) |
| 8 | `received_at` | datetime | Tidak | current_timestamp() | — | Waktu notifikasi diterima |

## 5.16 Tabel `withdrawals`

Pengajuan penarikan dana toko. Saldo didebit saat pengajuan dan dikembalikan jika ditolak admin.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | varchar(36) | Tidak | — | PK | ID penarikan (UUID) |
| 2 | `withdrawal_number` | varchar(30) | Tidak | — | UK | Nomor penarikan yang ditampilkan |
| 3 | `store_id` | varchar(36) | Tidak | — | FK → `stores.id` | Toko pemilik data |
| 4 | `amount` | int(11) | Tidak | — | — | Total didebit dari saldo tersedia (termasuk biaya) |
| 5 | `fee` | int(11) | Tidak | — | — | Biaya tarik + biaya bank |
| 6 | `bank_name` | varchar(50) | Tidak | — | — | Nama bank / e-wallet tujuan |
| 7 | `account_number` | varchar(30) | Tidak | — | — | Nomor rekening tujuan |
| 8 | `account_name` | varchar(100) | Tidak | — | — | Nama pemilik rekening |
| 9 | `name_match` | enum('MATCH', 'REVIEW', 'MISMATCH') | Tidak | — | — | Hasil pencocokan nama rekening dengan nama pemilik toko |
| 10 | `status` | enum('PENDING', 'COMPLETED', 'REJECTED') | Tidak | 'PENDING' | — | Status: menunggu admin, selesai, atau ditolak |
| 11 | `review_note` | varchar(255) | Ya | NULL | — | Catatan admin saat meninjau |
| 12 | `reviewed_by` | varchar(36) | Ya | NULL | FK → `users.id` | Admin yang meninjau |
| 13 | `reviewed_at` | datetime | Ya | NULL | — | Waktu ditinjau admin |
| 14 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.17 Tabel `rekber_messages`

Pesan dalam ruang rekber satu pesanan, yang menjadi bukti serah terima akun.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(20) | Tidak | AUTO_INCREMENT | PK | Nomor urut pesan |
| 2 | `order_id` | varchar(36) | Tidak | — | FK → `orders.id` | Pesanan tempat pesan dikirim |
| 3 | `sender_id` | varchar(36) | Ya | NULL | FK → `users.id` | NULL untuk pesan sistem |
| 4 | `sender_role` | enum('BUYER', 'STORE', 'ADMIN', 'SYSTEM') | Tidak | — | — | Peran pengirim |
| 5 | `body` | text | Tidak | — | — | Isi pesan |
| 6 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## 5.18 Tabel `help_articles`

Artikel pusat bantuan.

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | int(11) | Tidak | AUTO_INCREMENT | PK | ID artikel |
| 2 | `slug` | varchar(100) | Tidak | — | UK | Pengenal di URL (huruf kecil, tanpa spasi) |
| 3 | `title` | varchar(200) | Tidak | — | — | Judul artikel |
| 4 | `category` | enum('GETTING_STARTED', 'BECOMING_STORE', 'FEES_WITHDRAWAL', 'BEFORE_SALE', 'AFTER_SALE', 'DISPUTES', 'TOPUP', 'BALANCE', 'PENALTIES', 'SECURITY') | Tidak | — | — | Kategori pusat bantuan |
| 5 | `excerpt` | varchar(255) | Tidak | — | — | Ringkasan artikel |
| 6 | `body` | longtext | Tidak | — | — | Array blok: paragraph / heading / list |
| 7 | `popular` | tinyint(1) | Tidak | 0 | — | Ditandai populer (1/0) |
| 8 | `sort_order` | int(11) | Tidak | 0 | — | Urutan tampil |

## 5.19 Tabel `audit_logs`

Catatan aksi sensitif (verifikasi toko, persetujuan penarikan, dan lainnya).

| No | Nama Kolom | Tipe Data | Null | Default | Kunci | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(20) | Tidak | AUTO_INCREMENT | PK | Nomor urut log |
| 2 | `actor_id` | varchar(36) | Ya | NULL | FK → `users.id` | NULL untuk aksi sistem |
| 3 | `action` | varchar(60) | Tidak | — | — | mis. store.approve, withdrawal.approve |
| 4 | `target_type` | varchar(30) | Tidak | — | — | Jenis data yang dikenai aksi |
| 5 | `target_id` | varchar(36) | Tidak | — | — | ID data yang dikenai aksi |
| 6 | `detail` | longtext | Ya | NULL | — | Detail aksi (JSON) |
| 7 | `ip` | varchar(45) | Ya | NULL | — | Alamat IP pelaku |
| 8 | `created_at` | datetime | Tidak | current_timestamp() | — | Waktu data dibuat (UTC) |

## Constraint Tambahan (CHECK)

| Tabel | Constraint | Aturan |
|---|---|---|
| users | `ck_users_balance` | `balance >= 0` — Balance tidak boleh minus |
| store_balances | `ck_store_balances` | `escrow >= 0 AND available >= 0` |
| catalogs | `ck_catalogs_price` | `price > 0` |
| withdrawals | `ck_withdrawals_amount` | `amount > fee` |
