import { cn } from "@/lib/utils";

/** Page title + description for admin pages. */
export function DashHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <header>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
    </header>
  );
}

export function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="num mt-2 font-display text-2xl font-bold tracking-tight text-text">{value}</p>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface">
      <h2 className="border-b border-border px-5 py-4 font-display text-base font-bold text-text">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Horizontally scrollable table with consistent styling. */
export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-surface-elevated/60 text-xs text-text-secondary">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length > 0 ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-sm text-text-secondary">
                {empty ?? "Belum ada data."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}
