// Editable site texts (docs/ADMIN_PANEL.md §3.10). Only keys listed here can be
// changed; `site_settings` holds a row only for texts an admin changed, every
// other key falls back to `value` below — the site is never left without text.

export type TextKind = 'text' | 'multiline' | 'url' | 'email' | 'phone' | 'toggle';

export interface SiteText {
  key: string;
  label: string;
  kind: TextKind;
  value: string;
  max: number;
  /** Optional texts may be empty (the element is then hidden). */
  optional?: boolean;
  hint?: string;
}

export interface SiteTextGroup {
  id: string;
  label: string;
  description: string;
  items: SiteText[];
}

const text = (key: string, label: string, value: string, max = 120, extra: Partial<SiteText> = {}): SiteText => ({ key, label, kind: 'text', value, max, ...extra });
const long = (key: string, label: string, value: string, max = 300, extra: Partial<SiteText> = {}): SiteText => ({ key, label, kind: 'multiline', value, max, ...extra });

export const SITE_TEXT_GROUPS: SiteTextGroup[] = [
  {
    id: 'announcement',
    label: 'Bar pengumuman',
    description: 'Satu baris di atas navbar di semua halaman.',
    items: [
      { key: 'announcement.enabled', label: 'Tampilkan pengumuman', kind: 'toggle', value: 'false', max: 5 },
      text('announcement.text', 'Teks pengumuman', 'Pakai kode VALO10 untuk diskon 10% top-up (min. Rp50.000).', 160),
      { key: 'announcement.link', label: 'Link (opsional)', kind: 'url', value: '/topup', max: 300, optional: true, hint: 'Path situs (mis. /topup) atau https://…' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO beranda',
    description: 'Judul tab browser dan deskripsi di hasil pencarian.',
    items: [
      text('seo.home.title', 'Title', 'valostock.id | Marketplace Akun Game & Top-Up', 70),
      long('seo.home.description', 'Meta description', 'Beli akun game dari toko terverifikasi dengan escrow, atau top-up instan. Dana ditahan sampai kamu mengonfirmasi akunnya aman.', 170),
    ],
  },
  {
    id: 'hero',
    label: 'Hero beranda',
    description: 'Tampil bila tidak ada banner beranda yang aktif.',
    items: [
      text('home.hero.eyebrow', 'Label kecil', 'Marketplace akun game & top-up', 60),
      long('home.hero.title', 'Judul', 'Beli akun impianmu, dananya kami jaga sampai aman.', 90),
      long('home.hero.subtitle', 'Subjudul', 'Semua penjual adalah toko terverifikasi (verifikasi admin + deposit). Dana ditahan di escrow dan serah terima diawasi admin di Rekber Room.', 240),
      text('home.hero.cta_primary', 'Tombol utama (ke /search)', 'Jelajahi Akun', 30),
      text('home.hero.cta_secondary', 'Tombol kedua (ke /topup)', 'Top-Up Instan', 30),
    ],
  },
  {
    id: 'trust',
    label: 'Poin keunggulan',
    description: 'Empat poin di bawah hero.',
    items: [
      text('home.trust.1', 'Poin 1', 'Escrow di setiap transaksi', 60),
      text('home.trust.2', 'Poin 2', 'Toko terverifikasi + deposit', 60),
      text('home.trust.3', 'Poin 3', 'Akun bisa diinspeksi (Account Checked)', 60),
      text('home.trust.4', 'Poin 4', 'Serah terima diawasi admin', 60),
    ],
  },
  {
    id: 'cards',
    label: 'Kartu Akun Game & Top-Up',
    description: 'Dua kartu besar di bawah hero.',
    items: [
      text('home.card.account.title', 'Kartu akun, judul', 'Akun Game', 40),
      text('home.card.account.desc', 'Kartu akun, deskripsi', 'Jelajahi akun dari toko terverifikasi, semua lewat escrow.', 120),
      text('home.card.topup.title', 'Kartu top-up, judul', 'Top-Up', 40),
      text('home.card.topup.desc', 'Kartu top-up, deskripsi', 'VP, Diamond, dan lainnya, instan, struk ke email/WA.', 120),
    ],
  },
  {
    id: 'sections',
    label: 'Judul bagian beranda',
    description: 'Judul daftar di beranda dan catatan di bagian bawah.',
    items: [
      text('home.section.recommended', 'Rekomendasi', 'Rekomendasi Untukmu', 50),
      text('home.section.recommended_hint', 'Rekomendasi, keterangan', 'Berdasarkan akun yang kamu lihat dan simpan.', 120),
      text('home.section.games', 'Game', 'Game Populer', 50),
      text('home.section.featured', 'Akun unggulan', 'Akun Unggulan', 50),
      text('home.section.newest', 'Akun terbaru', 'Baru Ditambahkan', 50),
      text('home.section.news', 'Berita', 'Berita Terbaru', 50),
      long('home.footnote', 'Catatan bawah', 'Payout toko cair 5 jam setelah akun aman, proteksi pembeli 14/30 hari di setiap pesanan.', 200, { optional: true }),
    ],
  },
  {
    id: 'store_cta',
    label: 'Ajakan buka toko',
    description: 'Bagian "Untuk toko" di bawah beranda.',
    items: [
      text('store_cta.label', 'Label', 'Untuk toko', 40),
      text('store_cta.title', 'Judul', 'Punya toko akun game? Jadi', 80),
      text('store_cta.title_highlight', 'Judul, bagian berwarna', 'mitra terverifikasi.', 60, { optional: true }),
      long('store_cta.subtitle', 'Subjudul', 'Verifikasi identitas gratis oleh admin + deposit Rp500 ribu. Kami sediakan escrow, Rekber Room, ID katalog anti double-sell, dan perlindungan sengketa.', 260),
      text('store_cta.button_primary', 'Tombol utama (ke /sell)', 'Daftarkan toko', 30),
      text('store_cta.button_secondary', 'Tombol kedua (ke panduan)', 'Pelajari dulu', 30),
      text('store_cta.perk1.title', 'Keunggulan 1, judul', 'Saldo milik toko sendiri', 60),
      long('store_cta.perk1.body', 'Keunggulan 1, isi', 'Dana masuk ke saldo tokomu, bisa ditarik 5 jam setelah akun aman. Komisi 5%, lebih rendah dengan Premium.', 200),
      text('store_cta.perk2.title', 'Keunggulan 2, judul', 'Notifikasi WA / Discord / Telegram', 60),
      long('store_cta.perk2.body', 'Keunggulan 2, isi', 'Dapat alert pembeli, penawaran, dan pesanan baru, transaksi tetap aman di dalam platform.', 200),
      text('store_cta.perk3.title', 'Keunggulan 3, judul', 'Dashboard lengkap', 60),
      long('store_cta.perk3.body', 'Keunggulan 3, isi', 'Kelola katalog, penawaran, inspeksi, penarikan, dan analitik dari satu tempat.', 200),
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    description: 'Bagian bawah semua halaman publik.',
    items: [
      long('footer.newsletter.title', 'Judul newsletter', 'Daftar duluan,\ndapat info peluncuran.', 80, { hint: 'Baris baru = pindah baris.' }),
      long('footer.newsletter.subtitle', 'Keterangan newsletter', 'Kami kirim update fitur dan promo toko terverifikasi, tanpa spam.', 160),
      long('footer.tagline', 'Tagline', 'Marketplace akun game dengan toko dan produk yang diverifikasi admin. Toko yang berjualan, kami yang menjaga.', 200),
      { key: 'footer.email', label: 'Email kontak (opsional)', kind: 'email', value: '', max: 120, optional: true },
      { key: 'footer.whatsapp', label: 'WhatsApp kontak (opsional)', kind: 'phone', value: '', max: 20, optional: true, hint: 'Mis. 6281234567890, tampil sebagai link wa.me.' },
      text('footer.bottom', 'Teks kanan bawah', 'Dibangun untuk transaksi yang aman.', 80, { optional: true }),
    ],
  },
];

export const SITE_TEXTS = new Map(SITE_TEXT_GROUPS.flatMap((g) => g.items.map((item) => [item.key, item] as const)));

/** Validates one value for its registered key; returns the normalised value or an error message. */
export function checkText(item: SiteText, raw: string): { value: string } | { error: string } {
  const value = item.kind === 'multiline' ? raw.replace(/\r\n/g, '\n').trim() : raw.trim();
  if (value.length > item.max) return { error: `${item.label}: maksimal ${item.max} karakter.` };
  if (value === '') return item.optional || item.kind === 'toggle' ? { value } : { error: `${item.label} wajib diisi.` };
  switch (item.kind) {
    case 'toggle':
      return value === 'true' || value === 'false' ? { value } : { error: `${item.label}: pilih ya atau tidak.` };
    case 'url':
      return /^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/.test(value) ? { value } : { error: `${item.label}: pakai path situs (/…) atau https://…` };
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { value } : { error: `${item.label}: email tidak valid.` };
    case 'phone':
      return /^\+?\d{8,16}$/.test(value) ? { value: value.replace(/^\+/, '') } : { error: `${item.label}: 8 sampai 16 digit angka.` };
    default:
      return item.kind === 'text' && value.includes('\n') ? { error: `${item.label}: satu baris saja.` } : { value };
  }
}
