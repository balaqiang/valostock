# valostock.id — Prototype

Marketplace akun game + top-up (tugas kuliah, **prototype**). Toko diverifikasi manual oleh admin, pembayaran lewat Midtrans (Sandbox atau mode simulasi), dana pembeli ditahan di escrow sampai pesanan selesai.

| Folder | Isi |
|---|---|
| `front/` | Web Next.js 16 (UI) — `http://localhost:3000` |
| `back/` | API Express.js — `http://localhost:4000/api` |
| `supabase/` | Project Supabase lokal `valostock` (Postgres 17 + Auth + Storage): `config.toml`, `migrations/`, `seed.sql` |
| `docs/modeling/` | **Pemodelan sistem (pendekatan Alur Data):** Diagram Konteks, DFD, ERD, Basis Data Konseptual, Struktur Tabel |
| `docs/` | Arsitektur, aturan uang, PRD, sitemap, flowchart |

> **Status migrasi v8:** database sudah pindah ke **Supabase** (Fase 2 selesai). Backend dan frontend sedang disesuaikan (Fase 3–4), jadi aplikasi belum bisa dijalankan end-to-end sampai fase tersebut selesai.

## Menjalankan (lokal)

Kebutuhan: **Docker Desktop**, **Node.js 20+**, npm.

1. **Database (Supabase).** Dari root repo: `npx supabase start`, lalu `npx supabase db reset` (migrasi + data demo). Studio ada di <http://127.0.0.1:55323>.
   Detail port, keamanan, dan daftar akun demo ada di [`supabase/README.md`](supabase/README.md).
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

- `PAYMENT_MODE=simulation` (bawaan): tidak perlu akun Midtrans. Tombol bayar membuka halaman **Simulasi Pembayaran**, tempat kamu memilih "Bayar" atau "Gagalkan".
- `PAYMENT_MODE=midtrans`: isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` dari dashboard **Midtrans Sandbox**. Pembeli diarahkan ke halaman Snap asli, dan statusnya dicek ke Status API Midtrans saat kembali ke `/payment/finish`.

## Skenario demo

1. Login `nightfall@email.com`, buka katalog, klik **Beli Sekarang**, pilih metode, **Bayar**. Pesanan menjadi PAID dan dana masuk escrow.
2. Login `nusagame@email.com`, buka Dashboard Toko, pilih pesanan, lalu kirim data akun di **Rekber Room**.
3. Login pembeli lagi, klik **Akun Aman**, lalu **Selesai**. Escrow dilepas ke saldo toko (dikurangi komisi 5%).
4. Sebagai toko, buka **Saldo & Penarikan** dan ajukan tarik dana. Nama rekening harus sama dengan nama pemilik toko.
5. Login `admin@valostock.test`, buka **Panel Admin**, setujui penarikan dan verifikasi toko **TokoBaru**.
6. Top-up game (boleh tanpa login), isi Balance, lalu top-up dengan Balance, dan cek invoice di `/topup/invoice`.

Setelah setiap langkah uang, periksa tabel `store_ledger` / `balance_ledger` di Supabase Studio. Setiap perubahan saldo punya baris ledger dengan `balance_after`.

## Pengujian

```bash
cd back
npm run db:reset      # npx supabase db reset (migrasi + seed, hanya project valostock)
npm run test:smoke    # 14 pemeriksaan end-to-end (API harus berjalan, mode simulasi)
npm run build         # tsc
cd ../front && npm run build && npm run lint
```

## Cakupan prototype

**Berfungsi:** login/registrasi, katalog, top-up + promo + cek invoice, Balance closed-loop, pembelian akun dengan escrow + rekber, pembukaan toko dengan verifikasi manual admin, katalog/pesanan/saldo/penarikan toko, persetujuan admin, analitik top-up.

**Disimulasikan:** pengiriman item top-up (Digiflazz) dan transfer penarikan (Midtrans Iris).

**Hanya data demo di UI:** tawar-menawar, rating, sengketa, wishlist/follow, poin, afiliasi, langganan, iklan, voucher toko, flash sale, bundle, penjual eksternal, notifikasi.
