import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Wallet } from "lucide-react";
import { PageBand, SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";
import { VoucherShop } from "@/components/balance/voucher-shop";
import { publicApiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import type { BalanceVoucherOptions } from "@/types/api";

export const metadata: Metadata = {
  title: "Balance (BLC) | valostock.id",
  description: "Isi Balance closed-loop untuk membayar top-up game tanpa biaya metode.",
};

// Halaman Balance (SKPL 4.3.9): saldo + form pembelian voucher.
export default async function BalancePage() {
  const user = await requireUser("/balance");
  const options = await publicApiGet<BalanceVoucherOptions>("/api/balance/vouchers");

  return (
    <SiteShell>
      <PageBand
        title="Balance (BLC)"
        description="Saldo prabayar khusus top-up game, 1 BLC = Rp 1. Bayar top-up dengan Balance tanpa biaya metode pembayaran."
      />

      <Container className="max-w-4xl py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Balance kamu</p>
              <p className="num font-display text-3xl font-bold text-white">{user.balance.toLocaleString("id-ID")} BLC</p>
            </div>
          </div>
          <Link
            href="/account/mutation"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10"
          >
            Mutasi
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Closed-loop rules (MONEY_RULES §5) */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
          <p>
            Balance bersifat <span className="font-medium text-text">closed-loop</span>: hanya untuk membayar top-up
            game di valostock.id, tidak bisa dicairkan, dan tidak bisa ditransfer ke pengguna lain.
          </p>
        </div>

        <div className="mt-8">
          {options ? (
            <VoucherShop options={options} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-text-secondary">
              Pilihan voucher belum bisa dimuat.
            </p>
          )}
        </div>
      </Container>
    </SiteShell>
  );
}
