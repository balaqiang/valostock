import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { NewsExplorer } from "@/components/news/news-explorer";
import { getNewsArticles } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Berita — valostock.id",
  description:
    "Pengumuman platform, pembaruan fitur, panduan, event, dan berita esports dari valostock.id.",
};

export default async function NewsPage() {
  const newsArticles = await getNewsArticles();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* Page header */}
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Berita
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Pengumuman platform, pembaruan fitur, panduan, event, dan kabar
              esports — semua yang perlu kamu tahu, di satu tempat.
            </p>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <NewsExplorer articles={newsArticles} />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
