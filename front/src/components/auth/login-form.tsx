"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert, safeNextPath } from "@/components/auth/form-alert";
import { refreshSession, setSessionUser, useSession } from "@/lib/hooks/use-session";
import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();

  // An expired access cookie makes server pages send the visitor here; the
  // browser can still refresh the session with its refresh cookie — then go on.
  useEffect(() => {
    void refreshSession();
  }, []);
  useEffect(() => {
    if (session.status === "ready" && session.user) {
      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    }
  }, [session, router, searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);
    try {
      // The API sets the httpOnly session cookies on success.
      const data = await apiFetch<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identity: String(form.get("identity") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      setSessionUser(data.user);
      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kendala jaringan.");
      setLoading(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="identity"
          className="mb-1.5 block text-xs font-medium text-text-secondary"
        >
          Nomor HP atau Email
        </label>
        <Input
          id="identity"
          name="identity"
          required
          placeholder="08xxxxxxxxxx atau kamu@email.com"
          autoComplete="username"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-medium text-text-secondary"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:text-primary-hover"
          >
            Lupa password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <FormAlert message={error} />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
