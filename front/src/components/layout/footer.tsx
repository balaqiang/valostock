import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";

// docs/SITEMAP.md — like kepo.id: sitemap + legal links.
const columns = [
  {
    title: "Peta Situs",
    links: [
      { label: "Top-Up", href: "/" },
      { label: "Cek Invoice", href: "/topup/invoice" },
      { label: "Masuk", href: "/login" },
      { label: "Daftar", href: "/register" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { label: "Syarat & Ketentuan", href: "/legal/terms" },
      { label: "Kebijakan Privasi", href: "/legal/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="overflow-hidden bg-[#0a0a0c] text-white">
      <Container className="py-14">
        <div className="grid gap-12 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-xs">
            <Image src="/images/logo/logotext-white.svg" alt="valostock" width={146} height={30} />
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
              Top-up Valorant, Mobile Legends, Genshin Impact, dan Free Fire. Bayar lewat QRIS, Virtual Account,
              e-wallet, retail, kartu kredit, atau Balance.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-14 border-t border-white/10 pt-8 text-center text-sm text-zinc-500 sm:text-left">
          © {new Date().getFullYear()} valostock.id. Seluruh hak cipta dilindungi.
        </p>
      </Container>

      {/* Giant brand watermark, cropped at the bottom */}
      <div aria-hidden className="pointer-events-none select-none">
        <p className="-mb-[7vw] text-center font-display text-[19vw] font-bold leading-[0.8] tracking-tight text-white/[0.04]">
          valostock
        </p>
      </div>
    </footer>
  );
}
