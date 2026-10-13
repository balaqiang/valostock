"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, HandCoins, Heart, Loader2, Lock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatStoreButton } from "@/components/chat/chat-store-button";
import { ReportButton } from "@/components/account/report-button";
import { BuyButton } from "@/components/listings/buy-button";
import { StartPayment } from "@/components/payment/start-payment";
import { ApiError, apiFetch } from "@/lib/api";
import { LOCK_FEE } from "@/lib/fees";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { offerStatusLabel } from "@/lib/labels";
import type { BuyContext } from "@/types/api";

/**
 * Buy box of a catalog: buy (optionally with a store voucher), offer / counter,
 * paid lock, wishlist, chat, report. Prices are final only on the server.
 */
export function BuyPanel({
  catalogId,
  price,
  status,
  storeSlug,
  context,
  loggedIn,
}: {
  catalogId: string;
  price: number;
  status: string;
  storeSlug: string;
  context: BuyContext | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const returnTo = `/catalog/${catalogId}`;
  const [voucher, setVoucher] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(context?.wishlisted ?? false);

  // Count the view (+ recently viewed for logged-in buyers) once per page load.
  useEffect(() => {
    void apiFetch(`/api/listings/${catalogId}/view`, { method: "POST" }).catch(() => undefined);
  }, [catalogId]);

  const lock = context?.lock;
  const lockedByOther = Boolean(lock && !lock.mine);
  const available = status === "LISTED" && !lockedByOther;
  const offer = context?.offer;

  const guard = () => {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return false;
    }
    return true;
  };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (!guard()) return;
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      else setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  };

  if (context?.isOwner) {
    return (
      <div className="rounded-xl bg-surface-elevated p-4 text-sm text-text-secondary">
        Ini katalog tokomu.{" "}
        <Link href={`/store-dashboard/catalogs/${catalogId}`} className="font-medium text-primary">
          Kelola di dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {context?.openOrderId && (
        <Link href={`/checkout/${context.openOrderId}/pay`} className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Kamu punya pesanan menunggu pembayaran untuk akun ini, lanjutkan bayar →
        </Link>
      )}
      {lock && (
        <p className={`rounded-lg px-3 py-2 text-xs ${lock.mine ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          <Lock className="mr-1 inline h-3.5 w-3.5" />
          {lock.mine ? "Dikunci untukmu" : "Sedang dikunci pembeli lain"} sampai {formatDbDateTime(lock.expiresAt)}
        </p>
      )}

      {offer?.status === "ACCEPTED" && offer.finalAmount ? (
        <BuyButton catalogId={catalogId} offerId={offer.id} voucherCode={voucher} available={available} label={`Beli ${formatRupiah(offer.finalAmount)} (hasil nego)`} returnTo={returnTo} />
      ) : (
        <BuyButton catalogId={catalogId} voucherCode={voucher} available={available} returnTo={returnTo} />
      )}

      {context && context.vouchers.length > 0 && available && (
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <Ticket className="h-4 w-4 text-primary" />
          <select value={voucher} onChange={(e) => setVoucher(e.target.value)} className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-text">
            <option value="">Tanpa voucher toko</option>
            {context.vouchers.map((v) => (
              <option key={v.code} value={v.code} disabled={price < v.minSpend}>
                {v.code}, {v.kind === "PERCENT" ? `${v.value}%` : formatRupiah(v.value)}
                {v.minSpend > 0 ? ` (min. ${formatRupiah(v.minSpend)})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Offer / negotiation */}
      {available && (
        <div className="rounded-xl border border-border p-3">
          {offer ? (
            <div className="space-y-2 text-xs text-text-secondary">
              <p>
                Tawaranmu <span className="num font-medium text-text">{formatRupiah(offer.amount)}</span> ·{" "}
                <span className="font-medium text-text">{offerStatusLabel[offer.status]}</span>
              </p>
              {offer.status === "COUNTERED" && offer.counterAmount && (
                <Button
                  size="md"
                  className="w-full"
                  onClick={() => run("accept", () => apiFetch(`/api/offers/${offer.id}/accept-counter`, { method: "POST" }))}
                  disabled={busy !== null}
                >
                  {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Terima tawaran balik {formatRupiah(offer.counterAmount)}
                </Button>
              )}
              <p>Berlaku s.d. {formatDbDateTime(offer.expiresAt)}</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Tawar harga (Rp)"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="num h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none"
              />
              <Button
                variant="secondary"
                onClick={() =>
                  run("offer", () => apiFetch("/api/offers", { method: "POST", body: JSON.stringify({ catalogId, amount: Number(offerAmount) }) }))
                }
                disabled={busy !== null || !offerAmount}
              >
                {busy === "offer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                Tawar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Paid lock */}
      {available && !lock && loggedIn && (
        <details className="rounded-xl border border-border p-3 text-xs text-text-secondary">
          <summary className="cursor-pointer font-medium text-text">
            <Lock className="mr-1 inline h-3.5 w-3.5" /> Kunci akun 30 menit ({formatRupiah(LOCK_FEE)})
          </summary>
          <p className="my-2">Selama dikunci, hanya kamu yang bisa membeli akun ini. Biaya lock tidak dikembalikan.</p>
          <StartPayment endpoint={`/api/catalogs/${catalogId}/lock`} label="Bayar lock" compact />
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() =>
            run("wish", async () => {
              await apiFetch(wishlisted ? `/api/me/wishlist/${catalogId}` : "/api/me/wishlist", {
                method: wishlisted ? "DELETE" : "POST",
                body: wishlisted ? undefined : JSON.stringify({ catalogId }),
              });
              setWishlisted(!wishlisted);
            })
          }
          className={`inline-flex items-center gap-1.5 text-xs ${wishlisted ? "text-red-500" : "text-text-secondary hover:text-primary"}`}
        >
          {busy === "wish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-red-500" : ""}`} />}
          {wishlisted ? "Tersimpan di wishlist" : "Wishlist"}
        </button>
        <ChatStoreButton storeSlug={storeSlug} catalogId={catalogId} returnTo={returnTo} variant="ghost" />
      </div>
      <ReportButton targetType="CATALOG" targetId={catalogId} returnTo={returnTo} />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
