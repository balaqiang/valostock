"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { ActionButton } from "@/components/dashboard/action-button";
import { Badge } from "@/components/ui/badge";
import { formatDbDateTime } from "@/lib/format";
import { CmsBannerForm } from "@/components/admin/cms/banner-form";
import type { CmsBanner } from "@/lib/data/admin";

const STATUS: Record<CmsBanner["status"], { label: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  LIVE: { label: "Tayang", variant: "success" },
  SCHEDULED: { label: "Terjadwal", variant: "warning" },
  ENDED: { label: "Selesai", variant: "outline" },
  INACTIVE: { label: "Nonaktif", variant: "secondary" },
};

/** Home banners with preview, status and inline edit. */
export function CmsBannerList({ banners }: { banners: CmsBanner[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (banners.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">Belum ada banner — beranda memakai hero teks.</p>;
  }
  return (
    <ul className="space-y-3">
      {banners.map((b) => (
        <li key={b.id} className="rounded-2xl border border-border bg-surface p-4">
          {editing === b.id ? (
            <CmsBannerForm banner={b} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative aspect-[21/9] w-full flex-none overflow-hidden rounded-lg bg-surface-elevated sm:w-56">
                <Image src={b.imageUrl} alt="" fill sizes="224px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS[b.status].variant}>{STATUS[b.status].label}</Badge>
                  <span className="num text-xs text-text-secondary">Urutan {b.sortOrder}</span>
                </div>
                <p className="mt-1.5 font-medium text-text">{b.title}</p>
                {b.subtitle && <p className="line-clamp-2 text-xs text-text-secondary">{b.subtitle}</p>}
                <p className="mt-1 text-xs text-text-secondary">
                  {b.ctaLabel && b.linkUrl ? `Tombol "${b.ctaLabel}" → ${b.linkUrl}` : "Tanpa tombol"}
                  {(b.startsAt || b.endsAt) &&
                    ` · ${b.startsAt ? formatDbDateTime(b.startsAt) : "sekarang"} – ${b.endsAt ? formatDbDateTime(b.endsAt) : "seterusnya"}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                <button
                  type="button"
                  onClick={() => setEditing(b.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Ubah
                </button>
                <ActionButton variant="ghost" method="PATCH" endpoint={`/api/admin/cms/banners/${b.id}`} body={{ isActive: !b.isActive }}>
                  {b.isActive ? "Nonaktifkan" : "Aktifkan"}
                </ActionButton>
                <ActionButton variant="ghost" method="DELETE" endpoint={`/api/admin/cms/banners/${b.id}`} confirm={`Hapus banner "${b.title}"?`}>
                  Hapus
                </ActionButton>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
