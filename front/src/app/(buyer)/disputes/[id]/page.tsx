import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gavel } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/dashboard/action-button";
import { DisputeResolver } from "@/components/admin/dispute-resolver";
import { DisputeEventForm } from "@/components/orders/dispute-event-form";
import { requireUser } from "@/lib/auth";
import { getDispute } from "@/lib/data/buyer";
import { disputeReasonLabel, disputeStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sengketa | valostock.id" };

const ROLE = { BUYER: "Pembeli", STORE: "Toko", ADMIN: "Admin", SYSTEM: "Sistem" } as const;
const OPEN = new Set(["OPEN", "STORE_RESPONDED", "IN_REVIEW"]);

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/disputes/${id}`);
  const data = await getDispute(id);
  if (!data) notFound();
  const { dispute: d, events, viewerRole } = data;
  const open = OPEN.has(d.status);
  const canResolve = viewerRole === "ADMIN" && user.permissions.includes("disputes:resolve");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex-1">
        <Container className="max-w-4xl py-8 sm:py-10">
          <Link
            href={viewerRole === "ADMIN" ? "/admin/disputes" : viewerRole === "STORE" ? "/store-dashboard/disputes" : `/orders/${d.orderId}`}
            className="text-sm text-text-secondary hover:text-primary"
          >
            ← Kembali
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-text">
              <Gavel className="h-6 w-6 text-primary" /> Sengketa {d.orderNumber}
            </h1>
            <Badge variant={open ? "warning" : "secondary"}>{disputeStatusLabel[d.status]}</Badge>
          </div>
          <dl className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-text-secondary">Alasan</dt>
              <dd className="font-medium text-text">{disputeReasonLabel[d.reason]}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">Pembeli · Toko</dt>
              <dd className="font-medium text-text">
                {d.buyer.name} ·{" "}
                <Link href={`/store/${d.store.slug}`} className="text-primary">
                  {d.store.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">Nilai</dt>
              <dd className="num font-medium text-text">
                {formatRupiah(d.itemPrice)} (total dibayar {formatRupiah(d.totalPaid)})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">Tenggat tanggapan toko</dt>
              <dd className={cn("font-medium", d.overdue ? "text-red-600" : "text-text")}>
                {formatDbDateTime(d.storeDeadline)} {d.overdue && "· lewat tenggat"}
              </dd>
            </div>
            {d.openedAfterCompletion && <p className="text-xs text-text-secondary sm:col-span-2">Dibuka setelah pesanan selesai (masa proteksi).</p>}
            {d.resolutionNote && (
              <p className="rounded-lg bg-surface-elevated px-3 py-2 text-sm sm:col-span-2">
                <span className="font-medium">Putusan:</span> {d.resolutionNote}
                {d.refundAmount > 0 && <> · dana dikembalikan/kompensasi {formatRupiah(d.refundAmount)}</>}
              </p>
            )}
          </dl>

          <h2 className="mt-8 font-display text-lg font-bold text-text">Timeline</h2>
          <ol className="mt-3 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-text">
                    {e.actorName} <span className="font-normal text-text-secondary">· {ROLE[e.actorRole]}</span>
                  </span>
                  <span className="text-text-secondary">{formatDbDateTime(e.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">{e.body}</p>
                {e.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                    {e.attachments.map((a, i) =>
                      a.url ? (
                        <li key={a.path}>
                          <a href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">
                            Bukti {i + 1}
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          {open && (
            <div className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text">{viewerRole === "ADMIN" ? "Catatan admin" : "Tambahkan pernyataan / bukti"}</h2>
              <DisputeEventForm
                disputeId={d.id}
                placeholder={viewerRole === "STORE" ? "Tanggapan toko beserta bukti (tangkapan layar rekber, video)…" : "Tulis pernyataan atau bukti tambahan…"}
              />
              {viewerRole === "BUYER" && (
                <ActionButton variant="ghost" endpoint={`/api/disputes/${d.id}/cancel`} confirm="Batalkan sengketa? Pesanan dilanjutkan seperti semula.">
                  Batalkan sengketa
                </ActionButton>
              )}
            </div>
          )}

          {open && canResolve && (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="mb-3 text-sm font-semibold text-text">Putusan admin</h2>
              <DisputeResolver disputeId={d.id} afterCompletion={d.openedAfterCompletion} itemPrice={d.itemPrice} />
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
