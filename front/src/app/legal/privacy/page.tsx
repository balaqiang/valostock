import type { Metadata } from "next";
import { LegalArticle, type LegalSection } from "@/components/legal/legal-article";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — valostock.id",
  description:
    "Bagaimana valostock.id mengumpulkan, memakai, dan melindungi datamu.",
};

const sections: LegalSection[] = [
  {
    title: "Data yang Kami Kumpulkan",
    items: [
      "Data akun: nomor HP, email, nickname, dan preferensi bahasa.",
      "Data verifikasi Toko (KYC): diproses oleh penyedia verifikasi identitas (Sumsub); dokumen identitas tersimpan di penyedia tersebut, bukan di server kami.",
      "Data transaksi: pesanan, pembayaran, penawaran, penarikan, dan mutasi Balance.",
      "Riwayat Rekber Room dan chat: tersimpan sebagai jejak bukti sengketa.",
      "Data kontak top-up (email + WhatsApp) untuk pengiriman struk dan penanganan kendala.",
      "Data teknis: alamat IP, perangkat, dan log akses untuk keamanan dan pencegahan penipuan.",
    ],
  },
  {
    title: "Bagaimana Data Dipakai",
    items: [
      "Menjalankan layanan: memproses pesanan, escrow, pencairan, dan top-up.",
      "Keamanan: verifikasi Toko, Account Validation saat pencairan, deteksi penipuan, dan penegakan sanksi/blacklist.",
      "Penyelesaian sengketa: riwayat Rekber Room dan bukti pengiriman dipakai sebagai dasar arbitrase.",
      "Komunikasi: notifikasi pesanan/sistem, struk, dan pengumuman platform.",
    ],
  },
  {
    title: "Berbagi Data dengan Pihak Ketiga",
    paragraphs: [
      "Kami membagikan data hanya sebatas yang diperlukan kepada pemroses layanan: Midtrans (pembayaran, pencairan dana & validasi rekening), Sumsub (verifikasi identitas Toko), Digiflazz (pemenuhan top-up), dan penyedia email/notifikasi. Kami tidak menjual data pribadimu.",
      "Data dapat diberikan kepada penegak hukum sesuai prosedur hukum yang berlaku, misalnya pada kasus penipuan.",
    ],
  },
  {
    title: "Penyimpanan & Keamanan",
    items: [
      "Media sensitif (bukti inspeksi, bukti sengketa, lampiran chat) tersimpan di penyimpanan privat dan hanya diakses lewat tautan bertanda tangan (signed URL) — tidak pernah publik.",
      "Data sensitif seperti rekening bank dienkripsi saat disimpan.",
      "Akses admin dibatasi berdasarkan peran (RBAC), diwajibkan 2FA, dan setiap aksi sensitif tercatat di log audit.",
    ],
  },
  {
    title: "Retensi",
    paragraphs: [
      "Data transaksi dan jejak bukti disimpan selama diperlukan untuk kewajiban hukum, akuntansi, dan penyelesaian sengketa (termasuk masa proteksi 14/30 hari dan jendela sengketa 72 jam). Setelahnya, data dihapus atau dianonimkan secara bertahap.",
    ],
  },
  {
    title: "Hak Kamu",
    items: [
      "Mengakses dan memperbarui data profilmu dari halaman Profil Saya.",
      "Meminta penghapusan akun (dengan syarat tidak ada transaksi/sengketa berjalan).",
      "Menarik persetujuan komunikasi non-esensial kapan saja.",
    ],
  },
  {
    title: "Kontak",
    paragraphs: [
      "Pertanyaan privasi dapat dikirim melalui halaman Kontak atau Pusat Bantuan. Kami menanggapi permintaan terkait data pribadi secepatnya.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalArticle
      title="Kebijakan Privasi"
      updated="2026-07-12"
      intro="Privasi dan keamanan datamu adalah bagian dari cara kerja platform ini — mulai dari penyimpanan privat untuk media bukti sampai enkripsi data sensitif. Kebijakan ini menjelaskan data apa yang kami kumpulkan, untuk apa, dan hakmu atasnya."
      sections={sections}
    />
  );
}
