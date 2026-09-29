"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Megaphone,
  Store,
  ChevronDown,
  Gamepad2,
  Menu,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { Game as MockGame } from "@/types/domain";
import { useSession } from "@/lib/hooks/use-session";

// SITEMAP §1 top nav: Logo · Search · Games ▾ · Top-Up · News · Help · Login/Register
const navLinks = [
  { label: "Top-Up", href: "/topup" },
  { label: "Cek Invoice", href: "/topup/invoice" },
  { label: "Berita", href: "/news" },
  { label: "Bantuan", href: "/help" },
];

function GamesDropdown({ solid, games }: { solid: boolean; games: MockGame[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-sm transition-colors duration-200 ${
          solid
            ? "text-text-secondary hover:text-text"
            : "text-white/75 hover:text-white"
        }`}
      >
        Games
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-3 w-64 rounded-xl border border-border bg-background p-2 shadow-xl shadow-black/5"
          >
            {games.map((game) => (
              <div
                key={game.slug}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-surface-elevated"
              >
                <Link
                  href={
                    game.supportsAccount
                      ? `/${game.slug}/account`
                      : `/${game.slug}/topup`
                  }
                  onClick={() => setOpen(false)}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-sm font-medium text-text">
                    {game.name}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {game.tagline}
                  </span>
                </Link>
                <span className="flex flex-none gap-1">
                  {game.supportsAccount && (
                    <Link
                      href={`/${game.slug}/account`}
                      onClick={() => setOpen(false)}
                      aria-label={`Akun ${game.name}`}
                      className="rounded-md border border-border p-1.5 text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {game.supportsTopup && (
                    <Link
                      href={`/${game.slug}/topup`}
                      onClick={() => setOpen(false)}
                      aria-label={`Top-up ${game.name}`}
                      className="rounded-md border border-border p-1.5 text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Login/Register for guests; balance + account (+ admin analytics) when logged in. */
function AuthActions({ solid }: { solid: boolean }) {
  const session = useSession();
  const quiet = solid
    ? "text-text-secondary hover:bg-surface-elevated hover:text-text"
    : "text-white/80 hover:bg-white/10 hover:text-white";

  if (session.status === "loading") {
    return <span aria-hidden className="h-9 w-24 rounded-lg" />;
  }

  if (!session.user) {
    return (
      <>
        <Button
          href="/login"
          variant="ghost"
          size="md"
          className={`hidden sm:inline-flex ${solid ? "" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
        >
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
          aria-label="Panel admin"
          className={`hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-200 md:inline-flex ${quiet}`}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden xl:inline">Admin</span>
        </Link>
      )}
      {user.store && (
        <Link
          href={["ACTIVE", "SUSPENDED", "PENDING_REVIEW"].includes(user.store.status) ? "/store-dashboard" : "/sell"}
          aria-label="Toko saya"
          className={`hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-200 md:inline-flex ${quiet}`}
        >
          <Store className="h-4 w-4" />
          <span className="hidden xl:inline">Toko Saya</span>
        </Link>
      )}
      <Link
        href="/account/messages/order"
        aria-label={`Notifikasi${user.unreadNotifications ? ` (${user.unreadNotifications} belum dibaca)` : ""}`}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 ${quiet}`}
      >
        <Bell className="h-4 w-4" />
        {user.unreadNotifications > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {user.unreadNotifications > 99 ? "99+" : user.unreadNotifications}
          </span>
        )}
      </Link>
      <Link
        href="/account/balance"
        className={`hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-200 sm:inline-flex ${quiet}`}
      >
        <Wallet className="h-4 w-4" />
        <span className="num font-medium">
          {user.balance.toLocaleString("id-ID")} BLC
        </span>
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

/**
 * `overlay` (default): transparent over a dark hero, turns solid on scroll.
 * `solid`: always solid — for pages without a dark hero behind the nav.
 */
export function NavbarClient({
  variant = "overlay",
  games,
  announcement,
}: {
  variant?: "overlay" | "solid";
  games: MockGame[];
  /** CMS announcement bar (Admin → CMS Situs). */
  announcement?: { text: string; link: string | null } | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSession();

  useEffect(() => {
    if (variant === "solid") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const solid = variant === "solid" || scrolled || mobileOpen;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        solid
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      {announcement && (
        <div className="flex h-9 items-center justify-center bg-primary px-4 text-center text-xs font-medium text-white sm:text-sm">
          {announcement.link ? (
            <Link href={announcement.link} className="inline-flex min-w-0 items-center gap-1.5 hover:underline">
              <Megaphone className="h-3.5 w-3.5 flex-none" />
              <span className="truncate">{announcement.text}</span>
              <ArrowRight className="h-3.5 w-3.5 flex-none" />
            </Link>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5 flex-none" />
              <span className="truncate">{announcement.text}</span>
            </span>
          )}
        </div>
      )}
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-8">
          <Logo white={!solid} />
          <nav className="hidden items-center gap-6 lg:flex">
            <GamesDropdown solid={solid} games={games} />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-sm transition-colors duration-200 ${
                  solid
                    ? "text-text-secondary hover:text-text"
                    : "text-white/75 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/search"
            aria-label="Cari akun"
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-200 ${
              solid
                ? "text-text-secondary hover:bg-surface-elevated hover:text-text"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Search className="h-4 w-4" />
            <span className="hidden xl:inline">Cari akun…</span>
          </Link>
          <ThemeToggle over={!solid} />
          <AuthActions solid={solid} />
          <button
            type="button"
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 lg:hidden ${
              solid
                ? "text-text-secondary hover:bg-surface-elevated hover:text-text"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-b border-border bg-background lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              <p className="eyebrow px-3 pb-1 text-text-secondary">Games</p>
              {games.map((game) => (
                <Link
                  key={game.slug}
                  href={
                    game.supportsAccount
                      ? `/${game.slug}/account`
                      : `/${game.slug}/topup`
                  }
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-text transition-colors duration-200 hover:bg-surface-elevated"
                >
                  {game.name}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              {[{ label: "Cari akun", href: "/search" }, ...navLinks].map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-text transition-colors duration-200 hover:bg-surface-elevated"
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <div className="my-2 border-t border-border" />
              {(user
                ? [
                    { label: "Akun Saya", href: "/account" },
                    { label: "Toko Saya", href: "/sell" },
                    ...(user.role === "ADMIN" ? [{ label: "Panel Admin", href: "/admin/stores" }] : []),
                  ]
                : [{ label: "Masuk", href: "/login" }]
              ).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-text transition-colors duration-200 hover:bg-surface-elevated"
                >
                  {link.label}
                </Link>
              ))}
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
