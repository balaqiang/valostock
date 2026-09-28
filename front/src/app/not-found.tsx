import type { Metadata } from "next";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Halaman tidak ditemukan — valostock.id" };

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex flex-1 items-center">
        <Container className="py-20 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-7 w-7" />
          </span>
          <p className="num mt-6 font-display text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">Halaman tidak ditemukan</h1>
          <p className="mx-auto mt-4 max-w-md text-text-secondary">
            Link-nya mungkin salah ketik, atau katalog/toko ini sudah tidak tayang — misalnya sudah terjual, ditarik toko, atau sedang ditinjau admin.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/">
              <Home className="h-4 w-4" /> Ke beranda
            </Button>
            <Button href="/search" variant="secondary">
              <Search className="h-4 w-4" /> Cari akun
            </Button>
            <Button href="/help" variant="ghost">
              <LifeBuoy className="h-4 w-4" /> Pusat bantuan
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
