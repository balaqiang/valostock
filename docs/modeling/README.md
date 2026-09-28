# Pemodelan Sistem — valostock.id (Prototype)

Pendekatan yang dipakai: **Alur Data** (bukan UML). Sesuai ketentuan tugas, pendekatan UML **tidak** dibuat.

| No | Dokumen | Isi |
|---|---|---|
| 1 | [01-diagram-konteks.md](01-diagram-konteks.md) | Diagram Konteks (DFD Level 0): sistem sebagai satu proses + entitas eksternal |
| 2 | [02-dfd.md](02-dfd.md) | DFD Level 1 (8 proses utama) dan DFD Level 2 (Top-up & Balance, Pesanan & Escrow) |
| 3 | [03-erd.md](03-erd.md) | Entity Relationship Diagram (19 tabel) |
| 4 | [04-basis-data-konseptual.md](04-basis-data-konseptual.md) | Entitas, atribut kunci, relasi, dan kardinalitas |
| 5 | [05-struktur-tabel.md](05-struktur-tabel.md) | Struktur tabel fisik MySQL (kolom, tipe, kunci, keterangan) |

**Cakupan:** prototype untuk tugas kuliah. Database MySQL/MariaDB di **XAMPP**, dikelola lewat **phpMyAdmin**. Skema fisik ada di `back/database/schema.sql` dan harus selalu sama dengan [05-struktur-tabel.md](05-struktur-tabel.md).

Semua diagram ditulis dalam **Mermaid**. Untuk melihat atau mengekspor gambarnya (PNG/SVG) ke laporan, tempel kodenya di <https://mermaid.live>, atau buka file ini di VS Code/GitHub yang mendukung Mermaid.

## Notasi DFD yang dipakai

| Simbol | Arti | Bentuk di Mermaid |
|---|---|---|
| Entitas eksternal | Pihak di luar sistem yang memberi/menerima data | Persegi panjang `[Pembeli]` |
| Proses | Kegiatan yang mengolah data, bernomor `1.0`, `4.2`, … | Lingkaran/rounded `((4.0 …))` |
| Data store | Tempat penyimpanan data (tabel), berkode `D1`, `D2`, … | Silinder `[(D1 users)]` |
| Alur data | Perpindahan data, diberi label | Panah berlabel `-- data -->` |

Konvensi level: **Diagram Konteks = Level 0**, **DFD Level 1** = pemecahan sistem menjadi proses utama, **DFD Level 2** = pemecahan satu proses Level 1.
