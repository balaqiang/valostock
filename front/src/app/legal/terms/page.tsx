import type { Metadata } from "next";
import { LegalArticle, type LegalSection } from "@/components/legal/legal-article";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — valostock.id",
  description:
    "Syarat dan ketentuan penggunaan valostock.id — marketplace akun game dan top-up dengan escrow.",
};

// Operational summary of docs/STORE_RULES.md §14 + docs/MONEY_RULES.md.
const sections: LegalSection[] = [
  {
    title: "Peran Platform",
    paragraphs: [
      "valostock.id adalah penyedia layanan marketplace, bukan penjual. Penjual adalah Toko terverifikasi yang bertransaksi langsung dengan pembeli. Platform menyediakan escrow, ID katalog, Rekber Room yang diawasi admin, sistem penawaran, arbitrase sengketa, dan reputasi.",
      "Semua pembayaran diproses oleh Midtrans. Dana pembelian akun ditahan sebagai escrow sampai pesanan selesai, tercatat per toko di buku besar (ledger), dan tidak digunakan untuk operasional platform. Pencairan ke toko dan penjual eksternal dikirim melalui Midtrans Iris setelah validasi nama rekening.",
    ],
  },
  {
    title: "Akun Pengguna",
    items: [
      "Pendaftaran menggunakan nomor HP (OTP) dan email aktif. Pembeli tidak diwajibkan KYC.",
      "Kamu bertanggung jawab atas keamanan kredensial akunmu sendiri.",
      "Satu orang tidak boleh membuat banyak akun untuk menghindari sanksi.",
    ],
  },
  {
    title: "Berjualan — Hanya Toko Terverifikasi",
    items: [
      "Hanya Toko yang lulus verifikasi identitas (KYC) dan menyetor deposit keamanan Rp500.000 yang boleh berjualan.",
      "Toko bertipe Owner (akun milik sendiri) atau Reseller (akun titipan penjual eksternal). Reseller bertanggung jawab penuh atas penjual eksternalnya — identitas, keaslian akun, dan kerugian pembeli.",
      "Setiap listing mendapat ID katalog dari platform (awalan VS). Satu akun = satu katalog.",
      "Deskripsi listing wajib akurat. Klaim mutlak seperti \"100% aman\" atau \"100% original\" dilarang.",
    ],
  },
  {
    title: "Transaksi & Escrow",
    items: [
      "Pembayaran pembeli ditahan di escrow dan baru diteruskan ke Toko setelah pembeli mengonfirmasi akun diterima (atau jendela konfirmasi berakhir).",
      "Serah terima akun wajib berlangsung di Rekber Room — diawasi admin dan tercatat sebagai bukti.",
      "Pencairan dana Toko tersedia 5 jam setelah akun dinyatakan aman, dengan Account Validation (nama rekening = nama KYC).",
      "Seluruh transaksi wajib di dalam platform. Mengajak atau menerima transaksi di luar platform adalah pelanggaran berat.",
    ],
  },
  {
    title: "Biaya",
    items: [
      "Komisi platform: 5% dari harga final (Premium: 4,5% / 4%), dipotong dari Toko saat pesanan selesai.",
      "Biaya penanganan: maksimal 3,5% (minimum Rp4.000), dibayar pembeli saat checkout.",
      "Proteksi pembeli: Rp5.000 per pesanan (wajib), jendela dukungan 14 hari (akun ≤ Rp10 juta) atau 30 hari (> Rp10 juta).",
      "Biaya penarikan Toko: Rp4.000 (+Rp2.500 pajak antarbank). Lock akun opsional: Rp5.000 (30 menit).",
    ],
  },
  {
    title: "Penawaran (Tawar)",
    paragraphs: [
      "Pembeli dapat mengajukan penawaran harga. Toko dapat menerima, menolak, atau memberi penawaran balik; penawaran memiliki masa berlaku. Saat penawaran diterima, harga dan listing terkunci, dan komisi tetap dihitung dari harga final.",
    ],
  },
  {
    title: "Balance (BLC) — Closed-Loop",
    items: [
      "Balance adalah alat pembayaran internal khusus top-up, bukan uang elektronik.",
      "Balance hanya bisa dipakai untuk top-up game di valostock.id — tidak bisa dicairkan, tidak bisa membeli akun, dan tidak bisa ditransfer ke pengguna lain.",
      "Refund top-up yang gagal dikembalikan ke Balance, bukan uang tunai.",
    ],
  },
  {
    title: "Perilaku Terlarang",
    items: [
      "Transaksi atau pembayaran di luar platform, atau mengarahkan pengguna keluar platform.",
      "Listing palsu, konfirmasi pengiriman fiktif, duplikasi listing, atau manipulasi harga.",
      "Manipulasi ulasan: pesanan fiktif, menekan pembeli mengubah ulasan, atau menyerang kompetitor.",
      "Berbagi kontak pribadi (email/nomor telepon) atau bertransaksi di chat biasa.",
      "Penipuan, pengambilalihan kembali akun yang sudah dijual (recall), dan pelanggaran hukum lainnya.",
    ],
  },
  {
    title: "Sengketa & Arbitrase",
    items: [
      "Sengketa diajukan dalam 72 jam melalui sistem sengketa di dalam platform, dengan pernyataan dan bukti.",
      "Bukti utama adalah riwayat Rekber Room, checklist inspeksi, dan bukti pengiriman.",
      "Jika para pihak tidak sepakat, platform mengarbitrase dan keputusannya bersifat final.",
      "Klaim palsu menurunkan skor kepercayaan pembeli; kesalahan Toko dapat berujung refund pembeli dan potongan deposit.",
    ],
  },
  {
    title: "Sanksi",
    paragraphs: [
      "Pelanggaran dikenai sanksi bertingkat sesuai beratnya: peringatan, pembatasan listing, denda dari deposit, suspensi (mis. 30 hari), ban permanen, blacklist (perangkat/KYC/bank), hingga proses hukum. Refund akibat kesalahan Toko dapat dikenai denda tambahan.",
    ],
  },
  {
    title: "Batasan Tanggung Jawab",
    paragraphs: [
      "Platform menyediakan mekanisme keamanan berbasis bukti dan akuntabilitas (escrow, verifikasi, proteksi, arbitrase) — bukan jaminan mutlak atas hasil transaksi. Risiko yang timbul dari data yang kamu isi sendiri (mis. UID top-up yang salah) berada di luar tanggung jawab platform.",
    ],
  },
  {
    title: "Perubahan Ketentuan",
    paragraphs: [
      "Ketentuan ini dapat diperbarui. Perubahan material diumumkan melalui notifikasi sistem dan halaman Berita. Dengan terus menggunakan platform setelah perubahan berlaku, kamu menyetujui ketentuan yang diperbarui.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalArticle
      title="Syarat & Ketentuan"
      updated="2026-07-12"
      intro="Dengan menggunakan valostock.id kamu menyetujui ketentuan berikut. Ketentuan ini mengatur peran platform sebagai penyedia layanan, aturan jual-beli akun game dan top-up, biaya, serta penyelesaian sengketa."
      sections={sections}
    />
  );
}
