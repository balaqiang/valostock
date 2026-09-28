"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Gem,
  HandCoins,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  MessageSquare,
  Package,
  PackagePlus,
  Settings,
  Star,
  Ticket,
  Timer,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Store shell per docs/SITEMAP.md §7.
const sections: {
  title?: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    items: [
      { label: "Overview", href: "/store-dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Penjualan",
    items: [
      { label: "Katalog", href: "/store-dashboard/catalogs", icon: Package },
      { label: "Listing Baru", href: "/store-dashboard/catalogs/new", icon: PackagePlus },
      { label: "Penawaran Masuk", href: "/store-dashboard/offers", icon: HandCoins },
      { label: "Pesanan & Rekber", href: "/store-dashboard/orders", icon: Timer },
    ],
  },
  {
    title: "Reseller",
    items: [
      {
        label: "Penjual Eksternal",
        href: "/store-dashboard/external-sellers",
        icon: Users,
      },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Saldo & Penarikan", href: "/store-dashboard/balance", icon: Wallet },
      { label: "Langganan", href: "/store-dashboard/subscription", icon: Gem },
    ],
  },
  {
    title: "Promosi",
    items: [
      { label: "Iklan & Featured", href: "/store-dashboard/ads", icon: Megaphone },
      { label: "Voucher", href: "/store-dashboard/vouchers", icon: Ticket },
      { label: "Flash Sale", href: "/store-dashboard/flash-sales", icon: Zap },
      { label: "Bundel", href: "/store-dashboard/bundles", icon: BadgePercent },
    ],
  },
  {
    title: "Toko",
    items: [
      {
        label: "Homepage Editor",
        href: "/store-dashboard/homepage-editor",
        icon: LayoutTemplate,
      },
      { label: "Analytics", href: "/store-dashboard/analytics", icon: BarChart3 },
      { label: "Ulasan", href: "/store-dashboard/ratings", icon: Star },
      { label: "Chat Pembeli", href: "/store-dashboard/chat", icon: MessageSquare },
      { label: "Pengaturan", href: "/store-dashboard/settings", icon: Settings },
    ],
  },
];

const allHrefs = sections.flatMap((section) =>
  section.items.map((item) => item.href),
);

/** Longest-prefix match so only the most specific item is active
 *  (e.g. /catalogs/new lights "Listing Baru", not also "Katalog"). */
function activeHref(pathname: string): string | undefined {
  return allHrefs
    .filter(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
}

export function StoreSidebar() {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav aria-label="Menu toko" className="space-y-5">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="eyebrow mb-2 px-3 text-text-secondary">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-text-secondary hover:bg-surface-elevated hover:text-text",
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-none" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
