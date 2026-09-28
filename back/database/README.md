# Database valostock (MySQL / MariaDB di XAMPP)

| File | Isi |
|---|---|
| `schema.sql` | Membuat ulang database `valostock` + 19 tabel. Sama dengan `docs/modeling/05-struktur-tabel.md`. |
| `seed.sql` | Data demo (game, toko, katalog, produk top-up, promo, artikel bantuan, akun demo). **Dihasilkan otomatis** oleh `npm run db:seed:gen` dari `front/src/lib/mock`, jadi jangan diedit manual. |
| `create-user.sql` | (Opsional) user MySQL khusus aplikasi dengan hak baca/tulis data saja. |

## Import lewat phpMyAdmin

1. Buka **XAMPP Control Panel**, lalu Start **Apache** dan **MySQL**.
2. Buka <http://localhost/phpmyadmin>, klik tab **Import**, pilih `schema.sql`, lalu klik **Import/Go**.
   File ini menghapus dan membuat ulang database `valostock`, jadi semua data lama ikut terhapus.
3. Di tab **Import**, pilih `seed.sql`, lalu klik **Import/Go**.
4. (Opsional) Di tab **SQL**, tempel isi `create-user.sql`, jalankan, lalu isi `DB_USER`/`DB_PASSWORD` di `back/.env` dengan user tersebut.
   Jika tidak, pakai `DB_USER=root` dan `DB_PASSWORD=` (kosong), yaitu bawaan XAMPP.

Alternatif lewat terminal (memakai `C:/xampp/mysql/bin/mysql.exe` sebagai root): `npm run db:reset` di folder `back/`.

## Akun demo

Semua akun memakai password **`valostock-demo`**. Ini hanya data uji lokal.

| Email | Peran | Keterangan |
|---|---|---|
| `admin@valostock.test` | ADMIN | Verifikasi toko, setujui/tolak penarikan, laporan |
| `nightfall@email.com` | Pembeli | Balance awal Rp100.000 (tercatat di `balance_ledger` sebagai `ADJUSTMENT`) |
| `nusagame@email.com` | Pemilik toko **NusaGame** (ACTIVE) | Nama pemilik: Rizky Pratama |
| `astralstore@valostock.test`, `verdantshop@valostock.test`, … | Pemilik toko lain (ACTIVE) | Satu akun per toko di seed |
| `tokobaru@valostock.test` | Pemilik **TokoBaru** | Status `PENDING_REVIEW` untuk demo verifikasi admin |

## Troubleshooting

- **`#1030 Got error 176 "Read page with wrong checksum"` / `Index for table 'db' is corrupt`** saat menjalankan `create-user.sql`.
  Tabel sistem `mysql.db` milik XAMPP rusak; ini masalah umum XAMPP, bukan dari skema ini. Perbaiki di phpMyAdmin (tab SQL): `REPAIR TABLE mysql.db;`, lalu jalankan ulang `create-user.sql`. Atau pakai `root` untuk pengembangan lokal.
- **Tanggal/jam terlihat bergeser 7 jam.** Data disimpan dalam UTC. Aplikasi menampilkannya sebagai WIB.
