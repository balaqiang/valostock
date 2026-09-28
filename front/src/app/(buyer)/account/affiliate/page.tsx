import type { Metadata } from "next";
import { BadgePercent, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { formatRupiah } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getAffiliate } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Affiliate — valostock.id",
};

export default async function AffiliatePage() {
  const user = await requireUser("/account/affiliate");
  // Accounts without an affiliate record yet start at zero.
  const affiliate = (await getAffiliate(user.id)) ?? {
    code: "—",
    referred: 0,
    qualified: 0,
    earnedToBalance: 0,
  };
  const stats = [
  { label: "Teman diundang", value: `${affiliate.referred}`, icon: Users },
  { label: "Referral memenuhi syarat", value: `${affiliate.qualified}`, icon: BadgePercent },
  {
    label: "Reward masuk Balance",
    value: formatRupiah(affiliate.earnedToBalance),
    icon: Wallet,
  },
];

  return (
    <div>
      <PageHeader
        title="Affiliate"
        description="Undang teman dengan kode referralmu — reward dikreditkan ke Balance (closed-loop, bukan uang tunai)."
      />

      {/* Referral code */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Kode referral kamu
          </p>
          <p className="num mt-1 font-display text-2xl font-bold tracking-wider text-primary">
            {affiliate.code}
          </p>
        </div>
        <Badge>Reward → Balance</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="num mt-3 font-display text-xl font-bold text-text">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-text-secondary">
        Reward affiliate dikreditkan ke Balance dan hanya bisa dipakai untuk
        top-up game — sesuai aturan closed-loop.
      </p>
    </div>
  );
}
