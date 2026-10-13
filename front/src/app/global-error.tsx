"use client";

import Link from "next/link";
import "./globals.css";

/** Last-resort boundary when the root layout itself fails; it replaces <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-text">
        <div className="w-full max-w-md text-center">
          <p className="font-display text-lg font-bold text-primary">valostock.id</p>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Aplikasi gagal dimuat</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Terjadi kesalahan tak terduga. Pembayaran dan saldo tidak terpengaruh, semuanya dicatat di server.
          </p>
          {error.digest && <p className="mt-4 text-xs text-text-secondary">Kode: {error.digest}</p>}
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => reset()} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
              Coba lagi
            </button>
            <Link href="/" className="flex h-9 items-center rounded-lg border border-border-strong px-4 text-sm font-medium">
              Ke beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
