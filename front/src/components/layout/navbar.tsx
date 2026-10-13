"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Menu, Wallet, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useSession } from "@/lib/hooks/use-session";
import { cn } from "@/lib/utils";

// docs/SITEMAP.md — like kepo.id: Top-Up · Cek Invoice · Masuk/Daftar.
const navLinks = [
  { label: "Top-Up", href: "/" },
  { label: "Cek Invoice", href: "/topup/invoice" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || (pathname.startsWith("/topup/") && pathname !== "/topup/invoice");
  return pathname === href;
}

/** Masuk/Daftar for guests; Balance + Akun Saya (+ Panel Admin) when logged in. */
function AuthActions() {
  const session = useSession();

  if (session.status === "loading") return <span aria-hidden className="h-9 w-24" />;

  if (!session.user) {
    return (
      <>
        <Button href="/login" variant="ghost" size="md" className="hidden sm:inline-flex">
          Masuk
        </Button>
        <Button href="/register" variant="primary" size="md">
          Daftar
        </Button>
      </>
    );
  }

  const { user } = session;
  return (
    <>
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text md:inline-flex"
        >
          <BarChart3 className="h-4 w-4" />
          Panel Admin
        </Link>
      )}
      <Link
        href="/balance"
        className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text sm:inline-flex"
      >
        <Wallet className="h-4 w-4" />
        <span className="num font-medium">{user.balance.toLocaleString("id-ID")} BLC</span>
      </Link>
      <Link
        href="/account"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary pl-1.5 pr-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 font-display text-xs font-bold">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate">{user.name}</span>
      </Link>
    </>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSession();

  const mobileLinks = [
    ...navLinks,
    ...(user
      ? [
          { label: "Balance", href: "/balance" },
          { label: "Akun Saya", href: "/account" },
          ...(user.role === "ADMIN" ? [{ label: "Panel Admin", href: "/admin" }] : []),
        ]
      : [
          { label: "Masuk", href: "/login" },
          { label: "Daftar", href: "/register" },
        ]),
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Menu utama" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                isActive(pathname, link.href)
                  ? "font-medium text-primary"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AuthActions />
          <button
            type="button"
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-200 hover:bg-surface-elevated md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.nav
            aria-label="Menu utama"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <Container className="py-3">
              <ul className="space-y-0.5">
                {mobileLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm text-text transition-colors duration-200 hover:bg-surface-elevated"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
