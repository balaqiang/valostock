"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Flag,
  Gamepad2,
  Gavel,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Menu,
  Newspaper,
  Package,
  Receipt,
  ScrollText,
  Send,
  ShieldCheck,
  Store,
  Ticket,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

type Badge = "catalogs" | "stores" | "reports" | "disputes" | "withdrawals" | "transfers";
type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; perm: string; badge?: Badge };

// docs/ADMIN_PANEL.md §1 — menu grouped as in the information architecture.
const SECTIONS: { title?: string; items: Item[] }[] = [
  { items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, perm: "dashboard:view" }] },
  {
    title: "Moderasi",
    items: [
      { label: "Katalog", href: "/admin/catalogs", icon: Package, perm: "catalogs:view", badge: "catalogs" },
      { label: "Toko", href: "/admin/stores", icon: Store, perm: "stores:view", badge: "stores" },
      { label: "Laporan", href: "/admin/reports", icon: Flag, perm: "reports:manage", badge: "reports" },
    ],
  },
  {
    title: "Transaksi",
    items: [
      { label: "Pesanan", href: "/admin/orders", icon: Receipt, perm: "orders:view" },
      { label: "Sengketa", href: "/admin/disputes", icon: Gavel, perm: "disputes:resolve", badge: "disputes" },
      { label: "Top-Up & Balance", href: "/admin/topups", icon: Wallet, perm: "payments:view" },
      { label: "Pembayaran", href: "/admin/payments", icon: CreditCard, perm: "payments:view" },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Penarikan", href: "/admin/withdrawals", icon: HandCoins, perm: "finance:view", badge: "withdrawals" },
      { label: "Transfer", href: "/admin/transfers", icon: Send, perm: "finance:view", badge: "transfers" },
      { label: "Ringkasan", href: "/admin/finance", icon: BarChart3, perm: "finance:view" },
      { label: "Iklan & Langganan", href: "/admin/ads", icon: Megaphone, perm: "ads:manage" },
    ],
  },
  {
    title: "Data Master & Konten",
    items: [
      { label: "Game & Kolom", href: "/admin/games", icon: Gamepad2, perm: "master:manage" },
      { label: "Produk Top-Up", href: "/admin/topup-products", icon: Boxes, perm: "master:manage" },
      { label: "Kode Promo", href: "/admin/promo-codes", icon: Ticket, perm: "master:manage" },
      { label: "Berita", href: "/admin/news", icon: Newspaper, perm: "content:manage" },
      { label: "Pusat Bantuan", href: "/admin/help", icon: LifeBuoy, perm: "content:manage" },
    ],
  },
  {
    title: "Pengguna & Akses",
    items: [
      { label: "Pengguna", href: "/admin/users", icon: Users, perm: "users:view" },
      { label: "Admin & Peran", href: "/admin/admins", icon: UserCog, perm: "rbac:manage" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText, perm: "audit:view" },
      { label: "Analitik Top-Up", href: "/admin/analytics", icon: FileText, perm: "audit:view" },
    ],
  },
];

export type AdminShellInfo = { name: string; email: string; permissions: string[]; counts: Partial<Record<Badge, number>> };

function Nav({ info, onNavigate }: { info: AdminShellInfo; onNavigate?: () => void }) {
  const pathname = usePathname();
  const perms = new Set(info.permissions);
  const all = SECTIONS.flatMap((s) => s.items.map((i) => i.href));
  const current = all.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Menu admin" className="space-y-5" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
      {SECTIONS.map((section, i) => {
        const items = section.items.filter((item) => perms.has(item.perm));
        if (items.length === 0) return null;
        return (
          <div key={section.title ?? i}>
            {section.title && <p className="eyebrow mb-2 px-3 text-text-secondary">{section.title}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.href === current;
                const count = item.badge ? (info.counts[item.badge] ?? 0) : 0;
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
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && <span className="num rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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
        <Nav info={info} onNavigate={onNavigate} />
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

/** Admin panel frame (docs/ADMIN_PANEL.md): sidebar with queue badges; permissions are enforced by the API. */
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
            <form action="/admin/orders" className="min-w-0 max-w-xl flex-1">
              <input
                type="search"
                name="q"
                placeholder="Cari no. pesanan / email / VS code / toko…"
                aria-label="Cari pesanan"
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
