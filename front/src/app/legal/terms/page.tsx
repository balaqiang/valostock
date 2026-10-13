import type { Metadata } from "next";
import { LegalArticle, type LegalSection } from "@/components/legal/legal-article";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | valostock.id",
  description: "Syarat dan ketentuan penggunaan layanan top-up game valostock.id.",
};

// Operational summary of docs/MONEY_RULES.md.
const sections: LegalSection[] = [
  {
    title: "Layanan",
    paragraphs: [
      "valostock.id menyediakan layanan top-up mata uang dan item game (Valorant, Mobile Legends, Genshin Impact, Free Fire). Item dikirim ke akun game sesuai ID yang kamu isi setelah pembayaran terkonfirmasi.",
      "Pembayaran diproses oleh Midtrans. Status lunas hanya ditetapkan dari konfirmasi Midtrans, bukan dari browser.",
    ],
  },
  {
    title: "Akun Pengguna",
    items: [
      "Top-up bisa dilakukan tanpa akun. Dengan akun (Member), riwayat transaksi tersimpan dan kamu bisa memakai Balance.",
      "Pendaftaran memakai nama, email aktif, dan password minimal 8 karakter. Nomor HP dan kode referral bersifat opsional.",
      "Kamu bertanggung jawab atas keamanan password akunmu sendiri.",
    ],
  },
  {
    title: "Pesanan dan Data Akun Game",
    items: [
      "Pastikan ID akun game (dan server/zone bila diminta) benar sebelum memesan. Item yang sudah dikirim ke ID yang salah tidak dapat dibatalkan.",
      "Setiap pesanan mendapat nomor invoice. Simpan nomor ini untuk melacak status di halaman Cek Invoice.",
      "Invoice yang tidak dibayar dalam 60 menit otomatis kedaluwarsa.",
    ],
  },
  {
    title: "Harga, Promo, dan Biaya",
    items: [
      "Harga, potongan promo, biaya metode pembayaran, dan total bayar dihitung oleh server dan ditampilkan sebelum kamu membayar.",
      "Biaya metode: QRIS 1,5%, Virtual Account Rp5.000, Retail Rp5.000, E-Wallet 2,5%, Kartu Kredit 4% + Rp3.000. Pembayaran dengan Balance tanpa biaya.",
      "Kode promo berlaku selama kuota dan masa berlakunya masih ada, serta hanya memberi potongan bila minimal belanja terpenuhi.",
    ],
  },
  {
    title: "Balance (BLC)",
    items: [
      "Balance adalah saldo prabayar dengan nilai 1 BLC = Rp1, diisi dengan membeli voucher Balance.",
      "Balance hanya dapat dipakai untuk membayar top-up game di valostock.id, tidak dapat dicairkan, dan tidak dapat ditransfer ke pengguna lain.",
      "Balance bertambah hanya setelah pembayaran voucher terkonfirmasi. Setiap perubahan saldo tercatat di halaman Mutasi.",
    ],
  },
  {
    title: "Referral",
    paragraphs: [
      "Member yang mendaftar dengan kode referral menghubungkan akunnya dengan pengajak. Saat top-up pertama Member tersebut berhasil, pengajak menerima Rp10.000 Balance, satu kali per Member yang diajak.",
    ],
  },
  {
    title: "Perubahan Ketentuan",
    paragraphs: [
      "Ketentuan ini dapat diperbarui. Dengan terus menggunakan layanan setelah perubahan berlaku, kamu menyetujui ketentuan yang diperbarui.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalArticle
      title="Syarat & Ketentuan"
      updated="13 Oktober 2026"
      intro="Dengan menggunakan valostock.id kamu menyetujui ketentuan berikut tentang pesanan top-up, pembayaran, Balance, dan referral."
      sections={sections}
    />
  );
}
