import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { VoucherShop } from "@/components/balance/voucher-shop";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Balance (BLC) | valostock.id",
  description:
    "Isi Balance closed-loop untuk top-up game lebih cepat, beli voucher, redeem, dan pantau riwayatnya.",
};

export default async function BalancePage() {
  const user = await requireUser("/balance");
  const buyerBalance = user.balance;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Balance (BLC)
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Saldo prabayar khusus top-up game, 1 BLC = Rp 1. Beli voucher,
              redeem, dan bayar top-up tanpa menunggu konfirmasi pembayaran.
            </p>
          </Container>
        </section>

        <Container className="max-w-4xl py-8 sm:py-10">
          {/* Balance card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
                <Wallet className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">
                  Balance kamu
                </p>
                <p className="num font-display text-3xl font-bold text-white">
                  {buyerBalance.toLocaleString("id-ID")} BLC
                </p>
                {buyerBalance === 0 && (
                  <p className="text-xs text-white/75">
                    Redeem agar Balance bertambah.
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/balance/history"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10"
            >
              Riwayat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Closed-loop rules per MONEY_RULES §8b */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
            <p>
              Balance bersifat <span className="font-medium text-text">closed-loop</span>:
              hanya untuk top-up game di valostock.id, tidak bisa dicairkan,
              tidak bisa membeli akun, dan tidak bisa ditransfer ke pengguna
              lain.{" "}
              <Link
                href="/help/kenapa-balance-tidak-bisa-beli-akun"
                className="font-medium text-primary hover:text-primary-hover"
              >
                Kenapa?
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <VoucherShop />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
