"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/form-alert";
import { apiFetch } from "@/lib/api";
import type { OrderView } from "@/types/api";

type Action = "cancel" | "safe" | "complete";

const confirmText: Record<Action, string> = {
  cancel: "Batalkan pesanan ini? Akun akan kembali dijual.",
  safe: "Sudah mengganti email, password, dan 2FA akun ini?",
  complete: "Selesaikan pesanan? Dana akan diteruskan ke toko dan tidak bisa dibatalkan.",
};

/** Buyer buttons for the order state machine (DFD 6.4–6.6). The API re-checks every transition. */
export function OrderActions({ order }: { order: OrderView }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (order.viewerRole !== "BUYER") return null;

  const run = async (action: Action) => {
    if (!window.confirm(confirmText[action])) return;
    setBusy(action);
    setError(null);
    try {
      await apiFetch(`/api/orders/${order.id}/${action}`, { method: "POST" });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Aksi gagal.");
    } finally {
      setBusy(null);
    }
  };

  const spinner = (action: Action) => (busy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : null);

  return (
    <div className="space-y-3">
      {order.status === "PENDING_PAYMENT" && (
        <Button variant="secondary" size="md" onClick={() => run("cancel")} disabled={busy !== null}>
          {spinner("cancel") ?? <XCircle className="h-4 w-4" />}
          Batalkan Pesanan
        </Button>
      )}

      {(order.status === "PAID" || order.status === "IN_REKBER") && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Langkah 1, Amankan akun
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Setelah toko mengirim data akun di Rekber Room, segera ganti email, password, dan 2FA. Lalu konfirmasi di sini.
          </p>
          <Button
            variant="primary"
            size="md"
            className="mt-4"
            onClick={() => run("safe")}
            disabled={busy !== null || order.status !== "IN_REKBER"}
          >
            {spinner("safe") ?? <ShieldCheck className="h-4 w-4" />}
            Akun Aman
          </Button>
          {order.status === "PAID" && (
            <p className="mt-2 text-xs text-text-secondary">Menunggu toko mengirim data akun…</p>
          )}
        </div>
      )}

      {order.status === "SAFE" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Langkah 2, Selesaikan pesanan
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Semua sesuai deskripsi? Klik Selesai agar dana escrow diteruskan ke toko (dikurangi komisi platform).
          </p>
          <Button variant="primary" size="md" className="mt-4" onClick={() => run("complete")} disabled={busy !== null}>
            {spinner("complete") ?? <CheckCircle2 className="h-4 w-4" />}
            Selesai
          </Button>
        </div>
      )}

      <FormAlert message={error} />
    </div>
  );
}
