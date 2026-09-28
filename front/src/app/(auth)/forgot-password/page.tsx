import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Lupa Password — valostock.id",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Lupa Password
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Masukkan email atau nomor HP terdaftar — kami kirim tautan/kode reset.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="identity"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Email atau Nomor HP
          </label>
          <Input
            id="identity"
            name="identity"
            required
            placeholder="kamu@email.com atau 08xxxxxxxxxx"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          Kirim Tautan Reset
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Ingat passwordmu?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Kembali ke Masuk
        </Link>
      </p>
    </div>
  );
}
