# valostock.id

Marketplace akun game + top-up (tugas kuliah). Toko **dan setiap katalog** diverifikasi admin sebelum dijual, pembayaran lewat Midtrans (Sandbox atau mode simulasi), dana pembeli ditahan di escrow sampai pesanan selesai, dan serah terima akun berlangsung di Rekber Room.

| Folder | Isi |
|---|---|
| `front/` | Web Next.js 16 (UI saja) — `http://localhost:3000` |
| `back/` | API Express.js (semua logika bisnis) — `http://localhost:4000/api` |
| `supabase/` | Project Supabase lokal `valostock` (Postgres 17 + Auth + Storage): `config.toml`, `migrations/`, `seed.sql` |
| `docs/modeling/` | **Pemodelan sistem (pendekatan Alur Data):** Diagram Konteks, DFD, ERD, Basis Data Konseptual, Struktur Tabel |
| `docs/` | Arsitektur (+ kontrak API), perancangan admin panel, aturan uang, PRD, sitemap, flowchart |

## Menjalankan (lokal)

Kebutuhan: **Docker Desktop**, **Node.js 20+**, npm.

> **Tidak punya Docker?** Pakai project **Supabase Cloud** gratis — kodenya sama, hanya `back/.env` yang berbeda. Ikuti [`docs/SETUP_CLOUD.md`](docs/SETUP_CLOUD.md).

1. **Database (Supabase).** Dari root repo: `npx supabase start`, lalu `npx supabase db reset` (migrasi + data demo). Studio: <http://127.0.0.1:55323>, Mailpit (email reset password): <http://127.0.0.1:55324>.
   Port, keamanan, dan akun demo: [`supabase/README.md`](supabase/README.md). Project ini **tidak** menyentuh project Supabase lain di mesin yang sama.
2. **Backend:**
   ```bash
   cd back
   cp .env.example .env      # isi key dari `npx supabase status`
   npm install
   npm run dev               # http://localhost:4000/api/health
   ```
3. **Frontend** (terminal lain):
   ```bash
   cd front
   cp .env.example .env.local
   npm install
   npm run dev               # http://localhost:3000
   ```

### Pembayaran

- `PAYMENT_MODE=simulation` (bawaan): tanpa akun Midtrans. Tombol bayar membuka **Simulasi Pembayaran** (Bayar / Gagalkan).
- `PAYMENT_MODE=midtrans`: isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` dari **Midtrans Sandbox**. Status diambil dari Status API Midtrans (atau webhook bertanda tangan).
  Uji tanpa uang sungguhan: di halaman Snap pilih QRIS → salin URL gambar QR → tempel di [simulator QRIS Sandbox](https://simulator.sandbox.midtrans.com/v2/qris/index) → **Pay** → kembali ke aplikasi, halaman status/invoice menyinkronkan PAID lewat Status API (webhook tidak dibutuhkan secara lokal). VA: simulator `…/v2/bca/va/index` dsb.

## Akun demo (password `valostock-demo`, kecuali akun pribadi di bawah)

| Email | Peran |
|---|---|
| `admin@valostock.test` | Super Admin (semua izin) |
| `moderator@valostock.test` | Moderator Katalog + Verifikator Toko |
| `finance@valostock.test` · `support@valostock.test` | Keuangan · Support & Sengketa |
| `nightfall@email.com` | Pembeli (Balance Rp100.000, kode referral `NIGHTFALL10`) |
| `raven@email.com` | Pembeli |
| `nusagame@email.com`, `<slug>@valostock.test` (mis. `verdantshop@valostock.test`) | Pemilik toko |
| `tokobaru@valostock.test` | Toko yang menunggu verifikasi |

**Akun demo pribadi** (password sendiri, hanya untuk lokal):

| Email | Password | Peran |
|---|---|---|
| `adminjati@email.com` | `adminjati123` | Super Admin (semua izin) |
| `buyersatya@email.com` | `buyersatya123` | Pembeli (Balance 0) |
| `storebala@email.com` | `storebala123` | Pemilik **Bala Store** (ACTIVE, deposit Rp500.000 ditahan, paket Free, belum ada katalog) |

## Skenario demo (alur inti)

1. **Toko menambah katalog:** login `verdantshop@valostock.test` → Dashboard Toko → **Katalog Baru** → pilih game (kolom form mengikuti template game), simpan draf → unggah foto → **Ajukan ke Admin** (VS code terbit, status *Menunggu Verifikasi*).
2. **Admin memverifikasi produk:** login `moderator@valostock.test` → Admin → **Moderasi Katalog** → Tinjau → **Tolak** dengan alasan (toko mendapat notifikasi + alasan) atau **Setujui** (katalog tayang; pengikut toko dan wishlist harga turun diberi notifikasi).
3. **Toko memperbaiki:** ubah data/foto → **Ajukan Ulang** → admin menyetujui.
4. **Pembeli:** login `raven@email.com` → buka katalog → **Tawar** / **Beli** (bisa pakai voucher toko, lock Rp5.000) → bayar (simulasi) → escrow.
5. **Rekber:** toko mengirim data akun di Rekber Room → pembeli **Akun Aman** → **Selesai** (atau otomatis 5 jam kemudian) → escrow dilepas ke saldo toko (dikurangi komisi paket), pembeli dapat poin → beri penilaian.
6. **Keuangan:** toko ajukan penarikan (nama rekening harus cocok dengan nama pemilik) → `finance@valostock.test` menyetujui.
7. **Lainnya:** sengketa dengan bukti (Support memutus), top-up + promo + cek invoice, isi Balance, referral `/register?ref=NIGHTFALL10`, langganan Pro/Business, iklan featured, flash sale, bundle, penjual eksternal (toko Reseller).

Setelah langkah uang, cek `store_ledger` / `balance_ledger` / `loyalty_ledger` di Supabase Studio — setiap perubahan saldo punya baris ledger dengan `balance_after`, setiap keputusan admin ada di `audit_logs`.

## Pengujian

```bash
cd back
npm run db:reset        # migrasi + seed (hanya project valostock)
npm run test:smoke      # 14 langkah end-to-end (API berjalan, mode simulasi, seed baru)
npm run test:features   # 15 langkah: promosi, reseller, lock, iklan, laporan, RBAC, deposit/sanksi, penutupan toko, refund, Balance, paket
npm run test:unit       # unit test aturan uang + pencocokan nama (tanpa API)
npm run test:sweep      # semua endpoint GET per peran
npm run build
cd ../front && npm run build && npm run lint
```

Jika `back/.env` memakai `PAYMENT_MODE=midtrans`, jalankan API kedua dalam mode simulasi untuk pengujian: `npm run dev:sim` (port 4100, `.env.simulation`). Skrip test otomatis memakai API simulasi yang sedang berjalan (`API_URL` bisa diisi manual).

## Cakupan

**Berfungsi:** Supabase Auth (daftar + referral, login email/HP, lupa/reset password, ubah profil & password), verifikasi toko manual, **moderasi katalog** dengan template kolom per game, foto di Supabase Storage, inspeksi akun, tawar-menawar, lock, pesanan + escrow + rekber (lampiran privat) + selesai otomatis, sengketa + putusan admin + sanksi, rating + balasan toko, voucher, flash sale, bundle, langganan, iklan featured, penjual eksternal + transfer, penarikan, top-up + promo + cek invoice, Balance closed-loop, wishlist + notifikasi harga turun, follow, terakhir dilihat, rekomendasi, chat toko, notifikasi in-app, poin loyalitas, referral, laporan pengguna, CMS berita/bantuan, **admin panel dengan RBAC + audit log**.

**Disimulasikan:** Midtrans Iris (persetujuan penarikan/transfer = terkirim), Digiflazz (top-up PAID = SUCCESS), WhatsApp/Discord/Telegram, dan halaman bayar Midtrans pada mode simulasi.

**Catatan aset:** beberapa foto produk contoh di `front/public/images/products` berasal dari pihak ketiga (ada watermark dan nomor WhatsApp) — ganti dengan foto sendiri sebelum presentasi publik.
