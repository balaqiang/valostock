import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { VoucherManager } from "@/components/store-dashboard/voucher-manager";
import { getVouchers, requireStore } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Voucher Toko — valostock.id",
};

export default async function StoreVouchersPage() {
  const store = await requireStore("/store-dashboard/vouchers");
  const vouchers = await getVouchers(store.slug);
  return (
    <div>
      <PageHeader
        title="Voucher Toko"
        description="Buat kode diskon (persen/tetap) dengan minimum belanja dan kuota."
      />
      <div className="mt-6">
        <VoucherManager vouchers={vouchers} />
      </div>
    </div>
  );
}
