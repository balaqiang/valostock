import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { LedgerTable } from "@/components/balance/ledger-table";
import { requireUser } from "@/lib/auth";
import { getMyBalanceLedger } from "@/lib/data/me";

export const metadata: Metadata = {
  title: "Balance | valostock.id",
};

export default async function AccountBalancePage() {
  const user = await requireUser("/account/balance");
  const buyerBalance = user.balance;
  const ledger = (await getMyBalanceLedger()).slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Balance (BLC)"
        description="Saldo closed-loop khusus top-up game, tidak bisa dicairkan atau dipakai membeli akun."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/15 text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">
              Balance kamu
            </p>
            <p className="num font-display text-2xl font-bold text-white">
              {buyerBalance.toLocaleString("id-ID")} BLC
            </p>
            {buyerBalance === 0 && (
              <p className="text-xs text-white/75">
                Redeem agar Balance bertambah.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            href="/balance"
            variant="ghost"
            size="md"
            className="border border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            Isi Balance
          </Button>
          <Button
            href="/balance/history"
            variant="ghost"
            size="md"
            className="border border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            Riwayat
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text">Mutasi Terakhir</h2>
        <div className="mt-3">
          <LedgerTable entries={ledger} />
        </div>
      </section>

      <p className="mt-4 text-xs text-text-secondary">
        Kenapa Balance tidak bisa membeli akun?{" "}
        <Link
          href="/help/kenapa-balance-tidak-bisa-beli-akun"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Baca penjelasannya
        </Link>
        .
      </p>
    </div>
  );
}
