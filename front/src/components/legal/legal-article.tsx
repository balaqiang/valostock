import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import { formatDateLong } from "@/lib/format";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

/**
 * Shared shell for legal pages. All legal content here is an operational
 * summary of docs/MONEY_RULES.md + docs/STORE_RULES.md — the final,
 * lawyer-validated text replaces it before launch (STORE_RULES §14).
 */
export function LegalArticle({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-text-secondary"
      >
        <Link href="/" className="transition-colors duration-200 hover:text-text">
          Beranda
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-text-secondary">Legal</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-text">{title}</span>
      </nav>

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Terakhir diperbarui: {formatDateLong(updated)}
      </p>

      <p className="mt-6 leading-relaxed text-text-secondary">{intro}</p>

      {/* Draft notice per STORE_RULES §14 */}
      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Scale className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Dokumen ini adalah ringkasan operasional. Versi final yang divalidasi
        konsultan hukum akan menggantikannya sebelum peluncuran penuh.
      </p>

      <div className="mt-4 divide-y divide-border">
        {sections.map((section, index) => (
          <section key={section.title} className="py-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-text">
              <span className="num mr-2 text-primary">{index + 1}.</span>
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mt-3 text-sm leading-relaxed text-text-secondary"
              >
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item.slice(0, 40)}
                    className="flex gap-3 text-sm leading-relaxed text-text-secondary"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
