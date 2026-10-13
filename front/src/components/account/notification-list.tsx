import Link from "next/link";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/account/bits";
import { ActionButton } from "@/components/dashboard/action-button";
import { formatDbDateTime } from "@/lib/format";
import type { NotificationView } from "@/types/api";

/** In-app notifications (WA/Discord/Telegram delivery is simulated). */
export function NotificationList({ items }: { items: NotificationView[] }) {
  if (items.length === 0) return <EmptyState icon={Bell} title="Belum ada notifikasi" />;
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <ActionButton variant="ghost" endpoint="/api/me/notifications/read" body={{}}>
            Tandai semua sudah dibaca ({unread})
          </ActionButton>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((item) => {
          const body = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-text">
                  {!item.read && <span aria-label="Belum dibaca" className="h-2 w-2 flex-none rounded-full bg-primary" />}
                  {item.title}
                </span>
                <span className="flex-none text-xs text-text-secondary">{formatDbDateTime(item.createdAt)}</span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-text-secondary">{item.body}</span>
            </>
          );
          return (
            <li key={item.id}>
              {item.link ? (
                <Link href={item.link} className="block rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40">
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
