import type { Metadata } from "next";
import { requireStore, getSubscription } from "@/lib/data/store";
import { Check, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { cn } from "@/lib/utils";
import { formatDateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: "Langganan Toko — valostock.id",
};

// Tiers per docs/MONEY_RULES.md §5.
const tiers = [
  {
    key: "FREE",
    name: "Free",
    price: "Gratis",
    commission: "5%",
    perks: ["Hingga 15 listing aktif", "Fitur dasar toko"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "Rp 99.000/bln",
    commission: "4,5%",
    perks: [
      "Hingga 60 listing aktif",
      "Badge Pro",
      "Analytics",
      "Bulk upload",
      "2 slot featured gratis/bln",
      "Boost ranking kecil",
    ],
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "Rp 299.000/bln",
    commission: "4%",
    perks: [
      "Listing tanpa batas",
      "Badge Business",
      "Analytics lanjutan",
      "Bulk upload",
      "6 slot featured gratis/bln",
      "Prioritas ranking",
      "Akses API",
      "Prioritas support & sengketa",
    ],
  },
] as const;

export default async function SubscriptionPage() {
  const store = await requireStore("/store-dashboard/subscription");
  const mySubscription = await getSubscription(store.slug);
  return (
    <div>
      <PageHeader
        title="Langganan"
        description={`Paket aktif: ${mySubscription.tier} — berlaku sampai ${formatDateLong(mySubscription.currentPeriodEnd)}.`}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => {
          const current = tier.key === mySubscription.tier;
          return (
            <div
              key={tier.key}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                current
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
                  <Gem
                    className={cn(
                      "h-4 w-4",
                      current ? "text-primary" : "text-text-secondary",
                    )}
                  />
                  {tier.name}
                </h2>
                {current && <Badge>Paket kamu</Badge>}
              </div>
              <p className="num mt-2 text-sm font-semibold text-text">
                {tier.price}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Komisi{" "}
                <span className="num font-semibold text-primary">
                  {tier.commission}
                </span>{" "}
                dari harga final
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {tier.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button
                variant={current ? "secondary" : "primary"}
                size="md"
                className="mt-5 w-full"
                disabled={current}
              >
                {current
                  ? "Sedang aktif"
                  : tier.key === "FREE"
                    ? "Turunkan Paket"
                    : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-text-secondary">
        Premium menurunkan komisi dan menambah kapasitas — reputasi (rating,
        Service Score, badge kepercayaan) tetap harus diperoleh, tidak bisa
        dibeli.
      </p>
    </div>
  );
}
