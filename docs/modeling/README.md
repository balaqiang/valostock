# Pemodelan Sistem — valostock.id

Pendekatan yang dipakai: **Alur Data** (bukan UML). Sesuai ketentuan tugas, pendekatan UML **tidak** dibuat.

| No | Dokumen | Isi |
|---|---|---|
| 1 | [01-diagram-konteks.md](01-diagram-konteks.md) | Diagram Konteks (DFD Level 0): sistem sebagai satu proses + 5 entitas eksternal |
| 2 | [02-dfd.md](02-dfd.md) | DFD Level 1 (10 proses) dan DFD Level 2 (3.0 Katalog & Moderasi, 6.0 Pesanan, 7.0 Sengketa, 4.0 Top-up) |
| 3 | [03-erd.md](03-erd.md) | Entity Relationship Diagram — 52 tabel dalam 7 domain |
| 4 | [04-basis-data-konseptual.md](04-basis-data-konseptual.md) | Entitas, relasi, kardinalitas, dan aturan bisnis |
| 5 | [05-struktur-tabel.md](05-struktur-tabel.md) | Struktur tabel fisik PostgreSQL (dibuat otomatis dari database) |

**Basis data:** PostgreSQL 17 pada **project Supabase lokal `valostock`** (Docker), dikelola lewat **Supabase Studio** (`http://127.0.0.1:55323`). Skema fisik ada di `supabase/migrations/*.sql`, dan data awal di `supabase/seed.sql`. Akun login dikelola **Supabase Auth**.

Semua diagram ditulis dalam **Mermaid**. Untuk mengekspor gambarnya (PNG/SVG) ke laporan, tempel kodenya di <https://mermaid.live>.

## Notasi DFD yang dipakai

| Simbol | Arti | Bentuk di Mermaid |
|---|---|---|
| Entitas eksternal | Pihak di luar sistem yang memberi/menerima data | Persegi panjang `[Pembeli]` |
| Proses | Kegiatan yang mengolah data, bernomor `1.0`, `3.2`, … | Lingkaran `((3.0 …))` |
| Data store | Tempat penyimpanan data (kelompok tabel), berkode `D1`, `D2`, … | Silinder `[(D1 Pengguna)]` |
| Alur data | Perpindahan data, diberi label | Panah berlabel `-- data -->` (`<-->` = baca & tulis) |

Konvensi level: **Diagram Konteks = Level 0**, **DFD Level 1** = proses utama sistem, **DFD Level 2** = pemecahan satu proses Level 1.
