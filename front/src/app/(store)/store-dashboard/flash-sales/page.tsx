import type { Metadata } from "next";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { getFlashSales, getMyCatalogs, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Flash Sale | valostock.id" };

const STATE = { SCHEDULED: ["Terjadwal", "warning"], RUNNING: ["Berjalan", "success"], ENDED: ["Selesai", "secondary"] } as const;

export default async function FlashSalesPage() {
  const store = await requireStore("/store-dashboard/flash-sales");
  const [sales, listed] = await Promise.all([getFlashSales(), getMyCatalogs("LISTED")]);

  return (
    <div className="space-y-6">
      <DashHeader
        title="Flash Sale"
        description="Harga khusus dalam rentang waktu tertentu (maks. 7 hari). Selama berjalan, harga flash sale dipakai di marketplace dan saat checkout."
      />
      {store.status === "ACTIVE" && (
        <Panel title="Buat flash sale">
          {listed.length === 0 ? (
            <p className="text-sm text-text-secondary">Belum ada katalog yang tayang.</p>
          ) : (
            <ApiForm
              endpoint="/api/stores/me/flash-sales"
              submitLabel="Jadwalkan"
              fields={[
                {
                  name: "catalogId",
                  label: "Katalog",
                  type: "select",
                  required: true,
                  defaultValue: listed[0]?.id,
                  options: listed.map((c) => ({ value: c.id, label: `${c.code} · ${c.title} (${formatRupiah(c.basePrice)})` })),
                },
                { name: "salePrice", label: "Harga flash sale (Rp)", type: "money", required: true, min: 10000 },
                { name: "startsAt", label: "Mulai", type: "datetime", required: true },
                { name: "endsAt", label: "Berakhir", type: "datetime", required: true },
              ]}
            />
          )}
        </Panel>
      )}
      <Table head={["Katalog", "Harga normal", "Harga flash", "Periode", "Status", ""]} empty="Belum ada flash sale.">
        {sales.map((s) => (
          <tr key={s.id}>
            <Td className="max-w-xs truncate">
              {s.catalog.vsCode} · {s.catalog.title}
            </Td>
            <Td className="num text-text-secondary line-through">{formatRupiah(s.catalog.price)}</Td>
            <Td className="num font-semibold">{formatRupiah(s.salePrice)}</Td>
            <Td className="text-xs text-text-secondary">
              {formatDbDateTime(s.startsAt)} sampai {formatDbDateTime(s.endsAt)}
            </Td>
            <Td>
              <Tone tone={STATE[s.state][1]}>{STATE[s.state][0]}</Tone>
            </Td>
            <Td>
              {s.state !== "ENDED" && (
                <ActionButton variant="ghost" method="DELETE" endpoint={`/api/stores/me/flash-sales/${s.id}`} confirm={s.state === "RUNNING" ? "Akhiri flash sale sekarang?" : "Hapus jadwal flash sale?"}>
                  {s.state === "RUNNING" ? "Akhiri" : "Hapus"}
                </ActionButton>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
