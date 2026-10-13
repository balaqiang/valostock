import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/account/bits";
import { ChatPanel } from "@/components/chat/chat-panel";
import { requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Chat Toko | valostock.id" };

export default async function BuyerChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireUser("/account/messages/chat");
  const { c } = await searchParams;
  const conversations = await getConversations();
  return (
    <div className="space-y-6">
      <PageHeader title="Chat Toko" description="Tanya jawab dengan toko sebelum membeli. Mulai chat dari halaman akun atau toko." />
      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Jangan bertransaksi atau berbagi kontak di luar platform, pembayaran di luar valostock tidak dilindungi escrow maupun proteksi.
      </p>
      <ChatPanel conversations={conversations} initialId={c} />
    </div>
  );
}
