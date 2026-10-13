import type { Metadata } from "next";
import { PageBand, SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";
import { InvoiceChecker } from "@/components/topup/invoice-checker";

export const metadata: Metadata = {
  title: "Cek Invoice | valostock.id",
  description: "Cek status top-up kamu dengan nomor invoice.",
};

// Cek Invoice (SKPL 4.3.8): exact invoice number only; the game account is masked.
export default function InvoiceCheckPage() {
  return (
    <SiteShell>
      <PageBand
        title="Cek Invoice Kamu dengan Mudah dan Cepat"
        description="Masukkan nomor invoice lengkap yang kamu dapat saat memesan untuk melihat status top-up."
      />
      <Container className="max-w-3xl py-8 sm:py-10">
        <InvoiceChecker />
      </Container>
    </SiteShell>
  );
}
