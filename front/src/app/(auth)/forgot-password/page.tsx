import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Lupa Password — valostock.id" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Lupa Password</h1>
      <p className="mt-1 text-sm text-text-secondary">Masukkan email terdaftar — kami kirim tautan untuk membuat password baru.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-text-secondary">
        Ingat passwordmu?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Kembali ke Masuk
        </Link>
      </p>
    </div>
  );
}
