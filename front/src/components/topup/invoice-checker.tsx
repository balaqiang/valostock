"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  EyeOff,
  FileSearch,
  Gamepad2,
  Loader2,
  Receipt,
  ReceiptText,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDbDateTime } from "@/lib/format";
import { topupStatus } from "@/lib/topup-status";
import { apiFetch, ApiError } from "@/lib/api";
import type { PublicTransaction } from "@/types/api";

/** Masked game account + a pointer to where the owner can see it in full. */
function MaskedGameId({ masked }: { masked: string }) {
  return (
    <dd className="mt-0.5">
      <span className="font-mono font-medium text-text">{masked}</span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
        <Badge variant="secondary" className="gap-1">
          <EyeOff />
          Dirahasiakan (Demi Privasi)
        </Badge>
        <span>
          Pemilik invoice bisa melihat ID lengkap di{" "}
          <Link
            href="/account/transactions"
            className="font-medium text-primary hover:text-primary-hover"
          >
            Akun → Transaksi
          </Link>
          .
        </span>
      </span>
    </dd>
  );
}

type InvoiceLookup = { results: PublicTransaction[]; error: string | null };

/** GET /api/topup/invoice — the API masks the game account before it leaves the server. */
async function lookupInvoice(invoiceNo: string): Promise<InvoiceLookup> {
  try {
    const data = await apiFetch<{ transaction: PublicTransaction }>(
      `/api/topup/invoice?q=${encodeURIComponent(invoiceNo)}`,
    );
    return { results: [data.transaction], error: null };
  } catch (err: unknown) {
    // 404 = unknown invoice; 400 = not even an invoice-shaped input. Both are "not found" for the visitor.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return { results: [], error: null };
    return { results: [], error: err instanceof Error ? err.message : "Gagal memeriksa invoice." };
  }
}

function InvoiceCheckerInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const hasInitialQuery = initialQuery.trim() !== "";

  const [value, setValue] = useState(initialQuery);
  const [loading, setLoading] = useState(hasInitialQuery);
  const [results, setResults] = useState<PublicTransaction[]>([]);
  const [searched, setSearched] = useState(hasInitialQuery);
  const [error, setError] = useState<string | null>(null);

  const applyLookup = useCallback((lookup: InvoiceLookup) => {
    setResults(lookup.results);
    setError(lookup.error);
    setLoading(false);
  }, []);

  const performSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    setError(null);
    void lookupInvoice(trimmed).then(applyLookup);
  };

  // `?q=` from the top-up success modal: look it up once on arrival.
  useEffect(() => {
    const trimmed = initialQuery.trim();
    if (trimmed) void lookupInvoice(trimmed).then(applyLookup);
  }, [initialQuery, applyLookup]);

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          performSearch(value);
        }}
      >
        <div className="relative flex-1">
          <ReceiptText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Masukkan nomor invoice (contoh: TU-260929-AB12CD)"
            aria-label="Nomor invoice"
            className="pl-10 uppercase placeholder:normal-case font-mono"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={loading} className="btn-shine">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Mencari...
            </>
          ) : (
            "Cek Status"
          )}
        </Button>
      </form>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Results Display */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.div
            key="db-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {results.map((tx) => {
              const statusCfg = topupStatus(tx.status);

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-sm hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      <span className="font-mono text-sm font-bold text-text">
                        {tx.invoice_number}
                      </span>
                    </div>
                    <Badge variant={statusCfg.variant} className="font-semibold">
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-text-secondary flex items-center gap-1">
                        <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                        Item / Produk
                      </dt>
                      <dd className="font-semibold text-text mt-0.5">{tx.item_name}</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-text-secondary flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-primary" />
                        ID Akun Tujuan
                      </dt>
                      <MaskedGameId
                        masked={
                          (tx.user_game_id_masked ?? "-") +
                          (tx.game_zone_id_masked ? ` (${tx.game_zone_id_masked})` : "")
                        }
                      />
                    </div>

                    <div>
                      <dt className="text-xs text-text-secondary flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-primary" />
                        Metode & Total
                      </dt>
                      <dd className="mt-0.5">
                        <span className="font-medium text-text">{tx.payment_method}</span>,{" "}
                        <span className="font-mono font-bold text-emerald-500">
                          {formatRupiah(tx.amount)}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Waktu Transaksi
                      </dt>
                      <dd className="font-mono text-xs text-text mt-0.5">
                        {formatDbDateTime(tx.created_at)} WIB
                      </dd>
                    </div>

                    {tx.gateway_ref && (
                      <div className="sm:col-span-2 rounded-xl bg-surface-elevated p-3 text-xs flex items-center justify-between">
                        <span className="text-text-secondary">Ref. Midtrans:</span>
                        <span className="font-mono font-semibold text-text">
                          {tx.gateway_ref}
                        </span>
                      </div>
                    )}
                  </dl>

                  <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Status diambil langsung dari server, bukan dari browser.</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Not Found */}
        {searched && results.length === 0 && !loading && !error && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center bg-surface"
          >
            <FileSearch className="h-10 w-10 text-text-secondary/60" />
            <p className="mt-3 font-semibold text-text">Nomor Invoice Tidak Ditemukan</p>
            <p className="mt-1 max-w-sm text-xs text-text-secondary">
              Pastikan Anda memasukkan nomor invoice lengkap seperti yang tertera saat checkout
              (contoh: <code className="font-mono">TU-260929-AB12CD</code>).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InvoiceChecker() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <InvoiceCheckerInner />
    </Suspense>
  );
}
