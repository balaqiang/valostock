import type { Metadata } from "next";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Tone } from "@/components/dashboard/ui";
import { getBundles, getMyCatalogs, requireStore } from "@/lib/data/store";
import { catalogStatusLabel } from "@/lib/labels";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Bundle | valostock.id" };

const STATUS = { ACTIVE: ["Aktif", "success"], INACTIVE: ["Nonaktif", "secondary"], SOLD: ["Terjual", "default"] } as const;

export default async function BundlesPage() {
  const store = await requireStore("/store-dashboard/bundles");
  const [bundles, listed] = await Promise.all([getBundles(), getMyCatalogs("LISTED")]);

  return (
    <div className="space-y-6">
      <DashHeader
        title="Bundle"
        description="Jual 2 sampai 5 akun sekaligus dengan harga paket. Bundle tampil di halaman toko dan di halaman tiap akunnya; dibeli sebagai satu pesanan."
      />
      {store.status === "ACTIVE" && (
        <Panel title="Buat bundle">
          {listed.length < 2 ? (
            <p className="text-sm text-text-secondary">Butuh minimal 2 katalog yang tayang.</p>
          ) : (
            <ApiForm
              endpoint="/api/stores/me/bundles"
              submitLabel="Buat bundle"
              fields={[
                { name: "title", label: "Judul bundle", type: "text", required: true, placeholder: "Paket 2 akun Immortal" },
                { name: "bundlePrice", label: "Harga bundle (Rp)", type: "money", required: true, min: 10000, hint: "Harus lebih murah dari total harga akun." },
                {
                  name: "catalogIds",
                  label: "Pilih akun (2 sampai 5)",
                  type: "multiselect",
                  options: listed.map((c) => ({ value: c.id, label: `${c.code} · ${formatRupiah(c.basePrice)}` })),
                },
              ]}
            />
          )}
        </Panel>
      )}
      {bundles.length === 0 ? (
        <p className="text-sm text-text-secondary">Belum ada bundle.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bundles.map((b) => (
            <Panel
              key={b.id}
              title={b.title}
              description={
                <>
                  <span className="num font-semibold text-text">{formatRupiah(b.bundlePrice)}</span> dari{" "}
                  <span className="num line-through">{formatRupiah(b.itemsTotal)}</span>
                </>
              }
              actions={<Tone tone={STATUS[b.status][1]}>{STATUS[b.status][0]}</Tone>}
            >
              <ul className="space-y-1 text-sm">
                {b.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span className="truncate text-text">{i.title}</span>
                    <span className="text-xs text-text-secondary">{catalogStatusLabel[i.status]}</span>
                  </li>
                ))}
              </ul>
              {b.status !== "SOLD" && (
                <div className="mt-4">
                  <ActionButton
                    variant="ghost"
                    method="PATCH"
                    endpoint={`/api/stores/me/bundles/${b.id}`}
                    body={{ status: b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                  >
                    {b.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                  </ActionButton>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
