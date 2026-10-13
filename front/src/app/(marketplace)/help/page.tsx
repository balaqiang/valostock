import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { HelpExplorer } from "@/components/help/help-explorer";
import { getHelpArticles } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Pusat Bantuan | valostock.id",
  description:
    "Panduan membeli akun, membuka toko, biaya, sengketa, top-up, Balance, dan keamanan di valostock.id.",
};

export default async function HelpCenterPage() {
  const articles = await getHelpArticles();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Pusat Bantuan
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Cari jawaban soal transaksi, toko, biaya, top-up, dan keamanan,
              atau hubungi kami dari halaman pesananmu.
            </p>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <HelpExplorer articles={articles} />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
