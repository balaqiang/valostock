// UI labels for status enums (code, not data). Enum values mirror docs/ERD.md.
import type { OrderStatus } from "@/lib/mock/orders";
import type { MockOffer } from "@/lib/mock/buyer";
import type { HelpCategory } from "@/lib/mock/help";
import type { StoreLevel, StoreType } from "@/lib/mock/stores";
import type { CatalogStatus, StoreOrderStatus } from "@/lib/mock/store-dashboard";

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Dibayar — Menunggu Rekber",
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

export const offerStatusLabel: Record<MockOffer["status"], string> = {
  PENDING: "Menunggu Toko",
  ACCEPTED: "Diterima",
  COUNTERED: "Ditawar Balik",
  REJECTED: "Ditolak",
  EXPIRED: "Kedaluwarsa",
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
  DRAFT: "Draft",
  LISTED: "Tayang",
  LOCKED: "Terkunci",
  IN_ORDER: "Dalam Pesanan",
  SOLD: "Terjual",
  DELISTED: "Diturunkan",
};

export const storeOrderStatusLabel: Record<StoreOrderStatus, string> = {
  PAID: "Dibayar — Buka Rekber",
  IN_REKBER: "Di Rekber Room",
  SAFE: "Akun Aman",
  COMPLETED: "Selesai",
  DISPUTED: "Sengketa",
};
