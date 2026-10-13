import type { Metadata } from "next";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { AdCreator } from "@/components/store-dashboard/ad-creator";
import { getAds, getMyCatalogs, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Iklan & Featured | valostock.id" };

const STATUS = {
  PENDING_PAYMENT: ["Menunggu bayar", "warning"],
  ACTIVE: ["Aktif", "success"],
  EXPIRED: ["Berakhir", "secondary"],
  STOPPED: ["Dihentikan", "destructive"],
} as const;

export default async function AdsPage() {
  const store = await requireStore("/store-dashboard/ads");
  const [info, listed] = await Promise.all([getAds(), getMyCatalogs("LISTED")]);
  const freeAvailable = info.freeFirstWeekAvailable || info.freeSlotsLeft > 0;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Iklan & Featured"
        description="Katalog yang diiklankan tampil paling atas di pencarian dan di beranda. Minggu pertama gratis (sekali per toko); paket Pro/Business punya slot gratis tambahan."
      />
      {store.status === "ACTIVE" && (
        <Panel
          title="Pasang iklan"
          description={
            info.freeFirstWeekAvailable
              ? "Jatah minggu pertama gratis masih tersedia."
              : `Sisa slot gratis dari paket: ${info.freeSlotsLeft}.`
          }
        >
          <AdCreator catalogs={listed.map((c) => ({ id: c.id, title: c.title, code: c.code }))} prices={info.prices} freeAvailable={freeAvailable} />
        </Panel>
      )}
      <Panel title="Riwayat iklan">
        <Table head={["Katalog", "Durasi", "Biaya", "Status", "Periode", ""]} empty="Belum ada iklan.">
          {info.ads.map((ad) => (
            <tr key={ad.id}>
              <Td className="max-w-xs truncate">{ad.catalog.title}</Td>
              <Td>{ad.durationDays} hari</Td>
              <Td className="num">{ad.isFree ? "Gratis" : formatRupiah(ad.price)}</Td>
              <Td>
                <Tone tone={STATUS[ad.status][1]}>{STATUS[ad.status][0]}</Tone>
                {ad.stopReason && <p className="mt-1 text-xs text-text-secondary">{ad.stopReason}</p>}
              </Td>
              <Td className="text-xs text-text-secondary">
                {ad.startsAt ? `${formatDbDateTime(ad.startsAt)} sampai ${ad.endsAt ? formatDbDateTime(ad.endsAt) : ""}` : "-"}
              </Td>
              <Td>
                {ad.status === "ACTIVE" && (
                  <ActionButton variant="ghost" endpoint={`/api/stores/me/ads/${ad.id}/stop`} confirm="Hentikan iklan ini? Sisa durasi tidak dikembalikan.">
                    Hentikan
                  </ActionButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
