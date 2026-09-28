"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeaturedNewsCard, NewsCard } from "@/components/news/news-card";
import {
  newsCategories,
  type MockNewsArticle,
  type NewsCategory,
} from "@/app/(marketplace)/news/mock-data";

const PAGE_SIZE = 9;

type Filter = "Semua" | NewsCategory;

export function NewsExplorer({ articles }: { articles: MockNewsArticle[] }) {
  const [filter, setFilter] = useState<Filter>("Semua");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered =
    filter === "Semua"
      ? articles
      : articles.filter((article) => article.category === filter);

  // Latest article gets the large card; only when nothing is filtered out,
  // so a category view stays a plain grid like the reference page.
  const featured = filter === "Semua" ? filtered[0] : undefined;
  const rest = filter === "Semua" ? filtered.slice(1) : filtered;
  const shown = rest.slice(0, visible);

  const selectFilter = (next: Filter) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
  };

  return (
    <div>
      {/* Category filter */}
      <div
        role="group"
        aria-label="Filter kategori berita"
        className="flex flex-wrap gap-2"
      >
        {(["Semua", ...newsCategories] as Filter[]).map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={filter === category}
            onClick={() => selectFilter(category)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
              filter === category
                ? "bg-primary text-white"
                : "border border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {featured && (
        <div className="mt-8 border-b border-border pb-10">
          <FeaturedNewsCard article={featured} />
        </div>
      )}

      {shown.length > 0 ? (
        <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((article, index) => (
            <NewsCard
              key={article.slug}
              article={article}
              priority={index < 3}
            />
          ))}
        </div>
      ) : (
        !featured && (
          <p className="mt-10 text-sm text-text-secondary">
            Belum ada berita di kategori ini.
          </p>
        )
      )}

      {rest.length > visible && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
          >
            Tampilkan Lebih Banyak
          </Button>
        </div>
      )}
    </div>
  );
}
