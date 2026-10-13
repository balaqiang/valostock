# valostock.id — Sistem Web Top-Up Game

Website top-up game (Valorant, Mobile Legends, Genshin Impact, Free Fire): pilih game dan nominal, bayar lewat
Midtrans (Sandbox/simulasi) atau saldo Balance, lalu lacak status dengan nomor invoice. Admin mengelola produk top-up
dan melihat laporan transaksi. Dokumen tugas: `docs/skpl`, `docs/dis`, `docs/pdhupl`.

| Bagian | Teknologi | Port |
|---|---|---|
| `front/` | Next.js 16, React 19, Tailwind CSS v4 | 3000 |
| `back/` | Express.js 5, TypeScript, pg, Supabase Auth | 4000 |
| `supabase/` | PostgreSQL 17 (Supabase Cloud atau Docker lokal) | — |

## Persyaratan

- **Node.js** v20+ dan **npm** v9+
- Project **Supabase Cloud** (lihat [docs/SETUP_CLOUD.md](docs/SETUP_CLOUD.md)) **atau** Docker Desktop untuk Supabase lokal

## Instalasi

```bash
cd back && npm install
cd ../front && npm install
```

### `back/.env`

Salin `back/.env.example` menjadi `back/.env`, lalu isi:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://valostock_api:<password>@<host>:<port>/postgres
DATABASE_SSL=off                # require untuk Supabase Cloud
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_MODE=simulation         # atau midtrans (isi kunci Sandbox)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
JOBS_ENABLED=true
```

### `front/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Menjalankan

1. **Database** — Supabase Cloud: `npm run cloud:setup -- "<session pooler URL>"` di `back/` (sekali, lihat
   [SETUP_CLOUD](docs/SETUP_CLOUD.md)). Docker lokal: `npx supabase start` lalu `npx supabase db reset` di root repo.
2. **API** — `cd back && npm run dev` → <http://localhost:4000/api/health>
3. **Web** — `cd front && npm run dev` → <http://localhost:3000>

## Akun demo

| Email | Password | Peran |
|---|---|---|
| `admin@valostock.test` | `valostock-demo` | Admin |
| `adminjati@email.com` | `adminjati123` | Admin |
| `nightfall@email.com` | `valostock-demo` | Member (Balance awal 100.000 BLC, kode referral `NIGHTFALL10`) |
| `buyersatya@email.com` | `buyersatya123` | Member (Balance 0) |

Kode promo: `VALO10` (diskon 10%, min. Rp50.000) dan `HEMAT5K` (potongan Rp5.000, min. Rp100.000).

## Perintah

| Folder | Perintah | Keterangan |
|---|---|---|
| `back/` | `npm run dev` | API mode pengembangan |
| `back/` | `npm run dev:sim` | API kedua di :4100 dengan `PAYMENT_MODE=simulation` (untuk tes) |
| `back/` | `npm run build` | Kompilasi TypeScript |
| `back/` | `npm run test:unit` | Tes aturan uang |
| `back/` | `npm run test:smoke` | Tes end-to-end API (skenario PDHUPL) |
| `back/` | `npm run docs:tables` | Buat ulang `docs/modeling/05-struktur-tabel.md` |
| `back/` | `npm run cloud:setup -- "<url>" [--reset]` | Pasang/ulang database di Supabase Cloud |
| `front/` | `npm run dev` · `npm run build` · `npm run lint` | Web |

Dokumentasi teknis: [ARCHITECTURE](docs/ARCHITECTURE.md) · [MONEY_RULES](docs/MONEY_RULES.md) ·
[SITEMAP](docs/SITEMAP.md) · [Pemodelan](docs/modeling/README.md).
