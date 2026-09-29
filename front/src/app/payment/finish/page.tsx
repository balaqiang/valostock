import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentStatus } from "@/components/payment/payment-status";

export const metadata: Metadata = { title: "Status Pembayaran | valostock.id" };

export default function PaymentFinishPage() {
  return (
    <Suspense>
      <PaymentStatus />
    </Suspense>
  );
}
