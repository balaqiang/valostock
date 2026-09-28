"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { catalogStatusLabel } from "@/lib/labels";
import type { CatalogStatus } from "@/types/domain";

type Item = { id: string; title: string; code: string; status: CatalogStatus };

/**
 * Bulk submit / hide (Pro & Business, MONEY_RULES §5). Each catalog goes through
 * the same server rules as a single action; failures are listed per catalog.
 */
export function BulkActions({ items }: { items: Item[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<"submit" | "withdraw" | null>(null);
  const [result, setResult] = useState<{ ok: number; failed: { title: string; message: string }[] } | null>(null);

  const submittable = items.filter((i) => ["DRAFT", "REJECTED", "DELISTED"].includes(i.status));
  const hideable = items.filter((i) => i.status === "LISTED" || i.status === "PENDING_REVIEW");
  const candidates = [...submittable, ...hideable];
  if (candidates.length === 0) return null;

  const run = async (action: "submit" | "withdraw") => {
    const ids = picked.filter((id) => (action === "submit" ? submittable : hideable).some((i) => i.id === id));
    if (ids.length === 0) return;
    setBusy(action);
    setResult(null);
    try {
      const res = await apiFetch<{ results: { id: string; ok: boolean; message?: string }[]; done: number }>("/api/stores/me/catalogs/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids }),
      });
      setResult({
        ok: res.done,
        failed: res.results.filter((r) => !r.ok).map((r) => ({ title: items.find((i) => i.id === r.id)?.title ?? r.id, message: r.message ?? "Gagal" })),
      });
      setPicked([]);
      router.refresh();
    } catch (err: unknown) {
      setResult({ ok: 0, failed: [{ title: "Aksi massal", message: err instanceof Error ? err.message : "Gagal" }] });
    } finally {
      setBusy(null);
    }
  };

  return (
    <details className="rounded-2xl border border-border bg-surface">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-text">
        <Layers className="h-4 w-4 text-primary" /> Aksi massal ({candidates.length} katalog)
      </summary>
      <div className="space-y-3 border-t border-border p-5">
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {candidates.map((i) => (
            <li key={i.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={picked.includes(i.id)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i.id] : p.filter((x) => x !== i.id)))}
                />
                <span className="truncate text-text">{i.title}</span>
                <span className="text-xs text-text-secondary">
                  {i.code || "draf"} · {catalogStatusLabel[i.status]}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button size="md" onClick={() => run("submit")} disabled={busy !== null || picked.length === 0}>
            {busy === "submit" && <Loader2 className="h-4 w-4 animate-spin" />} Ajukan yang dipilih
          </Button>
          <Button size="md" variant="secondary" onClick={() => run("withdraw")} disabled={busy !== null || picked.length === 0}>
            {busy === "withdraw" && <Loader2 className="h-4 w-4 animate-spin" />} Sembunyikan / tarik yang dipilih
          </Button>
        </div>
        {result && (
          <div className="text-xs">
            <p className="text-emerald-600">{result.ok} katalog berhasil.</p>
            {result.failed.map((f, i) => (
              <p key={i} className="text-red-600">
                {f.title}: {f.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
