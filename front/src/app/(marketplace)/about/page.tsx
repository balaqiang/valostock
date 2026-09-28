import type { Metadata } from "next";
import {
  BadgeCheck,
  Gavel,
  Lock,
  ScanLine,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { StoreCta } from "@/components/marketing/store-cta";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Tentang Kami — valostock.id",
  description:
    "Kenapa valostock.id ada: memindahkan jual-beli akun game dari grup WhatsApp ke marketplace dengan escrow, bukti, dan akuntabilitas.",
};

const principles = [
  {
    icon: BadgeCheck,
    title: "Hanya toko terverifikasi",
    body: "Penjual wajib lolos verifikasi identitas oleh admin dan menyetor deposit keamanan Rp500 ribu. Akuntabilitas terpusat di toko — itulah yang membuat sanksi bisa ditegakkan.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow, bukan saling percaya",
    body: "Dana pembeli ditahan dan baru diteruskan ke toko setelah pembeli mengonfirmasi akunnya aman. Setiap rupiah dibayar lewat Midtrans dan tercatat di buku besar (ledger) yang bisa diaudit.",
  },
  {
    icon: Lock,
    title: "Serah terima yang tercatat",
    body: "Setiap transaksi berlangsung di Rekber Room yang diawasi admin. Seluruh percakapan tersimpan dan menjadi bukti jika terjadi sengketa.",
  },
  {
    icon: ScanLine,
    title: "Bukti, bukan klaim",
    body: "Badge seperti Account Checked lahir dari inspeksi dengan checklist dan media — bukan slogan. Klaim mutlak seperti \"100% aman\" justru kami larang.",
  },
  {
    icon: Gavel,
    title: "Sengketa yang adil",
    body: "72 jam untuk mengajukan, timeline yang bisa dipantau, dan arbitrase final berbasis bukti. Toko yang bersalah menanggung refund — bisa dipotong dari depositnya.",
  },
  {
    icon: Wallet,
    title: "Biaya yang jujur",
    body: "Komisi 5% dari harga final, biaya penanganan maks. 3,5%, proteksi Rp5.000 — semua tertulis, tanpa biaya tersembunyi.",
  },
];

const stats = [
  { value: "5%", label: "Komisi platform — dari harga final" },
  { value: "5 jam", label: "Pencairan toko setelah akun aman" },
  { value: "14/30 hari", label: "Proteksi di setiap pesanan" },
  { value: "72 jam", label: "Jendela pengajuan sengketa" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-surface">
          <Container className="py-14 sm:py-20">
            <p className="eyebrow text-primary">Tentang valostock.id</p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-text sm:text-5xl">
              Jual-beli akun game seharusnya tidak bergantung pada nasib.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary">
              Selama ini transaksi akun berjalan di grup WhatsApp: lambat,
              rawan double-sell dan recall, dan tanpa jejak bukti. valostock.id
              memindahkan seluruh proses itu ke satu tempat yang tercatat —
              dengan escrow, toko terverifikasi, dan arbitrase yang adil.
            </p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          {/* Stats */}
          <Reveal>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-surface p-5 text-center"
                >
                  <p className="num font-display text-2xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Principles */}
          <Reveal className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Prinsip kami
            </h2>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Keamanan lahir dari akuntabilitas dan transparansi — bukan dari
              janji.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {principles.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <item.icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
                  <h3 className="mt-4 font-display text-base font-bold text-text">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Honest note — no absolute claims */}
          <Reveal className="mt-14">
            <div className="rounded-2xl border border-border bg-surface p-8">
              <h2 className="font-display text-xl font-bold tracking-tight text-text">
                Yang tidak kami janjikan
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
                Kami tidak menjanjikan transaksi yang &quot;100% aman&quot; —
                tidak ada yang bisa. Yang kami bangun adalah sistem di mana
                setiap pihak bisa dimintai tanggung jawab: toko diverifikasi
                dan menyetor deposit, serah terima tercatat, sengketa
                diputuskan dari bukti, dan pelanggar ditindak sampai blacklist.
                Keamanan dari akuntabilitas — itu janji yang bisa kami tepati.
              </p>
            </div>
          </Reveal>
        </Container>

        <StoreCta />
      </main>

      <Footer />
    </div>
  );
}
