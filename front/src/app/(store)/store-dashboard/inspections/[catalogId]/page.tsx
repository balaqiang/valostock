import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { DashHeader, Panel } from "@/components/dashboard/ui";
import { InspectionForm } from "@/components/store-dashboard/inspection-form";
import { getMyCatalog, requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Inspeksi Akun | valostock.id" };

export default async function InspectionPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  await requireStore(`/store-dashboard/inspections/${catalogId}`);
  const detail = await getMyCatalog(catalogId);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <DashHeader
        title="Account Inspection"
        back={{ href: `/store-dashboard/catalogs/${catalogId}`, label: "Kembali ke katalog" }}
        description={`${detail.listing.title}${detail.listing.code ? ` · ${detail.listing.code}` : ""}`}
      />
      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Inspeksi bersifat login-only: jangan mengubah email atau password akun, dan 2FA tetap di tangan penjual. Checklist, catatan, dan bukti disimpan
        sebagai catatan resmi dan ikut ditinjau admin saat verifikasi katalog.
      </p>
      <Panel title="Checklist">
        <InspectionForm catalogId={catalogId} current={detail.inspection} />
      </Panel>
    </div>
  );
}
