import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Daftar — valostock.id",
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Daftar
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Pembeli langsung bisa belanja — tanpa KYC. Buka toko bisa kapan saja.
      </p>

      <Suspense>
        <RegisterForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
