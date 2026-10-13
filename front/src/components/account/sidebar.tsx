"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Coins, LayoutDashboard, ReceiptText, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

// Akun Saya (docs/SITEMAP.md): dashboard, invoices, Balance ledger, Balance, profile.
const items = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "Transaksi", href: "/account/transactions", icon: ReceiptText },
  { label: "Mutasi", href: "/account/mutation", icon: Coins },
  { label: "Balance", href: "/balance", icon: Wallet },
  { label: "Profil Saya", href: "/account/profile", icon: CircleUserRound },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu akun">
      <ul className="space-y-0.5">
        {items.map((item) => {
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
    </nav>
  );
}
