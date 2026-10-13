"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FieldDef =
  | { name: string; label: string; type: "text" | "email" | "password" | "textarea"; required?: boolean; placeholder?: string; hint?: string; defaultValue?: string; maxLength?: number }
  | { name: string; label: string; type: "number" | "money"; required?: boolean; placeholder?: string; hint?: string; defaultValue?: number | null; min?: number }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; hint?: string; defaultValue?: string; numeric?: boolean }
  | { name: string; label: string; type: "checkbox"; hint?: string; defaultValue?: boolean }
  | { name: string; label: string; type: "datetime"; required?: boolean; hint?: string; defaultValue?: string }
  | { name: string; label: string; type: "multiselect"; options: { value: string; label: string }[]; hint?: string; defaultValue?: string[] }
  | { name: string; label: string; type: "list"; placeholder?: string; hint?: string; defaultValue?: string[] | null };

type Value = string | number | boolean | string[] | null;

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

/** `datetime-local` value (local time) ↔ ISO string. */
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function initial(fields: FieldDef[]): Record<string, Value> {
  const values: Record<string, Value> = {};
  for (const f of fields) {
    if (f.type === "checkbox") values[f.name] = f.defaultValue ?? false;
    else if (f.type === "multiselect") values[f.name] = f.defaultValue ?? [];
    else if (f.type === "number" || f.type === "money") values[f.name] = f.defaultValue ?? null;
    else if (f.type === "datetime") values[f.name] = toLocalInput(f.defaultValue);
    else if (f.type === "list") values[f.name] = (f.defaultValue ?? []).join(", ");
    else values[f.name] = f.defaultValue ?? "";
  }
  return values;
}

/**
 * Small JSON form for dashboard CRUD: renders the fields, sends
 * `{ ...extra, ...values }` to the endpoint and refreshes the page.
 * Empty optional fields are omitted (or sent as null with `nullEmpty`).
 */
export function ApiForm({
  endpoint,
  method = "POST",
  fields,
  extra,
  submitLabel = "Simpan",
  resetOnSuccess = true,
  nullEmpty = false,
  columns = 2,
  onSuccess,
  successMessage,
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  fields: FieldDef[];
  extra?: Record<string, unknown>;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  nullEmpty?: boolean;
  columns?: 1 | 2 | 3;
  onSuccess?: (result: unknown) => void;
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
    const body: Record<string, unknown> = { ...extra };
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === "list") {
        const items = String(v ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        body[f.name] = items.length > 0 ? items : null;
      } else if (f.type === "datetime") {
        if (v) body[f.name] = new Date(String(v)).toISOString();
        else if (nullEmpty) body[f.name] = null;
      } else if (v === "" || v === null) {
        if (nullEmpty) body[f.name] = null;
      } else {
        body[f.name] = f.type === "select" && f.numeric ? Number(v) : v;
      }
    }
    try {
      const result = await apiFetch(endpoint, { method, body: JSON.stringify(body) });
      if (resetOnSuccess) setValues(initial(fields));
      setDone(successMessage ?? "Tersimpan.");
      onSuccess?.(result);
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
          <label key={f.name} className={cn("block text-sm", (f.type === "textarea" || f.type === "multiselect") && "sm:col-span-full")}>
            {f.type === "checkbox" ? (
              <span className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="font-medium text-text">{f.label}</span>
              </span>
            ) : (
              <>
                <span className="mb-1.5 block font-medium text-text">
                  {f.label}
                  {"required" in f && f.required && <span className="text-red-500"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    rows={4}
                    required={f.required}
                    maxLength={f.maxLength}
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                    className={inputClass}
                  />
                ) : f.type === "select" ? (
                  <select required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} className={inputClass}>
                    {!f.required && <option value="">-</option>}
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "multiselect" ? (
                  <span className="flex flex-wrap gap-2">
                    {f.options.map((o) => {
                      const list = (values[f.name] as string[]) ?? [];
                      const on = list.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => set(f.name, on ? list.filter((x) => x !== o.value) : [...list, o.value])}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            on ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </span>
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
                ) : f.type === "list" ? (
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                    className={inputClass}
                  />
                ) : f.type === "datetime" ? (
                  <input type="datetime-local" required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} className={inputClass} />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    maxLength={"maxLength" in f ? f.maxLength : undefined}
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                    className={inputClass}
                  />
                )}
              </>
            )}
            {"hint" in f && f.hint && <span className="mt-1 block text-xs text-text-secondary">{f.hint}</span>}
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
