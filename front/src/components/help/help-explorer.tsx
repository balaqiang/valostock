"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Flame,
  Gavel,
  HandCoins,
  LifeBuoy,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { HelpCategory, HelpArticle as MockHelpArticle } from "@/types/domain";
import { helpCategoryLabel } from "@/lib/labels";

const categoryIcons: Record<HelpCategory, React.ComponentType<{ className?: string }>> = {
  GETTING_STARTED: Rocket,
  BECOMING_STORE: Store,
  FEES_WITHDRAWAL: HandCoins,
  BEFORE_SALE: Scale,
  AFTER_SALE: LifeBuoy,
  DISPUTES: Gavel,
  TOPUP: Zap,
  BALANCE: Wallet,
  PENALTIES: AlertTriangle,
  SECURITY: ShieldCheck,
};

export function HelpExplorer({ articles: helpArticles }: { articles: MockHelpArticle[] }) {
  const [query, setQuery] = useState("");
  const popularHelpArticles = helpArticles.filter((article) => article.popular);

  const term = query.trim().toLowerCase();
  const results = term
    ? helpArticles.filter((article) =>
        `${article.title} ${article.excerpt} ${helpCategoryLabel[article.category]}`
          .toLowerCase()
          .includes(term),
      )
    : null;

  const categories = Object.keys(helpCategoryLabel) as HelpCategory[];

  return (
    <div>
      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari artikel bantuan…"
          aria-label="Cari artikel bantuan"
          className="pl-10"
        />
      </div>

      {results ? (
        /* Search results */
        <div className="mt-8">
          <p className="text-sm text-text-secondary">
            <span className="num font-medium text-text">{results.length}</span>{" "}
            artikel ditemukan
          </p>
          <ul className="mt-4 space-y-3">
            {results.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/help/${article.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
                >
                  <span>
                    <span className="block text-sm font-medium text-text group-hover:text-primary">
                      {article.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {helpCategoryLabel[article.category]}, {article.excerpt}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-text-secondary group-hover:text-primary" />
                </Link>
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-secondary">
                Tidak ada artikel yang cocok, coba kata kunci lain.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <>
          {/* Popular */}
          <div className="mt-10">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-text">
              <Flame className="h-5 w-5 text-primary" />
              Artikel Populer
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {popularHelpArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/help/${article.slug}`}
                  className="group rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
                >
                  <p className="text-sm font-medium text-text group-hover:text-primary">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {article.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Category groups */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold tracking-tight text-text">
              Semua Kategori
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const Icon = categoryIcons[category];
                const articles = helpArticles.filter(
                  (article) => article.category === category,
                );
                return (
                  <div
                    key={category}
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
                      <Icon className="h-4 w-4 text-primary" />
                      {helpCategoryLabel[category]}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {articles.map((article) => (
                        <li key={article.slug}>
                          <Link
                            href={`/help/${article.slug}`}
                            className="text-sm text-text-secondary transition-colors duration-200 hover:text-primary"
                          >
                            {article.title}
                          </Link>
                        </li>
                      ))}
                      {articles.length === 0 && (
                        <li className="text-xs text-text-secondary/70">
                          Artikel segera hadir.
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
