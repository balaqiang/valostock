# Menjalankan valostock.id tanpa Docker (Supabase Cloud)

Panduan ini untuk laptop yang **tidak punya Docker**. Database, login (Auth), dan penyimpanan foto memakai project **Supabase Cloud** gratis; API (`back/`) dan web (`front/`) tetap berjalan di laptop sendiri. Kodenya sama persis dengan mode lokal — yang berbeda hanya isi `back/.env`.

> Satu project Cloud bisa dipakai bersama. Cukup **satu orang** yang menjalankan langkah 1–4; yang lain cukup menerima isi `back/.env` (bagikan secara pribadi, jangan di grup/repo) lalu lanjut ke langkah 5.

## Kebutuhan

- **Node.js 20+** dan npm
- Koneksi internet
- Akun gratis di <https://supabase.com>

## 1. Buat project Supabase

1. Masuk ke <https://supabase.com/dashboard> → **New project**.
2. Nama bebas (mis. `valostock`), **Region: Southeast Asia (Singapore)**.
3. Isi **Database Password** yang kuat dan simpan — dipakai sekali di langkah 4.
4. Tunggu sampai project selesai dibuat.

## 2. Atur Auth

Di menu **Authentication**:

- **Sign In / Providers → Email** → matikan **Confirm email**. Jika tetap menyala, akun yang baru mendaftar tidak bisa langsung masuk (lokal juga tanpa konfirmasi email).
- **URL Configuration** → **Site URL** `http://localhost:3000`, dan tambahkan `http://localhost:3000/**` di **Redirect URLs** (untuk link reset password).

## 3. Isi `back/.env`

```bash
cd back
cp .env.example .env
npm install
```

Buka `back/.env` dan isi dari dashboard (**Project Settings → API Keys**, tab *Legacy API keys*):

| Variabel | Diambil dari |
|---|---|
| `SUPABASE_URL` | Project URL, mis. `https://abcdefgh.supabase.co` |
| `SUPABASE_ANON_KEY` | kunci `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | kunci `service_role` — **rahasia**, jangan dibagikan ke publik |
| `PAYMENT_MODE` | `simulation` (tanpa akun Midtrans) |

`DATABASE_URL` dibiarkan dulu — langkah 4 mengisinya otomatis.

## 4. Pasang database (sekali saja)

Di dashboard klik **Connect** → pilih **Session pooler** → salin connection string, ganti `[YOUR-PASSWORD]` dengan password dari langkah 1. Lalu:

```bash
npm run cloud:setup -- "postgresql://postgres.abcdefgh:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

Skrip ini:

1. mendorong semua migrasi + data demo (`supabase/seed.sql`) ke project Cloud,
2. mengganti password role API `valostock_api` dengan password acak yang kuat (password bawaan seed hanya untuk lokal),
3. memeriksa role dan bucket Storage,
4. menulis `DATABASE_URL` dan `DATABASE_SSL=require` ke `back/.env`.

Password database (`postgres`) **tidak** disimpan di mana pun. Untuk mengulang data demo dari awal: tambahkan `--reset` (semua data di project Cloud dihapus lalu diisi ulang).

## 5. Jalankan

```bash
# terminal 1
cd back
npm run dev          # http://localhost:4000/api/health → "db":"connected"

# terminal 2
cd front
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Akun demo sama dengan mode lokal — lihat [README](../README.md#akun-demo-password-valostock-demo-kecuali-akun-pribadi-di-bawah).

## Beda dengan mode lokal (Docker)

| | Lokal (Docker) | Cloud |
|---|---|---|
| Database/Auth/Storage | `npx supabase start` | project di supabase.com |
| Isi ulang data demo | `npm run db:reset` | `npm run cloud:setup -- "<url>" --reset` |
| Studio | <http://127.0.0.1:55323> | dashboard supabase.com |
| Email reset password | Mailpit <http://127.0.0.1:55324> | dikirim sungguhan oleh Supabase (dibatasi beberapa email per jam) |
| `npm run test:*` | bisa | bisa, tetapi mengubah data project Cloud — jalankan `--reset` sesudahnya |

## Masalah umum

- **`/api/health` → `db-down` / timeout:** pastikan memakai *Session pooler* (IPv4), bukan *Direct connection*.
- **Daftar akun berhasil tetapi tidak bisa masuk:** *Confirm email* masih menyala (langkah 2).
- **`cloud:setup` gagal di `BYPASSRLS`:** project memakai Postgres lama. Buat project baru (Postgres 17 adalah bawaan project baru).
- **Foto tidak tampil:** restart `npm run dev` di `front/` setelah mengganti project (domain gambar `*.supabase.co` sudah diizinkan).

## Keamanan

- `back/.env` berisi kunci `service_role` dan password role API — **jangan di-commit** (sudah di `.gitignore`) dan jangan dibagikan di grup publik.
- Semua tabel memakai RLS tanpa policy, jadi kunci `anon` yang terlihat publik tidak bisa membaca data; hanya API (role `valostock_api`) yang bisa.
- Project ini untuk demo/tugas. Hapus project Cloud setelah tidak dipakai.
