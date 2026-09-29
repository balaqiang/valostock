// Placeholder news data for frontend development only.
// Real articles come from the NestJS API once the backend lands.

export type NewsCategory =
  | "Pengumuman"
  | "Pembaruan Platform"
  | "Panduan"
  | "Event & Promo"
  | "Esports"
  | "Komunitas";

export type NewsBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "list"; items: string[] };

export type MockNewsArticle = {
  slug: string;
  category: NewsCategory;
  /** ISO date, e.g. "2026-07-10" */
  date: string;
  author: string;
  title: string;
  excerpt: string;
  cover: string;
  body: NewsBlock[];
};

export const newsCategories: readonly NewsCategory[] = [
  "Pengumuman",
  "Pembaruan Platform",
  "Panduan",
  "Event & Promo",
  "Esports",
  "Komunitas",
];

const AUTHOR = "Tim valostock.id";

export const newsArticles: MockNewsArticle[] = [
  {
    slug: "valostock-resmi-dibuka",
    category: "Pengumuman",
    date: "2026-07-10",
    author: AUTHOR,
    title: "valostock.id Resmi Dibuka: Marketplace Akun Game dengan Escrow",
    excerpt:
      "Jual beli akun Valorant kini lewat toko terverifikasi, dana ditahan di escrow sampai kamu mengonfirmasi akunnya aman.",
    cover: "/images/products/1.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Hari ini valostock.id resmi dibuka untuk publik. Kami membangun marketplace ini karena jual beli akun game selama ini berjalan lewat grup WhatsApp, lambat, rawan penipuan, dan tanpa jejak bukti. valostock.id memindahkan seluruh proses itu ke satu tempat yang tercatat dan diawasi.",
      },
      { type: "heading", text: "Hanya toko terverifikasi yang berjualan" },
      {
        type: "paragraph",
        text: "Di valostock.id, penjual adalah Toko yang identitas pemiliknya sudah diverifikasi admin dan menyetor deposit keamanan Rp500.000. Pembeli tidak perlu verifikasi identitas, cukup daftar dan langsung belanja. Akuntabilitas terpusat di toko, dan itulah yang membuat sanksi bisa ditegakkan.",
      },
      { type: "heading", text: "Dana lewat escrow, bukan transfer langsung" },
      {
        type: "paragraph",
        text: "Saat kamu membeli akun, dana ditahan di escrow dan baru diteruskan ke toko setelah kamu mengonfirmasi akun diterima dengan aman. Serah terima berlangsung di Rekber Room yang diawasi admin, sehingga setiap langkah tercatat sebagai bukti jika terjadi sengketa.",
      },
      { type: "image", src: "/images/products/2.jpeg", alt: "Marketplace valostock.id" },
      {
        type: "paragraph",
        text: "Setiap pesanan juga dilengkapi proteksi pembeli dengan jendela dukungan 14 hari (akun ≤ Rp10 juta) atau 30 hari (akun > Rp10 juta). Selamat berbelanja, dan selamat datang di cara baru jual beli akun game.",
      },
    ],
  },
  {
    slug: "fitur-tawar-hadir",
    category: "Pembaruan Platform",
    date: "2026-07-08",
    author: AUTHOR,
    title: "Fitur Tawar Kini Hadir: Nego Harga Langsung dengan Toko",
    excerpt:
      "Ajukan penawaran lewat tombol Tawar, toko bisa menerima, menolak, atau memberi harga balik sebelum penawaran kedaluwarsa.",
    cover: "/images/products/3.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Nego harga adalah bagian alami dari jual beli akun, dan sekarang kamu tidak perlu keluar platform untuk melakukannya. Fitur Tawar sudah aktif di semua halaman detail akun.",
      },
      { type: "heading", text: "Cara kerjanya" },
      {
        type: "list",
        items: [
          "Buka halaman akun yang kamu incar, lalu tekan tombol Tawar.",
          "Isi harga penawaranmu dan kirim, setiap penawaran punya masa berlaku.",
          "Toko bisa Menerima, Menolak, atau memberi Penawaran Balik.",
          "Jika penawaran diterima, harga dan listing langsung terkunci untukmu.",
        ],
      },
      {
        type: "paragraph",
        text: "Setelah harga terkunci, kamu tinggal melanjutkan ke pembayaran seperti biasa, dana tetap lewat escrow, dan komisi platform dihitung dari harga final yang disepakati. Ingin memastikan akun tidak diambil orang lain saat kamu berpikir? Gunakan Lock opsional Rp5.000 untuk mengunci akun selama 30 menit.",
      },
      {
        type: "paragraph",
        text: "Semua riwayat penawaran tersimpan di menu Penawaran Saya, jadi kamu selalu tahu status nego yang sedang berjalan.",
      },
    ],
  },
  {
    slug: "mengenal-badge-account-checked",
    category: "Pembaruan Platform",
    date: "2026-07-05",
    author: AUTHOR,
    title: "Mengenal Badge Account Checked",
    excerpt:
      "Badge Account Checked menandai akun yang sudah diinspeksi tokonya dengan checklist, timestamp, dan bukti media.",
    cover: "/images/products/4.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Klaim tanpa bukti tidak berarti apa-apa. Karena itu kami tidak pernah memakai istilah seperti \"100% aman\", sebagai gantinya, kami memberi toko cara untuk membuktikan kondisi akunnya lewat Account Inspection.",
      },
      { type: "heading", text: "Apa yang diperiksa" },
      {
        type: "list",
        items: [
          "Login berhasil tanpa kendala (login-only, email dan password tidak diubah).",
          "Tidak ada pembatasan atau penalti aktif di akun.",
          "Isi inventory dan rank sesuai dengan deskripsi listing.",
          "2FA tetap aktif di tangan penjual sampai serah terima.",
        ],
      },
      {
        type: "paragraph",
        text: "Seluruh proses direkam dengan checklist, timestamp, dan media (screenshot atau video) yang tersimpan di penyimpanan privat. Akun yang lolos mendapat badge Account Checked di halaman listingnya.",
      },
      { type: "image", src: "/images/products/5.jpeg", alt: "Contoh akun dengan badge Account Checked" },
      {
        type: "paragraph",
        text: "Badge ini bersifat opsional bagi toko, tetapi akun dengan badge Account Checked cenderung lebih dipercaya pembeli. Cari ikonnya saat kamu menjelajah marketplace.",
      },
    ],
  },
  {
    slug: "cara-kerja-rekber-room",
    category: "Panduan",
    date: "2026-07-03",
    author: AUTHOR,
    title: "Cara Kerja Rekber Room: Serah Terima yang Diawasi Admin",
    excerpt:
      "Setelah pembayaran masuk escrow, Rekber Room terbuka, di sinilah akun diserahkan, diperiksa, dan semua percakapan tercatat.",
    cover: "/images/products/6.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Rekber Room adalah ruang transaksi resmi di valostock.id. Begitu pembayaranmu terkonfirmasi dan dana tertahan di escrow, sistem otomatis membuka Rekber Room dengan kode ruangan sesuai ID katalog akun (misalnya VS001).",
      },
      { type: "heading", text: "Langkah demi langkah" },
      {
        type: "list",
        items: [
          "Toko menyerahkan akses akun di dalam Rekber Room.",
          "Kamu mengganti email, password, dan 2FA akun tersebut.",
          "Periksa isi akun, rank, skin, dan detail lain sesuai listing.",
          "Tekan Selesai. Dana baru diteruskan ke toko setelah konfirmasimu.",
        ],
      },
      { type: "heading", text: "Kenapa harus di dalam platform?" },
      {
        type: "paragraph",
        text: "Rekber Room diawasi admin dan seluruh percakapannya tersimpan. Jika terjadi sengketa, riwayat ruangan inilah yang menjadi bukti utama, sesuatu yang tidak kamu dapatkan saat bertransaksi lewat chat pribadi. Karena itu pula transaksi di luar platform melanggar aturan dan menghilangkan perlindunganmu.",
      },
      {
        type: "paragraph",
        text: "Chat biasa dengan toko tetap tersedia untuk tanya jawab, tetapi serah terima akun hanya terjadi di Rekber Room.",
      },
    ],
  },
  {
    slug: "flash-sale-juli",
    category: "Event & Promo",
    date: "2026-07-01",
    author: AUTHOR,
    title: "Flash Sale Juli: Diskon dari Toko Pilihan Sepanjang Bulan",
    excerpt:
      "Toko-toko pilihan menggelar flash sale bergilir sepanjang Juli, pantau jadwalnya supaya tidak kehabisan.",
    cover: "/images/products/7.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Bulan ini toko-toko di valostock.id menggelar flash sale bergilir. Setiap periode berlangsung singkat dengan stok terbatas, akun yang masuk flash sale ditandai dengan label khusus dan harga coret di marketplace.",
      },
      { type: "heading", text: "Yang perlu kamu tahu" },
      {
        type: "list",
        items: [
          "Diskon ditentukan masing-masing toko, bukan oleh platform.",
          "Harga flash sale otomatis berakhir saat periodenya habis.",
          "Semua pembelian tetap lewat escrow dan proteksi pembeli seperti biasa.",
          "Gabungkan dengan voucher toko untuk potongan tambahan jika tersedia.",
        ],
      },
      {
        type: "paragraph",
        text: "Tambahkan akun incaranmu ke wishlist dan nyalakan notifikasi penurunan harga, kamu akan diberi tahu begitu akun tersebut masuk periode flash sale.",
      },
    ],
  },
  {
    slug: "vct-pacific-stage-2-dimulai",
    category: "Esports",
    date: "2026-06-28",
    author: AUTHOR,
    title: "VCT Pacific Stage 2 Dimulai 16 Juli, Musim Ramai untuk Para Pemain",
    excerpt:
      "Panggung kompetitif kembali menyala. Ini artinya untuk kamu yang sedang berburu akun atau menaikkan rank musim ini.",
    cover: "/images/products/8.jpeg",
    body: [
      {
        type: "paragraph",
        text: "VCT Pacific Stage 2 akan bergulir mulai 16 Juli. Seperti biasa, musim kompetitif besar selalu diikuti lonjakan aktivitas pemain, antrean ranked lebih ramai, dan permintaan akun dengan rank serta koleksi tertentu ikut naik.",
      },
      { type: "heading", text: "Dampaknya di marketplace" },
      {
        type: "paragraph",
        text: "Berdasarkan pola musim sebelumnya, akun dengan rank Immortal ke atas dan akun dengan koleksi skin populer bergerak paling cepat selama periode turnamen. Jika kamu berencana membeli, memasang wishlist lebih awal membantu kamu memantau harga sebelum permintaan memuncak.",
      },
      {
        type: "paragraph",
        text: "Untuk para toko: pastikan deskripsi listing akurat dan pertimbangkan Account Inspection, pembeli baru yang datang dari hype turnamen cenderung memilih akun dengan badge Account Checked.",
      },
      {
        type: "paragraph",
        text: "Nonton bareng jalannya turnamen dan diskusi meta bisa kamu ikuti di kanal komunitas kami. Selamat menikmati musim kompetitif!",
      },
    ],
  },
  {
    slug: "top-up-game-tersedia",
    category: "Pengumuman",
    date: "2026-06-25",
    author: AUTHOR,
    title: "Top-Up Game Kini Tersedia di valostock.id",
    excerpt:
      "Isi VP dan kebutuhan game lain langsung dari valostock.id, bayar lewat QRIS, VA, e-wallet, retail, atau kartu kredit.",
    cover: "/images/products/9.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Selain marketplace akun, valostock.id kini melayani top-up game. Prosesnya instan: pilih game, masukkan UID, pilih nominal, isi kontak (email dan WhatsApp), lalu bayar dengan metode favoritmu.",
      },
      { type: "heading", text: "Fitur yang menyertainya" },
      {
        type: "list",
        items: [
          "Kode promo, masukkan saat checkout untuk potongan harga.",
          "Struk dikirim otomatis ke email dan WhatsApp kamu.",
          "Halaman Cek Invoice, lacak status top-up cukup dengan nomor invoice.",
          "Top-Up Balance, saldo prabayar khusus top-up agar pembayaran lebih cepat.",
        ],
      },
      { type: "heading", text: "Tentang Top-Up Balance" },
      {
        type: "paragraph",
        text: "Balance bersifat closed-loop: hanya bisa dipakai untuk top-up game di valostock.id, tidak bisa ditarik tunai, tidak bisa dipakai membeli akun, dan tidak bisa ditransfer ke pengguna lain. Jika top-up gagal dan item tidak masuk, dana dikembalikan ke Balance. Aturan lengkapnya tersedia di pusat bantuan.",
      },
    ],
  },
  {
    slug: "memahami-proteksi-pembeli",
    category: "Panduan",
    date: "2026-06-20",
    author: AUTHOR,
    title: "Memahami Proteksi Pembeli 14 & 30 Hari",
    excerpt:
      "Setiap pesanan akun menyertakan proteksi Rp5.000, ini yang sebenarnya kamu dapatkan dari biaya tersebut.",
    cover: "/images/products/10.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Setiap pembelian akun di valostock.id menyertakan biaya proteksi Rp5.000. Proteksi ini adalah jendela dukungan dan penanganan keamanan, tim kami siap membantu jika terjadi masalah seperti upaya penarikan kembali (recall) akun oleh pemilik lama.",
      },
      { type: "heading", text: "Durasi proteksi" },
      {
        type: "list",
        items: [
          "Akun dengan harga sampai Rp10 juta: jendela dukungan 14 hari.",
          "Akun dengan harga di atas Rp10 juta: jendela dukungan 30 hari.",
        ],
      },
      { type: "heading", text: "Yang perlu diluruskan" },
      {
        type: "paragraph",
        text: "Proteksi bukan penahanan dana, pembayaran ke toko tetap cair 5 jam setelah akun dinyatakan aman. Proteksi juga bukan jaminan mutlak; ia adalah komitmen penanganan: kami menindaklanjuti laporanmu, memakai bukti dari Rekber Room, dan menegakkan sanksi ke toko yang terbukti bersalah, termasuk kompensasi dari deposit toko.",
      },
      {
        type: "paragraph",
        text: "Laporkan masalah sesegera mungkin melalui halaman pesananmu. Sengketa diproses dalam 72 jam dengan timeline yang bisa kamu pantau.",
      },
    ],
  },
  {
    slug: "store-premium-diluncurkan",
    category: "Pengumuman",
    date: "2026-06-15",
    author: AUTHOR,
    title: "Store Premium: Komisi Lebih Rendah untuk Toko Pro & Business",
    excerpt:
      "Paket langganan untuk toko resmi meluncur, komisi turun hingga 4%, listing lebih banyak, dan slot featured gratis.",
    cover: "/images/products/2.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Untuk toko yang serius berjualan, kami meluncurkan Store Premium dengan dua paket: Pro (Rp99.000/bulan) dan Business (Rp299.000/bulan).",
      },
      { type: "heading", text: "Perbandingan singkat" },
      {
        type: "list",
        items: [
          "Free: komisi 5%, hingga 15 listing aktif.",
          "Pro: komisi 4,5%, hingga 60 listing, analytics, bulk upload, 2 slot featured gratis per bulan.",
          "Business: komisi 4%, listing tanpa batas, analytics lanjutan, 6 slot featured gratis, prioritas dukungan & sengketa, akses API.",
        ],
      },
      {
        type: "paragraph",
        text: "Perlu dicatat: Premium menurunkan komisi dan menambah kapasitas, tetapi tidak memengaruhi reputasi. Rating, Service Score, dan badge kepercayaan tetap harus diperoleh lewat transaksi yang baik, tidak bisa dibeli.",
      },
      {
        type: "paragraph",
        text: "Toko bisa berlangganan langsung dari dashboard di menu Subscription.",
      },
    ],
  },
  {
    slug: "tips-aman-membeli-akun",
    category: "Panduan",
    date: "2026-06-10",
    author: AUTHOR,
    title: "5 Hal yang Perlu Dicek Sebelum Membeli Akun",
    excerpt:
      "Dari badge toko sampai riwayat rating, checklist singkat supaya keputusan belimu lebih terinformasi.",
    cover: "/images/products/3.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Escrow dan proteksi melindungimu di sisi transaksi, tetapi keputusan memilih akun tetap di tanganmu. Berikut lima hal yang kami sarankan untuk selalu dicek.",
      },
      {
        type: "list",
        items: [
          "Badge toko, Identity Verified menandakan identitas pemilik sudah diverifikasi admin; Verified dan Platinum mencerminkan rekam jejak; Deposit Secured berarti deposit keamanannya aktif.",
          "Tipe toko, Owner Store menjual akun miliknya sendiri; Reseller Store menjual akun titipan penjual eksternal dan bertanggung jawab penuh atasnya.",
          "Badge Account Checked, akun sudah diinspeksi dengan checklist dan bukti media.",
          "Rating dan Service Score, lihat akurasi deskripsi, sikap layanan, dan kecepatan pengiriman dari pembeli sebelumnya.",
          "Kelengkapan deskripsi, rank, koleksi skin, region, akses email, dan metode serah terima harus jelas sebelum kamu menawar.",
        ],
      },
      {
        type: "paragraph",
        text: "Satu aturan emas terakhir: jangan pernah menyelesaikan transaksi di luar platform. Selain melanggar aturan, kamu kehilangan escrow, bukti Rekber Room, dan seluruh perlindungan yang menyertainya.",
      },
    ],
  },
  {
    slug: "loyalty-points-hadir",
    category: "Event & Promo",
    date: "2026-06-05",
    author: AUTHOR,
    title: "Kumpulkan Loyalty Points di Setiap Transaksi",
    excerpt:
      "Setiap pembelian akun yang selesai kini menghasilkan poin, tukarkan dengan potongan harga di transaksi berikutnya.",
    cover: "/images/products/4.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Mulai bulan ini, setiap pesanan akun yang kamu selesaikan menghasilkan loyalty points. Poin terkumpul otomatis setelah kamu menekan Selesai dan memberi rating.",
      },
      { type: "heading", text: "Cara memakai poin" },
      {
        type: "paragraph",
        text: "Poin bisa ditukarkan sebagai potongan harga saat checkout pembelian berikutnya. Saldo poin dan riwayatnya bisa kamu lihat di halaman Poin di area akunmu, setiap perolehan dan penukaran tercatat jelas.",
      },
      {
        type: "paragraph",
        text: "Program ini akan terus kami kembangkan, termasuk bonus poin untuk event tertentu. Pantau halaman Berita untuk pengumuman berikutnya.",
      },
    ],
  },
  {
    slug: "gabung-komunitas-discord",
    category: "Komunitas",
    date: "2026-06-01",
    author: AUTHOR,
    title: "Gabung Komunitas valostock.id di Discord",
    excerpt:
      "Diskusi harga, info flash sale, dan pengumuman platform paling cepat, semuanya ada di server komunitas kami.",
    cover: "/images/products/5.jpeg",
    body: [
      {
        type: "paragraph",
        text: "Server Discord komunitas valostock.id sudah dibuka. Di sana kamu bisa berdiskusi soal harga pasar akun, berbagi pengalaman, dan mendapat pengumuman platform lebih cepat.",
      },
      { type: "heading", text: "Satu hal penting" },
      {
        type: "paragraph",
        text: "Discord, WhatsApp, dan Telegram hanya kami gunakan untuk notifikasi dan komunitas, bukan tempat bertransaksi. Semua penawaran, pembayaran, dan serah terima akun tetap terjadi di dalam platform melalui escrow dan Rekber Room. Waspadai siapa pun yang mengajakmu bertransaksi langsung lewat DM dan laporkan ke admin.",
      },
      {
        type: "paragraph",
        text: "Tautan undangan tersedia di footer situs. Sampai jumpa di sana!",
      },
    ],
  },
];

export function getArticle(slug: string): MockNewsArticle | undefined {
  return newsArticles.find((article) => article.slug === slug);
}

/** Latest articles excluding one slug — for "Berita Lainnya". */
export function relatedArticles(slug: string, count = 3): MockNewsArticle[] {
  return newsArticles.filter((article) => article.slug !== slug).slice(0, count);
}
