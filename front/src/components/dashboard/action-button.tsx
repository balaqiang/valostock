"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

/**
 * Calls one API endpoint and refreshes the page. Optional confirm dialog and
 * an optional required/optional text prompt whose value is sent as `promptKey`.
 * All decisions are validated and recorded by the API.
 */
export function ActionButton({
  endpoint,
  method = "POST",
  body,
  confirm,
  prompt,
  promptKey = "note",
  promptRequired = false,
  children,
  variant = "secondary",
  className,
  onDone,
  redirectTo,
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  confirm?: string;
  prompt?: string;
  promptKey?: string;
  promptRequired?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "invert";
  className?: string;
  onDone?: (result: unknown) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    let extra: Record<string, unknown> = {};
    if (prompt) {
      const value = window.prompt(prompt)?.trim();
      if (value === undefined) return;
      if (promptRequired && !value) return;
      if (value) extra = { [promptKey]: value };
    } else if (confirm && !window.confirm(confirm)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { ...body, ...extra };
      const result = await apiFetch(endpoint, {
        method,
        body: method === "DELETE" && Object.keys(payload).length === 0 ? undefined : JSON.stringify(payload),
      });
      onDone?.(result);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} onClick={run} disabled={busy} className={className}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Button>
      {error && <span className="max-w-xs text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
