import type { Metadata } from "next";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, KeyValues, Panel, Tone } from "@/components/dashboard/ui";
import { requireStore } from "@/lib/data/store";
import { storeLevelLabel, storeStatusLabel, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Pengaturan Toko — valostock.id" };

export default async function StoreSettingsPage() {
  const store = await requireStore("/store-dashboard/settings");

  return (
    <div className="space-y-6">
      <DashHeader title="Pengaturan Toko" description="Profil toko dan data verifikasi. Nama pemilik (KTP) dikunci setelah diverifikasi karena dipakai untuk validasi rekening penarikan." />
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
              ["Deposit", `${formatRupiah(store.depositAmount)} · ${store.depositStatus === "HELD" ? "ditahan (jaminan)" : store.depositStatus}`],
              ["Catatan admin", store.reviewNote ?? "-"],
              ["Bergabung", formatDbDateTime(store.createdAt)],
            ]}
          />
          <p className="mt-4 text-xs text-text-secondary">
            Notifikasi WhatsApp/Discord/Telegram disimulasikan di prototype — semua notifikasi tampil di menu Notifikasi.
          </p>
        </Panel>
      </div>
    </div>
  );
}
