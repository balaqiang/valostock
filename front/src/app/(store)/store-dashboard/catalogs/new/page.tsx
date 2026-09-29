import type { Metadata } from "next";
import { DashHeader, Panel } from "@/components/dashboard/ui";
import { CatalogEditor } from "@/components/store-dashboard/catalog-editor";
import { getGameFields, getGames } from "@/lib/data/catalog";
import { requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Katalog Baru | valostock.id" };

export default async function NewCatalogPage() {
  const store = await requireStore("/store-dashboard/catalogs/new");
  const games = (await getGames()).filter((game) => game.supportsAccount);
  const initialFields = games[0] ? await getGameFields(games[0].slug) : [];
  return (
    <div className="space-y-6">
      <DashHeader
        title="Katalog Baru"
        back={{ href: "/store-dashboard/catalogs", label: "Katalog" }}
        description="Langkah 1: simpan data akun sebagai draf. Langkah 2: unggah foto. Langkah 3: ajukan ke admin untuk diverifikasi."
      />
      <Panel title="Data katalog">
        <CatalogEditor games={games} initialFields={initialFields} commissionRate={store.subscription?.commissionRate ?? 0.05} />
      </Panel>
    </div>
  );
}
