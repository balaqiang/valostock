// Payment methods as shown in the UI (labels, channels, logos). The surcharge itself is
// computed only by the API (docs/MONEY_RULES.md §3); `feeLabel` is the printed rule.
import type { TopupMethod } from "@/types/api";

export type PaymentMethodOption = {
  kind: TopupMethod;
  label: string;
  detail: string;
  feeLabel: string;
  /** Logos in public/images/payment-method, shown on the method card. */
  logos: { src: string; alt: string }[];
  requiresAuth?: boolean;
};

const logo = (file: string, alt: string) => ({ src: `/images/payment-method/${encodeURIComponent(file)}`, alt });

export const paymentMethods: PaymentMethodOption[] = [
  { kind: "QRIS", label: "QRIS", detail: "DANA, OVO, m-banking & e-wallet lain", feeLabel: "+1,5%", logos: [logo("qris-logo.svg", "QRIS"), logo("dana-logo.svg", "DANA"), logo("ovo-logo.svg", "OVO")] },
  { kind: "VA", label: "Virtual Account", detail: "BNI, CIMB Niaga, BCA, BRI, Permata, Mandiri", feeLabel: "+Rp 5.000", logos: [logo("bank-negara-indonesia-(bni)-logo.svg", "BNI"), logo("bank-cimb-niaga-logo.svg", "CIMB Niaga")] },
  { kind: "EWALLET", label: "E-Wallet", detail: "GoPay, ShopeePay", feeLabel: "+2,5%", logos: [logo("gopay-logo.svg", "GoPay"), logo("shopeepay-logo.svg", "ShopeePay")] },
  { kind: "RETAIL", label: "Retail", detail: "Indomaret, Alfamart", feeLabel: "+Rp 5.000", logos: [logo("indomaret-logo.svg", "Indomaret")] },
  { kind: "CC", label: "Kartu Kredit", detail: "Visa, Mastercard", feeLabel: "+4% + Rp 3.000", logos: [] },
  { kind: "BALANCE", label: "Balance (BLC)", detail: "Saldo closed-loop, khusus top-up", feeLabel: "Tanpa biaya", logos: [], requiresAuth: true },
];

/** Balance vouchers are paid through the gateway — Balance itself is not a fill method. */
export const gatewayMethods = paymentMethods.filter((method) => method.kind !== "BALANCE");
