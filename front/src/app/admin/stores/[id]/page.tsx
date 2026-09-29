import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, KeyValues, Panel, StatCard, Table, Td, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminStoreDetail } from "@/lib/data/admin";
import { catalogStatusLabel, orderStatusLabel, storeLevelLabel, storeStatusLabel, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/types/api";
import type { CatalogStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Detail Toko | Admin" };

export default async function AdminStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([adminGet<AdminStoreDetail>(`/stores/${id}`), getCurrentUser()]);
  if (!data) return <Denied permission="stores:view" />;
  const { store: s } = data;
  const perms = new Set(user?.permissions ?? []);
  const base = `/api/admin/stores/${s.id}`;

  return (
    <div className="space-y-6">
      <DashHeader
        title={s.name}
        back={{ href: "/admin/stores", label: "Verifikasi Toko" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Tone tone={s.status === "ACTIVE" ? "success" : s.status === "PENDING_REVIEW" ? "warning" : "destructive"}>{storeStatusLabel[s.status]}</Tone>
            {storeTypeLabel[s.type]} · {storeLevelLabel[s.level]} · paket {data.subscription?.tier ?? "FREE"}
          </span>
        }
        actions={
          <>
            {s.status === "PENDING_REVIEW" && perms.has("stores:verify") && (
              <>
                <ActionButton variant="primary" endpoint={`${base}/approve`} prompt="Catatan persetujuan (opsional), mis. nama KTP sesuai:">
                  Setujui toko
                </ActionButton>
                <ActionButton endpoint={`${base}/reject`} prompt="Alasan penolakan (wajib):" promptRequired>
                  Tolak
                </ActionButton>
              </>
            )}
            {s.status === "ACTIVE" && perms.has("stores:suspend") && (
              <ActionButton endpoint={`${base}/suspend`} prompt="Alasan penangguhan (wajib):" promptRequired>
                Tangguhkan
              </ActionButton>
            )}
            {s.status === "CLOSING" && perms.has("stores:verify") && (
              <>
                <ActionButton variant="primary" endpoint={`${base}/close-decision`} body={{ decision: "approve" }} prompt="Catatan persetujuan penutupan (opsional):">
                  Setujui penutupan + refund deposit
                </ActionButton>
                <ActionButton endpoint={`${base}/close-decision`} body={{ decision: "reject" }} prompt="Alasan menolak penutupan (wajib):" promptRequired>
                  Tolak penutupan
                </ActionButton>
              </>
            )}
            {s.status === "SUSPENDED" && perms.has("stores:suspend") && (
              <ActionButton variant="primary" endpoint={`${base}/reactivate`} prompt="Catatan (opsional):">
                Aktifkan kembali
              </ActionButton>
            )}
            {s.status === "ACTIVE" && s.slug && (
              <Link href={`/store/${s.slug}`} className="text-sm font-medium text-primary">
                Etalase →
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Saldo tersedia" value={formatRupiah(data.balance.available)} />
        <StatCard label="Escrow" value={formatRupiah(data.balance.escrow)} hint={`Deposit ${formatRupiah(data.balance.deposit)}`} />
        <StatCard label="Rating" value={`${s.rating} / 5`} hint={`${s.reviews} ulasan · ${s.sold} terjual`} />
        <StatCard label="Pelanggaran" value={data.sanctions.length} tone={data.sanctions.length ? "danger" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profil & verifikasi">
          <KeyValues
            rows={[
              ["Nama pemilik (KTP)", <strong key="n">{s.ownerLegalName}</strong>],
              ["Akun", `${s.owner.name} · ${s.owner.email}`],
              ["HP", s.owner.phone ?? "-"],
              ["Deposit", `${formatRupiah(s.depositAmount)} · ${s.depositStatus}`],
              ["Identitas terverifikasi", s.identityVerified ? "Ya" : "Belum"],
              ["Catatan admin", s.reviewNote ?? "-"],
              ["Daftar", formatDbDateTime(s.createdAt)],
            ]}
          />
          <p className="mt-3 text-sm text-text-secondary">{s.description || "(tanpa deskripsi)"}</p>
          {perms.has("stores:verify") && s.status === "ACTIVE" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(["AUTHORIZED", "VERIFIED", "PLATINUM"] as const)
                .filter((l) => l !== s.level)
                .map((l) => (
                  <ActionButton key={l} variant="ghost" endpoint={`${base}/level`} body={{ level: l }} confirm={`Ubah level toko menjadi ${storeLevelLabel[l]}?`}>
                    Jadikan {storeLevelLabel[l]}
                  </ActionButton>
                ))}
            </div>
          )}
        </Panel>
        <Panel title="Katalog per status">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(data.catalogs).map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-lg bg-surface-elevated px-3 py-2">
                <Link href={`/admin/catalogs?status=${k === "PENDING_REVIEW" || k === "REJECTED" || k === "LISTED" || k === "DELISTED" ? k : "ALL"}&store=${s.slug}`} className="text-text-secondary hover:text-primary">
                  {catalogStatusLabel[k as CatalogStatus] ?? k}
                </Link>
                <span className="num font-semibold">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {perms.has("stores:suspend") && ["ACTIVE", "SUSPENDED"].includes(s.status) && (
        <Panel title="Beri sanksi" description={`Denda dipotong dari deposit (saat ini ${formatRupiah(data.balance.deposit)}), tidak pernah melebihi deposit. Penangguhan menyembunyikan semua katalog.`}>
          <ApiForm
            endpoint={`${base}/sanctions`}
            columns={3}
            submitLabel="Terapkan sanksi"
            successMessage="Sanksi dicatat."
            fields={[
              {
                name: "type",
                label: "Jenis",
                type: "select",
                required: true,
                defaultValue: "WARNING",
                options: [
                  { value: "WARNING", label: "Peringatan" },
                  { value: "FINE", label: "Denda dari deposit" },
                  { value: "SUSPEND", label: "Tangguhkan toko" },
                ],
              },
              { name: "amount", label: "Nilai denda (Rp, untuk denda)", type: "money", min: 1 },
              { name: "reason", label: "Alasan", type: "text", required: true },
            ]}
          />
        </Panel>
      )}

      <Panel title="Pesanan terbaru">
        <Table head={["No.", "Status", "Harga", "Tanggal"]} empty="Belum ada pesanan.">
          {data.orders.map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/orders/${o.id}`} className="num text-xs text-primary">
                  {o.number}
                </Link>
              </Td>
              <Td className="text-xs">{orderStatusLabel[o.status as OrderStatus] ?? o.status}</Td>
              <Td className="num">{formatRupiah(o.itemPrice)}</Td>
              <Td className="text-xs text-text-secondary">{formatDbDateTime(o.date)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ledger saldo (30 terakhir)">
          <Table head={["Jenis", "Jumlah", "Saldo", "Waktu"]} empty="Belum ada mutasi.">
            {data.ledger.map((l) => (
              <tr key={l.id}>
                <Td className="text-xs">
                  {l.type} <span className="text-text-secondary">({l.bucket})</span>
                </Td>
                <Td className="num text-xs">{formatRupiah(l.amount)}</Td>
                <Td className="num text-xs">{formatRupiah(l.balanceAfter)}</Td>
                <Td className="text-xs text-text-secondary">{formatDbDateTime(l.date)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Sanksi & riwayat keputusan">
          <ul className="space-y-2 text-sm">
            {data.sanctions.map((x) => (
              <li key={x.id} className="rounded-lg bg-red-500/5 px-3 py-2">
                <span className="font-medium text-red-600">{x.type}</span> {x.amount > 0 && formatRupiah(x.amount)}, {x.reason}
                <span className="block text-xs text-text-secondary">
                  {x.admin} · {formatDbDateTime(x.date)}
                </span>
              </li>
            ))}
            {data.history.map((h) => (
              <li key={h.id} className="rounded-lg bg-surface-elevated px-3 py-2">
                <span className="font-medium">{h.action}</span>
                <span className="block text-xs text-text-secondary">
                  {h.actor} · {formatDbDateTime(h.date)}
                </span>
              </li>
            ))}
            {data.sanctions.length + data.history.length === 0 && <li className="text-text-secondary">Belum ada.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
