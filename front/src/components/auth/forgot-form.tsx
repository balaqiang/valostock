"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/auth/form-alert";
import { apiFetch } from "@/lib/api";

/** Sends a Supabase Auth reset email (local: open Mailpit at http://127.0.0.1:55324). */
export function ForgotForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
        <MailCheck className="h-5 w-5 flex-none" />
        <p>Jika email terdaftar, tautan reset sudah dikirim. Buka email lalu klik tautannya (berlaku 1 jam).</p>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Email terdaftar
        </label>
        <Input id="email" name="email" type="email" required placeholder="kamu@email.com" autoComplete="email" />
      </div>
      <FormAlert message={error} />
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim Tautan Reset
      </Button>
    </form>
  );
}
