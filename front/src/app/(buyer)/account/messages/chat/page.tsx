import type { Metadata } from "next";
import Link from "next/link";
import { Info, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getChats } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Chat — valostock.id",
};

export default async function ChatListPage() {
  const user = await requireUser("/account/messages/chat");
  const chats = await getChats(user.id);

  return (
    <div>
      <PageHeader
        title="Chat"
        description="Percakapan dengan toko (chat biasa) — serah terima tetap di Rekber Room."
      />

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Chat biasa hanya untuk tanya jawab. Dilarang bertransaksi, bertukar
        email, atau nomor telepon — transaksi resmi berlangsung di Rekber Room.
      </p>

      {chats.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link
                href={`/store/${chat.storeSlug}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {chat.storeName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text group-hover:text-primary">
                      {chat.storeName}
                    </span>
                    <span className="num text-xs text-text-secondary">
                      {formatDateShort(chat.date)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {chat.lastMessage}
                  </span>
                </span>
                {chat.unread > 0 && (
                  <Badge className="num flex-none">{chat.unread}</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState icon={MessageSquare} title="Belum ada percakapan" />
        </div>
      )}
    </div>
  );
}
