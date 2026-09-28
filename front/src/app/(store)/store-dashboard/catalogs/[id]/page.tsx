import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/account/bits";
import { CatalogForm } from "@/components/store-dashboard/catalog-form";
import { getMyCatalog, requireStore } from "@/lib/data/store";
import { getGames } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/catalogs/${id}`);
  const catalog = await getMyCatalog(store.slug, id);
  return {
    title: catalog
      ? `Edit ${catalog.vsCode ?? "Draft"} — valostock.id`
      : "Katalog tidak ditemukan — valostock.id",
  };
}

export default async function EditCatalogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/catalogs/${id}`);
  const catalog = await getMyCatalog(store.slug, id);
  if (!catalog) notFound();
  const games = (await getGames()).filter((game) => game.supportsAccount);

  return (
    <div>
      <PageHeader
        title={`Edit Listing${catalog.vsCode ? ` — VS: ${catalog.vsCode}` : " (Draft)"}`}
        description={catalog.title}
      />
      <div className="mt-6">
        <CatalogForm catalog={catalog} games={games} />
      </div>
    </div>
  );
}
