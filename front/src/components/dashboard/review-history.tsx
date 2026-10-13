import { CheckCircle2, CircleDot, ShieldAlert, XCircle } from "lucide-react";
import { formatDbDateTime } from "@/lib/format";
import type { CatalogReview } from "@/types/api";

const META: Record<CatalogReview["decision"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  SUBMITTED: { label: "Diajukan", icon: CircleDot, className: "text-primary" },
  APPROVED: { label: "Disetujui", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  REJECTED: { label: "Ditolak", icon: XCircle, className: "text-red-600 dark:text-red-400" },
  TAKEDOWN: { label: "Diturunkan", icon: ShieldAlert, className: "text-red-600 dark:text-red-400" },
};

/** Moderation history of a catalog (catalog_reviews), newest first. */
export function ReviewHistory({ reviews }: { reviews: CatalogReview[] }) {
  if (reviews.length === 0) return <p className="text-sm text-text-secondary">Belum pernah diajukan.</p>;
  return (
    <ol className="space-y-4">
      {reviews.map((r) => {
        const meta = META[r.decision];
        return (
          <li key={r.id} className="flex gap-3">
            <meta.icon className={`mt-0.5 h-4 w-4 flex-none ${meta.className}`} />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-text">
                {meta.label} <span className="font-normal text-text-secondary">· {r.actor}</span>
              </p>
              <p className="text-xs text-text-secondary">{formatDbDateTime(r.date)}</p>
              {r.reasons.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-text">
                  {r.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              {r.note && <p className="mt-1 text-xs text-text">{r.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
