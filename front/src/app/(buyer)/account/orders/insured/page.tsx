import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/account/bits";

export const metadata: Metadata = {
  title: "Klaim Proteksi — valostock.id",
};

// Tabs per docs/SITEMAP.md §5.1: All · Under Review · Approved · Denied · Submit Claim.
const tabs = ["Semua", "Ditinjau", "Disetujui", "Ditolak"];

export default function InsuredOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Klaim Proteksi"
        description="Setiap pesanan punya proteksi 14/30 hari — di sini daftar klaim yang kamu ajukan."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab, index) => (
            <span
              key={tab}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                index === 0
                  ? "bg-primary text-white"
                  : "border border-border bg-background text-text-secondary"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <Button variant="secondary" size="md">
          <ShieldCheck className="h-4 w-4" />
          Ajukan Klaim
        </Button>
      </div>

      <div className="mt-5">
        <EmptyState
          icon={ShieldCheck}
          title="No more records"
          body="Belum ada klaim proteksi. Semoga tidak pernah perlu — tapi kalau ada masalah, ajukan dalam 72 jam dari halaman pesananmu."
        />
      </div>
    </div>
  );
}
