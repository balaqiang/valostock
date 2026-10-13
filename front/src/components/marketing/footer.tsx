import Image from "next/image";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { siteText } from "@/lib/data/site";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Cari akun", href: "/search" },
      { label: "Akun Valorant", href: "/valorant/account" },
      { label: "Akun Mobile Legends", href: "/mobile-legends/account" },
      { label: "Top-Up", href: "/topup" },
      { label: "Cek Invoice", href: "/topup/invoice" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Pusat Bantuan", href: "/help" },
      { label: "Buka Toko", href: "/sell" },
      { label: "Berita", href: "/news" },
      { label: "Tentang Kami", href: "/about" },
      { label: "Kontak", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Syarat & Ketentuan", href: "/legal/terms" },
      { label: "Kebijakan Privasi", href: "/legal/privacy" },
      { label: "Kebijakan Refund", href: "/legal/refund" },
    ],
  },
];

export async function Footer() {
  const t = await siteText();
  const email = t("footer.email");
  const whatsapp = t("footer.whatsapp");
  return (
    <footer className="overflow-hidden bg-[#0a0a0c] text-white">
      {/* Newsletter */}
      <Container className="pt-20">
        <div className="grid items-center gap-8 border-b border-white/10 pb-16 lg:grid-cols-2">
          <div>
            <h2 className="whitespace-pre-line font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("footer.newsletter.title")}
            </h2>
            <p className="mt-4 max-w-md text-zinc-400">{t("footer.newsletter.subtitle")}</p>
          </div>
          <form className="flex w-full max-w-md gap-3 lg:ml-auto">
            <input
              type="email"
              required
              placeholder="Alamat email kamu"
              aria-label="Alamat email"
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Daftar
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </Container>

      {/* Link columns */}
      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Image
              src="/images/logo/logotext-white.svg"
              alt="valostock"
              width={146}
              height={30}
            />
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">{t("footer.tagline")}</p>
            {(email || whatsapp) && (
              <ul className="mt-5 space-y-2 text-sm text-zinc-400">
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                      <Mail className="h-4 w-4" />
                      {email}
                    </a>
                  </li>
                )}
                {whatsapp && (
                  <li>
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                      <MessageCircle className="h-4 w-4" />
                      +{whatsapp}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} valostock.id. Seluruh hak cipta
            dilindungi.
          </p>
          {t("footer.bottom") && <p className="text-sm text-zinc-500">{t("footer.bottom")}</p>}
        </div>
      </Container>

      {/* Giant brand watermark, cropped at the bottom (Saki-style) */}
      <div aria-hidden className="pointer-events-none select-none">
        <p className="-mb-[7vw] text-center font-display text-[19vw] font-bold leading-[0.8] tracking-tight text-white/[0.04]">
          valostock
        </p>
      </div>
    </footer>
  );
}
