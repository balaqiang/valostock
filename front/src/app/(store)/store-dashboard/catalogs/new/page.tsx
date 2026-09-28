import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { CatalogForm } from "@/components/store-dashboard/catalog-form";
import { getGames } from "@/lib/data/catalog";
import { requireStore } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Listing Baru — valostock.id",
};

export default async function NewCatalogPage() {
  await requireStore("/store-dashboard/catalogs/new");
  const games = (await getGames()).filter((game) => game.supportsAccount);
  return (
    <div>
      <PageHeader
        title="Listing Baru"
        description="Pilih game, isi detail akun, lalu simpan sebagai draft atau publish."
      />
      <div className="mt-6">
        <CatalogForm games={games} />
      </div>
    </div>
  );
}
