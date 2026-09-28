"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Landmark, ScanSearch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import type { NameMatch } from "@/lib/mock/store-dashboard";
import { BANK_TAX, WITHDRAW_FEE } from "@/lib/fees";

const banks = ["BCA", "BNI", "BRI", "Mandiri", "SeaBank", "Jago"];

// Display-only mirror of Account Validation (docs/MONEY_RULES.md §9):
// exact = MATCH, partial = REVIEW, otherwise MISMATCH.
function validateName(input: string, kycName: string): NameMatch {
  const given = input.trim().toLowerCase();
  const expected = kycName.toLowerCase();
  if (!given) return "MISMATCH";
  if (given === expected) return "MATCH";
  const expectedParts = expected.split(/\s+/);
  const givenParts = given.split(/\s+/);
  return givenParts.some((part) => expectedParts.includes(part))
    ? "REVIEW"
    : "MISMATCH";
}

export function WithdrawForm({
  kycName,
  availableBalance,
}: {
  kycName: string;
  availableBalance: number;
}) {
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
      onSubmit={(event) => {
        event.preventDefault();
        setResult(validateName(name, kycName));
      }}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <Landmark className="h-4 w-4 text-primary" />
        Tarik Dana
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Nama pemilik rekening wajib sama dengan nama KYC tokomu (
        <span className="font-medium text-text">{kycName}</span>) — Account
        Validation menolak nama yang tidak cocok.
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
        disabled={!valid}
      >
        Ajukan Penarikan
      </Button>

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
              Account Validation: MATCH — penarikan diproses, dapat nomor
              permintaan via notifikasi.
            </>
          ) : result === "REVIEW" ? (
            <>
              <ScanSearch className="mt-0.5 h-4 w-4 flex-none" />
              Account Validation: REVIEW — nama mirip sebagian, penarikan
              ditinjau manual oleh admin.
            </>
          ) : (
            <>
              <XCircle className="mt-0.5 h-4 w-4 flex-none" />
              Account Validation: MISMATCH — nama tidak cocok dengan KYC,
              penarikan ditolak. Perbaiki data rekening lalu ajukan ulang.
            </>
          )}
        </motion.p>
      )}
    </form>
  );
}
