import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { AccountPanel } from "@/components/account/account-panel";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireUser } from "@/lib/auth";

// Buyer account shell (docs/SITEMAP.md §5) — Etherscan-style account area:
// dark hero band, profile card with grouped nav, content cards overlapping
// the hero. `auth` guarded server-side (each page re-checks for its own data).
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-elevated/40 pt-16">
      <Navbar variant="solid" />

      {/* Dark hero band */}
      <div className="relative bg-zinc-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_0%,rgba(124,58,237,0.25),transparent_60%)]"
        />
        <Container className="relative flex items-start justify-between gap-4 pb-24 pt-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors duration-200 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Beranda
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              Akun Saya
            </h1>
          </div>
          <LogoutButton />
        </Container>
      </div>

      {/* Content overlapping the hero — needs its own stacking layer,
          otherwise the positioned hero paints over the card tops. */}
      <main className="flex-1">
        <Container className="relative z-10 -mt-16 pb-12">
          <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
            <AccountPanel name={user.name} email={user.email} />
            <div className="min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              {children}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
