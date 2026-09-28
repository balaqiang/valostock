"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert, safeNextPath } from "@/components/auth/form-alert";
import { setSessionUser } from "@/lib/hooks/use-session";
import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/types/api";

const fields = [
  {
    id: "name",
    label: "Nama / Nickname",
    type: "text",
    placeholder: "Nama yang tampil di akunmu",
    autoComplete: "nickname",
  },
  {
    id: "phone",
    label: "Nomor HP",
    type: "tel",
    placeholder: "08xxxxxxxxxx",
    autoComplete: "tel",
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    placeholder: "kamu@email.com",
    autoComplete: "email",
  },
  {
    id: "password",
    label: "Password",
    type: "password",
    placeholder: "Minimal 8 karakter",
    autoComplete: "new-password",
  },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          acceptTerms: form.get("acceptTerms") === "on",
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
      {fields.map((field) => (
        <div key={field.id}>
          <label
            htmlFor={field.id}
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            {field.label}
          </label>
          <Input
            id={field.id}
            name={field.id}
            type={field.type}
            required
            minLength={field.id === "password" ? 8 : undefined}
            placeholder={field.placeholder}
            autoComplete={field.autoComplete}
          />
        </div>
      ))}

      <label className="flex items-start gap-2.5 text-xs text-text-secondary">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--primary)]"
        />
        <span>
          Saya setuju dengan{" "}
          <Link
            href="/legal/terms"
            className="font-medium text-primary hover:text-primary-hover"
          >
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link
            href="/legal/privacy"
            className="font-medium text-primary hover:text-primary-hover"
          >
            Kebijakan Privasi
          </Link>
          .
        </span>
      </label>

      <FormAlert message={error} />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Membuat akun..." : "Daftar"}
      </Button>
    </form>
  );
}
