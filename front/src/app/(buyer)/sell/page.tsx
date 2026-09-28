import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { SellWizard } from "@/components/store/sell-wizard";
import { requireUser } from "@/lib/auth";
import { getMyStore } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Buka Toko — valostock.id",
  description: "Daftarkan toko, bayar deposit, dan tunggu verifikasi admin untuk mulai berjualan.",
};

export default async function SellPage() {
  await requireUser("/sell");
  const store = await getMyStore();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-12">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">Buka Toko</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Hanya toko terverifikasi yang boleh berjualan. Isi profil, bayar deposit Rp500.000, lalu admin memverifikasi
              identitas pemilik secara manual.
            </p>
          </Container>
        </section>
        <Container className="max-w-3xl py-8 sm:py-10">
          <SellWizard store={store} />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
