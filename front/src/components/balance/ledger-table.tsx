import { Badge } from "@/components/ui/badge";
import { formatDbDateTime } from "@/lib/format";
import { balanceLedgerTypeLabel } from "@/lib/topup-status";
import type { BalanceLedgerRecord } from "@/types/api";

// Balance ledger — every movement carries balance_after (auditable, ERD).
export function LedgerTable({ entries }: { entries: BalanceLedgerRecord[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-text-secondary">
        Belum ada mutasi, isi Balance agar saldo bertambah.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">Tipe</th>
            <th className="px-4 py-3 font-medium">Referensi</th>
            <th className="px-4 py-3 text-right font-medium">Jumlah</th>
            <th className="px-4 py-3 text-right font-medium">Saldo Akhir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-background">
              <td className="num whitespace-nowrap px-4 py-3 text-text-secondary">
                {formatDbDateTime(entry.created_at)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={entry.amount < 0 ? "secondary" : "success"}>
                  {balanceLedgerTypeLabel[entry.type]}
                </Badge>
              </td>
              <td className="num px-4 py-3 font-mono text-xs text-text-secondary">
                {entry.reference}
              </td>
              <td
                className={`num px-4 py-3 text-right font-medium ${
                  entry.amount < 0 ? "text-text" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {entry.amount > 0 ? "+" : ""}
                {entry.amount.toLocaleString("id-ID")} BLC
              </td>
              <td className="num px-4 py-3 text-right text-text">
                {entry.balance_after.toLocaleString("id-ID")} BLC
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
