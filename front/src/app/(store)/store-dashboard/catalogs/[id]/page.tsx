import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, ScanLine, Send } from "lucide-react";
import { ActionButton } from "@/components/dashboard/action-button";
import { ReviewHistory } from "@/components/dashboard/review-history";
import { DashHeader, KeyValues, Panel, Tone } from "@/components/dashboard/ui";
import { CatalogEditor } from "@/components/store-dashboard/catalog-editor";
import { CatalogImages } from "@/components/store-dashboard/catalog-images";
import { getGames } from "@/lib/data/catalog";
import { getMyCatalog, requireStore } from "@/lib/data/store";
import { catalogStatusLabel, catalogStatusTone } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Kelola Katalog — valostock.id" };

export default async function EditCatalogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const store = await requireStore(`/store-dashboard/catalogs/${id}`);
  const detail = await getMyCatalog(id);
  if (!detail) notFound();
  const games = (await getGames()).filter((game) => game.supportsAccount);
  const { listing } = detail;
  const editable = ["DRAFT", "PENDING_REVIEW", "REJECTED", "LISTED", "DELISTED"].includes(listing.status);
  const canSubmit = ["DRAFT", "REJECTED", "DELISTED"].includes(listing.status);
  const storeActive = store.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <DashHeader
        title={listing.title}
        back={{ href: "/store-dashboard/catalogs", label: "Katalog" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Tone tone={catalogStatusTone[listing.status]}>{catalogStatusLabel[listing.status]}</Tone>
            <span>{listing.code ? `VS code ${listing.code}` : "VS code terbit saat pertama diajukan"}</span>
            <span>· {listing.gameName}</span>
          </span>
        }
        actions={
          <>
            {listing.status === "LISTED" && (
              <Link href={`/catalog/${listing.id}`} className="text-sm font-medium text-primary">
                Lihat di marketplace →
              </Link>
            )}
            {canSubmit && (
              <ActionButton
                variant="primary"
                endpoint={`/api/stores/me/catalogs/${listing.id}/submit`}
                confirm="Ajukan katalog ini ke admin untuk diverifikasi?"
              >
                <Send className="h-4 w-4" /> {listing.status === "DRAFT" ? "Ajukan ke Admin" : "Ajukan Ulang"}
              </ActionButton>
            )}
            {(listing.status === "LISTED" || listing.status === "PENDING_REVIEW") && (
              <ActionButton
                endpoint={`/api/stores/me/catalogs/${listing.id}/withdraw`}
                confirm={listing.status === "LISTED" ? "Sembunyikan katalog dari marketplace?" : "Tarik pengajuan dan kembalikan ke draf?"}
              >
                {listing.status === "LISTED" ? "Sembunyikan" : "Tarik pengajuan"}
              </ActionButton>
            )}
            {listing.status === "DRAFT" && !listing.code && (
              <ActionButton
                variant="ghost"
                method="DELETE"
                endpoint={`/api/stores/me/catalogs/${listing.id}`}
                confirm="Hapus draf ini beserta fotonya?"
                redirectTo="/store-dashboard/catalogs"
              >
                Hapus draf
              </ActionButton>
            )}
          </>
        }
      />

      {created && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Draf tersimpan. Unggah foto akun di bawah, lalu tekan <strong>Ajukan ke Admin</strong>.
        </p>
      )}
      {!storeActive && canSubmit && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Toko belum aktif — katalog bisa disiapkan sebagai draf, tetapi baru bisa diajukan setelah toko diverifikasi admin.
        </p>
      )}
      {listing.status === "PENDING_REVIEW" && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" /> Menunggu verifikasi admin sejak {listing.submittedAt ? formatDbDateTime(listing.submittedAt) : "-"}. Kamu akan mendapat notifikasi saat diputuskan.
        </p>
      )}
      {(listing.status === "REJECTED" || listing.status === "DELISTED") && listing.reviewNote && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <p className="font-medium">{listing.status === "REJECTED" ? "Ditolak admin" : "Diturunkan"}</p>
            <p>{listing.reviewNote}</p>
            <p className="mt-1 text-xs">Perbaiki data/foto sesuai alasan, simpan, lalu ajukan ulang.</p>
          </div>
        </div>
      )}
      {listing.status === "LISTED" && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Tayang di marketplace. Mengubah judul, harga, deskripsi, atribut, atau foto akan mengirim katalog kembali ke antrean verifikasi.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Foto akun">
            <CatalogImages catalogId={listing.id} images={detail.imageItems} editable={editable} listed={listing.status === "LISTED"} />
          </Panel>
          <Panel title="Data katalog">
            <CatalogEditor games={games} detail={detail} commissionRate={store.subscription?.commissionRate ?? 0.05} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Ringkasan">
            <KeyValues
              rows={[
                ["Harga", <span key="p" className="num">{formatRupiah(listing.price)}</span>],
                ["Dilihat", <span key="v" className="num">{listing.views}</span>],
                ["Diajukan", <span key="s">{detail.submitCount}×</span>],
                ["Tayang sejak", listing.listedAt ? formatDbDateTime(listing.listedAt) : "-"],
              ]}
            />
          </Panel>
          <Panel
            title="Inspeksi akun"
            description="Checklist login + bukti privat → badge Account Checked."
            actions={
              <Link href={`/store-dashboard/inspections/${listing.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <ScanLine className="h-3.5 w-3.5" /> {detail.inspection ? "Perbarui" : "Isi"}
              </Link>
            }
          >
            {detail.inspection ? (
              <p className="text-sm">
                <Tone tone={detail.inspection.result === "PASSED" ? "success" : "destructive"}>{detail.inspection.result === "PASSED" ? "Lulus" : "Tidak lulus"}</Tone>
                <span className="ml-2 text-xs text-text-secondary">{formatDbDateTime(detail.inspection.date)}</span>
              </p>
            ) : (
              <p className="text-sm text-text-secondary">Belum diinspeksi.</p>
            )}
          </Panel>
          <Panel title="Riwayat verifikasi">
            <ReviewHistory reviews={detail.reviews} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
