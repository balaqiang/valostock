# 1. Diagram Konteks (DFD Level 0)

Diagram konteks memperlihatkan **sistem valostock.id sebagai satu proses tunggal** beserta semua entitas eksternal dan data yang keluar-masuk. Layanan pendukung milik sistem sendiri (database, autentikasi, dan penyimpanan file di Supabase) berada **di dalam** batas sistem, sehingga tidak digambar sebagai entitas eksternal.

## Entitas Eksternal

| Entitas | Peran |
|---|---|
| **Pembeli** | Membeli akun game (termasuk tawar-menawar), top-up, isi Balance, membuka sengketa, memberi rating, wishlist, mengikuti toko, chat dengan toko. |
| **Toko** | Penjual yang sudah diverifikasi admin. Mengajukan katalog untuk dimoderasi, menyerahkan akun lewat rekber, mengelola promosi, langganan, iklan, penjual eksternal, dan penarikan dana. |
| **Admin** | Memverifikasi toko dan **setiap katalog**, memutus sengketa, menyetujui pencairan dana, mengelola data master (game, produk top-up, promo), konten, dan peran admin. |
| **Midtrans** | Payment gateway (Sandbox). Menerima permintaan transaksi dan mengembalikan status pembayaran. |
| **Penyedia Top-up** | Pemasok item game (disimulasikan di proyek ini). |

## Diagram

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    A[Admin]
    M[Midtrans]
    G[Penyedia Top-up]

    S(("0<br/>Sistem Marketplace<br/>valostock.id"))

    P -- "registrasi, login, profil" --> S
    P -- "pencarian, tawaran, pesanan, konfirmasi akun aman/selesai" --> S
    P -- "pesanan top-up, isi Balance, penukaran poin" --> S
    P -- "sengketa + bukti, rating, laporan, chat" --> S
    S -- "katalog terverifikasi, harga, promo" --> P
    S -- "invoice, status pesanan, pesan rekber, notifikasi" --> P

    T -- "profil toko & deposit" --> S
    T -- "katalog, foto, atribut, pengajuan moderasi" --> S
    T -- "respon tawaran, data akun (rekber), tanggapan sengketa" --> S
    T -- "voucher, flash sale, bundle, iklan, langganan" --> S
    T -- "penarikan dana, penjual eksternal, transfer" --> S
    S -- "status verifikasi toko & katalog (+ alasan)" --> T
    S -- "pesanan masuk, saldo escrow/tersedia, laporan penjualan" --> T

    A -- "keputusan verifikasi toko & katalog" --> S
    A -- "putusan sengketa, persetujuan pencairan" --> S
    A -- "data master, konten, peran admin" --> S
    S -- "antrean moderasi, laporan keuangan, audit log" --> A

    S -- "permintaan transaksi (order_id, jumlah)" --> M
    M -- "URL pembayaran & status pembayaran" --> S

    S -- "permintaan pengiriman item" --> G
    G -- "status pengiriman" --> S
```
