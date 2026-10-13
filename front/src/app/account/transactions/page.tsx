import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { TopupHistory } from "@/components/account/topup-history";
import { requireUser } from "@/lib/auth";
import { getMyTransactions } from "@/lib/data/me";

export const metadata: Metadata = {
  title: "Transaksi | valostock.id",
};

// Transaksi (SKPL 4.3.11): the member's own top-up and Balance invoices.
export default async function TransactionsPage() {
  await requireUser("/account/transactions");
  const transactions = await getMyTransactions();

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Riwayat top-up game dan pengisian Balance milikmu. ID akun game tampil lengkap hanya di halaman ini."
      />
      <div className="mt-6">
        <TopupHistory transactions={transactions} />
      </div>
    </div>
  );
}
