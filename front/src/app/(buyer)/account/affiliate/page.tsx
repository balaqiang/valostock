import type { Metadata } from "next";
import { BadgePercent, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getReferral } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Affiliate — valostock.id" };

export default async function AffiliatePage() {
  await requireUser("/account/affiliate");
  const info = await getReferral();
  const referred = info?.referred ?? [];
  const rewarded = referred.filter((r) => r.status === "REWARDED").length;
  const stats = [
    { label: "Teman mendaftar", value: `${referred.length}`, icon: Users },
    { label: "Sudah bertransaksi", value: `${rewarded}`, icon: BadgePercent },
    { label: "Reward masuk Balance", value: formatRupiah(info?.totalEarned ?? 0), icon: Wallet },
  ];

  return (
    <div>
      <PageHeader
        title="Affiliate"
        description={`Ajak teman daftar dengan kodemu. Saat pesanan akun pertamanya selesai atau top-up pertamanya sukses, kamu dapat ${formatRupiah(info?.reward ?? 10000)} Balance.`}
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Kode referral kamu</p>
          <p className="num mt-1 font-display text-2xl font-bold tracking-wider text-primary">{info?.code ?? "—"}</p>
          {info?.link && <p className="mt-1 break-all text-xs text-text-secondary">{info.link}</p>}
        </div>
        <Badge>Reward → Balance</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5">
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="num mt-3 font-display text-xl font-bold text-text">{stat.value}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>
      {referred.length > 0 && (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-5">
          {referred.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="text-text">{r.name}</span>
                <span className="block text-xs text-text-secondary">bergabung {formatDbDateTime(r.joinedAt)}</span>
              </span>
              <Badge variant={r.status === "REWARDED" ? "success" : "secondary"}>
                {r.status === "REWARDED" ? `+${formatRupiah(r.reward)}` : "Belum bertransaksi"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-text-secondary">Reward dikreditkan ke Balance dan hanya bisa dipakai untuk top-up game — sesuai aturan closed-loop.</p>
    </div>
  );
}
