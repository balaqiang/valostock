import type { Metadata } from "next";
import { LegalArticle, type LegalSection } from "@/components/legal/legal-article";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | valostock.id",
  description: "Bagaimana valostock.id mengumpulkan, memakai, dan melindungi datamu.",
};

const sections: LegalSection[] = [
  {
    title: "Data yang Kami Kumpulkan",
    items: [
      "Data akun Member: nama, email, nomor HP (opsional), dan kode referral.",
      "Data pesanan: ID akun game dan server/zone tujuan, email dan nomor WhatsApp kontak (opsional), produk, metode, dan total bayar.",
      "Data pembayaran dari Midtrans: status dan nomor referensi transaksi. Kami tidak menyimpan data kartu atau rekening.",
    ],
  },
  {
    title: "Penggunaan Data",
    items: [
      "Memproses top-up dan pembayaran, serta menampilkan status invoice.",
      "Mencatat saldo dan mutasi Balance milik Member.",
      "Menyusun laporan transaksi untuk Admin.",
    ],
  },
  {
    title: "Perlindungan Data",
    items: [
      "Password disimpan dalam bentuk hash oleh Supabase Auth. Sesi login disimpan di cookie httpOnly yang tidak bisa dibaca JavaScript.",
      "Halaman Cek Invoice hanya menerima nomor invoice lengkap dan menampilkan ID akun game secara tersamar. ID lengkap hanya terlihat oleh pemilik akun di halaman Transaksi.",
      "Basis data hanya dapat diakses oleh server aplikasi, dan setiap perubahan produk oleh Admin tercatat di log audit.",
    ],
  },
  {
    title: "Hak Kamu",
    items: [
      "Melihat dan memperbarui nama, nomor HP, dan password dari halaman Profil Saya.",
      "Melihat seluruh riwayat transaksi dan mutasi Balance milikmu.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalArticle
      title="Kebijakan Privasi"
      updated="13 Oktober 2026"
      intro="Kebijakan ini menjelaskan data apa yang kami kumpulkan saat kamu top-up atau memakai akun valostock.id, untuk apa data itu dipakai, dan bagaimana kami melindunginya."
      sections={sections}
    />
  );
}
