"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/account/bits";
import { cn } from "@/lib/utils";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { MockOrder } from "@/lib/mock/orders";
import type { OrderDetails } from "@/lib/data/buyer";
import { orderStatusLabel } from "@/lib/labels";

// iGV-style tabs per docs/SITEMAP.md §5.1.
const tabs = [
  { key: "all", label: "Semua" },
  { key: "unpaid", label: "Belum Dibayar" },
  { key: "awaiting", label: "Menunggu Pengiriman" },
  { key: "rekber", label: "Di Rekber" },
  { key: "review", label: "Perlu Rating" },
  { key: "completed", label: "Selesai" },
  { key: "aftersales", label: "After-Sales" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function matches(order: MockOrder, tab: TabKey): boolean {
  switch (tab) {
    case "all":
      return true;
    case "unpaid":
      return order.status === "PENDING_PAYMENT";
    case "awaiting":
      return order.status === "PAID";
    case "rekber":
      return order.status === "IN_REKBER" || order.status === "SAFE";
    case "review":
      return order.status === "COMPLETED" && !order.rated;
    case "completed":
      return order.status === "COMPLETED";
    case "aftersales":
      return order.status === "DISPUTED" || order.status === "REFUNDED";
  }
}

export function OrdersExplorer({
  orders,
  details: detailsById,
}: {
  orders: MockOrder[];
  details: Record<string, OrderDetails>;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const orderDetails = (order: MockOrder) => detailsById[order.id] ?? null;

  const term = query.trim().toLowerCase();
  const shown = orders.filter((order) => {
    if (!matches(order, tab)) return false;
    if (!term) return true;
    const details = orderDetails(order);
    return `${order.id} ${details?.listing.title ?? ""}`
      .toLowerCase()
      .includes(term);
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
              tab === item.key
                ? "bg-primary text-white"
                : "border border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari No. Pesanan atau produk…"
          aria-label="Cari pesanan"
          className="h-10 pl-10"
        />
      </div>

      {/* List */}
      {shown.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {shown.map((order) => {
            const details = orderDetails(order);
            if (!details) return null;
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="num block text-xs text-text-secondary">
                      {order.id} · {formatDateShort(order.createdAt)} ·{" "}
                      {details.listing.store}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium text-text group-hover:text-primary">
                      {details.listing.title}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-text">
                      {formatRupiah(details.totalPaid)}
                    </span>
                    <Badge
                      variant={
                        order.status === "COMPLETED"
                          ? "success"
                          : order.status === "PENDING_PAYMENT"
                            ? "warning"
                            : "default"
                      }
                    >
                      {orderStatusLabel[order.status]}
                    </Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={Package}
            title="No orders found"
            body="Tidak ada pesanan di tab ini — coba tab lain atau ubah kata kunci."
          />
        </div>
      )}
    </div>
  );
}
