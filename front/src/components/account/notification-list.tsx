import Link from "next/link";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";
import type { MockNotification } from "@/lib/mock/buyer";

export function NotificationList({ items }: { items: MockNotification[] }) {
  if (items.length === 0) {
    return (
      <EmptyState icon={Bell} title="Belum ada notifikasi" />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const body = (
          <>
            <span className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-text">
                {!item.read && (
                  <span
                    aria-label="Belum dibaca"
                    className="h-2 w-2 flex-none rounded-full bg-primary"
                  />
                )}
                {item.title}
              </span>
              <span className="num flex-none text-xs text-text-secondary">
                {formatDateShort(item.date)}
              </span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
              {item.body}
            </span>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
              >
                {body}
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-4">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
