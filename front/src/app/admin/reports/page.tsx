import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminReport } from "@/lib/data/admin";
import { reportReasonLabel } from "@/lib/labels";
import { formatDbDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Pengguna | Admin" };

const TABS = [
  { value: "OPEN", label: "Terbuka" },
  { value: "RESOLVED", label: "Ditindaklanjuti" },
  { value: "DISMISSED", label: "Ditutup" },
  { value: "ALL", label: "Semua" },
];
const STATUS = { OPEN: ["Terbuka", "warning"], REVIEWING: ["Ditinjau", "default"], RESOLVED: ["Ditindaklanjuti", "success"], DISMISSED: ["Ditutup", "secondary"] } as const;

function targetLink(r: AdminReport) {
  if (r.targetType === "CATALOG") return `/admin/catalogs/${r.targetId}`;
  if (r.targetType === "STORE") return `/admin/stores/${r.targetId}`;
  return `/admin/users/${r.targetId}`;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "OPEN";
  const data = await adminGet<{ reports: AdminReport[] }>(`/reports?status=${status}`);
  if (!data) return <Denied permission="reports:manage" />;

  return (
    <div className="space-y-6">
      <DashHeader title="Laporan Pengguna" description="Laporan terhadap katalog, toko, atau pengguna. Tandai ditinjau, selesaikan dengan tindakan (turunkan katalog / tangguhkan toko), atau tutup." />
      <StatusTabs base="/admin/reports" current={status} tabs={TABS} />
      <Table head={["Target", "Alasan", "Pelapor", "Status", "Aksi"]} empty="Tidak ada laporan.">
        {data.reports.map((r) => {
          const open = r.status === "OPEN" || r.status === "REVIEWING";
          const endpoint = `/api/admin/reports/${r.id}`;
          return (
            <tr key={r.id}>
              <Td>
                <span className="text-xs text-text-secondary">{r.targetType}</span>
                <Link href={targetLink(r)} className="block max-w-xs truncate font-medium text-text hover:text-primary">
                  {r.targetName ?? r.targetId}
                </Link>
              </Td>
              <Td>
                {reportReasonLabel[r.reason]}
                {r.detail && <span className="block max-w-xs text-xs text-text-secondary">{r.detail}</span>}
              </Td>
              <Td className="text-xs">
                {r.reporter}
                <span className="block text-text-secondary">{formatDbDateTime(r.createdAt)}</span>
              </Td>
              <Td>
                <Tone tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Tone>
                {r.resolutionNote && <p className="mt-1 max-w-xs text-xs text-text-secondary">{r.resolutionNote}</p>}
              </Td>
              <Td>
                {open && (
                  <span className="flex flex-wrap gap-1">
                    {r.status === "OPEN" && (
                      <ActionButton variant="ghost" endpoint={endpoint} body={{ decision: "REVIEWING" }}>
                        Tinjau
                      </ActionButton>
                    )}
                    <ActionButton variant="ghost" endpoint={endpoint} body={{ decision: "RESOLVED", action: "NONE" }} prompt="Catatan tindak lanjut (wajib):" promptRequired>
                      Selesai
                    </ActionButton>
                    {r.targetType === "CATALOG" && (
                      <ActionButton variant="ghost" endpoint={endpoint} body={{ decision: "RESOLVED", action: "TAKEDOWN_CATALOG" }} prompt="Alasan menurunkan katalog (wajib):" promptRequired>
                        Turunkan katalog
                      </ActionButton>
                    )}
                    {r.targetType !== "USER" && (
                      <ActionButton variant="ghost" endpoint={endpoint} body={{ decision: "RESOLVED", action: "SUSPEND_STORE" }} prompt="Alasan menangguhkan toko (wajib):" promptRequired>
                        Tangguhkan toko
                      </ActionButton>
                    )}
                    <ActionButton variant="ghost" endpoint={endpoint} body={{ decision: "DISMISSED" }} prompt="Alasan menutup laporan (wajib):" promptRequired>
                      Tutup
                    </ActionButton>
                  </span>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
