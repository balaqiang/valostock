# Supabase lokal — project `valostock`

Database, autentikasi, dan penyimpanan file valostock.id berjalan di **project Supabase sendiri** (Docker), terpisah dari project lain di komputer ini (mis. `yowana` di port 543xx).

| Layanan | URL lokal |
|---|---|
| API (Auth, Storage) | `http://127.0.0.1:55321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| **Studio** (tabel, SQL, storage) | <http://127.0.0.1:55323> |
| Mailpit (email Auth: reset password) | <http://127.0.0.1:55324> |

Realtime, Edge Functions, dan Analytics dimatikan di `config.toml` supaya hemat RAM.

## Perintah (dari root repo, Docker Desktop harus berjalan)

```bash
npx supabase start       # menyalakan stack valostock
npx supabase status      # URL + key (ANON_KEY, SERVICE_ROLE_KEY) untuk back/.env
npx supabase db reset    # hapus & buat ulang DB valostock: migrations/*.sql + seed.sql
npx supabase stop        # mematikan stack (data tetap tersimpan)
```

`db reset` hanya berlaku untuk project **valostock** (dibaca dari `config.toml` di folder ini).

## Isi folder

| File | Isi |
|---|---|
| `config.toml` | Port 553xx, Auth (tanpa konfirmasi email saat lokal, password min. 8), bucket Storage |
| `migrations/*.sql` | Skema: 52 tabel, 40 ENUM, trigger profil Supabase Auth, RLS, role `valostock_api` |
| `seed.sql` | Data demo. **Dihasilkan otomatis** oleh `npm run db:seed:gen` di `back/`, jadi jangan diedit manual |

Struktur tabel lengkap ada di [`docs/modeling/05-struktur-tabel.md`](../docs/modeling/05-struktur-tabel.md) (`npm run docs:tables` di `back/`).

## Keamanan

- **RLS aktif di semua tabel tanpa policy**, dan hak `anon`/`authenticated` dicabut. REST API publik Supabase (`/rest/v1`) tidak bisa membaca apa pun.
- API Express terhubung sebagai role **`valostock_api`** (hanya baca/tulis data, bypass RLS). Tabel ledger dan audit bersifat **append-only** untuk role ini.
- Bucket `catalog-images` publik (foto katalog, maks. 2 MB). Bucket `private-media` privat (inspeksi, lampiran rekber/sengketa, diakses dengan signed URL).

## Akun demo (password semua: `valostock-demo`, hanya untuk lokal)

| Email | Peran |
|---|---|
| `admin@valostock.test` | Super Admin |
| `moderator@valostock.test` | Moderator Katalog + Verifikator Toko |
| `finance@valostock.test` | Keuangan |
| `support@valostock.test` | Support & Sengketa |
| `nightfall@email.com` | Pembeli (Balance awal Rp100.000, kode referral `NIGHTFALL10`) |
| `raven@email.com` | Pembeli kedua |
| `nusagame@email.com` | Pemilik **NusaGame** (paket Pro, reseller) |
| `astralstore@valostock.test`, `verdantshop@…`, `gudangakun@…`, `skyvault@…` | Pemilik toko lain (ACTIVE) |
| `tokobaru@valostock.test` | Pemilik **TokoBaru** (menunggu verifikasi admin) |

Password role database `valostock_api` untuk lokal diatur di `seed.sql`.

**Data seed:** 4 game dengan 17 template kolom, 17 katalog (14 LISTED, 2 menunggu moderasi, 1 ditolak beserta alasannya), 20 produk top-up, 2 kode promo, 5 voucher toko, 1 flash sale, 1 bundle, 1 iklan featured, 13 artikel bantuan, dan 12 berita.
