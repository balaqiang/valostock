import type { Metadata } from "next";
import { Compass, FileSearch, Home } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Halaman tidak ditemukan | valostock.id" };

export default function NotFound() {
  return (
    <SiteShell>
      <Container className="py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </span>
        <p className="num mt-6 font-display text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-4 max-w-md text-text-secondary">
          Link-nya mungkin salah ketik, atau halaman ini memang tidak ada.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/">
            <Home className="h-4 w-4" /> Ke beranda
          </Button>
          <Button href="/topup/invoice" variant="secondary">
            <FileSearch className="h-4 w-4" /> Cek invoice
          </Button>
        </div>
      </Container>
    </SiteShell>
  );
}
