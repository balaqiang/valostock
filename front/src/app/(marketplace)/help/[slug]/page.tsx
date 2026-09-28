import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { HelpfulVote } from "@/components/help/helpful-vote";
import type { HelpBlock } from "@/lib/mock/help";
import { helpCategoryLabel } from "@/lib/labels";
import { getHelpArticle, getHelpArticles } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticle(slug);
  return {
    title: article
      ? `${article.title} — Pusat Bantuan valostock.id`
      : "Artikel tidak ditemukan — valostock.id",
    description: article?.excerpt,
  };
}

function ArticleBlock({ block }: { block: HelpBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="mt-8 font-display text-lg font-bold tracking-tight text-text">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className="mt-4 leading-relaxed text-text-secondary">{block.text}</p>
      );
    case "list":
      return (
        <ul className="mt-4 space-y-2.5">
          {block.items.map((item) => (
            <li
              key={item}
              className="flex gap-3 leading-relaxed text-text-secondary"
            >
              <span
                aria-hidden
                className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-primary"
              />
              {item}
            </li>
          ))}
        </ul>
      );
  }
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getHelpArticle(slug);
  if (!article) notFound();

  const related = (await getHelpArticles())
    .filter((item) => item.category === article.category && item.slug !== article.slug)
    .slice(0, 3);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="max-w-3xl py-8 sm:py-10">
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
              href="/help"
              className="transition-colors duration-200 hover:text-text"
            >
              Pusat Bantuan
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate text-text">{article.title}</span>
          </nav>

          <article className="mt-8">
            <Badge variant="secondary">{helpCategoryLabel[article.category]}</Badge>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-text sm:text-3xl">
              {article.title}
            </h1>
            <p className="mt-3 text-text-secondary">{article.excerpt}</p>

            <div className="mt-6 border-t border-border">
              {article.body.map((block, index) => (
                <ArticleBlock key={index} block={block} />
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
              <HelpfulVote />
            </div>
          </article>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="font-display text-lg font-bold tracking-tight text-text">
                Artikel Terkait
              </h2>
              <ul className="mt-4 space-y-3">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/help/${item.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
                    >
                      <span>
                        <span className="block text-sm font-medium text-text group-hover:text-primary">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-secondary">
                          {item.excerpt}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 flex-none text-text-secondary group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
