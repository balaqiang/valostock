# 2. Data Flow Diagram (DFD)

## Daftar Data Store

Setiap data store sama dengan satu tabel di basis data (lihat [05-struktur-tabel.md](05-struktur-tabel.md)).

| Kode | Data store (tabel) | Kode | Data store (tabel) |
|---|---|---|---|
| D1 | users | D11 | orders |
| D2 | stores | D12 | payments |
| D3 | store_vouchers | D13 | webhook_events |
| D4 | games | D14 | store_balances |
| D5 | catalogs | D15 | store_ledger |
| D6 | topup_products | D16 | withdrawals |
| D7 | promo_codes | D17 | rekber_messages |
| D8 | topup_orders | D18 | help_articles |
| D9 | balance_topups | D19 | audit_logs |
| D10 | balance_ledger | | |

---

## 2.1 DFD Level 1

Pemecahan sistem menjadi 8 proses utama.

| No | Proses | Ringkasan |
|---|---|---|
| 1.0 | Autentikasi Pengguna | Registrasi, login, logout (email + password, sesi JWT di cookie httpOnly) |
| 2.0 | Pendaftaran & Verifikasi Toko | Isi profil toko, bayar deposit Rp500.000, diverifikasi manual oleh Admin |
| 3.0 | Pengelolaan Katalog | Toko menambah/mengubah katalog akun; publik melihat game, toko, katalog, bantuan |
| 4.0 | Transaksi Top-up & Balance | Pesan top-up, cek promo, isi Balance (closed-loop), bayar top-up dengan Balance, cek invoice |
| 5.0 | Pembayaran | Membuat transaksi Midtrans Snap, menerima/mengecek status, menerapkan status lunas |
| 6.0 | Pesanan Akun & Escrow | Buat pesanan, tahan dana (escrow), rekber, konfirmasi aman, selesai → dana dilepas ke toko |
| 7.0 | Penarikan Dana | Toko mengajukan penarikan dari saldo tersedia |
| 8.0 | Administrasi & Laporan | Admin memverifikasi toko, menyetujui/menolak penarikan, melihat laporan |

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    A[Admin]
    M[Midtrans]
    G[Penyedia Top-up]

    P1((1.0<br/>Autentikasi<br/>Pengguna))
    P2((2.0<br/>Pendaftaran &<br/>Verifikasi Toko))
    P3((3.0<br/>Pengelolaan<br/>Katalog))
    P4((4.0<br/>Transaksi Top-up<br/>& Balance))
    P5((5.0<br/>Pembayaran))
    P6((6.0<br/>Pesanan Akun<br/>& Escrow))
    P7((7.0<br/>Penarikan<br/>Dana))
    P8((8.0<br/>Administrasi<br/>& Laporan))

    D1[(D1 users)]
    D2[(D2 stores)]
    D4[(D4 games)]
    D5[(D5 catalogs)]
    D6[(D6 topup_products)]
    D7[(D7 promo_codes)]
    D8[(D8 topup_orders)]
    D9[(D9 balance_topups)]
    D10[(D10 balance_ledger)]
    D11[(D11 orders)]
    D12[(D12 payments)]
    D13[(D13 webhook_events)]
    D14[(D14 store_balances)]
    D15[(D15 store_ledger)]
    D16[(D16 withdrawals)]
    D17[(D17 rekber_messages)]
    D19[(D19 audit_logs)]

    %% 1.0
    P -- "data registrasi/login" --> P1
    T -- "data registrasi/login" --> P1
    P1 -- "data user" --> D1
    D1 -- "data user" --> P1
    P1 -- "sesi login" --> P

    %% 2.0
    T -- "profil toko" --> P2
    P2 -- "data toko" --> D2
    P2 -- "permintaan bayar deposit" --> P5
    P5 -- "deposit lunas" --> P2
    P2 -- "status toko" --> T

    %% 3.0
    T -- "data katalog" --> P3
    D2 -- "status toko" --> P3
    P3 -- "katalog" --> D5
    D4 -- "data game" --> P3
    D6 -- "produk top-up" --> P3
    P3 -- "daftar katalog & produk" --> P

    %% 4.0
    P -- "pesanan top-up / isi Balance" --> P4
    D6 -- "harga produk" --> P4
    D7 -- "aturan promo" --> P4
    P4 -- "invoice top-up" --> D8
    P4 -- "invoice isi Balance" --> D9
    P4 -- "mutasi Balance" --> D10
    P4 -- "saldo Balance" --> D1
    P4 -- "permintaan bayar" --> P5
    P5 -- "top-up / Balance lunas" --> P4
    P4 -- "kirim item" --> G
    G -- "status kirim" --> P4
    P4 -- "invoice & status" --> P

    %% 5.0
    P5 -- "permintaan transaksi" --> M
    M -- "token, URL, status bayar" --> P5
    P5 -- "data pembayaran" --> D12
    P5 -- "notifikasi masuk" --> D13
    P5 -- "URL pembayaran" --> P

    %% 6.0
    P -- "pembelian akun, pesan rekber, konfirmasi" --> P6
    T -- "serah terima akun (pesan rekber)" --> P6
    D5 -- "katalog" --> P6
    P6 -- "status katalog" --> D5
    P6 -- "pesanan" --> D11
    P6 -- "pesan rekber" --> D17
    P6 -- "permintaan bayar" --> P5
    P5 -- "pesanan lunas" --> P6
    P6 -- "escrow & pelepasan dana" --> D14
    P6 -- "mutasi saldo toko" --> D15
    P6 -- "status pesanan" --> P
    P6 -- "pesanan masuk" --> T

    %% 7.0
    T -- "pengajuan penarikan" --> P7
    D2 -- "nama pemilik (validasi)" --> P7
    D14 -- "saldo tersedia" --> P7
    P7 -- "pengajuan" --> D16
    P7 -- "debit saldo" --> D14
    P7 -- "mutasi saldo toko" --> D15
    P7 -- "status penarikan" --> T

    %% 8.0
    A -- "keputusan verifikasi & penarikan" --> P8
    D2 -- "toko menunggu verifikasi" --> P8
    D16 -- "penarikan menunggu" --> P8
    D8 -- "data top-up (laporan)" --> P8
    P8 -- "status toko" --> D2
    P8 -- "saldo toko baru" --> D14
    P8 -- "status penarikan" --> D16
    P8 -- "pengembalian saldo (jika ditolak)" --> D15
    P8 -- "catatan aksi admin" --> D19
    P8 -- "laporan & antrean" --> A
```

---

## 2.2 DFD Level 2 — Proses 4.0 Transaksi Top-up & Balance

```mermaid
flowchart LR
    P[Pembeli]
    G[Penyedia Top-up]
    P5((5.0<br/>Pembayaran))

    P41((4.1<br/>Validasi pesanan<br/>& promo))
    P42((4.2<br/>Hitung total &<br/>buat invoice))
    P43((4.3<br/>Bayar dengan<br/>Balance))
    P44((4.4<br/>Isi Balance))
    P45((4.5<br/>Kirim item<br/>top-up))
    P46((4.6<br/>Cek invoice))

    D1[(D1 users)]
    D6[(D6 topup_products)]
    D7[(D7 promo_codes)]
    D8[(D8 topup_orders)]
    D9[(D9 balance_topups)]
    D10[(D10 balance_ledger)]

    P -- "game, ID akun, nominal, kode promo, kontak" --> P41
    D6 -- "produk & harga" --> P41
    D7 -- "aturan promo" --> P41
    P41 -- "pesanan valid + diskon" --> P42
    P42 -- "invoice PENDING" --> D8
    P42 -- "metode = Midtrans" --> P5
    P42 -- "metode = Balance" --> P43
    D1 -- "saldo Balance" --> P43
    P43 -- "saldo dikurangi" --> D1
    P43 -- "mutasi SPEND_TOPUP" --> D10
    P43 -- "invoice lunas" --> P45
    P5 -- "top-up lunas" --> P45
    P45 -- "permintaan kirim" --> G
    G -- "berhasil" --> P45
    P45 -- "status SUCCESS" --> D8

    P -- "nominal voucher × jumlah, metode" --> P44
    P44 -- "invoice isi Balance" --> D9
    P44 -- "permintaan bayar" --> P5
    P5 -- "isi Balance lunas" --> P44
    P44 -- "saldo ditambah" --> D1
    P44 -- "mutasi TOPUP_CREDIT" --> D10

    P -- "nomor invoice" --> P46
    D8 -- "data invoice" --> P46
    P46 -- "status (ID game disamarkan)" --> P
```

**Aturan penting:**
- Balance bersifat **closed-loop**: hanya bisa dipakai untuk top-up. Tidak bisa ditarik tunai, tidak bisa membeli akun, dan tidak bisa ditransfer ke pengguna lain.
- Balance hanya bertambah (4.4) setelah proses 5.0 menyatakan pembayaran **lunas**, tidak pernah langsung dari halaman browser.
- Setiap perubahan saldo Balance selalu menulis satu baris di D10 `balance_ledger` dalam transaksi database yang sama.

---

## 2.3 DFD Level 2 — Proses 6.0 Pesanan Akun & Escrow

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    P5((5.0<br/>Pembayaran))

    P61((6.1<br/>Buat pesanan &<br/>kunci katalog))
    P62((6.2<br/>Tahan dana<br/>escrow))
    P63((6.3<br/>Rekber:<br/>serah terima))
    P64((6.4<br/>Konfirmasi<br/>akun aman))
    P65((6.5<br/>Selesaikan &<br/>lepas escrow))
    P66((6.6<br/>Batalkan<br/>pesanan))

    D5[(D5 catalogs)]
    D11[(D11 orders)]
    D14[(D14 store_balances)]
    D15[(D15 store_ledger)]
    D17[(D17 rekber_messages)]

    P -- "katalog dipilih" --> P61
    D5 -- "harga & status LISTED" --> P61
    P61 -- "status LOCKED" --> D5
    P61 -- "pesanan PENDING_PAYMENT<br/>(harga + biaya penanganan + proteksi)" --> D11
    P61 -- "permintaan bayar" --> P5
    P5 -- "pesanan lunas" --> P62
    P62 -- "status PAID" --> D11
    P62 -- "status IN_ORDER" --> D5
    P62 -- "escrow + harga akun" --> D14
    P62 -- "mutasi ESCROW_HOLD" --> D15
    P62 -- "pesan sistem: rekber dibuka" --> D17

    T -- "data akses akun" --> P63
    P -- "pertanyaan / bukti" --> P63
    P63 -- "pesan" --> D17
    P63 -- "status IN_REKBER" --> D11
    D17 -- "riwayat pesan" --> P63
    P63 -- "riwayat pesan" --> P
    P63 -- "riwayat pesan" --> T

    P -- "akun sudah diamankan" --> P64
    P64 -- "status SAFE" --> D11

    P -- "klik Selesai" --> P65
    P65 -- "status COMPLETED" --> D11
    P65 -- "status SOLD" --> D5
    P65 -- "escrow − harga, tersedia + (harga − komisi)" --> D14
    P65 -- "mutasi ESCROW_RELEASE & COMMISSION" --> D15

    P -- "batal (sebelum bayar)" --> P66
    P5 -- "pembayaran kedaluwarsa/gagal" --> P66
    P66 -- "status CANCELLED" --> D11
    P66 -- "status LISTED" --> D5
```

**Aturan penting:**
- Katalog dikunci (`LOCKED`) saat pesanan dibuat, sehingga satu akun tidak bisa dibeli dua kali.
- Komisi platform 5% dihitung dari harga akun saat pesanan **selesai**.
- **Penyederhanaan prototype:** di rancangan penuh, dana dilepas 5 jam setelah akun aman. Di prototype, dana dilepas saat pembeli menekan **Selesai** (6.5).
- Sengketa/dispute tidak termasuk cakupan prototype.
