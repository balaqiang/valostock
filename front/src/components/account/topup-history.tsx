import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/account/bits";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { topupStatus } from "@/lib/topup-status";
import type { TransactionRecord } from "@/types/api";

/**
 * The owner's own top-up history. Unlike the public invoice page, the game
 * account ID is shown in full here — only the logged-in owner sees this.
 */
export function TopupHistory({ transactions }: { transactions: TransactionRecord[] }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Belum ada transaksi"
        body="Top-up yang kamu lakukan saat masuk akan tercatat di sini."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">No. Invoice</th>
            <th className="px-4 py-3 font-medium">Produk</th>
            <th className="px-4 py-3 font-medium">ID Akun Game</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((tx) => {
            const status = topupStatus(tx.status);
            return (
              <tr key={tx.id} className="bg-background">
                <td className="num whitespace-nowrap px-4 py-3 text-text-secondary">
                  {formatDbDateTime(tx.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span className="num font-mono text-xs font-semibold text-text">
                    {tx.invoice_number}
                  </span>
                  <span className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                    {tx.kind === "BALANCE_TOPUP" ? "Balance" : "Top-Up"}
                  </span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-text">
                  {tx.item_name}
                  <span className="block text-xs text-text-secondary">{tx.payment_method}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text">
                  {tx.kind === "BALANCE_TOPUP" ? (
                    <span className="font-sans text-text-secondary">Akun valostock kamu</span>
                  ) : (
                    <>
                      {tx.user_game_id}
                      {tx.game_zone_id ? ` (${tx.game_zone_id})` : ""}
                    </>
                  )}
                </td>
                <td className="num whitespace-nowrap px-4 py-3 text-right font-medium text-text">
                  {formatRupiah(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
