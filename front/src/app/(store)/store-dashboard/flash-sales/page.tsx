import type { Metadata } from "next";
import { requireStore, getFlashSales } from "@/lib/data/store";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Flash Sale — valostock.id",
};

export default async function FlashSalesPage() {
  const store = await requireStore("/store-dashboard/flash-sales");
  const myFlashSales = await getFlashSales(store.slug);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Flash Sale"
          description="Diskon berbatas waktu untuk mendorong urgensi — harga otomatis kembali saat periode berakhir."
        />
        <Button variant="primary" size="md">
          <Zap className="h-4 w-4" />
          Jadwalkan Flash Sale
        </Button>
      </div>

      {myFlashSales.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {myFlashSales.map((sale) => {
            const discount = Math.round(
              (1 - sale.salePrice / sale.listPrice) * 100,
            );
            return (
              <li
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {sale.title}
                  </span>
                  <span className="num mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span className="line-through">
                      {formatRupiah(sale.listPrice)}
                    </span>
                    <span className="font-semibold text-primary">
                      {formatRupiah(sale.salePrice)}
                    </span>
                    <Badge>-{discount}%</Badge>
                  </span>
                </span>
                <span className="num text-xs text-text-secondary">
                  {formatDateShort(sale.startsAt)} → {formatDateShort(sale.endsAt)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={Zap}
            title="Belum ada flash sale"
            body="Jadwalkan diskon singkat untuk listing pilihanmu."
          />
        </div>
      )}
    </div>
  );
}
