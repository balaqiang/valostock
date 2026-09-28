import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminPromo } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Kode Promo — Admin" };

export default async function AdminPromoCodesPage() {
  const data = await adminGet<{ promos: AdminPromo[] }>("/promo-codes");
  if (!data) return <Denied permission="master:manage" />;

  return (
    <div className="space-y-6">
      <DashHeader title="Kode Promo Top-Up" description="Diskon persen/potongan untuk top-up game. Kuota terpakai saat invoice sukses dibayar." />
      <Table head={["Kode", "Diskon", "Min. belanja", "Terpakai", "Berlaku", "Status", ""]}>
        {data.promos.map((p) => (
          <tr key={p.id}>
            <Td>
              <span className="num font-semibold">{p.code}</span>
              <span className="block text-xs text-text-secondary">{p.label}</span>
            </Td>
            <Td className="num">{p.kind === "PERCENT" ? `${p.value}%` : formatRupiah(p.value)}</Td>
            <Td className="num">{formatRupiah(p.minSpend)}</Td>
            <Td className="num">
              {p.usedCount}
              {p.quota ? ` / ${p.quota}` : ""}
            </Td>
            <Td className="text-xs text-text-secondary">{p.expiresAt ? `s.d. ${formatDbDateTime(p.expiresAt)}` : "Tanpa batas"}</Td>
            <Td>
              <Tone tone={p.isActive ? "success" : "secondary"}>{p.isActive ? "Aktif" : "Nonaktif"}</Tone>
            </Td>
            <Td>
              <ActionButton variant="ghost" method="PATCH" endpoint={`/api/admin/promo-codes/${p.id}`} body={{ isActive: !p.isActive }}>
                {p.isActive ? "Nonaktifkan" : "Aktifkan"}
              </ActionButton>
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Buat kode promo">
        <ApiForm
          endpoint="/api/admin/promo-codes"
          columns={3}
          submitLabel="Buat kode"
          fields={[
            { name: "code", label: "Kode", type: "text", required: true, placeholder: "HEMAT10" },
            { name: "label", label: "Label", type: "text", required: true, placeholder: "Diskon 10% semua top-up" },
            {
              name: "kind",
              label: "Jenis",
              type: "select",
              required: true,
              defaultValue: "PERCENT",
              options: [
                { value: "PERCENT", label: "Persen" },
                { value: "FIXED", label: "Potongan Rupiah" },
              ],
            },
            { name: "value", label: "Nilai", type: "number", required: true, min: 1 },
            { name: "minSpend", label: "Minimal belanja (Rp)", type: "money", defaultValue: 0 },
            { name: "quota", label: "Kuota (kosong = tanpa batas)", type: "number", min: 1 },
            { name: "expiresAt", label: "Berakhir", type: "datetime" },
          ]}
        />
      </Panel>
    </div>
  );
}
