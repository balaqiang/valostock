import type { Metadata } from "next";
import Link from "next/link";
import { ArticleEditor } from "@/components/admin/article-editor";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminHelp } from "@/lib/data/admin";
import { helpCategoryLabel } from "@/lib/labels";
import { formatDbDateTime } from "@/lib/format";
import type { HelpCategory } from "@/types/domain";

export const metadata: Metadata = { title: "Pusat Bantuan — Admin" };

export default async function AdminHelpPage() {
  const data = await adminGet<{ articles: AdminHelp[]; categories: HelpCategory[] }>("/help");
  if (!data) return <Denied permission="content:manage" />;
  const categories = data.categories.map((c) => ({ value: c, label: helpCategoryLabel[c] }));

  return (
    <div className="space-y-6">
      <DashHeader title="Pusat Bantuan (CMS)" description="Artikel bantuan per kategori, termasuk kebijakan refund top-up dan alasan Balance tidak bisa membeli akun." />
      <Panel title="Artikel baru">
        <ArticleEditor endpoint="/api/admin/help" method="POST" categories={categories} kind="help" />
      </Panel>
      <div className="space-y-3">
        {data.articles.map((a) => (
          <details key={a.id} className="rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="min-w-0">
                <span className="font-medium text-text">{a.title}</span>
                <span className="block text-xs text-text-secondary">
                  {helpCategoryLabel[a.category]} · {a.helpfulCount} merasa terbantu · diperbarui {formatDbDateTime(a.updatedAt)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Tone tone={a.isPublished ? "success" : "secondary"}>{a.isPublished ? "Tampil" : "Disembunyikan"}</Tone>
                {a.isPublished && (
                  <Link href={`/help/${a.slug}`} className="text-xs text-primary">
                    Lihat
                  </Link>
                )}
              </span>
            </summary>
            <div className="border-t border-border p-5">
              <ArticleEditor
                endpoint={`/api/admin/help/${a.id}`}
                method="PATCH"
                categories={categories}
                kind="help"
                initial={{ slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, body: a.body, extra: { published: a.isPublished } }}
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
