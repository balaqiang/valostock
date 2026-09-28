"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, HandCoins, Loader2, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/account/bits";
import { apiFetch } from "@/lib/api";
import { offerStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { OfferView } from "@/types/api";

const tone = (status: OfferView["status"]) =>
  status === "ACCEPTED" || status === "USED" ? "success" : status === "COUNTERED" || status === "PENDING" ? "warning" : "secondary";

/** Accept / counter / reject — the API validates each transition and notifies the buyer. */
export function OffersInbox({ offers }: { offers: OfferView[] }) {
  const router = useRouter();
  const [countering, setCountering] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const act = async (offer: OfferView, action: "accept" | "reject" | "counter") => {
    if (action === "reject" && !window.confirm("Tolak tawaran ini?")) return;
    setBusy(`${offer.id}:${action}`);
    setError(null);
    try {
      await apiFetch(`/api/offers/${offer.id}/${action}`, {
        method: "POST",
        body: action === "counter" ? JSON.stringify({ amount: Number(counterValue) }) : undefined,
      });
      setCountering(null);
      setCounterValue("");
      router.refresh();
    } catch (err: unknown) {
      setError({ id: offer.id, message: err instanceof Error ? err.message : "Gagal." });
    } finally {
      setBusy(null);
    }
  };

  const pending = offers.filter((o) => o.status === "PENDING");
  const others = offers.filter((o) => o.status !== "PENDING");

  const render = (offer: OfferView) => (
    <li key={offer.id} className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/catalog/${offer.catalog.id}`} className="truncate text-sm font-medium text-text hover:text-primary">
          {offer.catalog.vsCode} · {offer.catalog.title}
        </Link>
        <Badge variant={tone(offer.status)}>{offerStatusLabel[offer.status]}</Badge>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        <span className="font-medium text-text">{offer.buyer.name}</span> menawar{" "}
        <span className="num font-semibold text-text">{formatRupiah(offer.amount)}</span> dari harga{" "}
        <span className="num">{formatRupiah(offer.catalog.price)}</span>
        {offer.counterAmount && (
          <>
            {" "}
            · tawaran balikmu <span className="num font-semibold text-text">{formatRupiah(offer.counterAmount)}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        Masuk {formatDbDateTime(offer.createdAt)} · berlaku sampai {formatDbDateTime(offer.expiresAt)}
      </p>

      {offer.status === "PENDING" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="md" onClick={() => act(offer, "accept")} disabled={busy !== null}>
            {busy === `${offer.id}:accept` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Terima
          </Button>
          {countering === offer.id ? (
            <>
              <Input
                type="number"
                value={counterValue}
                onChange={(e) => setCounterValue(e.target.value)}
                placeholder="Harga tawaran balik"
                className="num h-9 w-44"
              />
              <Button size="md" variant="secondary" onClick={() => act(offer, "counter")} disabled={busy !== null || !counterValue}>
                {busy === `${offer.id}:counter` && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim
              </Button>
              <Button size="md" variant="ghost" onClick={() => setCountering(null)}>
                Batal
              </Button>
            </>
          ) : (
            <Button size="md" variant="secondary" onClick={() => setCountering(offer.id)} disabled={busy !== null}>
              <Undo2 className="h-4 w-4" /> Tawar balik
            </Button>
          )}
          <Button size="md" variant="ghost" onClick={() => act(offer, "reject")} disabled={busy !== null}>
            <X className="h-4 w-4" /> Tolak
          </Button>
        </div>
      )}
      {error?.id === offer.id && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error.message}</p>}
    </li>
  );

  if (offers.length === 0) {
    return <EmptyState icon={HandCoins} title="Belum ada tawaran" body="Tawaran pembeli untuk katalogmu akan muncul di sini." />;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">Menunggu jawabanmu ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-text-secondary">Semua tawaran sudah dijawab.</p> : <ul className="space-y-3">{pending.map(render)}</ul>}
      </section>
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Riwayat</h2>
          <ul className="space-y-3">{others.map(render)}</ul>
        </section>
      )}
    </div>
  );
}
