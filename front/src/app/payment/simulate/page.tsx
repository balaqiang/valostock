import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSimulator } from "@/components/payment/payment-simulator";

export const metadata: Metadata = { title: "Simulasi Pembayaran | valostock.id", robots: { index: false } };

export default function PaymentSimulatePage() {
  return (
    <Suspense>
      <PaymentSimulator />
    </Suspense>
  );
}
