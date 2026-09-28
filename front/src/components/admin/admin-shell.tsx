import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/stores", label: "Verifikasi Toko" },
  { href: "/admin/withdrawals", label: "Penarikan Dana" },
  { href: "/admin/analytics", label: "Analytics Top-Up" },
];

/** Shared frame of the admin pages (DFD 8.0). Access is enforced by the API; the page guard only redirects. */
export function AdminShell({
  active,
  title,
  description,
  children,
}: {
  active: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-8 sm:py-10">
            <Badge>ADMIN</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">{description}</p>
            <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Menu admin">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active === link.href ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                    active === link.href
                      ? "bg-primary text-white"
                      : "border border-border bg-background text-text-secondary hover:text-text",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </Container>
        </section>
        <Container className="py-8 sm:py-10">{children}</Container>
      </main>
      <Footer />
    </div>
  );
}
