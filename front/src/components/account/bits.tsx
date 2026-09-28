import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      )}
    </header>
  );
}

/** List empty state per docs/SITEMAP.md §10. */
export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
      <Icon className="h-8 w-8 text-text-secondary" />
      <p className="mt-3 text-sm font-medium text-text">{title}</p>
      {body && (
        <p className="mt-1 max-w-sm text-xs text-text-secondary">{body}</p>
      )}
    </div>
  );
}
