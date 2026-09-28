"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Bell,
  CircleUserRound,
  Coins,
  FileWarning,
  HandCoins,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Buyer account shell per docs/SITEMAP.md §5:
// Orders · Messages · wallet items · My Profile · Help Center.
const sections: {
  title?: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    items: [{ label: "Dashboard", href: "/account", icon: LayoutDashboard }],
  },
  {
    title: "Pesanan",
    items: [
      { label: "Pesanan Saya", href: "/account/orders/my", icon: Package },
      {
        label: "Sengketa & Proteksi",
        href: "/account/orders/insured",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Pesan",
    items: [
      { label: "Notifikasi Pesanan", href: "/account/messages/order", icon: Bell },
      { label: "Notifikasi Sistem", href: "/account/messages/system", icon: Bell },
      { label: "Chat", href: "/account/messages/chat", icon: MessageSquare },
    ],
  },
  {
    title: "Dompet & Aktivitas",
    items: [
      { label: "Transaksi", href: "/account/transactions", icon: ReceiptText },
      { label: "Mutasi", href: "/account/mutation", icon: Coins },
      { label: "Balance", href: "/account/balance", icon: Wallet },
      { label: "Affiliate", href: "/account/affiliate", icon: BadgePercent },
      { label: "Laporan Saya", href: "/account/reports", icon: FileWarning },
      { label: "Penawaran Saya", href: "/account/offers", icon: HandCoins },
      { label: "Wishlist", href: "/account/wishlist", icon: Heart },
      { label: "Mengikuti", href: "/account/following", icon: Store },
      { label: "Poin", href: "/account/points", icon: Coins },
    ],
  },
  {
    items: [
      { label: "Profil Saya", href: "/account/profile", icon: CircleUserRound },
      { label: "Pusat Bantuan", href: "/help", icon: LifeBuoy },
    ],
  },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu akun" className="space-y-5">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="eyebrow mb-2 px-3 text-text-secondary">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
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
