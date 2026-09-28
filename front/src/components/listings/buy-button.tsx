"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import type { OrderView } from "@/types/api";

/**
 * "Beli Sekarang" (DFD 6.1): the API creates the order and locks the catalog,
 * then the buyer picks a payment method on /checkout/[orderId]/pay.
 */
export function BuyButton({ catalogId, available }: { catalogId: string; available: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setLoading(true);
    setError(null);
    try {
      const { order } = await apiFetch<{ order: OrderView }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ catalogId }),
      });
      router.push(`/checkout/${order.id}/pay`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/catalog/${catalogId}`)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan.");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="primary" size="lg" className="w-full" onClick={buy} disabled={!available || loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {available ? "Beli Sekarang" : "Sedang dalam transaksi"}
      </Button>
      {error && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
