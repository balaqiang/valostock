import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/account/bits";
import { ApiForm } from "@/components/dashboard/api-form";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getPoints } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Loyalty Points | valostock.id" };

const TYPE = { EARN: "Dapat poin", REDEEM: "Tukar ke Balance", ADJUSTMENT: "Penyesuaian" } as const;

export default async function PointsPage() {
  await requireUser("/account/points");
  const info = await getPoints();
  const maxUnits = Math.floor(info.points / info.redeemUnit);

  return (
    <div>
      <PageHeader
        title="Loyalty Points"
        description={`1 poin per Rp1.000 dari pesanan akun yang selesai dan top-up yang sukses. ${info.redeemUnit} poin = ${formatRupiah(info.rupiahPerUnit)} Balance (untuk top-up).`}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-6 w-6" />
          </span>
          <div>
            <p className="num font-display text-2xl font-bold text-text">{info.points.toLocaleString("id-ID")} poin</p>
            <p className="text-xs text-text-secondary">≈ {formatRupiah(maxUnits * info.rupiahPerUnit)} Balance bila ditukar semua.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="mb-3 text-sm font-semibold text-text">Tukar poin ke Balance</p>
          {maxUnits > 0 ? (
            <ApiForm
              endpoint="/api/me/points/redeem"
              columns={1}
              submitLabel="Tukar"
              successMessage="Poin ditukar, Balance bertambah."
              fields={[{ name: "points", label: `Jumlah poin (kelipatan ${info.redeemUnit})`, type: "number", required: true, min: info.redeemUnit, defaultValue: maxUnits * info.redeemUnit }]}
            />
          ) : (
            <p className="text-sm text-text-secondary">Minimal {info.redeemUnit} poin untuk ditukar.</p>
          )}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface px-5">
        {info.ledger.length === 0 && <li className="py-6 text-center text-sm text-text-secondary">Belum ada riwayat poin.</li>}
        {info.ledger.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block text-sm text-text">{TYPE[entry.type]}</span>
              <span className="num block text-xs text-text-secondary">
                {entry.reference} · {formatDbDateTime(entry.createdAt)}
              </span>
            </span>
            <span className={`num flex-none text-sm font-medium ${entry.points < 0 ? "text-text" : "text-emerald-600 dark:text-emerald-400"}`}>
              {entry.points > 0 ? "+" : ""}
              {entry.points.toLocaleString("id-ID")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
