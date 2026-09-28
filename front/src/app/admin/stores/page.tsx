import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminStoreRow } from "@/lib/data/admin";
import { storeStatusLabel, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime } from "@/lib/format";
import type { StoreStatus } from "@/types/api";

export const metadata: Metadata = { title: "Verifikasi Toko — Admin" };

const TABS = ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED", "PENDING_DEPOSIT", "ALL"] as const;

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = TABS.includes(sp.status as (typeof TABS)[number]) ? sp.status! : "PENDING_REVIEW";
  const params = new URLSearchParams({ status });
  if (sp.q) params.set("q", sp.q);
  const data = await adminGet<{ stores: AdminStoreRow[] }>(`/stores?${params}`);
  if (!data) return <Denied permission="stores:view" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Verifikasi Toko"
        description="Tanpa penyedia KYC: admin mencocokkan nama pemilik (KTP) dengan data akun secara manual setelah deposit dibayar. Setujui, tolak dengan alasan, atau tangguhkan."
      />
      <StatusTabs base="/admin/stores" current={status} tabs={TABS.map((t) => ({ value: t, label: t === "ALL" ? "Semua" : storeStatusLabel[t as StoreStatus] }))} />
      <form className="flex gap-2 text-sm">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="nama toko / email / nama KTP" className="h-9 w-72 rounded-lg border border-border bg-background px-3" />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Cari</button>
      </form>
      <Table head={["Toko", "Pemilik (KTP)", "Akun", "Deposit", "Paket", "Status", "Daftar", ""]} empty="Tidak ada toko di status ini.">
        {data.stores.map((s) => (
          <tr key={s.id}>
            <Td>
              <Link href={`/admin/stores/${s.id}`} className="font-medium text-text hover:text-primary">
                {s.name}
              </Link>
              <span className="block text-xs text-text-secondary">
                {storeTypeLabel[s.type]} · {s.listedCount} katalog tayang
              </span>
            </Td>
            <Td>{s.ownerLegalName}</Td>
            <Td className="text-xs">
              {s.owner.name}
              <span className="block text-text-secondary">{s.owner.email}</span>
            </Td>
            <Td className="text-xs">{s.depositStatus === "HELD" ? "Ditahan" : s.depositStatus === "RELEASED" ? "Dikembalikan" : "Belum bayar"}</Td>
            <Td className="text-xs">{s.tier}</Td>
            <Td>
              <Tone tone={s.status === "ACTIVE" ? "success" : s.status === "PENDING_REVIEW" ? "warning" : s.status === "PENDING_DEPOSIT" ? "secondary" : "destructive"}>
                {storeStatusLabel[s.status]}
              </Tone>
            </Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(s.createdAt)}</Td>
            <Td>
              <Link href={`/admin/stores/${s.id}`} className="text-xs font-medium text-primary">
                {s.status === "PENDING_REVIEW" ? "Verifikasi →" : "Detail →"}
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
