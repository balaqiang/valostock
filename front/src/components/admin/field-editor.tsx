"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { FieldTemplate, FieldType } from "@/types/domain";

const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-text focus:border-primary focus:outline-none";

type Draft = { label: string; type: FieldType; required: boolean; filterable: boolean; options: string; helpText: string; sortOrder: number };

const toDraft = (f?: FieldTemplate): Draft => ({
  label: f?.label ?? "",
  type: f?.type ?? "TEXT",
  required: f?.required ?? false,
  filterable: f?.filterable ?? false,
  options: (f?.options ?? []).join(", "),
  helpText: f?.helpText ?? "",
  sortOrder: f?.sortOrder ?? 0,
});

const optionsOf = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * One catalog column of a game (game_field_templates). New rows need a key;
 * the key of an existing column is fixed because catalog attributes use it.
 */
export function FieldEditor({ gameId, field, usedBy }: { gameId: number; field?: FieldTemplate; usedBy?: number }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [d, setD] = useState<Draft>(() => toDraft(field));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const run = async (kind: string, fn: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      if (!field) {
        setKey("");
        setD(toDraft());
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  };

  const payload = {
    label: d.label.trim(),
    required: d.required,
    filterable: d.filterable,
    options: d.type === "SELECT" ? optionsOf(d.options) : null,
    helpText: d.helpText.trim() || null,
    sortOrder: d.sortOrder,
  };

  return (
    <div className="grid items-end gap-2 rounded-xl border border-border bg-background p-3 text-sm md:grid-cols-[1fr_1fr_110px_1.5fr_70px_auto]">
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Key</span>
        {field ? (
          <code className="num block h-9 truncate rounded-lg bg-surface-elevated px-2 leading-9">{field.key}</code>
        ) : (
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="mis. heroCount" className={input} />
        )}
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Label</span>
        <input value={d.label} onChange={(e) => set("label", e.target.value)} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Tipe</span>
        <select value={d.type} disabled={Boolean(field)} onChange={(e) => set("type", e.target.value as FieldType)} className={input}>
          {(["TEXT", "NUMBER", "SELECT", "TAGS"] as FieldType[]).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">{d.type === "SELECT" ? "Pilihan (pisahkan koma)" : "Bantuan untuk toko"}</span>
        {d.type === "SELECT" ? (
          <input value={d.options} onChange={(e) => set("options", e.target.value)} className={input} />
        ) : (
          <input value={d.helpText} onChange={(e) => set("helpText", e.target.value)} className={input} />
        )}
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">Urutan</span>
        <input type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} className={`${input} num`} />
      </label>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={d.required} onChange={(e) => set("required", e.target.checked)} className="accent-primary" /> Wajib
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={d.filterable} onChange={(e) => set("filterable", e.target.checked)} className="accent-primary" /> Filter
        </label>
        {field ? (
          <>
            <Button size="md" variant="secondary" onClick={() => run("save", () => apiFetch(`/api/admin/fields/${field.id}`, { method: "PATCH", body: JSON.stringify(payload) }))} disabled={busy !== null} aria-label="Simpan">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button
              size="md"
              variant="ghost"
              aria-label="Hapus"
              disabled={busy !== null}
              onClick={() => window.confirm(`Hapus kolom ${field.key}?`) && run("del", () => apiFetch(`/api/admin/fields/${field.id}`, { method: "DELETE" }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            size="md"
            onClick={() =>
              run("add", () =>
                apiFetch(`/api/admin/games/${gameId}/fields`, {
                  method: "POST",
                  body: JSON.stringify({ key: key.trim(), type: d.type, ...payload }),
                }),
              )
            }
            disabled={busy !== null || !key.trim() || !d.label.trim()}
          >
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah
          </Button>
        )}
      </div>
      {(error || usedBy !== undefined) && (
        <p className="text-xs md:col-span-6">
          {usedBy !== undefined && <span className="text-text-secondary">Dipakai {usedBy} katalog. </span>}
          {error && <span className="text-red-600">{error}</span>}
        </p>
      )}
    </div>
  );
}
