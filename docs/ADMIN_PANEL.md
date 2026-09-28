# Perancangan Admin Panel — valostock.id

Versi 1.0 · Bagian dari arsitektur v8 (Supabase) · Rujukan: `SITEMAP.md` §8–9, `ARCHITECTURE.md`, `docs/modeling/02-dfd.md` (proses 8.0)

Admin panel adalah tempat platform **mengambil keputusan**: memverifikasi toko dan produk, menengahi sengketa, menyetujui pencairan dana, dan mengelola data master (game, produk top-up, konten). Prinsipnya:

1. **Tidak ada yang otomatis disetujui.** Toko, katalog, penarikan dana, transfer, dan sengketa selalu diputuskan oleh admin.
2. **Setiap keputusan tercatat** di `audit_logs`: siapa, kapan, aksi, target, alasan, dan IP. Penolakan wajib diberi alasan.
3. **Izin dicek di server** (`requirePermission`), bukan hanya disembunyikan di UI.
4. **Antrean didahulukan.** Halaman utama menampilkan pekerjaan yang menunggu keputusan, dimulai dari yang paling lama menunggu.

---

## 1. Struktur Menu (Information Architecture)

```
/admin                                  Dashboard (KPI + antrean)
├── Moderasi
│   ├── /admin/catalogs                 Moderasi Katalog      ← antrean PENDING_REVIEW
│   ├── /admin/catalogs/[id]            Detail & keputusan katalog
│   ├── /admin/stores                   Verifikasi Toko       ← antrean PENDING_REVIEW
│   ├── /admin/stores/[id]              Detail toko (profil, katalog, pesanan, saldo, sanksi)
│   └── /admin/reports                  Laporan Pengguna
├── Transaksi
│   ├── /admin/orders                   Pesanan (cari no. pesanan / pembeli / toko)
│   ├── /orders/[id]                    Detail pesanan + Rekber Room (halaman bersama; admin bisa kirim pesan)
│   ├── /admin/disputes                 Sengketa              ← antrean OPEN / IN_REVIEW
│   ├── /disputes/[id]                  Timeline + bukti + putusan (halaman bersama; form putusan untuk admin)
│   ├── /admin/topups                   Invoice top-up & isi Balance
│   └── /admin/payments                 Pembayaran & log webhook Midtrans
├── Keuangan
│   ├── /admin/withdrawals              Penarikan dana toko   ← antrean PENDING
│   ├── /admin/transfers                Transfer ke penjual eksternal ← antrean PENDING
│   ├── /admin/finance                  Ringkasan: komisi, biaya, float Balance, escrow
│   └── /admin/ads                      Iklan & featured listing, langganan toko
├── Data Master & Konten
│   ├── /admin/games                    Game + template kolom katalog per game
│   ├── /admin/topup-products           Produk top-up per game
│   ├── /admin/promo-codes              Kode promo top-up
│   ├── /admin/news                     Artikel berita (CMS)
│   └── /admin/help                     Artikel pusat bantuan (CMS)
├── Pengguna & Akses
│   ├── /admin/users                    Pengguna (cari, blokir/aktifkan, riwayat)
│   └── /admin/admins                   Admin & peran (RBAC)
└── Sistem
    ├── /admin/audit                    Audit log
    └── /admin/analytics                Analitik top-up per akun game
```

### Wireframe tata letak

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  valostock · Admin            [cari no. pesanan / email / VS code]   👤 Admin │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Dashboard     │  Moderasi Katalog                                            │
│ MODERASI      │  [Menunggu 12] [Ditolak] [Aktif] [Diturunkan] [Semua]        │
│ • Katalog (12)│  Filter: game ▾  toko ▾  harga ▾  menunggu > 24 jam ☐        │
│ • Toko (3)    │ ┌──────────────────────────────────────────────────────────┐ │
│ • Laporan (1) │ │ ▢ foto │ VS7K3QX · Akun Valorant Immortal 3   Rp4.250.000  │ │
│ TRANSAKSI     │ │        │ NusaGame (Reseller) · diajukan 2 jam lalu   [Tinjau]│ │
│ • Pesanan     │ ├──────────────────────────────────────────────────────────┤ │
│ • Sengketa (2)│ │ ...                                                       │ │
│ KEUANGAN      │ └──────────────────────────────────────────────────────────┘ │
│ • Penarikan(4)│                                                              │
│ DATA MASTER   │   Panel detail (drawer kanan): foto, atribut per game,       │
│ PENGGUNA      │   deskripsi, data toko, hasil inspeksi, riwayat keputusan,   │
│ SISTEM        │   [Setujui]  [Tolak ▾ alasan]                                 │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

Angka di sidebar adalah jumlah item yang sedang menunggu keputusan pada antrean itu.

---

## 2. Peran & Izin (RBAC)

Izin berformat `modul:aksi`. Satu admin bisa punya lebih dari satu peran. Hanya **Super Admin** yang boleh mengubah peran (`rbac:manage`).

| Izin | Keterangan |
|---|---|
| `dashboard:view` | Melihat dashboard |
| `catalogs:view` · `catalogs:moderate` · `catalogs:takedown` | Melihat, menyetujui/menolak, dan menurunkan katalog |
| `stores:view` · `stores:verify` · `stores:suspend` | Melihat, memverifikasi, dan menangguhkan toko |
| `reports:manage` | Menangani laporan pengguna |
| `orders:view` · `orders:intervene` | Melihat pesanan, dan membatalkan pesanan yang belum dibayar atau mengirim pesan admin di rekber |
| `disputes:resolve` | Memutus sengketa |
| `payments:view` | Melihat pembayaran, invoice, dan log webhook |
| `finance:view` · `payouts:approve` | Melihat laporan keuangan, dan menyetujui penarikan/transfer |
| `ads:manage` | Mengelola iklan, featured listing, dan langganan |
| `master:manage` | Mengelola game, template kolom, produk top-up, dan kode promo |
| `content:manage` | Mengelola berita dan artikel bantuan |
| `users:view` · `users:ban` | Melihat pengguna, dan memblokir/mengaktifkan akun |
| `audit:view` | Melihat audit log dan analitik |
| `rbac:manage` | Mengelola admin dan peran |

| Peran (seed) | Izin |
|---|---|
| **Super Admin** | semua |
| **Moderator Katalog** | `dashboard:view`, `catalogs:*`, `stores:view`, `reports:manage` |
| **Verifikator Toko** | `dashboard:view`, `stores:*`, `catalogs:view`, `users:view` |
| **Keuangan** | `dashboard:view`, `finance:view`, `payouts:approve`, `payments:view`, `orders:view`, `ads:manage` |
| **Support & Sengketa** | `dashboard:view`, `orders:*`, `disputes:resolve`, `reports:manage`, `users:view`, `payments:view` |
| **Editor Konten** | `dashboard:view`, `content:manage`, `master:manage` |

Menu yang izinnya tidak dimiliki admin tidak ditampilkan. Kalau URL-nya diakses langsung, API menjawab 403.

---

## 3. Spesifikasi Halaman

### 3.1 Dashboard `/admin`
- **Kartu KPI:** GMV hari ini dan 30 hari (pesanan COMPLETED), jumlah pesanan aktif, komisi 30 hari, jumlah invoice top-up sukses, float Balance, dan total escrow yang sedang ditahan.
- **Kartu antrean:** katalog menunggu, toko menunggu, sengketa terbuka (dan yang lewat tenggat), penarikan menunggu, transfer menunggu, laporan terbuka. Setiap kartu bisa diklik ke antreannya.
- **Aktivitas terbaru:** 10 entri audit log terakhir.

### 3.2 Moderasi Katalog `/admin/catalogs` — *fokus utama*
- **Tab status:** `PENDING_REVIEW` (default, urut dari yang paling lama diajukan) · `REJECTED` · `LISTED` · `DELISTED` · Semua.
- **Kolom:** foto utama, VS code, judul, game, toko (dengan badge tipe dan level), harga, waktu diajukan, berapa kali pernah diajukan ulang.
- **Filter:** game, toko, rentang harga, "menunggu > 24 jam".
- **Detail `/admin/catalogs/[id]`:**
  - Galeri foto (Storage), atribut game sesuai template (rank, server, level, jumlah skin …), dan deskripsi.
  - Data toko: status verifikasi, rating, jumlah pelanggaran.
  - Hasil inspeksi akun jika ada (checklist + media privat lewat signed URL).
  - Riwayat keputusan (`catalog_reviews`).
- **Aksi:**
  - **Setujui:** katalog menjadi `LISTED`, toko mendapat notifikasi in-app.
  - **Tolak:** wajib memilih alasan (bisa lebih dari satu) + catatan bebas. Katalog menjadi `REJECTED`, toko mendapat notifikasi berisi alasan.
  - **Turunkan** (untuk katalog LISTED): butuh `catalogs:takedown` dan alasan. Katalog menjadi `DELISTED`.
- **Template alasan penolakan:**
  1. Foto tidak jelas atau bukan milik akun tersebut
  2. Data atribut (rank/level/skin) tidak sesuai foto
  3. Judul/deskripsi menyesatkan atau memakai klaim mutlak ("100% aman")
  4. Harga tidak wajar
  5. Mencantumkan kontak/link di luar platform
  6. Kategori/game salah
  7. Duplikat katalog lain (akun yang sama)
  8. Lainnya (wajib catatan)
- **Checklist moderasi** (ditampilkan di panel detail sebagai pengingat): foto memperlihatkan data yang diklaim · atribut konsisten · tidak ada kontak luar · tidak ada klaim mutlak · harga wajar · toko ACTIVE.

### 3.3 Verifikasi Toko `/admin/stores`
- **Tab:** `PENDING_REVIEW` · `ACTIVE` · `SUSPENDED` · `REJECTED` · `PENDING_DEPOSIT` · Semua.
- **Kolom:** nama toko, tipe, nama pemilik (KTP), akun (nama + email), status deposit, tanggal daftar.
- **Aksi:** Setujui (menjadi `ACTIVE`, `identity_verified`, saldo toko dibuat) · Tolak + alasan (deposit dikembalikan, disimulasikan) · Tangguhkan / Aktifkan kembali (`stores:suspend`, alasan wajib; semua katalog LISTED ikut disembunyikan selama ditangguhkan).
- **Detail toko:** profil, katalog per status, pesanan, saldo + ledger, penarikan, sengketa, dan riwayat keputusan admin.

### 3.4 Laporan Pengguna `/admin/reports`
Laporan dari pembeli terhadap katalog, toko, atau pengguna, berisi alasan dan detail. Aksi: tandai sedang ditinjau · selesaikan (dengan tindakan: turunkan katalog / tangguhkan toko / tanpa tindakan) · tolak laporan.

### 3.5 Pesanan `/admin/orders`
- **Cari:** no. pesanan, VS code, email pembeli, nama toko. **Filter:** status, tanggal.
- **Detail:** timeline status, rincian uang (harga, biaya penanganan, proteksi, voucher, komisi, bagian toko), dan Rekber Room (admin bisa mengirim pesan sebagai ADMIN).
- **Aksi** (`orders:intervene`): batalkan pesanan yang belum dibayar. Refund untuk pesanan yang sudah dibayar hanya lewat putusan sengketa.

### 3.6 Sengketa `/admin/disputes`
- **Tab:** `OPEN` · `STORE_RESPONDED` · `IN_REVIEW` · selesai. Badge merah jika tenggat 72 jam untuk toko sudah lewat.
- **Detail:** alasan, pernyataan dan bukti kedua pihak (lampiran privat), timeline (`dispute_events`), dan riwayat rekber.
- **Putusan** (`disputes:resolve`, catatan wajib):
  - **Menangkan pembeli:** sebelum pesanan selesai → escrow direfund ke pembeli (refund Midtrans disimulasikan) dan katalog kembali LISTED. Setelah pesanan selesai → kompensasi dipotong dari saldo tersedia/deposit toko.
  - **Menangkan toko:** pesanan dilanjutkan menjadi COMPLETED dan escrow dilepas.
  - Opsional: beri sanksi ke toko (peringatan / tangguhkan).

### 3.7 Penarikan & Transfer `/admin/withdrawals`, `/admin/transfers`
Kolom: nomor, toko, jumlah, biaya, rekening, **kecocokan nama** (MATCH/REVIEW), dan tanggal. Aksi: Setujui (transfer Iris disimulasikan) · Tolak + alasan (dana dikembalikan ke saldo toko lewat `PAYOUT_REVERSAL`).

### 3.8 Keuangan `/admin/finance` dan Iklan `/admin/ads`
- **Keuangan:** pendapatan per sumber (komisi, biaya penanganan, proteksi, langganan, iklan, margin top-up), escrow berjalan, float Balance (liabilitas ke pembeli), penarikan per status. Hanya baca.
- **Iklan:** daftar featured listing dan langganan aktif, dengan tanggal berakhir. Aksi: hentikan iklan yang melanggar (alasan wajib).

### 3.9 Data Master
- **Game:** CRUD game (slug, nama, dukung akun/top-up, urutan, gradien, label UID). **Template kolom** per game: key, label, tipe (TEXT / NUMBER / SELECT / TAGS), wajib/opsional, opsi, urutan, dipakai sebagai filter atau tidak. Template ini yang menentukan form katalog toko dan filter pencarian.
- **Produk top-up:** CRUD per game (nama, label nominal, harga jual, populer, aktif).
- **Kode promo:** CRUD (jenis, nilai, minimal belanja, kuota, masa berlaku, aktif) + jumlah terpakai.

### 3.10 Konten
Berita dan artikel bantuan: daftar, buat, ubah, publish/unpublish. Isi artikel berupa blok (paragraf / judul / daftar), sama dengan format yang dipakai halaman publik.

### 3.11 Pengguna & Admin
- **Pengguna:** cari (nama/email), lihat ringkasan (pesanan, top-up, Balance, laporan), blokir/aktifkan (alasan wajib). Pengguna yang diblokir tidak bisa login atau bertransaksi.
- **Admin & peran:** jadikan pengguna admin, atur peran, cabut akses. Hanya Super Admin.

### 3.12 Audit Log
Filter berdasarkan aksi, admin, jenis target, dan tanggal. Setiap entri memuat detail JSON (sebelum/sesudah, alasan) dan IP. Hanya baca.

---

## 4. Keputusan yang Dikendalikan Admin (State Machine)

| Objek | Transisi oleh admin | Syarat |
|---|---|---|
| Toko | `PENDING_REVIEW → ACTIVE / REJECTED`, `ACTIVE ↔ SUSPENDED` | alasan wajib untuk tolak/tangguhkan |
| Katalog | `PENDING_REVIEW → LISTED / REJECTED`, `LISTED → DELISTED` | alasan wajib untuk tolak/turunkan |
| Sengketa | `OPEN/STORE_RESPONDED/IN_REVIEW → RESOLVED_BUYER / RESOLVED_STORE` | catatan wajib |
| Penarikan / Transfer | `PENDING → COMPLETED / REJECTED` | nama rekening bukan MISMATCH |
| Pesanan | `PENDING_PAYMENT → CANCELLED` | hanya yang belum dibayar |
| Laporan | `OPEN → REVIEWING → RESOLVED / DISMISSED` | — |
| Iklan | `ACTIVE → STOPPED` | alasan wajib |
| Pengguna | aktif ↔ diblokir | alasan wajib |

---

## 5. Komponen UI yang Dipakai Ulang

- `AdminLayout`: sidebar dengan badge jumlah antrean, header dengan pencarian global dan menu profil.
- `QueueTable`: tabel dengan tab status, filter, pagination, dan klik baris membuka detail.
- `DecisionBar`: tombol Setujui / Tolak dengan dialog alasan (template + catatan), konfirmasi, dan status loading.
- `EntityDrawer`: panel detail di sisi kanan untuk tinjauan cepat tanpa pindah halaman.
- `AuditTrail`: riwayat keputusan untuk objek yang sedang dibuka.
- `StatusBadge`: warna konsisten (hijau aktif/disetujui, kuning menunggu, merah ditolak/ditangguhkan, abu-abu nonaktif).
