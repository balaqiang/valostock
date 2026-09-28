import type { Metadata } from "next";
import { storeTypeLabel } from "@/lib/labels";
import { getNotifChannels, requireStore } from "@/lib/data/store";
import {
  BadgeCheck,
  Bell,
  Landmark,
  Pencil,
  Store as StoreIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { ChannelToggles } from "@/components/store-dashboard/channel-toggles";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pengaturan Toko — valostock.id",
};

function Block({
  icon: Icon,
  title,
  children,
  editable = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  editable?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
        {editable && (
          <Button variant="ghost" size="md">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-44 flex-none text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

export default async function StoreSettingsPage() {
  const storeSettings = await requireStore("/store-dashboard/settings");
  const channels = await getNotifChannels(storeSettings.slug);
  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Profil toko, status verifikasi, deposit, dan kanal notifikasi."
      />

      <div className="mt-6 space-y-4">
        {/* Profile */}
        <Block icon={StoreIcon} title="Profil Toko" editable>
          <dl className="divide-y divide-border">
            <Row label="Nama toko" value={storeSettings.name} />
            <Row
              label="Alamat etalase"
              value={<span className="num">/store/{storeSettings.slug}</span>}
            />
            <Row
              label="Tipe toko"
              value={
                <span className="inline-flex items-center gap-2">
                  {storeTypeLabel[storeSettings.type]}
                  <span className="text-xs text-text-secondary">
                    — bertanggung jawab penuh atas penjual eksternal
                  </span>
                </span>
              }
            />
            <Row
              label="Kategori produk"
              value={storeSettings.categories.join(" · ")}
            />
          </dl>
        </Block>

        {/* KYC */}
        <Block icon={BadgeCheck} title="Verifikasi Identitas (KYC)">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Terverifikasi (Sumsub)</Badge>
            <p className="text-xs text-text-secondary">
              Nama KYC dipakai untuk Account Validation di setiap penarikan —
              rekening atas nama lain akan ditolak.
            </p>
          </div>
        </Block>

        {/* Deposit */}
        <Block icon={Landmark} title="Deposit Keamanan">
          <div className="flex flex-wrap items-center gap-3">
            <span className="num font-display text-xl font-bold text-text">
              {formatRupiah(storeSettings.depositAmount)}
            </span>
            <Badge variant="success">Aktif (HELD)</Badge>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Jaminan kepatuhan — dapat dipotong untuk denda/kompensasi pembeli,
            dan dikembalikan saat toko tutup dengan syarat akun bersih (lihat
            aturan toko §10).
          </p>
        </Block>

        {/* Notification channels — one-way */}
        <Block icon={Bell} title="Kanal Notifikasi (satu arah)">
          <p className="mb-3 text-xs text-text-secondary">
            Alert pembeli baru, penawaran, pesanan dibayar, dan sengketa.
            Hanya notifikasi — penawaran, chat, pengiriman, dan sengketa tetap
            di dalam platform.
          </p>
          <ChannelToggles channels={channels} />
        </Block>
      </div>
    </div>
  );
}
