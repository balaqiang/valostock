import { BarChart3, BellRing, Wallet } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const perks = [
  {
    icon: Wallet,
    title: "Saldo milik toko sendiri",
    body: "Dana masuk ke saldo tokomu — bisa ditarik 5 jam setelah akun aman. Komisi 5%, lebih rendah dengan Premium.",
  },
  {
    icon: BellRing,
    title: "Notifikasi WA / Discord / Telegram",
    body: "Dapat alert pembeli, penawaran, dan pesanan baru — transaksi tetap aman di dalam platform.",
  },
  {
    icon: BarChart3,
    title: "Dashboard lengkap",
    body: "Kelola katalog, penawaran, inspeksi, penarikan, dan analitik dari satu tempat.",
  },
];

export function StoreCta() {
  return (
    <section className="bg-violet-50 py-24 dark:bg-violet-950/20 sm:py-32">
      <Container>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <SectionLabel>Untuk toko</SectionLabel>
            <h2 className="display-2 mt-5 text-text">
              Punya toko akun game? Jadi{" "}
              <span className="text-primary">mitra terverifikasi.</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
              Verifikasi identitas gratis oleh admin + deposit Rp500 ribu. Kami
              sediakan escrow, Rekber Room, ID katalog anti double-sell, dan
              perlindungan sengketa.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:pb-2">
            <Button href="/sell" variant="primary" size="lg">
              Daftarkan toko
            </Button>
            <Button href="/help/cara-membuka-toko" variant="secondary" size="lg">
              Pelajari dulu
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {perks.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-8"
            >
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-lg font-semibold text-text">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
