import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { adminGet } from "@/lib/data/admin";
import { formatRupiah } from "@/lib/format";
import type { AdminProduct } from "@/types/api";

export const metadata: Metadata = { title: "Produk Top-Up | Admin" };

// Kelola Produk Top-Up (SKPL 4.3.15, SKPL-F-02, DFD 2.1–2.4).
export default async function AdminTopupProductsPage() {
  const data = await adminGet<{ products: AdminProduct[]; games: { id: number; name: string }[] }>("/topup-products");
  if (!data) return <Denied />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Produk Top-Up"
        description="Nominal top-up per game. Harga modal dari daftar harga Digiflazz; harga jual default = modal + 3% dibulatkan ke atas Rp100 dan tidak boleh di bawah modal (MONEY_RULES §2). Pengiriman ke Digiflazz disimulasikan."
      />
      <Table head={["Produk", "Game", "Modal", "Harga jual", "Margin", "Terjual", "Status", ""]}>
        {data.products.map((p) => (
          <tr key={p.id}>
            <Td>
              <span className="flex items-center gap-2.5">
                {p.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.icon} alt="" className="h-8 w-8 flex-none object-contain" />
                ) : (
                  <span className="h-8 w-8 flex-none rounded-lg bg-surface-elevated" />
                )}
                <span>
                  <span className="font-medium text-text">{p.amountLabel}</span>
                  <span className="block text-xs text-text-secondary">
                    {p.id} · {p.section === "SPECIAL" ? "Item Spesial" : "Top Up Instan"}
                    {p.popular && " · populer"}
                  </span>
                </span>
              </span>
            </Td>
            <Td className="text-xs">{p.gameName}</Td>
            <Td className="num text-text-secondary">{formatRupiah(p.supplierPrice)}</Td>
            <Td className="num">
              <details>
                <summary className="cursor-pointer">{formatRupiah(p.retailPrice)}</summary>
                <div className="mt-2 w-64">
                  <ApiForm
                    endpoint={`/api/admin/topup-products/${p.id}`}
                    method="PATCH"
                    columns={1}
                    resetOnSuccess={false}
                    fields={[
                      { name: "supplierPrice", label: "Harga modal Digiflazz", type: "money", required: true, defaultValue: p.supplierPrice },
                      { name: "retailPrice", label: "Harga jual", type: "money", defaultValue: p.retailPrice, hint: "Kosongkan untuk modal + 3%." },
                      {
                        name: "section",
                        label: "Bagian",
                        type: "select",
                        defaultValue: p.section,
                        options: [
                          { value: "INSTANT", label: "Top Up Instan" },
                          { value: "SPECIAL", label: "Item Spesial" },
                        ],
                      },
                      { name: "icon", label: "Ikon", type: "text", defaultValue: p.icon ?? "", placeholder: "/images/topup-icon/…" },
                      { name: "sortOrder", label: "Urutan", type: "number", defaultValue: p.sortOrder },
                      { name: "popular", label: "Populer", type: "checkbox", defaultValue: p.popular },
                    ]}
                  />
                </div>
              </details>
            </Td>
            <Td className={p.margin > 0 ? "num text-emerald-600 dark:text-emerald-400" : "num text-text-secondary"}>
              {formatRupiah(p.margin)}
              <span className="block text-[11px] text-text-secondary">{((p.margin / p.supplierPrice) * 100).toFixed(1)}%</span>
            </Td>
            <Td className="num">{p.sold}</Td>
            <Td>
              <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Aktif" : "Nonaktif"}</Badge>
            </Td>
            <Td>
              <ActionButton variant="ghost" method="PATCH" endpoint={`/api/admin/topup-products/${p.id}`} body={{ isActive: !p.isActive }}>
                {p.isActive ? "Nonaktifkan" : "Aktifkan"}
              </ActionButton>
              <ActionButton
                variant="ghost"
                method="DELETE"
                endpoint={`/api/admin/topup-products/${p.id}`}
                confirm={`Hapus produk ${p.amountLabel}? Produk yang sudah pernah dipesan tidak bisa dihapus, hanya dinonaktifkan.`}
              >
                Hapus
              </ActionButton>
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Tambah produk">
        <ApiForm
          endpoint="/api/admin/topup-products"
          columns={3}
          submitLabel="Tambah produk"
          fields={[
            { name: "id", label: "ID produk", type: "text", required: true, placeholder: "vp-5350", hint: "huruf kecil, angka, minus" },
            { name: "gameId", label: "Game", type: "select", numeric: true, required: true, defaultValue: String(data.games[0]?.id ?? ""), options: data.games.map((g) => ({ value: String(g.id), label: g.name })) },
            { name: "name", label: "Nama", type: "text", required: true, placeholder: "Valorant Points" },
            { name: "amountLabel", label: "Label nominal", type: "text", required: true, placeholder: "5350 VP" },
            { name: "supplierPrice", label: "Harga modal Digiflazz (Rp)", type: "money", required: true, min: 1 },
            { name: "retailPrice", label: "Harga jual (Rp)", type: "money", min: 1, hint: "Kosongkan untuk modal + 3%, dibulatkan ke atas Rp100." },
            {
              name: "section",
              label: "Bagian",
              type: "select",
              defaultValue: "INSTANT",
              options: [
                { value: "INSTANT", label: "Top Up Instan" },
                { value: "SPECIAL", label: "Item Spesial" },
              ],
            },
            { name: "icon", label: "Ikon", type: "text", placeholder: "/images/topup-icon/valorant/vp.webp" },
            { name: "popular", label: "Populer", type: "checkbox" },
          ]}
        />
      </Panel>
    </div>
  );
}
