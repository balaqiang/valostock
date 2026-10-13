import Image from "next/image";
import { CreditCard, Wallet } from "lucide-react";
import type { PaymentMethodOption } from "@/lib/payment-methods";

/**
 * Logos of the channels behind a payment method. Brand SVGs sit on white chips
 * so dark logos (OVO, BNI) stay readable in dark mode.
 */
export function PaymentLogos({ method }: { method: PaymentMethodOption }) {
  if (method.logos.length === 0) {
    const Icon = method.kind === "BALANCE" ? Wallet : CreditCard;
    return (
      <span className="flex h-7 w-10 items-center justify-center rounded-md bg-surface-elevated text-text-secondary">
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {method.logos.map((logo) => (
        <span key={logo.src} className="flex h-7 items-center rounded-md border border-border bg-white px-1.5">
          <Image src={logo.src} alt={logo.alt} width={48} height={16} className="h-4 w-auto max-w-14 object-contain" />
        </span>
      ))}
    </span>
  );
}
