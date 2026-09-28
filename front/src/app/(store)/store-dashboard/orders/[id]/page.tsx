import { redirect } from "next/navigation";
import { requireStore } from "@/lib/data/store";

// Store and buyer share one order page (rekber room, status, money details);
// the API decides what each viewer may see and do.
export default async function StoreOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStore(`/store-dashboard/orders/${id}`);
  redirect(`/orders/${encodeURIComponent(id)}`);
}
