import type { BalanceLedgerType } from "@/types/api";

type BadgeVariant = "success" | "warning" | "destructive" | "secondary";

export const topupStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  SUCCESS_DELIVERED: { label: "Berhasil Terkirim", variant: "success" },
  SUCCESS: { label: "Berhasil", variant: "success" },
  PAID: { label: "Dibayar", variant: "secondary" },
  PENDING: { label: "Menunggu Pembayaran", variant: "warning" },
  PROCESSING: { label: "Sedang Diproses", variant: "warning" },
  FAILED: { label: "Gagal", variant: "destructive" },
  REFUNDED: { label: "Direfund", variant: "secondary" },
};

export function topupStatus(status: string): { label: string; variant: BadgeVariant } {
  return topupStatusConfig[status] ?? { label: status, variant: "secondary" };
}

export const balanceLedgerTypeLabel: Record<BalanceLedgerType, string> = {
  TOPUP_CREDIT: "Isi Balance",
  SPEND_TOPUP: "Bayar Top-Up",
  REFUND_CREDIT: "Refund",
  ADJUSTMENT: "Penyesuaian",
};

export function ledgerBadgeVariant(type: BalanceLedgerType): BadgeVariant {
  if (type === "SPEND_TOPUP") return "secondary";
  if (type === "REFUND_CREDIT") return "warning";
  return "success";
}
