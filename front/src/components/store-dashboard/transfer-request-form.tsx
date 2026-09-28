"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import type { MockExternalSeller, MockStoreOrder } from "@/lib/mock/store-dashboard";
import { TRANSFER_FEE } from "@/lib/fees";

/**
 * Transfer Request per docs/MONEY_RULES.md §11 — the store instructs a payout
 * from its OWN available balance to the external seller via Midtrans Iris
 * (admin-approved). Available only after an order is safe + 5h; Iris Account
 * Validation recognises the recipient name before sending. Display-only here.
 */
export function TransferRequestForm({
  seller,
  orders: storeOrders,
}: {
  seller: MockExternalSeller;
  orders: MockStoreOrder[];
}) {
  // Only safe/completed orders are eligible (safe_at + 5h in the real API).
  const eligibleOrders = storeOrders.filter(
    (order) => order.status === "SAFE" || order.status === "COMPLETED",
  );
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const numericAmount = Number(amount) || 0;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <BadgeCheck className="h-4 w-4 flex-none" />
          Transfer Request dibuat — Account Validation: MATCH ({seller.payoutName})
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {formatRupiah(numericAmount)} akan dikirim dari saldo tokomu ke{" "}
          {seller.payoutChannel} {seller.payoutAccount} (biaya{" "}
          {formatRupiah(TRANSFER_FEE)}). Penjual diberi tahu via WhatsApp.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      className="rounded-2xl border border-border bg-surface p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <Send className="h-4 w-4 text-primary" />
        Buat Transfer Request
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Tersedia setelah akun aman + 5 jam. Dana keluar dari saldo tokomu —
        Account Validation memverifikasi nama penerima sebelum kirim.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tr-order"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Pesanan (katalog terjual)
          </label>
          <select
            id="tr-order"
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="" disabled>
              Pilih pesanan…
            </option>
            {eligibleOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id} — {order.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="tr-amount"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Nominal untuk penjual (Rp)
          </label>
          <Input
            id="tr-amount"
            type="number"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="cth: 1800000"
            className="num"
          />
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 rounded-xl bg-surface-elevated p-4 text-sm">
        <div className="flex justify-between text-text-secondary">
          <dt>Tujuan</dt>
          <dd className="num">
            {seller.payoutChannel} {seller.payoutAccount} — {seller.payoutName}
          </dd>
        </div>
        <div className="flex justify-between text-text-secondary">
          <dt>Biaya transfer</dt>
          <dd className="num">{formatRupiah(TRANSFER_FEE)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
          <dt>Total keluar dari saldo</dt>
          <dd className="num">
            {numericAmount > 0 ? formatRupiah(numericAmount + TRANSFER_FEE) : "—"}
          </dd>
        </div>
      </dl>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-4"
        disabled={!orderId || numericAmount <= 0}
      >
        Kirim Transfer Request
      </Button>
    </form>
  );
}
