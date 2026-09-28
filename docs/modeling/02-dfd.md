# 2. Data Flow Diagram (DFD)

## Daftar Data Store

Tabel yang berhubungan erat digabung dalam satu data store supaya diagram tetap terbaca. Rincian setiap tabel ada di [03-erd.md](03-erd.md) dan [05-struktur-tabel.md](05-struktur-tabel.md).

| Kode | Data store | Tabel |
|---|---|---|
| D1 | Pengguna | `profiles` (+ `auth.users` milik Supabase Auth) |
| D2 | Hak Akses Admin | `admin_roles`, `permissions`, `role_permissions`, `admin_user_roles` |
| D3 | Toko | `stores`, `store_subscriptions`, `store_sanctions` |
| D4 | Saldo Toko | `store_balances`, `store_ledger` |
| D5 | Game | `games`, `game_field_templates` |
| D6 | Katalog | `catalogs`, `catalog_images`, `account_inspections` |
| D7 | Riwayat Moderasi | `catalog_reviews` |
| D8 | Penawaran & Kunci | `offers`, `catalog_locks` |
| D9 | Pesanan | `orders`, `order_items` |
| D10 | Rekber | `rekber_messages` |
| D11 | Sengketa | `disputes`, `dispute_events` |
| D12 | Penilaian | `ratings` |
| D13 | Pembayaran | `payments`, `webhook_events` |
| D14 | Top-up | `topup_products`, `promo_codes`, `topup_orders` |
| D15 | Balance | `balance_topups`, `balance_ledger` |
| D16 | Promosi | `store_vouchers`, `voucher_redemptions`, `flash_sales`, `bundles`, `bundle_items`, `featured_listings` |
| D17 | Pencairan | `withdrawals`, `transfer_requests`, `external_sellers` |
| D18 | Interaksi | `wishlists`, `store_follows`, `recently_viewed`, `conversations`, `chat_messages` |
| D19 | Notifikasi & Loyalitas | `notifications`, `loyalty_ledger`, `referral_rewards` |
| D20 | Konten & Log | `news_articles`, `help_articles`, `reports`, `audit_logs` |

---

## 2.1 DFD Level 1

| No | Proses | Ringkasan |
|---|---|---|
| 1.0 | Autentikasi & Profil | Registrasi (dengan kode referral), login, reset password (Supabase Auth), ubah profil |
| 2.0 | Pendaftaran & Verifikasi Toko | Profil toko → deposit → verifikasi manual admin |
| 3.0 | Katalog & Moderasi | Toko membuat katalog + foto + atribut per game, mengajukan; admin memverifikasi; publik mencari katalog LISTED |
| 4.0 | Top-up & Balance | Top-up game, promo, isi Balance, bayar dengan Balance, cek invoice |
| 5.0 | Pembayaran | Midtrans Snap / simulasi; status dari Midtrans; penerapan status lunas |
| 6.0 | Pesanan, Tawar & Escrow | Tawar-menawar, voucher/flash sale/bundle, pesanan, escrow, rekber, akun aman, selesai |
| 7.0 | Sengketa & Penilaian | Sengketa 72 jam + putusan admin; rating + skor layanan + balasan toko |
| 8.0 | Keuangan & Promosi Toko | Penarikan, penjual eksternal + transfer, langganan, iklan, voucher, flash sale, bundle |
| 9.0 | Interaksi & Loyalitas | Wishlist, ikuti toko, baru dilihat, chat toko, notifikasi, poin, hadiah referral |
| 10.0 | Administrasi & Konten | Keputusan admin (toko, katalog, sengketa, pencairan, laporan), data master, CMS, RBAC, audit |

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    A[Admin]
    M[Midtrans]
    G[Penyedia Top-up]

    P1((1.0 Autentikasi<br/>& Profil))
    P2((2.0 Pendaftaran &<br/>Verifikasi Toko))
    P3((3.0 Katalog &<br/>Moderasi))
    P4((4.0 Top-up<br/>& Balance))
    P5((5.0<br/>Pembayaran))
    P6((6.0 Pesanan, Tawar<br/>& Escrow))
    P7((7.0 Sengketa<br/>& Penilaian))
    P8((8.0 Keuangan &<br/>Promosi Toko))
    P9((9.0 Interaksi<br/>& Loyalitas))
    P10((10.0 Administrasi<br/>& Konten))

    D1[(D1 Pengguna)]
    D3[(D3 Toko)]
    D4[(D4 Saldo Toko)]
    D5[(D5 Game)]
    D6[(D6 Katalog)]
    D7[(D7 Riwayat Moderasi)]
    D9[(D9 Pesanan)]
    D11[(D11 Sengketa)]
    D13[(D13 Pembayaran)]
    D14[(D14 Top-up)]
    D15[(D15 Balance)]
    D16[(D16 Promosi)]
    D17[(D17 Pencairan)]
    D19[(D19 Notifikasi & Loyalitas)]
    D20[(D20 Konten & Log)]

    P -- "registrasi / login" --> P1
    T -- "registrasi / login" --> P1
    P1 <--> D1

    T -- "profil toko, deposit" --> P2
    P2 --> D3
    P2 -- "tagihan deposit" --> P5

    T -- "katalog, foto, atribut, pengajuan" --> P3
    D5 -- "template kolom per game" --> P3
    P3 --> D6
    P3 --> D7
    P3 -- "katalog LISTED" --> P
    P3 -- "status moderasi" --> T

    P -- "pesanan top-up / isi Balance" --> P4
    P4 <--> D14
    P4 <--> D15
    P4 -- "tagihan" --> P5
    P4 -- "kirim item" --> G

    P5 <--> M
    P5 <--> D13
    P5 -- "lunas" --> P2
    P5 -- "lunas" --> P4
    P5 -- "lunas" --> P6
    P5 -- "lunas" --> P8

    P -- "tawar, beli, konfirmasi" --> P6
    T -- "respon tawar, kirim akun" --> P6
    D16 -- "voucher, flash sale, bundle" --> P6
    P6 <--> D9
    P6 -- "status katalog" --> D6
    P6 -- "escrow / rilis + komisi" --> D4
    P6 -- "tagihan" --> P5

    P -- "sengketa, rating" --> P7
    T -- "tanggapan, balasan rating" --> P7
    P7 <--> D11
    P7 -- "refund / kompensasi" --> D4

    T -- "tarik dana, transfer, langganan, iklan, promosi" --> P8
    P8 <--> D17
    P8 <--> D16
    P8 -- "debit saldo" --> D4
    P8 -- "tagihan" --> P5

    P -- "wishlist, ikuti, chat" --> P9
    P9 <--> D19
    P9 -- "notifikasi" --> P
    P9 -- "notifikasi" --> T

    A -- "keputusan & data master" --> P10
    P10 -- "verifikasi toko" --> D3
    P10 -- "setujui / tolak katalog" --> D7
    P10 -- "putusan sengketa" --> D11
    P10 -- "setujui pencairan" --> D17
    P10 <--> D20
    P10 -- "antrean & laporan" --> A
```

---

## 2.2 DFD Level 2 — Proses 3.0 Katalog & Moderasi

```mermaid
flowchart LR
    T[Toko]
    A[Admin]
    P[Pembeli]

    P31((3.1 Kelola draft<br/>& foto katalog))
    P32((3.2 Ajukan<br/>katalog))
    P33((3.3 Tinjau &<br/>putuskan))
    P34((3.4 Cari & tampilkan<br/>katalog))
    P35((3.5 Inspeksi<br/>akun))

    D3[(D3 Toko)]
    D5[(D5 Game)]
    D6[(D6 Katalog)]
    D7[(D7 Riwayat Moderasi)]
    D19[(D19 Notifikasi)]

    D5 -- "template kolom game" --> P31
    T -- "judul, harga, atribut, foto" --> P31
    P31 -- "katalog DRAFT + foto" --> D6
    T -- "ajukan" --> P32
    D3 -- "status ACTIVE & kuota langganan" --> P32
    P32 -- "VS code, status PENDING_REVIEW" --> D6
    P32 -- "SUBMITTED" --> D7
    D6 -- "antrean PENDING_REVIEW" --> P33
    A -- "setujui / tolak + alasan" --> P33
    P33 -- "LISTED / REJECTED" --> D6
    P33 -- "APPROVED / REJECTED + alasan" --> D7
    P33 -- "hasil moderasi" --> D19
    D19 -- "notifikasi" --> T
    T -- "checklist + media inspeksi" --> P35
    P35 -- "Account Checked" --> D6
    D6 -- "katalog LISTED" --> P34
    D5 -- "filter per game" --> P34
    P -- "kata kunci & filter" --> P34
    P34 -- "hasil pencarian & detail" --> P
```

**Aturan:**
- Hanya toko `ACTIVE` yang bisa mengajukan, dan jumlah katalog aktif dibatasi sesuai langganan (Free 15, Pro 60, Business tanpa batas).
- VS code diterbitkan saat katalog pertama kali diajukan (unik, anti double-sell).
- Penolakan wajib disertai alasan. Toko memperbaiki lalu mengajukan ulang (kembali ke 3.2).
- Katalog `LISTED` yang diubah pada judul, harga, foto, atau atribut kembali ke `PENDING_REVIEW`.
- Publik (3.4) hanya melihat katalog `LISTED` (dan yang sedang dikunci transaksi) dari toko `ACTIVE`.

---

## 2.3 DFD Level 2 — Proses 6.0 Pesanan, Tawar & Escrow

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    P5((5.0<br/>Pembayaran))

    P61((6.1 Tawar<br/>harga))
    P62((6.2 Hitung harga &<br/>buat pesanan))
    P63((6.3 Tahan<br/>escrow))
    P64((6.4 Rekber:<br/>serah terima))
    P65((6.5 Akun aman<br/>& selesai))
    P66((6.6 Batal /<br/>kedaluwarsa))

    D4[(D4 Saldo Toko)]
    D6[(D6 Katalog)]
    D8[(D8 Penawaran)]
    D9[(D9 Pesanan)]
    D10[(D10 Rekber)]
    D16[(D16 Promosi)]
    D19[(D19 Notifikasi & Loyalitas)]

    P -- "nominal tawaran / lock Rp5.000" --> P61
    T -- "terima / tawar balik / tolak" --> P61
    P61 <--> D8
    P -- "beli (katalog / tawaran diterima / bundle) + voucher" --> P62
    D16 -- "flash sale, bundle, voucher" --> P62
    D8 -- "harga tawaran" --> P62
    P62 -- "pesanan PENDING_PAYMENT" --> D9
    P62 -- "katalog LOCKED" --> D6
    P62 -- "tagihan" --> P5
    P5 -- "lunas" --> P63
    P63 -- "PAID" --> D9
    P63 -- "ESCROW_HOLD" --> D4
    P63 -- "IN_ORDER" --> D6
    T -- "data akun" --> P64
    P64 <--> D10
    P64 -- "IN_REKBER" --> D9
    P -- "Akun aman, Selesai" --> P65
    P65 -- "SAFE → COMPLETED" --> D9
    P65 -- "ESCROW_RELEASE, COMMISSION" --> D4
    P65 -- "SOLD" --> D6
    P65 -- "poin loyalti, notifikasi" --> D19
    P5 -- "kedaluwarsa / gagal" --> P66
    P -- "batal (belum bayar)" --> P66
    P66 -- "CANCELLED" --> D9
    P66 -- "LISTED" --> D6
```

**Aturan:** harga final = harga katalog, atau harga flash sale yang sedang berlaku, atau harga tawaran yang diterima, atau harga bundle; lalu dikurangi voucher toko. Komisi dihitung dari harga final sesuai tier langganan toko (5% / 4,5% / 4%). Pesanan yang tidak dibayar dalam 60 menit dibatalkan otomatis. **Lock opsional:** pembeli membayar Rp5.000 untuk mengunci akun selama 30 menit (tidak bisa dibeli orang lain) sebelum memutuskan membeli. **Selesai otomatis:** jika pembeli tidak menekan Selesai, pesanan otomatis selesai 5 jam setelah konfirmasi Akun aman (escrow dilepas saat itu). Penawaran kedaluwarsa setelah 24 jam, dan penawaran yang diterima berlaku 24 jam untuk dibayar.

---

## 2.4 DFD Level 2 — Proses 7.0 Sengketa & Penilaian

```mermaid
flowchart LR
    P[Pembeli]
    T[Toko]
    A[Admin]

    P71((7.1 Buka<br/>sengketa))
    P72((7.2 Tanggapan<br/>& bukti))
    P73((7.3 Putusan<br/>admin))
    P74((7.4 Rating &<br/>balasan))
    P75((7.5 Hitung skor<br/>toko))

    D3[(D3 Toko)]
    D4[(D4 Saldo Toko)]
    D9[(D9 Pesanan)]
    D11[(D11 Sengketa)]
    D12[(D12 Penilaian)]

    P -- "alasan + bukti" --> P71
    D9 -- "pesanan dalam masa proteksi" --> P71
    P71 -- "OPEN, tenggat toko 72 jam" --> D11
    P71 -- "DISPUTED" --> D9
    T -- "pernyataan + bukti" --> P72
    P -- "bukti tambahan" --> P72
    P72 --> D11
    A -- "putusan + catatan" --> P73
    D11 -- "timeline & bukti" --> P73
    P73 -- "RESOLVED_BUYER / RESOLVED_STORE" --> D11
    P73 -- "REFUND escrow / kompensasi / rilis" --> D4
    P73 -- "REFUNDED / COMPLETED" --> D9
    P -- "rating + 3 skor layanan" --> P74
    D9 -- "pesanan COMPLETED" --> P74
    T -- "balasan (satu kali)" --> P74
    P74 --> D12
    D12 --> P75
    P75 -- "rating & service score" --> D3
```

---

## 2.5 DFD Level 2 — Proses 4.0 Top-up & Balance

```mermaid
flowchart LR
    P[Pembeli]
    G[Penyedia Top-up]
    P5((5.0<br/>Pembayaran))

    P41((4.1 Validasi<br/>pesanan & promo))
    P42((4.2 Buat<br/>invoice))
    P43((4.3 Bayar dengan<br/>Balance))
    P44((4.4 Isi<br/>Balance))
    P45((4.5 Kirim<br/>item))
    P46((4.6 Cek<br/>invoice))

    D1[(D1 Pengguna)]
    D14[(D14 Top-up)]
    D15[(D15 Balance)]
    D19[(D19 Loyalitas)]

    P -- "game, ID akun, nominal, promo, kontak" --> P41
    D14 -- "produk & promo" --> P41
    P41 --> P42
    P42 -- "invoice PENDING" --> D14
    P42 -- "Midtrans" --> P5
    P42 -- "Balance" --> P43
    P43 -- "SPEND_TOPUP" --> D15
    P43 -- "saldo" --> D1
    P43 --> P45
    P5 -- "lunas" --> P45
    P45 <--> G
    P45 -- "SUCCESS" --> D14
    P45 -- "poin" --> D19
    P -- "voucher Balance" --> P44
    P44 -- "tagihan" --> P5
    P5 -- "lunas" --> P44
    P44 -- "TOPUP_CREDIT" --> D15
    P -- "no. invoice" --> P46
    D14 --> P46
    P46 -- "status (ID game disamarkan)" --> P
```

Balance bersifat **closed-loop**: hanya untuk top-up, tidak bisa ditarik tunai, tidak bisa membeli akun, dan tidak bisa ditransfer ke pengguna lain.
