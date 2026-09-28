import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { requireUser } from "@/lib/auth";
import { getMyDisputes, getMyOrders } from "@/lib/data/buyer";
import { disputeReasonLabel, disputeStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Proteksi & Sengketa — valostock.id" };

export default async function InsuredOrdersPage() {
  await requireUser("/account/orders/insured");
  const [disputes, orders] = await Promise.all([getMyDisputes(), getMyOrders()]);
  const protectedOrders = orders.filter((o) => o.canDispute);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader
          title="Sengketa & Klaim Proteksi"
          description="Buka sengketa dari halaman pesanan selama dana masih ditahan, atau dalam masa proteksi 14/30 hari setelah selesai."
        />
        {disputes.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={ShieldCheck} title="Belum ada sengketa" body="Semoga tidak pernah perlu — jika ada masalah, ajukan dari halaman pesananmu." />
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {disputes.map((d) => (
              <li key={d.id}>
                <Link href={`/disputes/${d.id}`} className="block rounded-xl border border-border bg-surface p-4 hover:border-primary/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-sm font-medium text-text">{d.orderNumber}</span>
                    <Badge variant={d.status === "RESOLVED_BUYER" ? "success" : d.status === "RESOLVED_STORE" || d.status === "CANCELLED" ? "secondary" : "warning"}>
                      {disputeStatusLabel[d.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {disputeReasonLabel[d.reason]} · {d.store.name} · dibuka {formatDbDateTime(d.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <PageHeader title="Pesanan yang masih terlindungi" />
        {protectedOrders.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Tidak ada pesanan dalam masa proteksi.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {protectedOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
                  <span className="min-w-0 truncate text-text">
                    {o.orderNumber} · {o.catalog.title}
                  </span>
                  <span className="flex-none text-xs text-text-secondary">
                    {o.protectionUntil ? `s.d. ${formatDbDateTime(o.protectionUntil)}` : `escrow ${formatRupiah(o.itemPrice)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
