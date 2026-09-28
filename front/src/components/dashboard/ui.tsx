import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Page title + description + actions for dashboard pages (store & admin). */
export function DashHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="text-xs font-medium text-text-secondary hover:text-primary">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-2xl border bg-surface p-5 transition-colors",
        href && "hover:border-primary/40",
        tone === "warning" && "border-amber-500/40",
        tone === "danger" && "border-red-500/40",
        tone === "success" && "border-emerald-500/40",
        tone === "default" && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-text-secondary" />}
      </div>
      <p className="num mt-2 font-display text-2xl font-bold tracking-tight text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-bold text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
          </div>
          {actions}
        </div>
      )}
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

/** Tabs as links (?status=…), so the server page filters. */
export function StatusTabs({
  base,
  current,
  tabs,
  param = "status",
}: {
  base: string;
  current: string;
  tabs: { value: string; label: string; count?: number }[];
  param?: string;
}) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Filter status">
      {tabs.map((tab) => {
        const active = tab.value === current;
        return (
          <Link
            key={tab.value}
            href={`${base}?${param}=${tab.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-primary text-white" : "border border-border bg-background text-text-secondary hover:text-text",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn("num rounded-full px-1.5 text-[10px]", active ? "bg-white/25" : "bg-surface-elevated")}>{tab.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Tone({
  tone,
  children,
}: {
  tone: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  children: React.ReactNode;
}) {
  return <Badge variant={tone}>{children}</Badge>;
}

/** Label/value rows for detail panels. */
export function KeyValues({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-secondary">{k}</dt>
          <dd className="text-right font-medium text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
