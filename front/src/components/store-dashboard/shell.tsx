"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  ExternalLink,
  Gem,
  LifeBuoy,
  Menu,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StoreSidebar } from "@/components/store-dashboard/sidebar";
import type { StoreType } from "@/types/domain";
import { storeTypeLabel } from "@/lib/labels";

/** What the shell shows about the logged-in owner's store (loaded by the layout). */
export type ShellInfo = {
  name: string;
  slug: string;
  type: StoreType;
  status: string;
  tier: string;
  commissionRate: number;
  /** Things needing action (rekber delivery, disputes) + pending offers. */
  alertCount: number;
  unreadChats: number;
  pendingOffers: number;
  /** Paid orders waiting for the store to send the account. */
  toDeliver: number;
};

function SidebarContent({ onNavigate, info }: { onNavigate?: () => void; info: ShellInfo }) {
  const storeSettings = info;
  const mySubscription = info;
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 flex-none items-center gap-2 border-b border-border px-5">
        <Logo />
        <span className="eyebrow mt-0.5 text-text-secondary">Seller</span>
      </div>

      {/* Store identity */}
      <div className="flex-none border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
            {storeSettings.name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <span className="truncate">{storeSettings.name}</span>
              <BadgeCheck className="h-4 w-4 flex-none text-primary" />
            </span>
            <span className="block text-xs text-text-secondary">
              {storeTypeLabel[storeSettings.type]}
            </span>
          </span>
        </div>
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Gem className="h-3 w-3" />
          {mySubscription.tier} · komisi{" "}
          <span className="num">
            {(mySubscription.commissionRate * 100).toLocaleString("id-ID")}%
          </span>
        </p>
      </div>

      {/* Nav (scrollable) */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) onNavigate?.();
        }}
      >
        <StoreSidebar type={info.type} badges={{ offers: info.pendingOffers, orders: info.toDeliver, chat: info.unreadChats }} />
      </div>

      {/* Bottom links */}
      <div className="flex-none border-t border-border p-3">
        <Link
          href={`/store/${storeSettings.slug}`}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text"
        >
          <ExternalLink className="h-4 w-4 flex-none" />
          Lihat Etalase
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text"
        >
          <LifeBuoy className="h-4 w-4 flex-none" />
          Pusat Bantuan
        </Link>
      </div>
    </div>
  );
}

function IconButton({
  label,
  href,
  count,
  children,
}: {
  label: string;
  href: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text"
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

/** Professional dashboard shell — fixed sidebar + topbar, no public nav/footer. */
export function StoreDashboardShell({
  children,
  info,
}: {
  children: React.ReactNode;
  info: ShellInfo;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { alertCount, unreadChats } = info;
  const storeSettings = info;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background lg:block">
        <SidebarContent info={info} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
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
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-elevated hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent info={info} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="dashboard-canvas flex min-h-screen flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="relative min-w-0 flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="search"
                placeholder="Cari pesanan, katalog, atau pembeli…"
                aria-label="Cari di dashboard"
                className="h-10 w-full rounded-full border border-border bg-surface-elevated/60 pl-10 pr-4 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:bg-background focus:outline-none"
              />
            </div>

            <div className="ml-auto flex flex-none items-center gap-1">
              <IconButton
                label="Notifikasi"
                href="/store-dashboard/notifications"
                count={alertCount}
              >
                <Bell className="h-[18px] w-[18px]" />
              </IconButton>
              <IconButton
                label="Chat pembeli"
                href="/store-dashboard/chat"
                count={unreadChats}
              >
                <MessageSquare className="h-[18px] w-[18px]" />
              </IconButton>
              <ThemeToggle />
              <span
                aria-hidden
                className="mx-2 hidden h-6 w-px bg-border sm:block"
              />
              <Link
                href="/store-dashboard/settings"
                className="flex items-center gap-2.5 rounded-full p-1 pr-3 transition-colors duration-200 hover:bg-surface-elevated"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 font-display text-sm font-bold text-white">
                  {storeSettings.name.charAt(0)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold leading-tight text-text">
                    {storeSettings.name}
                  </span>
                  <span className="block text-[11px] leading-tight text-text-secondary">
                    Store Admin
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </header>

        {info.status === "PENDING_REVIEW" && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 sm:px-6 dark:text-amber-300">
            Toko sedang <strong>diverifikasi admin</strong>. Kamu sudah bisa menyiapkan katalog sebagai draf, pengajuan ke admin dan penjualan dibuka setelah toko disetujui.
          </div>
        )}
        {info.status === "CLOSING" && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 sm:px-6 dark:text-amber-300">
            Toko sedang <strong>mengajukan penutupan</strong>, katalog disembunyikan. Admin akan meninjau dan mengembalikan sisa deposit.
          </div>
        )}
        {info.status === "SUSPENDED" && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 sm:px-6 dark:text-red-300">
            Toko sedang <strong>ditangguhkan</strong> admin, katalog disembunyikan dan transaksi baru dinonaktifkan. Hubungi support.
          </div>
        )}
        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
