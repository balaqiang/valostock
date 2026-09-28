import type { Metadata } from "next";
import { getStoreBalance, getWithdrawals, requireStore } from "@/lib/data/store";
import { ShieldCheck, Timer, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { WithdrawForm } from "@/components/store-dashboard/withdraw-form";
import { formatDateShort, formatDbDateTime, formatRupiah } from "@/lib/format";
import { Table, Td } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Saldo & Penarikan — valostock.id",
};

export default async function StoreBalancePage() {
  const store = await requireStore("/store-dashboard/balance");
  const [balance, withdrawals] = await Promise.all([getStoreBalance(), getWithdrawals()]);
  const { available, escrow, deposit, ledger } = balance;
  return (
    <div>
      <PageHeader
        title="Saldo & Penarikan"
        description="Dana hasil penjualan tercatat di saldo tokomu: ditahan (escrow) sampai pembeli menekan Selesai, lalu masuk ke saldo tersedia (dikurangi komisi sesuai paket langganan). Penarikan disetujui admin."
      />

      {/* Balance cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
            <Wallet className="h-4 w-4" />
            Saldo tersedia
          </p>
          <p className="num mt-2 font-display text-3xl font-bold text-white">
            {formatRupiah(available)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary">
            <Timer className="h-4 w-4 text-primary" />
            Ditahan escrow (sampai pesanan selesai)
          </p>
          <p className="num mt-2 font-display text-3xl font-bold text-text">
            {formatRupiah(escrow)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Deposit keamanan (tidak bisa ditarik)
          </p>
          <p className="num mt-2 font-display text-3xl font-bold text-text">{formatRupiah(deposit)}</p>
        </div>
      </div>

      {/* Withdraw */}
      <div className="mt-6">
        <WithdrawForm ownerLegalName={store.ownerLegalName} availableBalance={available} />
      </div>

      {/* History */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold tracking-tight text-text">
          Riwayat Penarikan
        </h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">No.</th>
                <th className="px-4 py-3 font-medium">Tujuan</th>
                <th className="px-4 py-3 text-right font-medium">Nominal</th>
                <th className="px-4 py-3 font-medium">Validasi Nama</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="bg-background">
                  <td className="num px-4 py-3 text-text-secondary">
                    {formatDateShort(withdrawal.date)}
                  </td>
                  <td className="num px-4 py-3 font-medium text-text">
                    {withdrawal.id}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="num">{withdrawal.bank}</span>
                    <span className="block text-xs">
                      a.n. {withdrawal.accountName}
                    </span>
                  </td>
                  <td className="num px-4 py-3 text-right font-medium text-text">
                    {formatRupiah(withdrawal.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        withdrawal.nameMatch === "MATCH"
                          ? "success"
                          : withdrawal.nameMatch === "REVIEW"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {withdrawal.nameMatch}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        withdrawal.status === "COMPLETED"
                          ? "success"
                          : withdrawal.status === "REJECTED"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {withdrawal.status === "COMPLETED"
                        ? "Selesai"
                        : withdrawal.status === "REJECTED"
                          ? "Ditolak — dana kembali"
                          : "Menunggu admin"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Penarikan yang ditolak admin otomatis kembali ke saldo tersedia —
          perbaiki data rekening lalu ajukan ulang. (Transfer bank disimulasikan di prototype.)
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold tracking-tight text-text">Buku Besar Saldo</h2>
        <p className="mt-1 text-xs text-text-secondary">Setiap perubahan saldo tercatat di sini (append-only) dengan saldo setelah transaksi.</p>
        <div className="mt-4">
          <Table head={["Waktu", "Jenis", "Kantong", "Jumlah", "Saldo setelah", "Catatan"]} empty="Belum ada mutasi.">
            {ledger.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(l.createdAt)}</Td>
                <Td className="text-xs font-medium">{l.type}</Td>
                <Td className="text-xs">{l.bucket === "ESCROW" ? "Escrow" : l.bucket === "DEPOSIT" ? "Deposit" : "Tersedia"}</Td>
                <Td className={cn("num whitespace-nowrap font-medium", l.amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {l.amount > 0 ? "+" : ""}
                  {formatRupiah(l.amount)}
                </Td>
                <Td className="num whitespace-nowrap">{formatRupiah(l.balanceAfter)}</Td>
                <Td className="text-xs text-text-secondary">{l.note ?? "-"}</Td>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  );
}
