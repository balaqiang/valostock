import Link from "next/link";
import { Logo } from "@/components/ui/logo";

// Auth pages (docs/SITEMAP.md §2) — centered card, no full nav/footer.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="flex h-16 items-center justify-center">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-text-secondary">
        © {new Date().getFullYear()} valostock.id ·{" "}
        <Link href="/legal/terms" className="hover:text-text">
          Syarat
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacy" className="hover:text-text">
          Privasi
        </Link>{" "}
        ·{" "}
        <Link href="/help" className="hover:text-text">
          Bantuan
        </Link>
      </footer>
    </div>
  );
}
