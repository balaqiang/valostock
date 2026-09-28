// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Mirrors docs/ERD.md ORDERS + the order state machine (docs/SITEMAP.md §3):
// PENDING_PAYMENT → PAID → IN_REKBER → SAFE → COMPLETED (or DISPUTED/…).

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_REKBER"
  | "SAFE"
  | "COMPLETED"
  | "DISPUTED"
  | "REFUNDED"
  | "CANCELLED";

export type MockOrder = {
  id: string;
  listingId: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  safeAt?: string;
  completedAt?: string;
  /** Buyer already left a rating (COMPLETED only). */
  rated?: boolean;
};

export const orders: MockOrder[] = [
  {
    id: "ORD-260712-0007",
    listingId: "vl-004",
    status: "PENDING_PAYMENT",
    createdAt: "2026-07-12",
  },
  {
    id: "ORD-260711-0042",
    listingId: "vl-007",
    status: "IN_REKBER",
    createdAt: "2026-07-11",
    paidAt: "2026-07-11",
  },
  {
    id: "ORD-260710-0031",
    listingId: "vl-008",
    status: "SAFE",
    createdAt: "2026-07-10",
    paidAt: "2026-07-10",
    safeAt: "2026-07-10",
  },
  {
    id: "ORD-260705-0022",
    listingId: "vl-012",
    status: "COMPLETED",
    createdAt: "2026-07-05",
    paidAt: "2026-07-05",
    safeAt: "2026-07-05",
    completedAt: "2026-07-05",
    rated: false,
  },
  {
    id: "ORD-260628-0011",
    listingId: "vl-005",
    status: "COMPLETED",
    createdAt: "2026-06-28",
    paidAt: "2026-06-28",
    safeAt: "2026-06-28",
    completedAt: "2026-06-29",
    rated: true,
  },
];
