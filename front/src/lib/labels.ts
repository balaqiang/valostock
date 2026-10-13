// UI labels for status enums (code, not data). Enum values mirror docs/ERD.md.
import type { DisputeReason, DisputeStatus, OfferStatus, OrderStatus, PaymentPurpose, StoreStatus } from "@/types/api";
import type { CatalogStatus, HelpCategory, StoreLevel, StoreType } from "@/types/domain";

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Dibayar, Menunggu Rekber",
  IN_REKBER: "Di Rekber Room",
  SAFE: "Akun Aman",
  COMPLETED: "Selesai",
  DISPUTED: "Sengketa",
  REFUNDED: "Direfund",
  CANCELLED: "Dibatalkan",
};

/** Timeline steps per SITEMAP §3: Unpaid→Paid→In Rekber→Safe→Completed. */
export const orderSteps = [
  { key: "PENDING_PAYMENT", label: "Dibuat" },
  { key: "PAID", label: "Dibayar (escrow)" },
  { key: "IN_REKBER", label: "Rekber Room" },
  { key: "SAFE", label: "Akun Aman" },
  { key: "COMPLETED", label: "Selesai" },
] as const;

const stepOrder: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  IN_REKBER: 2,
  SAFE: 3,
  COMPLETED: 4,
  DISPUTED: 2,
  REFUNDED: 4,
  CANCELLED: 0,
};

export function stepIndexOf(status: OrderStatus): number {
  return stepOrder[status];
}

export const offerStatusLabel: Record<OfferStatus, string> = {
  PENDING: "Menunggu Toko",
  ACCEPTED: "Diterima",
  COUNTERED: "Ditawar Balik",
  REJECTED: "Ditolak",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  USED: "Sudah Dibeli",
};

export const helpCategoryLabel: Record<HelpCategory, string> = {
  GETTING_STARTED: "Mulai di valostock.id",
  BECOMING_STORE: "Membuka Toko",
  FEES_WITHDRAWAL: "Biaya & Penarikan",
  BEFORE_SALE: "Sebelum Penjualan",
  AFTER_SALE: "Setelah Penjualan",
  DISPUTES: "Sengketa",
  TOPUP: "Top-Up",
  BALANCE: "Balance (BLC)",
  PENALTIES: "Sanksi & Penalti",
  SECURITY: "Keamanan",
};

export const storeLevelLabel: Record<StoreLevel, string> = {
  AUTHORIZED: "Authorized Store",
  VERIFIED: "Verified Store",
  PLATINUM: "Platinum Store",
};

export const storeTypeLabel: Record<StoreType, string> = {
  OWNER: "Owner Store",
  RESELLER: "Reseller Store",
};

export const catalogStatusLabel: Record<CatalogStatus, string> = {
  DRAFT: "Draf",
  PENDING_REVIEW: "Menunggu Verifikasi",
  REJECTED: "Ditolak",
  LISTED: "Tayang",
  LOCKED: "Terkunci",
  IN_ORDER: "Dalam Pesanan",
  SOLD: "Terjual",
  DELISTED: "Diturunkan",
};

/** Badge colours for catalog statuses. */
export const catalogStatusTone: Record<CatalogStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  PENDING_REVIEW: "warning",
  REJECTED: "destructive",
  LISTED: "success",
  LOCKED: "default",
  IN_ORDER: "default",
  SOLD: "secondary",
  DELISTED: "destructive",
};

export const storeOrderStatusLabel: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran Pembeli",
  PAID: "Dibayar, Kirim Akun di Rekber",
  IN_REKBER: "Di Rekber Room",
  SAFE: "Akun Aman, Menunggu Selesai",
  COMPLETED: "Selesai",
  DISPUTED: "Sengketa",
  REFUNDED: "Direfund",
  CANCELLED: "Dibatalkan",
};

export const orderStatusTone: Record<OrderStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING_PAYMENT: "warning",
  PAID: "default",
  IN_REKBER: "default",
  SAFE: "default",
  COMPLETED: "success",
  DISPUTED: "destructive",
  REFUNDED: "secondary",
  CANCELLED: "secondary",
};

export const storeStatusLabel: Record<StoreStatus, string> = {
  PENDING_DEPOSIT: "Menunggu Deposit",
  PENDING_REVIEW: "Menunggu Verifikasi",
  ACTIVE: "Aktif",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
  CLOSING: "Mengajukan Penutupan",
  CLOSED: "Ditutup",
};

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  OPEN: "Menunggu Tanggapan Toko",
  STORE_RESPONDED: "Toko Menanggapi",
  IN_REVIEW: "Ditinjau Admin",
  RESOLVED_BUYER: "Dimenangkan Pembeli",
  RESOLVED_STORE: "Dimenangkan Toko",
  CANCELLED: "Dibatalkan",
};

export const disputeReasonLabel: Record<DisputeReason, string> = {
  NOT_DELIVERED: "Akun tidak dikirim",
  NOT_AS_DESCRIBED: "Akun tidak sesuai deskripsi",
  RECALLED: "Akun ditarik kembali (recall)",
  OTHER: "Lainnya",
};

export const paymentPurposeLabel: Record<PaymentPurpose, string> = {
  TOPUP: "Top-up game",
  BALANCE_FILL: "Isi Balance",
  ORDER: "Pesanan akun",
  STORE_DEPOSIT: "Deposit toko",
  SUBSCRIPTION: "Langganan toko",
  AD: "Iklan featured",
  LOCK: "Lock akun",
};

export const reportReasonLabel: Record<"SCAM" | "FAKE" | "OFF_PLATFORM" | "ABUSE" | "OTHER", string> = {
  SCAM: "Penipuan",
  FAKE: "Data/foto palsu",
  OFF_PLATFORM: "Mengajak transaksi di luar platform",
  ABUSE: "Perilaku kasar",
  OTHER: "Lainnya",
};
