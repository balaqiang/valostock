import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { CatalogDecision } from "@/components/admin/catalog-decision";
import { Denied } from "@/components/admin/denied";
import { ReviewHistory } from "@/components/dashboard/review-history";
import { DashHeader, KeyValues, Panel, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminCatalogDetail } from "@/lib/data/admin";
import { catalogStatusLabel, catalogStatusTone, storeLevelLabel, storeStatusLabel, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Tinjau Katalog | Admin" };

const CHECKLIST = [
  "Foto memperlihatkan data yang diklaim (rank, skin, level)",
  "Atribut konsisten dengan foto",
  "Tidak ada kontak / link di luar platform",
  "Tidak ada klaim mutlak (\"100% aman\")",
  "Harga wajar",
  "Toko berstatus aktif",
];

const INSPECTION_LABEL: Record<string, string> = {
  login_success: "Login berhasil",
  no_restriction: "Tanpa pembatasan",
  inventory_matches: "Inventori sesuai",
  rank_matches: "Rank sesuai",
  twofa_active: "2FA di tangan penjual",
};

export default async function AdminCatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([adminGet<AdminCatalogDetail>(`/catalogs/${id}`), getCurrentUser()]);
  if (!data) return <Denied permission="catalogs:view" />;
  const { listing, store, fields, inspection } = data;
  const perms = new Set(user?.permissions ?? []);

  const attr = (key: string) => {
    const v = listing.attributes[key];
    if (v === undefined || v === null || v === "") return <span className="text-red-600">-</span>;
    return Array.isArray(v) ? v.join(", ") : typeof v === "number" ? v.toLocaleString("id-ID") : String(v);
  };

  return (
    <div className="space-y-6">
      <DashHeader
        title={listing.title}
        back={{ href: "/admin/catalogs", label: "Moderasi Katalog" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Tone tone={catalogStatusTone[listing.status]}>{catalogStatusLabel[listing.status]}</Tone>
            <span className="num">{listing.code}</span> · {listing.gameName} · diajukan {data.submitCount}×
            {listing.submittedAt && <> · {formatDbDateTime(listing.submittedAt)}</>}
          </span>
        }
        actions={
          listing.status === "LISTED" ? (
            <Link href={`/catalog/${listing.id}`} className="text-sm font-medium text-primary">
              Lihat di marketplace →
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Foto">
            {data.imageItems.length === 0 ? (
              <p className="text-sm text-red-600">Tidak ada foto.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.imageItems.map((img, i) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden rounded-xl border border-border">
                    <Image src={img.url} alt={`Foto ${i + 1}`} fill sizes="300px" className="object-cover" unoptimized />
                  </a>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Atribut game (sesuai template)">
            <KeyValues
              rows={[
                ...fields.map((f) => [`${f.label}${f.required ? " *" : ""}`, attr(f.key)] as [React.ReactNode, React.ReactNode]),
                ["Harga", <span key="price" className="num">{formatRupiah(listing.basePrice)}</span>],
                ["Harga coret", listing.oldPrice ? formatRupiah(listing.oldPrice) : "-"],
                ["Proses instan", listing.instant ? "Ya" : "Tidak"],
              ]}
            />
          </Panel>
          <Panel title="Deskripsi">
            <p className="whitespace-pre-line text-sm text-text">{listing.description || <span className="text-text-secondary">(kosong)</span>}</p>
          </Panel>
          <Panel title="Hasil inspeksi akun">
            {inspection ? (
              <div className="space-y-3 text-sm">
                <p>
                  <Tone tone={inspection.result === "PASSED" ? "success" : "destructive"}>{inspection.result === "PASSED" ? "Lulus" : "Tidak lulus"}</Tone>
                  <span className="ml-2 text-xs text-text-secondary">{formatDbDateTime(inspection.date)}</span>
                </p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {Object.entries(inspection.checklist).map(([k, v]) => (
                    <li key={k} className={v ? "text-emerald-600" : "text-red-600"}>
                      {v ? "✓" : "✗"} {INSPECTION_LABEL[k] ?? k}
                    </li>
                  ))}
                </ul>
                {inspection.notes && <p className="text-text-secondary">{inspection.notes}</p>}
                {inspection.media.length > 0 && (
                  <p className="flex flex-wrap gap-2 text-xs">
                    {inspection.media.map((m, i) => (
                      <a key={m.path} href={m.url} target="_blank" rel="noreferrer" className="text-primary underline">
                        Bukti {i + 1} (tautan sementara)
                      </a>
                    ))}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Toko belum mengisi inspeksi (opsional).</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Keputusan">
            <ul className="mb-4 space-y-1.5 text-xs text-text-secondary">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex gap-2">
                  <CheckSquare className="h-3.5 w-3.5 flex-none text-primary" /> {c}
                </li>
              ))}
            </ul>
            <CatalogDecision
              catalogId={listing.id}
              status={listing.status}
              reasons={data.reasons}
              canModerate={perms.has("catalogs:moderate")}
              canTakedown={perms.has("catalogs:takedown")}
            />
          </Panel>
          {store && (
            <Panel
              title="Toko"
              actions={
                perms.has("stores:view") ? (
                  <Link href={`/admin/stores/${store.id}`} className="text-xs font-medium text-primary">
                    Detail →
                  </Link>
                ) : undefined
              }
            >
              <KeyValues
                rows={[
                  ["Nama", store.name],
                  ["Status", <Tone key="s" tone={store.status === "ACTIVE" ? "success" : "destructive"}>{storeStatusLabel[store.status]}</Tone>],
                  ["Tipe / level", `${storeTypeLabel[store.type]} · ${storeLevelLabel[store.level]}`],
                  ["Rating", `${store.rating} (${store.reviews} ulasan)`],
                  ["Terjual", store.sold],
                  ["Katalog tayang", store.listedCount],
                  ["Pelanggaran", <span key="v" className={store.sanctions > 0 ? "font-semibold text-red-600" : ""}>{store.sanctions}</span>],
                ]}
              />
            </Panel>
          )}
          <Panel title="Riwayat keputusan">
            <ReviewHistory reviews={data.reviews} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
