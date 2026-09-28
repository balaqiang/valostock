import type { Metadata } from "next";
import { FileWarning, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getReports } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Laporan Saya — valostock.id",
};

export default async function ReportsPage() {
  const user = await requireUser("/account/reports");
  const myReports = await getReports(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Laporan Saya"
          description="Laporkan toko, listing, atau pesanan bermasalah — dan pantau statusnya."
        />
        <Button variant="secondary" size="md">
          <Flag className="h-4 w-4" />
          Buat Laporan
        </Button>
      </div>

      {myReports.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {myReports.map((report) => (
            <li
              key={report.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text">
                  {report.target}
                </span>
                <span className="num block text-xs text-text-secondary">
                  {report.reason} · {formatDateShort(report.date)}
                </span>
              </span>
              <Badge variant={report.status === "RESOLVED" ? "success" : "warning"}>
                {report.status}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={FileWarning}
            title="Belum ada laporan"
            body="Jika menemukan listing mencurigakan atau masalah pesanan, laporkan — tim kami menindaklanjuti setiap laporan."
          />
        </div>
      )}
    </div>
  );
}
