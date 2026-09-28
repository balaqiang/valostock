import type { Metadata } from "next";
import Link from "next/link";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = {
  title: "Verifikasi OTP — valostock.id",
};

export default function VerifyOtpPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Verifikasi OTP
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Masukkan 6 digit kode yang kami kirim ke nomor HP kamu.
      </p>

      <OtpForm />

      <p className="mt-6 text-center text-sm text-text-secondary">
        Salah nomor?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Ubah data pendaftaran
        </Link>
      </p>
    </div>
  );
}
