"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

/**
 * Calls one API endpoint (with an optional confirm dialog) and refreshes the page.
 * The API validates the action and writes the audit log.
 */
export function ActionButton({
  endpoint,
  method = "POST",
  body,
  confirm,
  children,
  variant = "secondary",
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  confirm?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} onClick={run} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Button>
      {error && <span className="max-w-xs text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
