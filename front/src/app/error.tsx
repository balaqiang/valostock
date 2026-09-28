"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for every page under the root layout. Money is never at risk
 * here: payments and balances only change in the API, so a render error just
 * means this page could not be shown — the visitor can safely retry.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
      <div className="w-full max-w-md text-center">
        <Logo className="justify-center" />
        <span className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-text">Halaman ini gagal dimuat</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Terjadi kesalahan saat menampilkan halaman. Pembayaran dan saldo tidak terpengaruh — semuanya dicatat di server. Coba muat ulang; jika tetap gagal, hubungi tim bantuan dan sertakan kode di bawah.
        </p>
        {error.digest && <p className="num mt-4 text-xs text-text-secondary">Kode: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" /> Coba lagi
          </Button>
          <Button href="/" variant="secondary">
            <Home className="h-4 w-4" /> Ke beranda
          </Button>
        </div>
      </div>
    </main>
  );
}
