import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgePercent, CircleUserRound, Crown, Phone, Receipt, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TopupHistory } from "@/components/account/topup-history";
import { customerIdFor } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getMyTransactions } from "@/lib/data/me";

export const metadata: Metadata = {
  title: "Dashboard Akun | valostock.id",
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
      <dd className="flex flex-wrap items-center gap-2 text-sm text-text">{children}</dd>
    </div>
  );
}

export default async function AccountDashboardPage() {
  const user = await requireUser("/account");
  const recent = (await getMyTransactions()).slice(0, 5);

  return (
    <div>
      <h1 className="font-display text-xl font-bold tracking-tight text-text">Ringkasan Akun</h1>

      <dl className="mt-3 divide-y divide-border border-t border-border">
        <OverviewRow icon={Crown} label="Status Akun">
          <Badge>{user.role === "ADMIN" ? "ADMIN" : "MEMBER"}</Badge>
        </OverviewRow>
        <OverviewRow icon={CircleUserRound} label="Customer ID">
          <span className="num font-medium">{customerIdFor(user.id)}</span>
        </OverviewRow>
        <OverviewRow icon={Phone} label="Nomor HP">
          <span className="num">{user.phone ?? "-"}</span>
          <Link href="/account/profile" className="text-xs font-medium text-primary">
            Ubah
          </Link>
        </OverviewRow>
        <OverviewRow icon={Wallet} label="Balance (BLC)">
          <span className="num font-semibold">{user.balance.toLocaleString("id-ID")} BLC</span>
          <Link
            href="/balance"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            Isi Balance
            <ArrowRight className="h-3 w-3" />
          </Link>
        </OverviewRow>
        <OverviewRow icon={BadgePercent} label="Kode Referral">
          <span className="num rounded-md bg-surface-elevated px-2 py-0.5 text-xs font-semibold tracking-wider">
            {user.referralCode}
          </span>
          <span className="text-xs text-text-secondary">
            Teman yang daftar dengan kode ini memberimu Rp10.000 Balance saat top-up pertamanya berhasil.
          </span>
        </OverviewRow>
      </dl>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
            <Receipt className="h-4 w-4 text-primary" />
            Transaksi Terbaru
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
