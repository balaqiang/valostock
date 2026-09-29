import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Masuk | valostock.id",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Masuk
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Pakai nomor HP atau email yang terdaftar.
      </p>

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
