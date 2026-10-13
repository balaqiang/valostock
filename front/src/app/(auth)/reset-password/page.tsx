import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Reset Password | valostock.id" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Buat Password Baru</h1>
      <p className="mt-1 text-sm text-text-secondary">Tautan dari email reset membawamu ke sini. Password baru minimal 8 karakter.</p>
      <ResetForm />
    </div>
  );
}
