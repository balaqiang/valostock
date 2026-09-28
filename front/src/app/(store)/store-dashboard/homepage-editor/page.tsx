import type { Metadata } from "next";
import { getStore } from "@/lib/data/catalog";
import { getMyCatalogs, requireStore } from "@/lib/data/store";
import Link from "next/link";
import { ExternalLink, ImageUp, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/account/bits";

export const metadata: Metadata = {
  title: "Homepage Editor — valostock.id",
};

export default async function HomepageEditorPage() {
  const { slug: myStoreSlug } = await requireStore("/store-dashboard/homepage-editor");
  const [store, myCatalogs] = await Promise.all([getStore(myStoreSlug), getMyCatalogs(myStoreSlug)]);
  const showcase = myCatalogs.filter((catalog) => catalog.status === "LISTED");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Homepage Editor"
          description="Kustomisasi etalase tokomu — banner, deskripsi, dan showcase."
        />
        <Link
          href={`/store/${myStoreSlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          Lihat etalase
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <form className="mt-6 space-y-6">
        {/* Banner */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            Banner
          </h2>
          <div
            className={`mt-4 flex aspect-[4/1] items-center justify-center rounded-xl bg-gradient-to-br ${store?.gradient ?? "from-primary to-fuchsia-600"}`}
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/55"
            >
              <ImageUp className="h-4 w-4" />
              Ganti banner (1600×400)
            </button>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <label
            htmlFor="store-desc"
            className="text-sm font-semibold text-text"
          >
            Deskripsi Toko
          </label>
          <textarea
            id="store-desc"
            rows={3}
            defaultValue={store?.description}
            className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-secondary">
            Tanpa kontak pribadi dan tanpa klaim mutlak (&quot;100% aman&quot;
            dilarang).
          </p>
        </section>

        {/* Showcase */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-text">Showcase Pilihan</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Pilih listing yang ditonjolkan di bagian atas etalase.
          </p>
          <div className="mt-4 space-y-2">
            {showcase.map((catalog, index) => (
              <label
                key={catalog.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3 text-sm text-text"
              >
                <input
                  type="checkbox"
                  defaultChecked={index === 0}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
                <span className="truncate">{catalog.title}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Search field for highlight text */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <label
            htmlFor="tagline"
            className="text-sm font-semibold text-text"
          >
            Tagline Toko
          </label>
          <Input
            id="tagline"
            defaultValue="Reseller store dengan katalog terluas"
            className="mt-3"
          />
        </section>

        <Button type="submit" variant="primary" size="lg">
          Simpan Perubahan
        </Button>
      </form>
    </div>
  );
}
