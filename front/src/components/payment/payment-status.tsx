"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { PaymentStatusView } from "@/types/api";

const POLL_MS = 3_000;
const MAX_POLLS = 20; // ~1 minute, then the user can check again manually

const purposeLabel: Record<PaymentStatusView["purpose"], string> = {
  TOPUP: "Top-up game",
  BALANCE_FILL: "Isi Balance",
  ORDER: "Pembelian akun",
  STORE_DEPOSIT: "Deposit toko",
};

/**
 * /payment/finish — Midtrans sends the buyer back here (?order_id=…). The page
 * asks OUR API for the status; the API asks Midtrans. The browser's own query
 * string (transaction_status) is never trusted.
 */
export function PaymentStatus() {
  const params = useSearchParams();
  const router = useRouter();
  const invoice = params.get("order_id") ?? params.get("invoice") ?? "";
  const [payment, setPayment] = useState<PaymentStatusView | null>(null);
  const [error, setError] = useState<string | null>(invoice ? null : "Nomor invoice tidak ada di alamat halaman.");
  const [polls, setPolls] = useState(0);

  const check = useCallback(
    () =>
      apiFetch<{ payment: PaymentStatusView }>(`/api/payments/${encodeURIComponent(invoice)}/status`)
        .then((data) => {
          setPayment(data.payment);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memeriksa pembayaran.")),
    [invoice],
  );

  useEffect(() => {
    if (invoice) void check();
  }, [invoice, check]);

  // Keep asking while Midtrans still reports PENDING (e.g. VA not paid yet).
  useEffect(() => {
    if (payment?.status !== "PENDING" || polls >= MAX_POLLS) return;
    const timer = window.setTimeout(() => {
      setPolls((n) => n + 1);
      void check();
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [payment, polls, check]);

  // Paid → continue automatically.
  useEffect(() => {
    if (payment?.status !== "PAID") return;
    const timer = window.setTimeout(() => router.push(payment.next), 2_500);
    return () => window.clearTimeout(timer);
  }, [payment, router]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-500" />
        <p className="mt-3 text-sm text-text">{error}</p>
        <Button href="/" variant="secondary" size="md" className="mt-5">
          Ke Beranda
        </Button>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const paid = payment.status === "PAID";
  const pending = payment.status === "PENDING";
  const Icon = paid ? CheckCircle2 : pending ? Clock : XCircle;

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <Icon className={`mx-auto h-12 w-12 ${paid ? "text-emerald-500" : pending ? "text-amber-500" : "text-red-500"}`} />
      <h1 className="mt-3 font-display text-2xl font-bold text-text">
        {paid ? "Pembayaran berhasil" : pending ? "Menunggu pembayaran" : "Pembayaran tidak berhasil"}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        {purposeLabel[payment.purpose]} · <span className="num font-mono">{payment.invoice}</span> ·{" "}
        <span className="num">{formatRupiah(payment.amount)}</span>
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        {paid
          ? "Status dikonfirmasi oleh server pembayaran. Mengalihkan…"
          : pending
            ? "Selesaikan pembayaran di halaman Midtrans. Halaman ini memeriksa status secara otomatis."
            : "Pembayaran kedaluwarsa atau dibatalkan. Silakan ulangi transaksi."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {pending && payment.redirectUrl && (
          <a
            href={payment.redirectUrl}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Buka halaman pembayaran
          </a>
        )}
        {pending && polls >= MAX_POLLS && (
          <Button variant="secondary" size="md" onClick={() => { setPolls(0); void check(); }}>
            Cek lagi
          </Button>
        )}
        <Link
          href={payment.next}
          className="inline-flex h-9 items-center rounded-lg border border-border-strong px-4 text-sm font-medium text-text hover:bg-surface-elevated"
        >
          Lanjut
        </Link>
      </div>
    </div>
  );
}
