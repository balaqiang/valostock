import type { Metadata } from "next";
import { Info } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DashHeader } from "@/components/dashboard/ui";
import { getStoreConversations, requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Chat Pembeli | valostock.id" };

export default async function StoreChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireStore("/store-dashboard/chat");
  const { c } = await searchParams;
  const conversations = await getStoreConversations();
  return (
    <div className="space-y-6">
      <DashHeader title="Chat Pembeli" description="Tanya jawab dengan calon pembeli, serah terima akun tetap di Rekber Room pesanan." />
      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Dilarang bertransaksi lewat chat, bertukar nomor/email, atau mengarahkan ke luar platform, sistem menolak pesan berisi kontak luar, dan pelanggaran berujung sanksi.
      </p>
      <ChatPanel conversations={conversations} initialId={c} />
    </div>
  );
}
