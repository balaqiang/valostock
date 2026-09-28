import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getLoyaltyPoints, getPointsLedger } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Poin — valostock.id",
};

export default async function PointsPage() {
  const user = await requireUser("/account/points");
  const [points, pointsLedger] = await Promise.all([getLoyaltyPoints(user.id), getPointsLedger(user.id)]);

  return (
    <div>
      <PageHeader
        title="Loyalty Points"
        description="Dapat poin dari setiap pesanan yang selesai — tukarkan dengan potongan harga."
      />

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-6">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Coins className="h-6 w-6" />
        </span>
        <div>
          <p className="num font-display text-2xl font-bold text-text">
            {points.toLocaleString("id-ID")} poin
          </p>
          <p className="text-xs text-text-secondary">
            Poin aktif — siap ditukar saat checkout.
          </p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface px-5">
        {pointsLedger.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <span className="min-w-0">
              <span className="block text-sm text-text">
                {entry.type === "EARN" ? "Dapat poin" : "Tukar poin"}
              </span>
              <span className="num block text-xs text-text-secondary">
                {entry.ref} · {formatDateShort(entry.date)}
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
    </div>
  );
}
