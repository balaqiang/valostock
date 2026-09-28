import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel } from "@/components/dashboard/ui";
import { GradientPicker } from "@/components/store-dashboard/gradient-picker";
import { getMyCatalogs, requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Etalase Toko — valostock.id" };

export default async function HomepageEditorPage() {
  const store = await requireStore("/store-dashboard/homepage-editor");
  const listed = await getMyCatalogs("LISTED");

  return (
    <div className="space-y-6">
      <DashHeader
        title="Etalase Toko"
        description="Tampilan halaman publik tokomu: warna banner, deskripsi, katalog tayang, bundle, dan voucher aktif."
        actions={
          <Link href={`/store/${store.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Lihat etalase <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <Panel title="Banner">
        <div className={`mb-5 rounded-2xl bg-gradient-to-br ${store.gradient} px-6 py-8`}>
          <p className="font-display text-2xl font-bold text-white">{store.name}</p>
          <p className="mt-1 max-w-lg text-sm text-white/80">{store.description || "Deskripsi toko belum diisi."}</p>
        </div>
        <GradientPicker current={store.gradient} />
      </Panel>
      <Panel title="Deskripsi etalase">
        <ApiForm
          endpoint="/api/stores/me"
          method="PATCH"
          columns={1}
          resetOnSuccess={false}
          fields={[{ name: "description", label: "Deskripsi", type: "textarea", defaultValue: store.description, maxLength: 1000 }]}
        />
      </Panel>
      <Panel title="Katalog yang tampil" description="Hanya katalog yang sudah disetujui admin (Tayang) yang muncul di etalase.">
        <p className="text-sm text-text-secondary">
          <span className="num font-semibold text-text">{listed.length}</span> katalog tayang.{" "}
          <Link href="/store-dashboard/catalogs" className="text-primary">
            Kelola katalog →
          </Link>
        </p>
      </Panel>
    </div>
  );
}
