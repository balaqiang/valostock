import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/account/bits";
import { InspectionForm } from "@/components/store-dashboard/inspection-form";
import { getMyCatalog, requireStore } from "@/lib/data/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}): Promise<Metadata> {
  const { catalogId } = await params;
  const store = await requireStore(`/store-dashboard/inspections/${catalogId}`);
  const catalog = await getMyCatalog(store.slug, catalogId);
  return {
    title: catalog
      ? `Inspeksi ${catalog.vsCode ?? catalog.title} — valostock.id`
      : "Katalog tidak ditemukan — valostock.id",
  };
}

export default async function InspectionPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
  const store = await requireStore(`/store-dashboard/inspections/${catalogId}`);
  const catalog = await getMyCatalog(store.slug, catalogId);
  if (!catalog) notFound();

  return (
    <div>
      <PageHeader
        title="Account Inspection"
        description={`${catalog.title}${catalog.vsCode ? ` · VS: ${catalog.vsCode}` : ""}`}
      />

      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Inspeksi bersifat login-only: jangan pernah mengubah email atau
        password akun, dan 2FA tetap di tangan penjual. Seluruh proses direkam
        dengan checklist, timestamp, dan media di penyimpanan privat.
      </p>

      <div className="mt-6">
        <InspectionForm alreadyChecked={catalog.accountChecked} />
      </div>
    </div>
  );
}
