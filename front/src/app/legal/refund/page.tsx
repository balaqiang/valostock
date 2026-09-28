import type { Metadata } from "next";
import { LegalArticle, type LegalSection } from "@/components/legal/legal-article";

export const metadata: Metadata = {
  title: "Kebijakan Refund — valostock.id",
  description:
    "Aturan refund untuk pembelian akun (escrow + sengketa) dan top-up (refund ke Balance).",
};

// Per docs/MONEY_RULES.md §6 & §8b and docs/STORE_RULES.md §8.
const sections: LegalSection[] = [
  {
    title: "Pembelian Akun — Escrow Melindungimu Duluan",
    items: [
      "Dana pembelian ditahan di escrow dan baru diteruskan ke Toko setelah kamu menekan Selesai (atau jendela konfirmasi berakhir).",
      "Jika Toko tidak mengirim akun, atau akun tidak sesuai deskripsi, jangan tekan Selesai — ajukan sengketa dari halaman pesanan.",
      "Sengketa yang dimenangkan pembeli berujung refund penuh; kompensasi tambahan dapat diambil dari deposit Toko jika ada kerugian akibat kesalahan Toko.",
    ],
  },
  {
    title: "Setelah Selesai — Masa Proteksi 14/30 Hari",
    items: [
      "Setiap pesanan menyertakan proteksi: 14 hari untuk akun ≤ Rp10 juta, 30 hari untuk akun > Rp10 juta.",
      "Proteksi adalah jendela dukungan & penanganan (mis. bantuan saat akun ditarik kembali pemilik lama) — bukan penahanan dana dan bukan garansi uang-kembali otomatis.",
      "Laporkan masalah sesegera mungkin (maksimal 72 jam sejak kejadian). Hasil mengikuti arbitrase: Toko yang terbukti bersalah menanggung refund/kompensasi, termasuk dari deposit.",
    ],
  },
  {
    title: "Pembatalan Pesanan",
    items: [
      "Pesanan yang belum dibayar dibatalkan otomatis setelah batas waktu pembayaran — tanpa biaya.",
      "Pembatalan tanpa alasan sah setelah pembayaran dapat dikenai biaya pembatalan.",
    ],
  },
  {
    title: "Top-Up — Refund Hanya Jika Item Tidak Masuk",
    items: [
      "Top-up yang berhasil (VP/Diamond/item sudah masuk ke akun game) tidak dapat direfund.",
      "Jika item tidak masuk karena kegagalan pemenuhan, dana dikembalikan ke Balance (BLC) — bukan uang tunai.",
      "Kesalahan pengisian UID/ID player oleh pembeli berada di luar tanggung jawab platform — periksa kembali sebelum membayar.",
      "Status pesanan bisa dicek kapan saja di halaman Cek Invoice dengan nomor invoice.",
    ],
  },
  {
    title: "Balance (BLC) & Voucher",
    items: [
      "Balance bersifat closed-loop: hanya untuk top-up, tidak bisa dicairkan ke bank/e-wallet, tidak bisa membeli akun, dan tidak bisa ditransfer.",
      "Voucher Balance yang sudah di-redeem menjadi saldo BLC dan mengikuti aturan closed-loop di atas.",
      "Saldo Balance adalah kewajiban platform kepadamu dan dikelola terpisah dari dana operasional.",
    ],
  },
  {
    title: "Deposit Toko",
    paragraphs: [
      "Deposit keamanan Rp500.000 dapat dikembalikan saat Toko tutup dengan syarat: akun dalam kondisi baik, tidak ada sengketa/investigasi aktif, seluruh pesanan selesai dan lewat masa proteksi, serta tidak ada denda atau kewajiban tertunggak. Deposit dapat dipotong untuk denda dan kompensasi pembeli, dan hangus pada ban permanen atau penipuan terbukti.",
    ],
  },
  {
    title: "Cara Mengajukan",
    items: [
      "Masalah pesanan akun: buka halaman pesanan → Laporkan / Ajukan Sengketa (dalam 72 jam).",
      "Masalah top-up: cek status di halaman Cek Invoice; jika item tidak masuk, tim kami menghubungimu via email/WhatsApp yang kamu isi — atau hubungi kami lewat Pusat Bantuan.",
    ],
  },
];

export default function RefundPage() {
  return (
    <LegalArticle
      title="Kebijakan Refund"
      updated="2026-07-12"
      intro="Refund di valostock.id mengikuti dua jalur berbeda: pembelian akun dilindungi escrow dan arbitrase sengketa, sedangkan top-up direfund ke Balance hanya jika item game tidak masuk. Halaman ini merangkum keduanya."
      sections={sections}
    />
  );
}
