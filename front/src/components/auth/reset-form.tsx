"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/auth/form-alert";
import { apiFetch } from "@/lib/api";

/**
 * The reset email links to /reset-password#access_token=…&type=recovery.
 * The token stays in the URL fragment (never sent to a server log); this form
 * posts it once to the API, which sets the new password via Supabase Auth.
 */
export function ResetForm() {
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access = params.get("access_token");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL fragment on mount
    if (access) setToken(access);
    else setLinkError(params.get("error_description") ?? "Tautan reset tidak valid atau sudah kedaluwarsa.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset", { method: "POST", body: JSON.stringify({ accessToken: token, password }) });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <p className="flex gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" /> Password berhasil diganti.
        </p>
        <Button href="/login" size="lg" className="w-full">
          Masuk
        </Button>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="mt-6 space-y-3 text-sm">
        <FormAlert message={linkError} />
        <Link href="/forgot-password" className="font-medium text-primary">
          Minta tautan baru →
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Password baru
        </label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Ulangi password baru
        </label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <FormAlert message={error} />
      <Button type="submit" size="lg" className="w-full" disabled={loading || !token}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Simpan password baru
      </Button>
    </form>
  );
}
