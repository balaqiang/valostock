import type { Metadata } from "next";
import { Check, Gem } from "lucide-react";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { StartPayment } from "@/components/payment/start-payment";
import { getSubscription, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Langganan Toko | valostock.id" };

const PERKS: Record<string, string[]> = {
  FREE: ["Komisi 5%", "15 katalog aktif", "Minggu pertama iklan gratis (sekali)"],
  PRO: ["Komisi 4,5%", "60 katalog aktif", "2 slot iklan gratis / periode", "Badge Pro"],
  BUSINESS: ["Komisi 4%", "Katalog aktif tanpa batas", "6 slot iklan gratis / periode", "Badge Business, prioritas support"],
};

export default async function SubscriptionPage() {
  const store = await requireStore("/store-dashboard/subscription");
  const info = await getSubscription();
  const current = info?.current;
  const tier = current?.tier ?? "FREE";

  return (
    <div className="space-y-6">
      <DashHeader
        title="Langganan Toko"
        description="Paket menentukan komisi per pesanan, batas katalog aktif, dan slot iklan gratis. Dibayar lewat Midtrans, berlaku 30 hari; membeli paket yang sama memperpanjang masa aktif."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {(info?.plans ?? []).map((plan) => {
          const active = plan.tier === tier;
          return (
            <div key={plan.tier} className={cn("flex flex-col rounded-2xl border bg-surface p-6", active ? "border-primary" : "border-border")}>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
                  <Gem className="h-4 w-4 text-primary" /> {plan.tier}
                </h2>
                {active && <Tone tone="default">Paket aktif</Tone>}
              </div>
              <p className="num mt-2 font-display text-2xl font-bold text-text">
                {plan.price === 0 ? "Gratis" : formatRupiah(plan.price)}
                {plan.price > 0 && <span className="text-sm font-normal text-text-secondary"> / 30 hari</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-text-secondary">
                {(PERKS[plan.tier] ?? []).map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" /> {perk}
                  </li>
                ))}
              </ul>
              {plan.tier !== "FREE" && store.status === "ACTIVE" && (
                <div className="mt-5">
                  <StartPayment
                    endpoint="/api/stores/me/subscription"
                    body={{ tier: plan.tier }}
                    label={active ? "Perpanjang" : `Pilih ${plan.tier}`}
                    confirm={`Bayar ${formatRupiah(plan.price)} untuk paket ${plan.tier}?`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Panel title="Status paket">
        <p className="text-sm text-text-secondary">
          Paket <strong className="text-text">{tier}</strong>
          {current?.current_period_end ? <> · aktif sampai {formatDbDateTime(current.current_period_end)}</> : " · tanpa masa berlaku"}
          {" · "}slot iklan gratis terpakai{" "}
          <span className="num font-medium text-text">
            {current?.used_featured_slots ?? 0}/{current?.free_featured_slots ?? 0}
          </span>
        </p>
        <p className="mt-2 text-xs text-text-secondary">Saat masa berlaku habis, toko otomatis kembali ke paket Free.</p>
      </Panel>

      <Panel title="Riwayat pembayaran">
        <Table head={["Invoice", "Paket", "Jumlah", "Status", "Tanggal"]} empty="Belum ada pembayaran langganan.">
          {(info?.history ?? []).map((h) => (
            <tr key={h.invoice}>
              <Td className="num text-xs">{h.invoice}</Td>
              <Td>{h.tier}</Td>
              <Td className="num">{formatRupiah(h.amount)}</Td>
              <Td>
                <Tone tone={h.status === "PAID" ? "success" : h.status === "PENDING" ? "warning" : "secondary"}>{h.status}</Tone>
              </Td>
              <Td className="text-xs text-text-secondary">{formatDbDateTime(h.date)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
