import type { Metadata } from "next";
import { requireStore, getStoreChats } from "@/lib/data/store";
import { Info, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Chat Pembeli — valostock.id",
};

export default async function StoreChatPage() {
  const store = await requireStore("/store-dashboard/chat");
  const storeChats = await getStoreChats(store.slug);
  return (
    <div>
      <PageHeader
        title="Chat Pembeli"
        description="Tanya jawab dengan calon pembeli — serah terima tetap di Rekber Room."
      />

      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Chat biasa dilarang untuk bertransaksi, bertukar email/nomor telepon,
        atau mengarahkan ke luar platform — pelanggaran berujung sanksi hingga
        denda deposit.
      </p>

      {storeChats.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {storeChats.map((chat) => (
            <li
              key={chat.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                {chat.buyer.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text">
                    {chat.buyer}
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
