import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { InvoiceChecker } from "@/components/topup/invoice-checker";

export const metadata: Metadata = {
  title: "Cek Invoice | valostock.id",
  description:
    "Cek status top-up kamu dengan mudah dan cepat menggunakan nomor invoice.",
};

export default function InvoiceCheckPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Cek Invoice Kamu dengan Mudah dan Cepat
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Masukkan nomor invoice dari struk email/WhatsApp untuk melihat
              status pesanan top-up kamu.
            </p>
          </Container>
        </section>

        <Container className="max-w-3xl py-8 sm:py-10">
          <InvoiceChecker />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
