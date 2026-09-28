import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CircleUserRound,
  Coins,
  Crown,
  Phone,
  Receipt,
  Store,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TopupHistory } from "@/components/account/topup-history";
import { customerIdFor, formatRupiah } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getMyTransactions } from "@/lib/data/me";
import { getAffiliate, getLoyaltyPoints } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Dashboard Akun — valostock.id",
};

function OverviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center">
      <dt className="flex w-56 flex-none items-center gap-2.5 text-sm text-text-secondary">
        <Icon className="h-4 w-4 flex-none text-primary" />
        {label}:
      </dt>
      <dd className="flex flex-wrap items-center gap-2 text-sm text-text">
        {children}
      </dd>
    </div>
  );
}

export default async function AccountDashboardPage() {
  const user = await requireUser("/account");
  const recent = (await getMyTransactions()).slice(0, 5);
  const [loyaltyPoints, affiliate] = await Promise.all([getLoyaltyPoints(user.id), getAffiliate(user.id)]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold tracking-tight text-text">
        Ringkasan Akun
      </h1>

      {/* Etherscan-style overview rows */}
      <dl className="mt-3 divide-y divide-border border-t border-border">
        <OverviewRow icon={Crown} label="Status Akun">
          <Badge>{user.role === "ADMIN" ? "ADMIN" : "PEMBELI"}</Badge>
          <span className="text-xs text-text-secondary">
            — belanja bebas tanpa verifikasi identitas
          </span>
        </OverviewRow>
        <OverviewRow icon={CircleUserRound} label="Customer ID">
          <span className="num font-medium">{customerIdFor(user.id)}</span>
        </OverviewRow>
        <OverviewRow icon={Phone} label="Nomor HP">
          <span className="num">{user.phone ?? "—"}</span>
          <Badge variant="secondary">Belum verifikasi OTP</Badge>
        </OverviewRow>
        <OverviewRow icon={Wallet} label="Balance (BLC)">
          <span className="num font-semibold">
            {user.balance.toLocaleString("id-ID")} BLC
          </span>
          <Link
            href="/balance"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            Isi Balance
            <ArrowRight className="h-3 w-3" />
          </Link>
        </OverviewRow>
        <OverviewRow icon={Coins} label="Loyalty Points">
          <span className="num font-semibold">
            {loyaltyPoints.toLocaleString("id-ID")}
          </span>
          <Link
            href="/account/points"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            Riwayat poin
            <ArrowRight className="h-3 w-3" />
          </Link>
        </OverviewRow>
        <OverviewRow icon={BadgePercent} label="Kode Affiliate">
          {affiliate ? (
            <>
              <span className="num rounded-md bg-surface-elevated px-2 py-0.5 text-xs font-semibold tracking-wider">
                {affiliate.code}
              </span>
              <span className="text-xs text-text-secondary">
                reward masuk Balance ({formatRupiah(affiliate.earnedToBalance)})
              </span>
            </>
          ) : (
            <span className="text-xs text-text-secondary">Belum ada</span>
          )}
        </OverviewRow>
      </dl>

      {/* Open-a-store banner (like the premium banner in the reference) */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Store className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Buka Toko di valostock.id</p>
          <p className="text-xs text-text-secondary">
            Verifikasi admin + deposit Rp500 ribu — jual akunmu dengan escrow, Rekber
            Room, dan payout 5 jam.
          </p>
        </div>
        <Button href="/help/cara-membuka-toko" variant="primary" size="md">
          Pelajari
        </Button>
      </div>

      {/* Recent top-ups — full game IDs, owner-only view */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
            <Receipt className="h-4 w-4 text-primary" />
            Top-Up Terbaru
          </h2>
          <Link
            href="/account/transactions"
            className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
          >
            Lihat semua
          </Link>
        </div>
        <div className="mt-4">
          <TopupHistory transactions={recent} />
        </div>
      </section>
    </div>
  );
}
