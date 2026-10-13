import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminAds } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Iklan & Langganan | Admin" };

export default async function AdminAdsPage() {
  const data = await adminGet<AdminAds>("/ads");
  if (!data) return <Denied permission="ads:manage" />;

  return (
    <div className="space-y-6">
      <DashHeader title="Iklan & Langganan" description="Featured listing yang berjalan dan paket langganan toko. Hentikan iklan yang melanggar dengan alasan." />
      <Panel title="Featured listing">
        <Table head={["Katalog", "Toko", "Durasi", "Biaya", "Periode", "Status", ""]} empty="Belum ada iklan.">
          {data.ads.map((a) => (
            <tr key={a.id}>
              <Td>
                <Link href={`/admin/catalogs/${a.catalog.id}`} className="block max-w-xs truncate hover:text-primary">
                  {a.catalog.title}
                </Link>
              </Td>
              <Td className="text-xs">{a.store}</Td>
              <Td>{a.durationDays} hari</Td>
              <Td className="num">{a.isFree ? "Gratis" : formatRupiah(a.price)}</Td>
              <Td className="text-xs text-text-secondary">{a.startsAt ? `${formatDbDateTime(a.startsAt)} sampai ${a.endsAt ? formatDbDateTime(a.endsAt) : ""}` : "-"}</Td>
              <Td>
                <Tone tone={a.status === "ACTIVE" ? "success" : a.status === "STOPPED" ? "destructive" : "secondary"}>{a.status}</Tone>
                {a.stopReason && <p className="mt-1 text-xs text-text-secondary">{a.stopReason}</p>}
              </Td>
              <Td>
                {a.status === "ACTIVE" && (
                  <ActionButton variant="ghost" endpoint={`/api/admin/ads/${a.id}/stop`} prompt="Alasan menghentikan iklan (wajib):" promptRequired>
                    Hentikan
                  </ActionButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="Langganan toko">
        <Table head={["Toko", "Paket", "Komisi", "Berlaku sampai", "Slot iklan gratis"]}>
          {data.subscriptions.map((s) => (
            <tr key={s.storeId}>
              <Td>
                <Link href={`/admin/stores/${s.storeId}`} className="hover:text-primary">
                  {s.store.name}
                </Link>
              </Td>
              <Td>
                <Tone tone={s.tier === "FREE" ? "secondary" : "default"}>{s.tier}</Tone>
              </Td>
              <Td className="num">{(s.commissionRate * 100).toLocaleString("id-ID")}%</Td>
              <Td className="text-xs text-text-secondary">{s.periodEnd ? formatDbDateTime(s.periodEnd) : "-"}</Td>
              <Td className="num text-xs">{s.featuredSlots}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
