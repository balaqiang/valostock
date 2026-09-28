// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Mirrors docs/ERD.md HELP_ARTICLES (categories from its enum).

export type HelpCategory =
  | "GETTING_STARTED"
  | "BECOMING_STORE"
  | "FEES_WITHDRAWAL"
  | "BEFORE_SALE"
  | "AFTER_SALE"
  | "DISPUTES"
  | "TOPUP"
  | "BALANCE"
  | "PENALTIES"
  | "SECURITY";

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type MockHelpArticle = {
  slug: string;
  title: string;
  category: HelpCategory;
  excerpt: string;
  popular?: boolean;
  body: HelpBlock[];
};

export const helpArticles: MockHelpArticle[] = [
  {
    slug: "cara-membeli-akun",
    title: "Cara membeli akun game di valostock.id",
    category: "GETTING_STARTED",
    excerpt: "Dari mencari akun sampai serah terima di Rekber Room.",
    popular: true,
    body: [
      {
        type: "list",
        items: [
          "Cari akun lewat pencarian atau halaman game, lalu buka detailnya.",
          "Beli langsung, atau nego dulu lewat tombol Tawar.",
          "Bayar: harga akun + biaya penanganan (maks. 3,5%, min. Rp4.000) + proteksi Rp5.000. Dana ditahan di escrow.",
          "Rekber Room terbuka — toko menyerahkan akun, kamu ganti email/password/2FA dan periksa isinya.",
          "Tekan Selesai. Dana baru diteruskan ke toko setelah konfirmasimu, lalu beri rating.",
        ],
      },
      {
        type: "paragraph",
        text: "Pembeli tidak perlu KYC. Semua transaksi wajib di dalam platform — transaksi di luar menghilangkan escrow dan seluruh perlindunganmu.",
      },
    ],
  },
  {
    slug: "apa-itu-rekber-room",
    title: "Apa itu Rekber Room dan kenapa serah terima harus di sana?",
    category: "GETTING_STARTED",
    excerpt: "Ruang transaksi resmi yang diawasi admin dan tercatat.",
    body: [
      {
        type: "paragraph",
        text: "Rekber Room adalah ruang serah terima resmi yang terbuka otomatis setelah pembayaranmu terkonfirmasi. Kodenya sama dengan ID katalog (mis. VS001), diawasi admin, dan seluruh percakapan tersimpan sebagai bukti sengketa.",
      },
      {
        type: "paragraph",
        text: "Chat biasa hanya untuk tanya jawab — dilarang bertransaksi, bertukar email, atau nomor telepon di sana.",
      },
    ],
  },
  {
    slug: "cara-membuka-toko",
    title: "Cara membuka toko (KYC + deposit)",
    category: "BECOMING_STORE",
    excerpt: "Verifikasi identitas gratis, deposit Rp500.000, langsung berjualan.",
    popular: true,
    body: [
      {
        type: "list",
        items: [
          "Daftar dengan email aktif, lalu selesaikan verifikasi identitas (Sumsub) — gratis.",
          "Bayar deposit keamanan Rp500.000 (aktivasi ±15 menit) — membuka hak listing.",
          "Isi profil toko dan pilih tipe: Owner Store (akun milik sendiri) atau Reseller Store (akun titipan penjual eksternal).",
          "Setujui Perjanjian Transaksi + Kebijakan Privasi → mulai listing.",
        ],
      },
      {
        type: "paragraph",
        text: "Deposit adalah jaminan keamanan, bukan biaya layanan — bisa dikembalikan saat toko tutup dengan syarat akun bersih (lihat aturan toko).",
      },
    ],
  },
  {
    slug: "tipe-toko-owner-reseller",
    title: "Perbedaan Owner Store dan Reseller Store",
    category: "BECOMING_STORE",
    excerpt: "Siapa yang bertanggung jawab atas akun yang dijual.",
    body: [
      {
        type: "paragraph",
        text: "Owner Store menjual akun miliknya sendiri. Reseller Store menjual akun titipan penjual eksternal — dan memikul tanggung jawab penuh atas identitas penjual, keaslian akun, dan kerugian pembeli. Platform hanya mengenal dan menindak toko: pembeli melapor dan menilai toko, bukan penjual eksternalnya.",
      },
    ],
  },
  {
    slug: "biaya-di-valostock",
    title: "Rincian biaya: komisi, penanganan, dan proteksi",
    category: "FEES_WITHDRAWAL",
    excerpt: "Tiga biaya sederhana — tanpa biaya posting atau biaya tersembunyi.",
    popular: true,
    body: [
      {
        type: "list",
        items: [
          "Komisi platform 5% dari harga final — dipotong dari toko saat pesanan selesai (Premium: 4,5% / 4%).",
          "Biaya penanganan maks. 3,5% (min. Rp4.000) — dibayar pembeli saat checkout.",
          "Proteksi Rp5.000 per pesanan — dibayar pembeli, jendela dukungan 14/30 hari.",
          "Biaya penarikan toko Rp4.000 (+Rp2.500 pajak antarbank).",
        ],
      },
      {
        type: "paragraph",
        text: "Komisi selalu dihitung dari harga final setelah nego, jadi tawar-menawar tidak mengubah aturannya.",
      },
    ],
  },
  {
    slug: "penarikan-dana-toko",
    title: "Penarikan dana toko & Account Validation",
    category: "FEES_WITHDRAWAL",
    excerpt: "Nama rekening tujuan harus sama dengan nama KYC.",
    body: [
      {
        type: "paragraph",
        text: "Dana toko tercatat di saldo toko (escrow → tersedia) dan tidak dipakai untuk operasional platform. Penarikan dikirim lewat Midtrans Iris setelah disetujui admin, dan hanya bisa ke rekening atas nama yang sama dengan identitas KYC (Account Validation). Nama tidak cocok → ditolak; mirip sebagian → ditinjau manual.",
      },
      {
        type: "paragraph",
        text: "Pencairan tersedia 5 jam setelah akun dinyatakan aman. Biaya penarikan Rp4.000 (+Rp2.500 pajak antarbank).",
      },
    ],
  },
  {
    slug: "aturan-listing-akun",
    title: "Aturan listing: kategori, deskripsi, dan ID katalog VS",
    category: "BEFORE_SALE",
    excerpt: "Satu akun = satu katalog — tidak bisa dijual dua kali.",
    body: [
      {
        type: "paragraph",
        text: "Setiap listing mendapat ID katalog dari platform (awalan VS, mis. VS001). Satu akun hanya bisa punya satu katalog, sehingga double-sell tidak mungkin terjadi. Tulis deskripsi yang akurat: rank, skin/VP, region, akses email, dan metode serah terima.",
      },
      {
        type: "paragraph",
        text: "Toko juga bisa menjalankan Account Inspection (login-only, 2FA tetap di penjual) untuk mendapatkan badge Account Checked. Klaim mutlak seperti \"100% aman\" dilarang di seluruh platform.",
      },
    ],
  },
  {
    slug: "pesanan-selesai-dan-rating",
    title: "Kapan pesanan dianggap selesai dan dana cair ke toko?",
    category: "AFTER_SALE",
    excerpt: "Konfirmasi pembeli, jendela otomatis, dan rilis dana 5 jam.",
    body: [
      {
        type: "paragraph",
        text: "Pesanan selesai saat pembeli menekan Selesai setelah memeriksa akun, atau otomatis setelah jendela inspeksi berakhir jika pembeli tidak merespons. Dana (dikurangi komisi 5%) masuk ke saldo toko, dan pencairan tersedia 5 jam setelah akun dinyatakan aman.",
      },
      {
        type: "paragraph",
        text: "Setelah selesai, pembeli memberi rating keseluruhan plus Service Score tiga dimensi: akurasi deskripsi, sikap layanan, dan kecepatan pengiriman.",
      },
    ],
  },
  {
    slug: "cara-mengajukan-sengketa",
    title: "Cara mengajukan sengketa (72 jam)",
    category: "DISPUTES",
    excerpt: "Batas waktu, bukti yang dibutuhkan, dan arbitrase final.",
    popular: true,
    body: [
      {
        type: "list",
        items: [
          "Ajukan dalam 72 jam sejak masalah terjadi, lewat halaman pesanan (bukan chat).",
          "Sertakan pernyataan lengkap + bukti: riwayat Rekber Room, tangkapan layar, bukti pengiriman.",
          "Kedua pihak memberi tanggapan sesuai timeline yang bisa dipantau.",
          "Jika tidak tercapai kesepakatan, platform mengarbitrase — keputusan final.",
        ],
      },
      {
        type: "paragraph",
        text: "Toko yang terbukti bersalah menanggung refund pembeli, bisa ditambah potongan deposit. Klaim palsu dari pembeli menurunkan Buyer Trust Score.",
      },
    ],
  },
  {
    slug: "kebijakan-refund-top-up",
    title: "Kebijakan refund top-up",
    category: "TOPUP",
    excerpt: "Refund hanya jika item game tidak masuk — dikembalikan ke Balance.",
    popular: true,
    body: [
      {
        type: "list",
        items: [
          "Top-up yang berhasil (VP/diamond sudah masuk) tidak bisa direfund.",
          "Jika item game tidak masuk ke akunmu, dana dikembalikan ke Balance (BLC) — bukan uang tunai.",
          "Cek status pesananmu kapan saja di halaman Cek Invoice dengan nomor invoice.",
          "Jika ada kendala, tim kami menghubungimu lewat email/WhatsApp yang kamu isi saat memesan.",
        ],
      },
      {
        type: "paragraph",
        text: "Pastikan UID/ID player yang kamu masukkan benar — kesalahan pengisian UID di luar tanggung jawab platform.",
      },
    ],
  },
  {
    slug: "kenapa-balance-tidak-bisa-beli-akun",
    title: "Kenapa Balance tidak bisa dipakai membeli akun?",
    category: "BALANCE",
    excerpt: "Balance bersifat closed-loop: khusus top-up, demi tetap legal.",
    popular: true,
    body: [
      {
        type: "paragraph",
        text: "Balance (BLC) adalah alat pembayaran internal khusus top-up, bukan uang elektronik. Agar tetap seperti itu secara hukum (tanpa lisensi e-money dari Bank Indonesia), Balance harus closed-loop:",
      },
      {
        type: "list",
        items: [
          "Hanya bisa dipakai untuk top-up game di valostock.id.",
          "Tidak bisa dipakai membeli akun game.",
          "Tidak bisa dicairkan ke bank atau e-wallet.",
          "Tidak bisa ditransfer ke pengguna lain.",
        ],
      },
      {
        type: "paragraph",
        text: "Jika batasan ini dilonggarkan, Balance berubah status menjadi uang elektronik yang butuh lisensi — karena itu aturan ini berlaku mutlak. Pembelian akun tetap menggunakan pembayaran reguler lewat escrow.",
      },
    ],
  },
  {
    slug: "sanksi-dan-penalti-toko",
    title: "Sanksi bertingkat untuk pelanggaran toko",
    category: "PENALTIES",
    excerpt: "Dari peringatan sampai blacklist perangkat/KYC/bank.",
    body: [
      {
        type: "paragraph",
        text: "Sanksi menyesuaikan tingkat pelanggaran: peringatan → pembatasan listing → denda dari deposit → suspensi 30 hari → ban permanen → blacklist (perangkat/KYC/bank) → proses hukum. Transaksi di luar platform, pengiriman palsu, dan listing bohong dikenai denda deposit + ban tanpa toleransi.",
      },
    ],
  },
  {
    slug: "tips-keamanan-akun",
    title: "Tips keamanan setelah menerima akun",
    category: "SECURITY",
    excerpt: "Langkah pertama yang wajib dilakukan di Rekber Room.",
    body: [
      {
        type: "list",
        items: [
          "Ganti email akun ke email milikmu sendiri terlebih dahulu.",
          "Ganti password dan aktifkan 2FA milikmu.",
          "Periksa perangkat/sesi yang masih login dan keluarkan semuanya.",
          "Lakukan semua ini sebelum menekan Selesai di Rekber Room.",
        ],
      },
      {
        type: "paragraph",
        text: "Simpan bukti serah terima. Jika ada percobaan pengambilan kembali akun dalam masa proteksi (14/30 hari), laporkan segera dari halaman pesananmu.",
      },
    ],
  },
];
