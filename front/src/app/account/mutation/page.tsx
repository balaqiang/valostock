import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { LedgerTable } from "@/components/balance/ledger-table";
import { requireUser } from "@/lib/auth";
import { getMyBalanceLedger } from "@/lib/data/me";

export const metadata: Metadata = {
  title: "Mutasi | valostock.id",
};

// Mutasi (SKPL 4.3.12, DFD 5.4): every Balance movement with its reference and the balance after it.
export default async function MutationPage() {
  await requireUser("/account/mutation");
  const ledger = await getMyBalanceLedger();

  return (
    <div>
      <PageHeader title="Mutasi" description="Pergerakan Balance (BLC): isi Balance, bayar top-up, dan hadiah referral." />
      <div className="mt-6">
        <LedgerTable entries={ledger} />
      </div>
    </div>
  );
}
