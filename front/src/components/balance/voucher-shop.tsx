"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, ExternalLink, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/form-alert";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { gatewayMethods } from "@/lib/payment-methods";
import { apiFetch } from "@/lib/api";
import type { BalanceQuote, BalanceVoucherOptions, GatewayMethod, PaymentSession, TransactionRecord } from "@/types/api";

/** POST /api/balance/topup → an invoice + a Midtrans Snap session. */
type TopupResponse = { transaction: TransactionRecord; payment: PaymentSession };

/**
 * Buy-voucher flow (DFD 5.1–5.2). The total is quoted by the API from nominal × qty
 * + method. Balance is credited ONLY when the payment is confirmed PAID
 * (docs/MONEY_RULES.md §5) — never from this page.
 */
export function VoucherShop({ options }: { options: BalanceVoucherOptions }) {
  const [nominal, setNominal] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<GatewayMethod | null>(null);
  const [quote, setQuote] = useState<BalanceQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopupResponse | null>(null);
  // One key per purchase attempt: a double-click or retry can't credit twice.
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    if (!nominal || !method) return;
    let cancelled = false;
    const query = new URLSearchParams({ nominal: String(nominal), qty: String(qty), method });
    apiFetch<{ quote: BalanceQuote }>(`/api/balance/quote?${query}`)
      .then((data) => !cancelled && setQuote(data.quote))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Gagal menghitung total."));
    return () => {
      cancelled = true;
    };
  }, [nominal, qty, method]);

  const resetAttempt = () => {
    idempotencyKey.current = null;
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nominal || !method || loading) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TopupResponse>("/api/balance/topup", {
        method: "POST",
        body: JSON.stringify({
          nominal,
          qty,
          method,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      setResult(data);
      idempotencyKey.current = null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kendala jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Denominations */}
      <h2 className="text-sm font-semibold text-text">Pilih Nominal Voucher</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {options.denominations.map((value) => (
          <motion.button
            key={value}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setNominal(value);
              resetAttempt();
            }}
            aria-pressed={nominal === value}
            className={cn(
              "relative rounded-xl border p-3 text-center transition-colors duration-200",
              nominal === value
                ? "border-primary bg-primary/5"
                : "border-border bg-surface hover:border-primary/40",
            )}
          >
            <span className="num block text-sm font-semibold text-text">
              {formatRupiah(value)}
            </span>
            <span className="num block text-[11px] text-text-secondary">
              {value.toLocaleString("id-ID")} BLC
            </span>
            {nominal === value && (
              <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Qty stepper */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <span className="text-sm font-medium text-text">Jumlah voucher</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Kurangi jumlah"
            onClick={() => {
              setQty((value) => Math.max(1, value - 1));
              resetAttempt();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="num w-8 text-center text-sm font-semibold text-text">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Tambah jumlah"
            onClick={() => {
              setQty((value) => Math.min(options.maxQty, value + 1));
              resetAttempt();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Payment method (Midtrans) */}
      <h2 className="mt-6 text-sm font-semibold text-text">
        Metode Pembayaran
      </h2>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {gatewayMethods.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => {
              setMethod(item.kind as GatewayMethod);
              resetAttempt();
            }}
            aria-pressed={method === item.kind}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-200",
              method === item.kind
                ? "border-primary bg-primary/5"
                : "border-border bg-surface hover:border-primary/40",
            )}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text">
                {item.label}
              </span>
              <span className="block truncate text-xs text-text-secondary">
                {item.detail}
              </span>
            </span>
            <span className="num flex-none text-xs font-medium text-text-secondary">
              {item.feeLabel}
            </span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <dl className="mt-6 space-y-1.5 rounded-xl bg-surface-elevated p-4 text-sm">
        <div className="flex justify-between text-text-secondary">
          <dt>
            Voucher{" "}
            {nominal ? (
              <span className="num">
                {formatRupiah(nominal)} × {qty}
              </span>
            ) : (
              "-"
            )}
          </dt>
          <dd className="num">{quote ? formatRupiah(quote.credit) : "-"}</dd>
        </div>
        <div className="flex justify-between text-text-secondary">
          <dt>Biaya metode</dt>
          <dd className="num">{quote ? formatRupiah(quote.surcharge) : "-"}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
          <dt>Total bayar</dt>
          <dd className="num">{quote ? formatRupiah(quote.amount) : "-"}</dd>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <dt>Balance masuk</dt>
          <dd className="num">{quote ? `${quote.credit.toLocaleString("id-ID")} BLC` : "-"}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        <FormAlert message={error} />
        {result && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              Invoice{" "}
              <span className="num font-mono font-semibold">
                {result.transaction.invoice_number}
              </span>{" "}
              dibuat. Balance bertambah otomatis setelah pembayaran terkonfirmasi.
            </span>
          </div>
        )}
        {result?.payment.mode === "MIDTRANS_SNAP" && (
          <a
            href={result.payment.redirectUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Lanjutkan ke Pembayaran Midtrans
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-3 w-full"
        disabled={!nominal || !method || loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Memproses..." : "Beli Voucher"}
      </Button>
      <p className="mt-2 text-center text-xs text-text-secondary">
        Pembayaran diproses oleh Midtrans (mode Sandbox saat pengembangan).
      </p>
    </form>
  );
}
