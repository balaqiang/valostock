"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, Landmark, Loader2, ScanSearch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { BANK_TAX, WITHDRAW_FEE } from "@/lib/fees";
import { ApiError, apiFetch } from "@/lib/api";
import type { Withdrawal } from "@/types/api";

type NameMatch = Withdrawal["nameMatch"];

const banks = ["BCA", "BNI", "BRI", "Mandiri", "SeaBank", "Jago"];

/**
 * Withdrawal request (docs/MONEY_RULES.md §9). The API compares the account
 * holder name with the store's admin-verified owner name: MATCH/REVIEW are
 * accepted (admin approves; the bank transfer is simulated), MISMATCH is refused.
 */
export function WithdrawForm({
  ownerLegalName,
  availableBalance,
}: {
  ownerLegalName: string;
  availableBalance: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState(banks[0]);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<NameMatch | null>(null);

  const numericAmount = Number(amount) || 0;
  const totalFee = WITHDRAW_FEE + BANK_TAX;
  const valid =
    numericAmount > totalFee &&
    numericAmount <= availableBalance &&
    account.trim() !== "" &&
    name.trim() !== "";

  return (
    <form
      className="rounded-2xl border border-border bg-surface p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        try {
          const data = await apiFetch<{ withdrawal: Withdrawal }>("/api/stores/me/withdrawals", {
            method: "POST",
            body: JSON.stringify({
              amount: numericAmount,
              bankName: bank,
              accountNumber: account.trim(),
              accountName: name.trim(),
            }),
          });
          setResult(data.withdrawal.nameMatch);
          setAmount("");
          router.refresh();
        } catch (err: unknown) {
          if (err instanceof ApiError && err.code === "NAME_MISMATCH") setResult("MISMATCH");
          else setError(err instanceof Error ? err.message : "Gagal mengajukan penarikan.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <Landmark className="h-4 w-4 text-primary" />
        Tarik Dana
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Nama pemilik rekening wajib sama dengan nama pemilik toko yang
        diverifikasi admin (<span className="font-medium text-text">{ownerLegalName}</span>) —
        nama yang tidak cocok ditolak.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="wd-amount"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Nominal (Rp)
          </label>
          <Input
            id="wd-amount"
            type="number"
            required
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setResult(null);
            }}
            placeholder={`maks. ${availableBalance.toLocaleString("id-ID")}`}
            className="num"
          />
        </div>
        <div>
          <label
            htmlFor="wd-bank"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Bank
          </label>
          <select
            id="wd-bank"
            value={bank}
            onChange={(event) => setBank(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-text focus:border-primary focus:outline-none"
          >
            {banks.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="wd-account"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Nomor rekening
          </label>
          <Input
            id="wd-account"
            required
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="cth: 1234567890"
            className="num"
          />
        </div>
        <div>
          <label
            htmlFor="wd-name"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Nama pemilik rekening
          </label>
          <Input
            id="wd-name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setResult(null);
            }}
            placeholder="Sesuai buku tabungan"
          />
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 rounded-xl bg-surface-elevated p-4 text-sm">
        <div className="flex justify-between text-text-secondary">
          <dt>Biaya penarikan</dt>
          <dd className="num">{formatRupiah(WITHDRAW_FEE)}</dd>
        </div>
        <div className="flex justify-between text-text-secondary">
          <dt>Pajak antarbank</dt>
          <dd className="num">{formatRupiah(BANK_TAX)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
          <dt>Diterima di {bank}</dt>
          <dd className="num">
            {numericAmount > totalFee
              ? formatRupiah(numericAmount - totalFee)
              : "—"}
          </dd>
        </div>
      </dl>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-4"
        disabled={!valid || loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Ajukan Penarikan
      </Button>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            result === "MATCH"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : result === "REVIEW"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {result === "MATCH" ? (
            <>
              <BadgeCheck className="mt-0.5 h-4 w-4 flex-none" />
              Account Validation: MATCH — pengajuan tercatat dan saldo sudah
              didebit. Menunggu persetujuan admin.
            </>
          ) : result === "REVIEW" ? (
            <>
              <ScanSearch className="mt-0.5 h-4 w-4 flex-none" />
              Account Validation: REVIEW — nama mirip sebagian. Pengajuan
              tercatat, admin akan memeriksa lebih teliti.
            </>
          ) : (
            <>
              <XCircle className="mt-0.5 h-4 w-4 flex-none" />
              Account Validation: MISMATCH — nama tidak cocok dengan pemilik
              toko, penarikan ditolak. Perbaiki data rekening lalu ajukan ulang.
            </>
          )}
        </motion.p>
      )}
    </form>
  );
}
