"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Block = { type: "paragraph"; text: string } | { type: "heading"; text: string } | { type: "list"; items: string[] } | { type: "image"; src: string; alt: string };

/**
 * Plain-text ↔ block body. One block per paragraph (blank line between):
 *   "## Judul" → heading · lines starting with "- " → list · "![alt](/images/x.png)" → image · else paragraph.
 */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) =>
      b.type === "heading" ? `## ${b.text}` : b.type === "list" ? b.items.map((i) => `- ${i}`).join("\n") : b.type === "image" ? `![${b.alt}](${b.src})` : b.text,
    )
    .join("\n\n");
}

function textToBlocks(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith("## ")) return { type: "heading", text: chunk.slice(3).trim() };
      const image = /^!\[(.*)\]\((\/images\/[^)]+)\)$/.exec(chunk);
      if (image) return { type: "image", alt: image[1] ?? "", src: image[2]! };
      const lines = chunk.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) return { type: "list", items: lines.map((l) => l.trim().slice(2).trim()) };
      return { type: "paragraph", text: chunk.replace(/\n/g, " ") };
    });
}

export type ArticleFields = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: Block[];
  extra: Record<string, string | boolean | number | null>;
};

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none";

/** News / help article form (content:manage). Creates with POST, edits with PATCH. */
export function ArticleEditor({
  endpoint,
  method,
  initial,
  categories,
  kind,
}: {
  endpoint: string;
  method: "POST" | "PATCH";
  initial?: ArticleFields;
  categories: { value: string; label: string }[];
  kind: "news" | "help";
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.value ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial ? blocksToText(initial.body) : "");
  const [published, setPublished] = useState(initial ? Boolean(initial.extra.published) : kind === "help");
  const [cover, setCover] = useState(String(initial?.extra.cover ?? ""));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const payload: Record<string, unknown> = { slug, title, category, excerpt, body: textToBlocks(body) };
    if (kind === "news") {
      payload.status = published ? "PUBLISHED" : "DRAFT";
      payload.cover = cover.trim() || null;
    } else {
      payload.isPublished = published;
    }
    try {
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      setMsg({ ok: true, text: "Tersimpan." });
      if (method === "POST") {
        setSlug("");
        setTitle("");
        setExcerpt("");
        setBody("");
      }
      router.refresh();
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={input} placeholder="judul-artikel" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Judul</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Kategori</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {kind === "news" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Cover (/images/…)</span>
            <input value={cover} onChange={(e) => setCover(e.target.value)} className={input} placeholder="/images/Valorant_Points.png" />
          </label>
        )}
        <label className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-primary" />
          {kind === "news" ? "Terbitkan" : "Tampilkan di pusat bantuan"}
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-secondary">Ringkasan</span>
        <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-secondary">
          Isi — pisahkan blok dengan baris kosong. <code>## Judul</code>, <code>- butir daftar</code>, <code>![alt](/images/x.png)</code>.
        </span>
        <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} font-mono text-xs`} />
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy || !slug || !title || !excerpt || !body.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
        </Button>
        {msg && <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
