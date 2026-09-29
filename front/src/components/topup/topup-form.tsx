"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BadgePercent,
  Check,
  Copy,
  ExternalLink,
  Gamepad2,
  Info,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Receipt,
  ShoppingBag,
  Sparkles,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import type { Game as MockGame } from "@/types/domain";
import { setSessionUser, useSession } from "@/lib/hooks/use-session";
import type { PromoCode as MockPromoCode, TopupProduct as MockTopupProduct } from "@/types/domain";
import { discountFor, paymentMethods, surchargeFor, type PaymentMethodKind } from "@/lib/fees";
import { apiFetch } from "@/lib/api";
import { PaymentLogos } from "@/components/payment/payment-logos";
import { topupStatus } from "@/lib/topup-status";
import type { PaymentSession, TransactionRecord } from "@/types/api";

/** POST /api/topup/checkout — the API prices the order; these totals are display-only. */
interface CheckoutResponse {
  transaction: TransactionRecord;
  payment: PaymentSession;
  /** New BLC balance when paid with Balance. */
  balance?: number;
}

export function TopupForm({
  game,
  products,
}: {
  game: MockGame;
  products: MockTopupProduct[];
}) {
  const session = useSession();
  const [productId, setProductId] = useState<string | null>(
    products.find((p) => p.popular)?.id ?? products[0]?.id ?? null,
  );
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<MockPromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodKind>("QRIS");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);

  const product = products.find((item) => item.id === productId) ?? null;
  const special = products.filter((item) => item.section === "SPECIAL");
  const instant = products.filter((item) => item.section !== "SPECIAL");
  const discount = product && promo ? discountFor(promo, product.retailPrice) : 0;
  const base = product ? product.retailPrice - discount : 0;
  const surcharge = product && method ? surchargeFor(method, base) : 0;
  const total = base + surcharge;

  // Promo codes are checked by the API — the list itself never reaches the browser.
  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    try {
      const data = await apiFetch<{ promo: MockPromoCode }>(
        `/api/topup/promo?code=${encodeURIComponent(code)}`,
      );
      setPromo(data.promo);
      setPromoError(null);
    } catch (err: unknown) {
      setPromo(null);
      setPromoError(
        err instanceof Error ? err.message : "Kode promo tidak ditemukan atau sudah tidak berlaku.",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!product) {
      setSubmitError("Silakan pilih nominal top-up terlebih dahulu.");
      return;
    }

    if (!uid.trim()) {
      setSubmitError(`Harap isi ${game.uidLabel}.`);
      return;
    }

    if (game.uidExtraLabel && !zone.trim()) {
      setSubmitError(`Harap isi ${game.uidExtraLabel}.`);
      return;
    }

    if (!method) {
      setSubmitError("Silakan pilih metode pembayaran.");
      return;
    }

    if (method === "BALANCE" && !session.user) {
      setSubmitError("Masuk dulu untuk membayar dengan Balance (BLC).");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<CheckoutResponse>("/api/topup/checkout", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          userGameId: uid.trim(),
          gameZoneId: zone.trim() || undefined,
          promoCode: promo?.code,
          paymentMethod: method,
          contactEmail: email.trim() || undefined,
          contactWhatsapp: wa.trim() || undefined,
        }),
      });

      setCheckoutResult(data);
      if (typeof data.balance === "number" && session.user) {
        setSessionUser({ ...session.user, balance: data.balance });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kendala jaringan ke server.";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvoice = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  return (
    <>
      <form
        className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]"
        onSubmit={handleSubmit}
      >
        <div className="min-w-0 space-y-6">
          {/* 1 — Player ID */}
          <Step number={1} title="Data Akun">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={game.uidExtraLabel ? "" : "sm:col-span-2"}>
                <label
                  htmlFor="uid"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  {game.uidLabel}
                </label>
                <Input
                  id="uid"
                  required
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder={`Masukkan ${game.uidLabel}`}
                />
              </div>
              {game.uidExtraLabel && (
                <div>
                  <label
                    htmlFor="zone"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    {game.uidExtraLabel}
                  </label>
                  {game.uidExtraOptions ? (
                    <select
                      id="zone"
                      required
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="" disabled>
                        Pilih {game.uidExtraLabel}
                      </option>
                      {game.uidExtraOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="zone"
                      required
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      placeholder={`Masukkan ${game.uidExtraLabel}`}
                    />
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
              {game.uidHint}. Pastikan data akun benar, salah isi tidak bisa dibatalkan setelah dikirim.
            </p>
          </Step>

          {/* 2 — Nominal */}
          <Step number={2} title="Pilih Nominal">
            {special.length > 0 && (
              <>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Item Spesial
                </h3>
                <ProductGrid items={special} selected={productId} onSelect={setProductId} />
                <h3 className="mb-3 mt-6 flex items-center gap-1.5 text-sm font-semibold text-text">
                  <Zap className="h-4 w-4 text-primary" />
                  Top Up Instan
                </h3>
              </>
            )}
            <ProductGrid items={instant} selected={productId} onSelect={setProductId} />
          </Step>

          {/* 3 — Promo code */}
          <Step number={3} title="Kode Promo" optional>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="Contoh: VALO10 atau HEMAT5K"
                  className="pl-10 uppercase placeholder:normal-case"
                />
              </div>
              <Button type="button" variant="secondary" size="lg" onClick={applyPromo}>
                Pakai
              </Button>
            </div>
            {promo && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <BadgePercent className="h-3.5 w-3.5" />
                {promo.code} aktif, {promo.label}
              </p>
            )}
            {promoError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{promoError}</p>
            )}
          </Step>

          {/* 4 — Contact */}
          <Step number={4} title="Kontak">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kamu@email.com"
                />
                <p className="mt-1.5 flex items-start gap-1 text-xs text-text-secondary">
                  <Mail className="mt-0.5 h-3 w-3 flex-none" />
                  Bukti pembelian dikirim ke email ini.
                </p>
              </div>
              <div>
                <label
                  htmlFor="wa"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Nomor WhatsApp
                </label>
                <Input
                  id="wa"
                  type="tel"
                  value={wa}
                  onChange={(e) => setWa(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
                <p className="mt-1.5 flex items-start gap-1 text-xs text-text-secondary">
                  <MessageCircle className="mt-0.5 h-3 w-3 flex-none" />
                  Dihubungi jika ada status pesanan penting.
                </p>
              </div>
            </div>
          </Step>

          {/* 5 — Payment method */}
          <Step number={5} title="Metode Pembayaran">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {paymentMethods.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => setMethod(item.kind)}
                  aria-pressed={method === item.kind}
                  className={cn(
                    "flex cursor-pointer flex-col gap-2.5 rounded-xl border p-4 text-left transition-all duration-200",
                    method === item.kind
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-surface hover:border-primary/40",
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
                        {item.label}
                        {item.requiresAuth && <Lock className="h-3 w-3 text-text-secondary" />}
                      </span>
                      <span className="block text-xs text-text-secondary">{item.detail}</span>
                    </span>
                    <span className="num flex-none text-xs font-medium text-text-secondary">
                      {item.feeLabel}
                    </span>
                  </span>
                  <PaymentLogos method={item} />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              {session.user
                ? `Top-up ini tercatat di akunmu (${session.user.name}). Saldo Balance: ${session.user.balance.toLocaleString("id-ID")} BLC.`
                : "Tanpa login pun bisa top-up. Masuk agar riwayat top-up tersimpan di akunmu."}
            </p>
          </Step>
        </div>

        {/* Summary sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-text">Ringkasan Pesanan</h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-background p-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-surface-elevated">
                {product?.icon ? (
                  <Image src={product.icon} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                ) : (
                  <Gamepad2 className="h-5 w-5 text-text-secondary" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text">{game.name}</span>
                <span className="block truncate text-xs text-text-secondary">
                  {product ? product.amountLabel : "Pilih nominal"}
                </span>
              </span>
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-text-secondary">
                <dt>Metode Pembayaran</dt>
                <dd className="font-medium text-text">
                  {paymentMethods.find((item) => item.kind === method)?.label ?? "-"}
                </dd>
              </div>
              <div className="flex justify-between text-text-secondary">
                <dt>Harga</dt>
                <dd className="num">{product ? formatRupiah(product.retailPrice) : "-"}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <dt>Diskon Promo</dt>
                  <dd className="num">−{formatRupiah(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <dt>Biaya Layanan</dt>
                <dd className="num">{product && method ? formatRupiah(surcharge) : "-"}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-text">
                <dt>Total Bayar</dt>
                <dd className="num font-bold text-primary">{product ? formatRupiah(total) : "-"}</dd>
              </div>
            </dl>

            {submitError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{submitError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="btn-shine mt-5 w-full font-bold shadow-lg shadow-primary/20"
              disabled={!product || !method || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyiapkan pembayaran...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  Pesan Sekarang
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-text-secondary">
              Pembayaran diproses oleh Midtrans. Status invoice berubah otomatis setelah pembayaran terkonfirmasi.
            </p>
          </div>
        </aside>
      </form>

      {/* Checkout Success Result Modal */}
      <AnimatePresence>
        {checkoutResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setCheckoutResult(null)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text transition-colors"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <BadgeCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-text">
                    {checkoutResult.payment.mode === "BALANCE"
                      ? "Dibayar dengan Balance"
                      : "Invoice Dibuat"}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {checkoutResult.payment.mode === "BALANCE"
                      ? "Top-up sedang diproses ke akun game tujuan."
                      : "Selesaikan pembayaran di Midtrans. Simpan nomor invoice untuk melacak status."}
                  </p>
                </div>
              </div>

              {/* Invoice Pill Box */}
              <div className="mt-5 rounded-xl border border-border bg-surface-elevated p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary font-medium">
                    NOMOR INVOICE
                  </span>
                  <Badge
                    variant={topupStatus(checkoutResult.transaction.status).variant}
                    className="text-[11px]"
                  >
                    {topupStatus(checkoutResult.transaction.status).label}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-text">
                    {checkoutResult.transaction.invoice_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyInvoice(checkoutResult.transaction.invoice_number)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium cursor-pointer"
                  >
                    {copiedInvoice ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Salin
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Details table */}
              <dl className="mt-4 space-y-2 text-xs divide-y divide-border">
                <div className="flex justify-between pt-2">
                  <dt className="text-text-secondary">Item / Produk</dt>
                  <dd className="font-semibold text-text">
                    {checkoutResult.transaction.item_name}
                  </dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="text-text-secondary">ID Akun Tujuan</dt>
                  <dd className="font-mono font-medium text-text">
                    {checkoutResult.transaction.user_game_id}
                    {checkoutResult.transaction.game_zone_id
                      ? ` (${checkoutResult.transaction.game_zone_id})`
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="text-text-secondary">Metode Pembayaran</dt>
                  <dd className="font-medium text-text">
                    {checkoutResult.transaction.payment_method}
                  </dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="text-text-secondary">Total Nominal</dt>
                  <dd className="font-mono font-bold text-emerald-500">
                    {formatRupiah(checkoutResult.transaction.amount)}
                  </dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="text-text-secondary">Sumber Dana</dt>
                  <dd className="font-mono text-text-secondary truncate max-w-[200px]">
                    {checkoutResult.payment.mode === "BALANCE" ? "Balance (BLC)" : "Midtrans"}
                  </dd>
                </div>
              </dl>

              {checkoutResult.payment.mode === "MIDTRANS_SNAP" && (
                <div className="mt-5">
                  <a
                    href={checkoutResult.payment.redirectUrl}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-hover transition-colors"
                  >
                    <span>Lanjutkan ke Pembayaran Midtrans</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  href={`/topup/invoice?q=${encodeURIComponent(
                    checkoutResult.transaction.invoice_number,
                  )}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Receipt className="h-4 w-4" />
                  Lacak di Cek Invoice
                </Link>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setCheckoutResult(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Tutup & Selesai
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Numbered form step, same card look on every step. */
function Step({
  number,
  title,
  optional,
  children,
}: {
  number: number;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <h2 className="flex items-center gap-3 border-b border-border bg-surface-elevated/60 px-5 py-3 text-sm font-semibold text-text">
        <span className="num flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
          {number}
        </span>
        {title}
        {optional && <span className="font-normal text-text-secondary">(opsional)</span>}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Nominal cards: item icon + price, with the instant-delivery strip. */
function ProductGrid({
  items,
  selected,
  onSelect,
}: {
  items: MockTopupProduct[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const active = selected === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(item.id)}
            aria-pressed={active}
            className={cn(
              "relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all duration-200",
              active
                ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                : "border-border bg-background hover:border-primary/40",
            )}
          >
            <span className="flex-1 p-3.5">
              <span className="block text-xs font-semibold leading-snug text-text">{item.amountLabel}</span>
              <span className="mt-2.5 flex items-center gap-2">
                {item.icon ? (
                  <Image src={item.icon} alt="" width={32} height={32} className="h-8 w-8 flex-none object-contain" />
                ) : (
                  <Gamepad2 className="h-6 w-6 flex-none text-text-secondary" />
                )}
                <span className="num text-sm font-bold text-primary">{formatRupiah(item.retailPrice)}</span>
              </span>
            </span>
            <span
              className={cn(
                "flex items-center justify-between border-t px-3.5 py-1.5",
                active ? "border-primary/30 bg-primary/10" : "border-border bg-surface-elevated",
              )}
            >
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                <Zap className="h-3 w-3 text-primary" />
                Pengiriman instan
              </span>
              <span className="flex items-center gap-1.5">
                {item.popular && <Badge className="bg-primary px-1.5 py-0 text-[10px] text-white">Populer</Badge>}
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
