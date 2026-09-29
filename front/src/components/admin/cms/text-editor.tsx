"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDbDateTime } from "@/lib/format";
import type { CmsTextGroup, CmsTextItem } from "@/lib/data/admin";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

/** Site texts editor: edit many, save once; each text can go back to its built-in default. */
export function CmsTextEditor({ groups }: { groups: CmsTextGroup[] }) {
  const router = useRouter();
  const initial = useMemo(() => Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.key, i.value]))), [groups]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = Object.keys(values).filter((key) => values[key] !== initial[key]);

  const send = async (payload: Record<string, string | null>, tag: string, done: string) => {
    setBusy(tag);
    setMessage(null);
    try {
      await apiFetch("/api/admin/cms/texts", { method: "PATCH", body: JSON.stringify({ values: payload }) });
      setMessage({ ok: true, text: done });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setBusy(null);
    }
  };

  const save = () => send(Object.fromEntries(dirty.map((key) => [key, values[key] ?? ""])), "save", `${dirty.length} teks disimpan.`);
  const reset = (item: CmsTextItem) => {
    setValues((v) => ({ ...v, [item.key]: item.defaultValue }));
    return send({ [item.key]: null }, item.key, `"${item.label}" kembali ke teks bawaan.`);
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="rounded-2xl border border-border bg-surface">
          <header className="border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-text">{group.label}</h2>
            <p className="mt-0.5 text-xs text-text-secondary">{group.description}</p>
          </header>
          <div className="divide-y divide-border">
            {group.items.map((item) => {
              const value = values[item.key] ?? "";
              const changedHere = value !== initial[item.key];
              return (
                <div key={item.key} className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <label htmlFor={`cms-${item.key}`} className="text-sm font-medium text-text">
                      {item.label}
                    </label>
                    <p className="num mt-0.5 text-[11px] text-text-secondary">{item.key}</p>
                    {item.changed && (
                      <p className="mt-1 text-[11px] text-primary">
                        Diubah{item.updatedBy ? ` oleh ${item.updatedBy}` : ""}
                        {item.updatedAt ? ` · ${formatDbDateTime(item.updatedAt)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    {item.kind === "toggle" ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text">
                        <input
                          id={`cms-${item.key}`}
                          type="checkbox"
                          checked={value === "true"}
                          onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.checked ? "true" : "false" }))}
                          className="h-4 w-4 accent-[var(--color-primary)]"
                        />
                        {value === "true" ? "Ya, tampilkan" : "Tidak ditampilkan"}
                      </label>
                    ) : item.kind === "multiline" ? (
                      <textarea
                        id={`cms-${item.key}`}
                        rows={Math.min(5, Math.max(2, Math.ceil(item.max / 90)))}
                        maxLength={item.max}
                        value={value}
                        onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                        className={cn(inputClass, changedHere && "border-amber-500/60")}
                      />
                    ) : (
                      <input
                        id={`cms-${item.key}`}
                        type={item.kind === "email" ? "email" : item.kind === "phone" ? "tel" : "text"}
                        maxLength={item.max}
                        value={value}
                        placeholder={item.optional ? "(kosong = tidak ditampilkan)" : undefined}
                        onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                        className={cn(inputClass, changedHere && "border-amber-500/60")}
                      />
                    )}
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
                      <span>
                        {item.hint ?? (item.kind === "toggle" ? "" : item.optional ? "Opsional." : "Wajib diisi.")}
                        {item.kind !== "toggle" && <span className="num"> · {value.length}/{item.max}</span>}
                      </span>
                      {item.changed && (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => reset(item)}
                          className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-primary disabled:opacity-50"
                        >
                          {busy === item.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Kembalikan bawaan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button type="button" onClick={save} disabled={dirty.length === 0 || busy !== null}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dirty.length > 0 ? `Simpan ${dirty.length} perubahan` : "Belum ada perubahan"}
        </Button>
        {dirty.length > 0 && (
          <button type="button" onClick={() => setValues(initial)} className="text-sm text-text-secondary hover:text-text">
            Batalkan
          </button>
        )}
        {message && <p className={cn("text-sm", message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{message.text}</p>}
      </div>
    </div>
  );
}
