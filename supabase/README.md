# Supabase — project `valostock`

Database dan autentikasi valostock.id. Bisa dijalankan di **Supabase Cloud** (lihat
[`docs/SETUP_CLOUD.md`](../docs/SETUP_CLOUD.md)) atau di **Docker lokal** (project sendiri, port 553xx, terpisah dari
project lain di komputer ini seperti `yowana` di port 543xx).

## Perintah Docker lokal (dari root repo, Docker Desktop harus berjalan)

```bash
npx supabase start       # menyalakan stack valostock
npx supabase status      # URL + key (ANON_KEY, SERVICE_ROLE_KEY) untuk back/.env
npx supabase db reset    # hapus & buat ulang DB: migrations/*.sql + seed.sql
npx supabase stop
```

| Layanan lokal | URL |
|---|---|
| API (Auth) | `http://127.0.0.1:55321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| **Studio** | <http://127.0.0.1:55323> |

## Isi folder

| File | Isi |
|---|---|
| `config.toml` | Port 553xx, Auth (tanpa konfirmasi email, password min. 8). Storage tidak dipakai. |
| `migrations/20261013000100_schema.sql` | 10 ENUM, 7 tabel utama + `payments` + `audit_logs`, trigger profil Supabase Auth |
| `migrations/20261013000200_security.sql` | RLS di semua tabel, role API `valostock_api`, ledger & audit append-only |
| `seed.sql` | Data demo: 4 akun, 4 game, 42 produk top-up, 2 kode promo, saldo awal Member demo |

Struktur tabel lengkap: [`docs/modeling/05-struktur-tabel.md`](../docs/modeling/05-struktur-tabel.md) (`npm run docs:tables` di `back/`).
Akun demo: [README](../README.md#akun-demo).

## Keamanan

- **RLS aktif di semua tabel tanpa policy**, dan hak `anon`/`authenticated` dicabut: REST API publik Supabase tidak bisa
  membaca apa pun.
- API Express terhubung sebagai role **`valostock_api`** (bypass RLS, hanya baca/tulis data). `balance_ledger` dan
  `audit_logs` bersifat **append-only** untuk role ini.
