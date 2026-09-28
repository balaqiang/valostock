import type { Metadata } from "next";
import { DashHeader, StatCard } from "@/components/dashboard/ui";
import { RatingsList } from "@/components/store-dashboard/ratings-list";
import { getRatings, requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Ulasan Toko — valostock.id" };

export default async function StoreRatingsPage() {
  const store = await requireStore("/store-dashboard/ratings");
  const data = await getRatings();
  const s = data?.summary ?? store;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Ulasan"
        description="Pembeli memberi penilaian setelah pesanan selesai. Kamu bisa membalas setiap ulasan satu kali — manipulasi ulasan dilarang."
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Rating" value={`${s.rating.toLocaleString("id-ID")} / 5`} hint={`${s.reviews} ulasan`} />
        <StatCard label="Akurasi deskripsi" value={s.serviceScore.descAccuracy.toLocaleString("id-ID")} />
        <StatCard label="Sikap" value={s.serviceScore.attitude.toLocaleString("id-ID")} />
        <StatCard label="Kecepatan kirim" value={s.serviceScore.deliverySpeed.toLocaleString("id-ID")} />
      </div>
      <RatingsList ratings={data?.ratings ?? []} />
    </div>
  );
}
