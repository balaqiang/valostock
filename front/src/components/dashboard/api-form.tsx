"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FieldDef =
  | { name: string; label: string; type: "text" | "password"; required?: boolean; placeholder?: string; hint?: string; defaultValue?: string }
  | { name: string; label: string; type: "number" | "money"; required?: boolean; placeholder?: string; hint?: string; defaultValue?: number | null; min?: number }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; hint?: string; defaultValue?: string; numeric?: boolean }
  | { name: string; label: string; type: "checkbox"; hint?: string; defaultValue?: boolean };

type Value = string | number | boolean | null;

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

function initial(fields: FieldDef[]): Record<string, Value> {
  const values: Record<string, Value> = {};
  for (const f of fields) {
    if (f.type === "checkbox") values[f.name] = f.defaultValue ?? false;
    else if (f.type === "number" || f.type === "money") values[f.name] = f.defaultValue ?? null;
    else values[f.name] = f.defaultValue ?? "";
  }
  return values;
}

/**
 * Small JSON form (profile, password, admin products): renders the fields, sends the
 * values to the endpoint and refreshes the page. Empty optional fields are omitted.
 */
export function ApiForm({
  endpoint,
  method = "POST",
  fields,
  submitLabel = "Simpan",
  resetOnSuccess = true,
  columns = 2,
  successMessage,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  fields: FieldDef[];
  submitLabel?: string;
  resetOnSuccess?: boolean;
  columns?: 1 | 2 | 3;
  successMessage?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, Value>>(() => initial(fields));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = (name: string, value: Value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (v === "" || v === null) continue;
      body[f.name] = f.type === "select" && f.numeric ? Number(v) : v;
    }
    try {
      await apiFetch(endpoint, { method, body: JSON.stringify(body) });
      if (resetOnSuccess) setValues(initial(fields));
      setDone(successMessage ?? "Tersimpan.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
        {fields.map((f) => (
          <label key={f.name} className="block text-sm">
            {f.type === "checkbox" ? (
              <span className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="font-medium text-text">{f.label}</span>
              </span>
            ) : (
              <>
                <span className="mb-1.5 block font-medium text-text">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </span>
                {f.type === "select" ? (
                  <select required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} className={inputClass}>
                    {!f.required && <option value="">-</option>}
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "number" || f.type === "money" ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    required={f.required}
                    min={f.min}
                    placeholder={f.placeholder}
                    value={values[f.name] === null ? "" : String(values[f.name])}
                    onChange={(e) => set(f.name, e.target.value === "" ? null : Number(e.target.value))}
                    className={cn(inputClass, "num")}
                  />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                    className={inputClass}
                  />
                )}
              </>
            )}
            {f.hint && <span className="mt-1 block text-xs text-text-secondary">{f.hint}</span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {done && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
      </div>
    </form>
  );
}
