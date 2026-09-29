import type { Metadata } from "next";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { getVouchers, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Voucher Toko | valostock.id" };

export default async function VouchersPage() {
  const store = await requireStore("/store-dashboard/vouchers");
  const vouchers = await getVouchers();

  return (
    <div className="space-y-6">
      <DashHeader
        title="Voucher Toko"
        description="Pembeli memasukkan kode saat checkout. Diskon dihitung server dan mengurangi harga akun (dasar komisi & escrow). Kuota terpakai saat pesanan dibayar."
      />
      {store.status === "ACTIVE" && (
        <Panel title="Buat voucher">
          <ApiForm
            endpoint="/api/stores/me/vouchers"
            columns={3}
            submitLabel="Buat voucher"
            fields={[
              { name: "code", label: "Kode", type: "text", required: true, placeholder: "HEMAT50", hint: "3 sampai 30 huruf/angka" },
              {
                name: "kind",
                label: "Jenis",
                type: "select",
                required: true,
                defaultValue: "FIXED",
                options: [
                  { value: "FIXED", label: "Potongan Rupiah" },
                  { value: "PERCENT", label: "Persen (maks. 90%)" },
                ],
              },
              { name: "value", label: "Nilai", type: "number", required: true, min: 1 },
              { name: "minSpend", label: "Minimal belanja (Rp)", type: "money", defaultValue: 0, min: 0 },
              { name: "quota", label: "Kuota (kosong = tanpa batas)", type: "number", min: 1 },
              { name: "expiresAt", label: "Berakhir (opsional)", type: "datetime" },
            ]}
          />
        </Panel>
      )}
      <Table head={["Kode", "Diskon", "Min. belanja", "Terpakai", "Berlaku", "Status", ""]} empty="Belum ada voucher.">
        {vouchers.map((v) => (
          <tr key={v.id}>
            <Td className="num font-semibold">{v.code}</Td>
            <Td className="num">{v.kind === "PERCENT" ? `${v.value}%` : formatRupiah(v.value)}</Td>
            <Td className="num">{formatRupiah(v.minSpend)}</Td>
            <Td className="num">
              {v.used}
              {v.quota ? ` / ${v.quota}` : ""}
            </Td>
            <Td className="text-xs text-text-secondary">{v.expiresAt ? `s.d. ${formatDbDateTime(v.expiresAt)}` : "Tanpa batas"}</Td>
            <Td>
              <Tone tone={v.isActive ? "success" : "secondary"}>{v.isActive ? "Aktif" : "Nonaktif"}</Tone>
            </Td>
            <Td>
              <span className="flex gap-1">
                <ActionButton variant="ghost" method="PATCH" endpoint={`/api/stores/me/vouchers/${v.id}`} body={{ isActive: !v.isActive }}>
                  {v.isActive ? "Nonaktifkan" : "Aktifkan"}
                </ActionButton>
                {v.used === 0 && (
                  <ActionButton variant="ghost" method="DELETE" endpoint={`/api/stores/me/vouchers/${v.id}`} confirm={`Hapus voucher ${v.code}?`}>
                    Hapus
                  </ActionButton>
                )}
              </span>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
