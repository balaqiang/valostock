import type { Metadata } from "next";
import Link from "next/link";
import { ArticleEditor } from "@/components/admin/article-editor";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, Panel, Tone } from "@/components/dashboard/ui";
import { adminGet, type NewsArticle } from "@/lib/data/admin";
import { formatDbDateTime } from "@/lib/format";
import { newsCategories } from "@/types/domain";

export const metadata: Metadata = { title: "Berita | Admin" };

const CATEGORIES = newsCategories.map((c) => ({ value: c, label: c }));

export default async function AdminNewsPage() {
  const data = await adminGet<{ articles: NewsArticle[] }>("/news");
  if (!data) return <Denied permission="content:manage" />;

  return (
    <div className="space-y-6">
      <DashHeader title="Berita (CMS)" description="Buat, ubah, terbitkan, atau tarik artikel berita. Halaman publik /news hanya menampilkan yang diterbitkan." />
      <Panel title="Artikel baru">
        <ArticleEditor endpoint="/api/admin/news" method="POST" categories={CATEGORIES} kind="news" />
      </Panel>
      <div className="space-y-3">
        {data.articles.map((a) => (
          <details key={a.id} className="rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="min-w-0">
                <span className="font-medium text-text">{a.title}</span>
                <span className="block text-xs text-text-secondary">
                  {a.category} · {a.author} · {a.date ? formatDbDateTime(a.date) : "belum terbit"}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Tone tone={a.status === "PUBLISHED" ? "success" : "secondary"}>{a.status === "PUBLISHED" ? "Terbit" : "Draf"}</Tone>
                {a.status === "PUBLISHED" && (
                  <Link href={`/news/${a.slug}`} className="text-xs text-primary">
                    Lihat
                  </Link>
                )}
              </span>
            </summary>
            <div className="space-y-3 border-t border-border p-5">
              <ArticleEditor
                endpoint={`/api/admin/news/${a.id}`}
                method="PATCH"
                categories={CATEGORIES}
                kind="news"
                initial={{ slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, body: a.body, extra: { published: a.status === "PUBLISHED", cover: a.cover } }}
              />
              <ActionButton variant="ghost" method="DELETE" endpoint={`/api/admin/news/${a.id}`} confirm={`Hapus artikel "${a.title}"?`}>
                Hapus artikel
              </ActionButton>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
