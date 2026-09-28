import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Flag,
  Info,
  LifeBuoy,
  Mail,
  ReceiptText,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Kontak — valostock.id",
  description:
    "Hubungi tim valostock.id — pertanyaan umum, kendala top-up, atau masalah pesanan.",
};

const channels = [
  {
    icon: LifeBuoy,
    title: "Pusat Bantuan",
    body: "Jawaban tercepat untuk pertanyaan umum — biaya, rekber, proteksi, top-up, dan Balance.",
    href: "/help",
    cta: "Buka Pusat Bantuan",
  },
  {
    icon: Flag,
    title: "Masalah pesanan / sengketa",
    body: "Masalah pesanan akun ditangani dari halaman pesananmu agar terhubung dengan bukti Rekber Room. Ajukan dalam 72 jam.",
    href: "/account/orders/my",
    cta: "Buka Pesanan Saya",
  },
  {
    icon: ReceiptText,
    title: "Kendala top-up",
    body: "Cek dulu status pesananmu dengan nomor invoice — jika item tidak masuk, dana kembali ke Balance.",
    href: "/topup/invoice",
    cta: "Cek Invoice",
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Hubungi Kami
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Pilih jalur yang paling sesuai — masalah transaksi paling cepat
              ditangani lewat halaman yang terhubung dengan datanya.
            </p>
          </Container>
        </section>

        <Container className="max-w-4xl py-8 sm:py-10">
          {/* Channels */}
          <div className="grid gap-4 sm:grid-cols-3">
            {channels.map((channel) => (
              <Link
                key={channel.title}
                href={channel.href}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary/40"
              >
                <channel.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 text-sm font-semibold text-text">
                  {channel.title}
                </h2>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-text-secondary">
                  {channel.body}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {channel.cta}
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* Contact form */}
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
              <Mail className="h-4 w-4 text-primary" />
              Kirim Pesan
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Untuk pertanyaan umum, kerja sama, atau media. Kami balas ke
              email kamu.
            </p>

            <form className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Nama
                </label>
                <Input id="name" name="name" required placeholder="Nama kamu" />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="kamu@email.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="topic"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Topik
                </label>
                <select
                  id="topic"
                  name="topic"
                  className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option>Pertanyaan umum</option>
                  <option>Membuka toko</option>
                  <option>Kerja sama / partnership</option>
                  <option>Media & press</option>
                  <option>Privasi & data</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="message"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Pesan
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Tulis pesanmu…"
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" size="lg">
                  Kirim Pesan
                </Button>
              </div>
            </form>
          </div>

          {/* In-app rule reminder */}
          <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
            Demi keamananmu, semua transaksi dan sengketa hanya ditangani di
            dalam platform — kami tidak pernah meminta pembayaran atau data
            akun lewat WhatsApp/DM.
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
