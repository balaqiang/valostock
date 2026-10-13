"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Boxes, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

// Panel Admin (docs/SITEMAP.md, SKPL 4.3.13–4.3.15).
const ITEMS = [
  { label: "Analitik Top-Up", href: "/admin/analytics", icon: BarChart3 },
  { label: "Top-Up & Balance", href: "/admin/topups", icon: Wallet },
  { label: "Produk Top-Up", href: "/admin/topup-products", icon: Boxes },
];

export type AdminShellInfo = { name: string; email: string };

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu admin" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
      <ul className="space-y-0.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-elevated hover:text-text",
                )}
              >
                <item.icon className="h-4 w-4 flex-none" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarContent({ info, onNavigate }: { info: AdminShellInfo; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 flex-none items-center gap-2 border-b border-border px-5">
        <Logo />
        <span className="eyebrow mt-0.5 text-text-secondary">Admin</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <Nav onNavigate={onNavigate} />
      </div>
      <div className="flex-none border-t border-border p-3 text-xs text-text-secondary">
        <p className="flex items-center gap-1.5 px-3 font-medium text-text">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {info.name}
        </p>
        <p className="truncate px-3">{info.email}</p>
        <div className="mt-2 px-1">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

/** Admin panel frame: sidebar + top bar; the API checks the admin role on every call. */
export function AdminShell({ info, children }: { info: AdminShellInfo; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background lg:block">
        <SidebarContent info={info} />
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background lg:hidden"
            >
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-elevated"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent info={info} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="dashboard-canvas flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-elevated lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form action="/admin/topups" className="min-w-0 max-w-xl flex-1">
              <input
                type="search"
                name="q"
                placeholder="Cari no. invoice / email / ID akun game…"
                aria-label="Cari invoice"
                className="h-10 w-full rounded-full border border-border bg-surface-elevated/60 px-4 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:bg-background focus:outline-none"
              />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/" className="hidden text-xs text-text-secondary hover:text-primary sm:block">
                Lihat situs →
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
