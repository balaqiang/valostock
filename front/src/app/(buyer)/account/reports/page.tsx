import type { Metadata } from "next";
import Link from "next/link";
import { FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDbDateTime } from "@/lib/format";
import { reportReasonLabel } from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { getMyReports } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Laporan Saya — valostock.id" };

const STATUS = {
  OPEN: ["Menunggu", "warning"],
  REVIEWING: ["Ditinjau", "default"],
  RESOLVED: ["Ditindaklanjuti", "success"],
  DISMISSED: ["Ditutup", "secondary"],
} as const;

const TARGET = { CATALOG: "Katalog", STORE: "Toko", USER: "Pengguna" } as const;

export default async function ReportsPage() {
  await requireUser("/account/reports");
  const reports = await getMyReports();

  return (
    <div>
      <PageHeader title="Laporan Saya" description="Laporkan katalog atau toko bermasalah lewat tombol Laporkan di halamannya. Moderator menindaklanjuti setiap laporan." />
      {reports.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium text-text">
                  {TARGET[r.targetType]}:{" "}
                  {r.targetType === "CATALOG" ? (
                    <Link href={`/catalog/${r.targetId}`} className="hover:text-primary">
                      {r.targetName ?? r.targetId}
                    </Link>
                  ) : (
                    (r.targetName ?? r.targetId)
                  )}
                </span>
                <Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {reportReasonLabel[r.reason]} · {formatDbDateTime(r.createdAt)}
              </p>
              {r.detail && <p className="mt-1 text-sm text-text">{r.detail}</p>}
              {r.resolutionNote && (
                <p className="mt-2 rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
                  <span className="font-medium text-text">Tanggapan moderator:</span> {r.resolutionNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={FileWarning} title="Belum ada laporan" body="Temukan katalog mencurigakan? Tekan Laporkan di halaman katalog atau toko." />
        </div>
      )}
    </div>
  );
}
