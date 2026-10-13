import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, KeyValues, Panel, Tone } from "@/components/dashboard/ui";
import { StartPayment } from "@/components/payment/start-payment";
import { requireStore } from "@/lib/data/store";
import { storeLevelLabel, storeStatusLabel, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Pengaturan Toko | valostock.id" };

export default async function StoreSettingsPage() {
  const store = await requireStore("/store-dashboard/settings");
  const deposit = store.balance?.deposit ?? 0;
  const minimum = store.depositMinimum ?? 500_000;
  const shortfall = Math.max(0, minimum - deposit);

  return (
    <div className="space-y-6">
      <DashHeader
        title="Pengaturan Toko"
        description="Profil toko, data verifikasi, deposit keamanan, dan penutupan toko. Nama pemilik (KTP) dikunci setelah diverifikasi karena dipakai untuk validasi rekening penarikan."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profil toko">
          <ApiForm
            endpoint="/api/stores/me"
            method="PATCH"
            columns={1}
            resetOnSuccess={false}
            fields={[
              { name: "name", label: "Nama toko", type: "text", required: true, defaultValue: store.name },
              { name: "description", label: "Deskripsi", type: "textarea", defaultValue: store.description, maxLength: 1000 },
            ]}
          />
        </Panel>
        <Panel title="Verifikasi & status">
          <KeyValues
            rows={[
              ["Status", <Tone key="s" tone={store.status === "ACTIVE" ? "success" : "destructive"}>{storeStatusLabel[store.status]}</Tone>],
              ["Tipe", storeTypeLabel[store.type]],
              ["Level", storeLevelLabel[store.level]],
              ["Nama pemilik (KTP)", store.ownerLegalName],
              ["Identitas terverifikasi", store.identityVerified ? "Ya (oleh admin)" : "Belum"],
              ["Catatan admin", store.reviewNote ?? "-"],
              ["Bergabung", formatDbDateTime(store.createdAt)],
            ]}
          />
          <p className="mt-4 text-xs text-text-secondary">
            Notifikasi WhatsApp/Discord/Telegram disimulasikan di prototype, semua notifikasi tampil di menu Notifikasi.
          </p>
        </Panel>
      </div>

      <Panel
        title="Deposit keamanan"
        description="Jaminan kepatuhan toko. Denda dan sisa kompensasi sengketa dipotong dari deposit; setiap pergerakan tercatat di buku besar saldo."
      >
        <div className="flex flex-wrap items-center gap-4">
          {shortfall === 0 ? <ShieldCheck className="h-8 w-8 text-emerald-500" /> : <ShieldOff className="h-8 w-8 text-amber-500" />}
          <div>
            <p className="num font-display text-2xl font-bold text-text">{formatRupiah(deposit)}</p>
            <p className="text-xs text-text-secondary">
              {shortfall === 0 ? "Badge Deposit Secured aktif." : `Kurang ${formatRupiah(shortfall)} dari ${formatRupiah(minimum)}, badge Deposit Secured tidak tampil.`}{" "}
              <Link href="/store-dashboard/balance" className="text-primary">
                Lihat buku besar →
              </Link>
            </p>
          </div>
        </div>
        {shortfall > 0 && store.status === "ACTIVE" && (
          <div className="mt-4">
            <StartPayment endpoint="/api/stores/me/deposit-topup" label={`Lengkapi deposit ${formatRupiah(shortfall)}`} />
          </div>
        )}
      </Panel>

      <Panel
        title="Tutup toko"
        description="Syarat: semua pesanan selesai dan lewat masa proteksi, tidak ada sengketa terbuka, tidak ada penarikan/transfer yang menunggu, dan saldo sudah ditarik. Katalog langsung disembunyikan; admin meninjau lalu mengembalikan sisa deposit."
      >
        {store.status === "CLOSING" ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">Permintaan penutupan sedang ditinjau admin.</p>
        ) : store.status === "ACTIVE" ? (
          <ActionButton
            endpoint="/api/stores/me/close"
            prompt="Alasan menutup toko (wajib). Katalog akan disembunyikan dan permintaan dikirim ke admin:"
            promptKey="reason"
            promptRequired
          >
            Ajukan penutupan toko
          </ActionButton>
        ) : (
          <p className="text-sm text-text-secondary">Penutupan hanya bisa diajukan oleh toko yang aktif.</p>
        )}
      </Panel>
    </div>
  );
}
