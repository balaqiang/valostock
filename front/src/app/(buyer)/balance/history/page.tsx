import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { LedgerTable } from "@/components/balance/ledger-table";
import { requireUser } from "@/lib/auth";
import { getMyBalanceLedger } from "@/lib/data/me";

export const metadata: Metadata = {
  title: "Riwayat Balance — valostock.id",
  description: "Riwayat mutasi Balance (BLC): isi, pemakaian top-up, dan refund.",
};

export default async function BalanceHistoryPage() {
  const user = await requireUser("/balance/history");
  const ledger = await getMyBalanceLedger();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="max-w-4xl py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-text-secondary"
          >
            <Link href="/" className="transition-colors duration-200 hover:text-text">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              href="/balance"
              className="transition-colors duration-200 hover:text-text"
            >
              Balance
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-text">Riwayat</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Riwayat Balance
            </h1>
            <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="num font-semibold text-text">
                {user.balance.toLocaleString("id-ID")} BLC
              </span>
            </p>
          </div>

          <div className="mt-6">
            <LedgerTable entries={ledger} />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
