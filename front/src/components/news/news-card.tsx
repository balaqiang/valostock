import Image from "next/image";
import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import type { MockNewsArticle } from "@/app/(marketplace)/news/mock-data";

function CardMeta({ article }: { article: MockNewsArticle }) {
  return (
    <p className="flex items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-primary">
        {article.category}
      </span>
      <span aria-hidden className="text-border-strong">
        •
      </span>
      <time dateTime={article.date} className="num text-text-secondary">
        {formatDateShort(article.date)}
      </time>
    </p>
  );
}

export function NewsCard({
  article,
  priority = false,
}: {
  article: MockNewsArticle;
  /** Set on above-the-fold cards so the LCP image loads eagerly. */
  priority?: boolean;
}) {
  return (
    <article className="group">
      <Link href={`/news/${article.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <Image
            src={article.cover}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <CardMeta article={article} />
          <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug tracking-tight text-text transition-colors duration-200 group-hover:text-primary">
            {article.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">
            {article.excerpt}
          </p>
        </div>
      </Link>
    </article>
  );
}

/** Large horizontal card for the latest article at the top of the list. */
export function FeaturedNewsCard({ article }: { article: MockNewsArticle }) {
  return (
    <article className="group">
      <Link
        href={`/news/${article.slug}`}
        className="grid gap-5 md:grid-cols-2 md:items-center lg:gap-8"
      >
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          <Image
            src={article.cover}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 90vw, 560px"
            priority
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div>
          <CardMeta article={article} />
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-text transition-colors duration-200 group-hover:text-primary sm:text-3xl">
            {article.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-text-secondary">
            {article.excerpt}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Baca selengkapnya
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
