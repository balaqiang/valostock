import type { BalanceLedgerType } from "@/types/api";

type BadgeVariant = "success" | "warning" | "destructive" | "secondary";

// Top-up invoices end in SUCCESS, Balance invoices in PAID (docs/ARCHITECTURE.md §5.2).
const topupStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  SUCCESS: { label: "Berhasil", variant: "success" },
  PAID: { label: "Dibayar", variant: "success" },
  PENDING: { label: "Menunggu Pembayaran", variant: "warning" },
  FAILED: { label: "Gagal", variant: "destructive" },
  EXPIRED: { label: "Kedaluwarsa", variant: "destructive" },
};

export function topupStatus(status: string): { label: string; variant: BadgeVariant } {
  return topupStatusConfig[status] ?? { label: status, variant: "secondary" };
}

export const balanceLedgerTypeLabel: Record<BalanceLedgerType, string> = {
  TOPUP_CREDIT: "Isi Balance",
  SPEND_TOPUP: "Bayar Top-Up",
  REFERRAL_CREDIT: "Hadiah Referral",
};
