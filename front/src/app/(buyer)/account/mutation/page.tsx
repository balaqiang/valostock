import type { Metadata } from "next";
import { Coins, Wallet } from "lucide-react";
import { PageHeader } from "@/components/account/bits";
import { formatDbDateTime } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getMyBalanceLedger } from "@/lib/data/me";
import { balanceLedgerTypeLabel } from "@/lib/topup-status";
import { getPoints } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Mutasi — valostock.id",
};

export default async function MutationPage() {
  await requireUser("/account/mutation");
  const balanceLedger = (await getMyBalanceLedger()).slice(0, 20);
  const pointsLedger = (await getPoints()).ledger;

  return (
    <div>
      <PageHeader
        title="Mutasi"
        description="Pergerakan Balance (BLC) dan Loyalty Points — semuanya tercatat."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Balance mutations */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Wallet className="h-4 w-4 text-primary" />
            Balance (BLC)
          </h2>
          {balanceLedger.length === 0 && (
            <p className="mt-4 text-sm text-text-secondary">Belum ada mutasi Balance.</p>
          )}
          <ul className="mt-4 divide-y divide-border">
            {balanceLedger.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-text">
                    {balanceLedgerTypeLabel[entry.type]}
                  </span>
                  <span className="num block text-xs text-text-secondary">
                    {entry.reference} · {formatDbDateTime(entry.created_at)}
                  </span>
                </span>
                <span
                  className={`num flex-none text-sm font-medium ${
                    entry.amount < 0
                      ? "text-text"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount.toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Points mutations */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Coins className="h-4 w-4 text-primary" />
            Loyalty Points
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {pointsLedger.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-text">
                    {entry.type === "EARN" ? "Dapat poin" : entry.type === "REDEEM" ? "Tukar poin" : "Penyesuaian"}
                  </span>
                  <span className="num block text-xs text-text-secondary">
                    {entry.reference} · {formatDbDateTime(entry.createdAt)}
                  </span>
                </span>
                <span
                  className={`num flex-none text-sm font-medium ${
                    entry.points < 0
                      ? "text-text"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {entry.points > 0 ? "+" : ""}
                  {entry.points.toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
