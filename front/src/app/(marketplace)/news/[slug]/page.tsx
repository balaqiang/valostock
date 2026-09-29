import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { NewsCard } from "@/components/news/news-card";
import { formatDateLong } from "@/lib/format";
import { getNewsArticle, getNewsArticles } from "@/lib/data/catalog";
import type { NewsBlock } from "@/types/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  return {
    title: article
      ? `${article.title} | valostock.id`
      : "Berita tidak ditemukan | valostock.id",
    description: article?.excerpt,
  };
}

function ArticleBlock({ block }: { block: NewsBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="mt-10 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          {block.text}
        </h2>
      );
    case "paragraph":
      return <p className="mt-5 leading-relaxed text-text-secondary">{block.text}</p>;
    case "list":
      return (
        <ul className="mt-5 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-text-secondary">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "image":
      return (
        <div className="relative mt-8 aspect-video overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          <Image
            src={block.src}
            alt={block.alt}
            fill
            sizes="(max-width: 768px) 90vw, 768px"
            className="object-cover"
          />
        </div>
      );
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) notFound();

  const others = (await getNewsArticles()).filter((a) => a.slug !== article.slug);
  const related = [...others.filter((a) => a.category === article.category), ...others.filter((a) => a.category !== article.category)].slice(0, 3);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-text-secondary"
          >
            <Link href="/" className="transition-colors duration-200 hover:text-text">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              href="/news"
              className="transition-colors duration-200 hover:text-text"
            >
              Berita
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate text-text">{article.title}</span>
          </nav>

          <article className="mx-auto mt-8 max-w-3xl">
            {/* Hero */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface-elevated">
              <Image
                src={article.cover}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 90vw, 768px"
                priority
                className="object-cover"
              />
            </div>

            {/* Header — category · date · author, like the reference article */}
            <header className="mt-8">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-semibold uppercase tracking-wider text-primary">
                  {article.category}
                </span>
                <span aria-hidden className="text-border-strong">
                  •
                </span>
                <time dateTime={article.date} className="text-text-secondary">
                  {formatDateLong(article.date)}
                </time>
                <span aria-hidden className="text-border-strong">
                  •
                </span>
                <span className="uppercase tracking-wider text-text-secondary">
                  Oleh <span className="font-medium text-text">{article.author}</span>
                </span>
              </p>

              <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
                {article.title}
              </h1>

              <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                {article.excerpt}
              </p>
            </header>

            <div className="mt-8 border-t border-border pt-2">
              {article.body.map((block, index) => (
                <ArticleBlock key={index} block={block} />
              ))}
            </div>
          </article>

          {/* Berita Lainnya */}
          {related.length > 0 && (
            <section aria-labelledby="berita-lainnya" className="mt-16 border-t border-border pt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="berita-lainnya"
                  className="font-display text-2xl font-bold tracking-tight text-text"
                >
                  Berita Lainnya
                </h2>
                <Link
                  href="/news"
                  className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
                >
                  Lihat semua
                </Link>
              </div>
              <div className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <NewsCard key={item.slug} article={item} />
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
