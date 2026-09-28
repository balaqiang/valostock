"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { MockStoreVoucherFull } from "@/lib/mock/store-dashboard";

/** Voucher list + create (percent/fixed, min-spend, quota) — local state only. */
export function VoucherManager({ vouchers: myVouchers }: { vouchers: MockStoreVoucherFull[] }) {
  const [vouchers, setVouchers] = useState<MockStoreVoucherFull[]>(myVouchers);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    kind: "FIXED" as "FIXED" | "PERCENT",
    value: "",
    minSpend: "",
    quota: "",
  });

  const submit = () => {
    setVouchers((current) => [
      {
        code: form.code.toUpperCase(),
        kind: form.kind,
        value: Number(form.value),
        minSpend: Number(form.minSpend),
        quota: Number(form.quota),
        used: 0,
        expiresAt: "2026-08-31",
      },
      ...current,
    ]);
    setCreating(false);
    setForm({ code: "", kind: "FIXED", value: "", minSpend: "", quota: "" });
  };

  const valid =
    form.code.trim() !== "" &&
    Number(form.value) > 0 &&
    Number(form.minSpend) >= 0 &&
    Number(form.quota) > 0;

  return (
    <div>
      <div className="flex justify-end">
        <Button
          variant={creating ? "secondary" : "primary"}
          size="md"
          onClick={() => setCreating((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          {creating ? "Batal" : "Buat Voucher"}
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) submit();
            }}
          >
            <div className="grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Kode
                </label>
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                  placeholder="NUSAJULI"
                  className="uppercase placeholder:normal-case"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Tipe
                </label>
                <select
                  value={form.kind}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      kind: event.target.value as "FIXED" | "PERCENT",
                    })
                  }
                  className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option value="FIXED">Potongan tetap (Rp)</option>
                  <option value="PERCENT">Persen (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Nilai
                </label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(event) =>
                    setForm({ ...form, value: event.target.value })
                  }
                  placeholder={form.kind === "FIXED" ? "25000" : "5"}
                  className="num"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Min. belanja (Rp)
                </label>
                <Input
                  type="number"
                  value={form.minSpend}
                  onChange={(event) =>
                    setForm({ ...form, minSpend: event.target.value })
                  }
                  placeholder="500000"
                  className="num"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Kuota
                </label>
                <Input
                  type="number"
                  value={form.quota}
                  onChange={(event) =>
                    setForm({ ...form, quota: event.target.value })
                  }
                  placeholder="100"
                  className="num"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-5">
                <Button type="submit" variant="primary" size="md" disabled={!valid}>
                  Simpan Voucher
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      <ul className="mt-5 space-y-3">
        {vouchers.map((voucher) => {
          const exhausted = voucher.used >= voucher.quota;
          return (
            <li
              key={voucher.code}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Ticket className="h-5 w-5 flex-none text-primary" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text">
                    <span className="num tracking-wider">{voucher.code}</span>
                    <Badge variant={exhausted ? "secondary" : "success"}>
                      {exhausted ? "Kuota habis" : "Aktif"}
                    </Badge>
                  </span>
                  <span className="num mt-0.5 block text-xs text-text-secondary">
                    {voucher.kind === "PERCENT"
                      ? `Diskon ${voucher.value}%`
                      : `Potongan ${formatRupiah(voucher.value)}`}{" "}
                    · min. {formatRupiah(voucher.minSpend)} · s.d.{" "}
                    {formatDateShort(voucher.expiresAt)}
                  </span>
                </span>
              </span>
              <span className="num text-xs text-text-secondary">
                {voucher.used}/{voucher.quota} terpakai
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
