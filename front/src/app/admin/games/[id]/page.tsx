import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Denied } from "@/components/admin/denied";
import { FieldEditor } from "@/components/admin/field-editor";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel } from "@/components/dashboard/ui";
import { adminGet, type AdminField, type AdminGame } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Kelola Game — Admin" };

export default async function AdminGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [games, fields] = await Promise.all([adminGet<{ games: AdminGame[] }>("/games"), adminGet<{ fields: AdminField[] }>(`/games/${id}/fields`)]);
  if (!games || !fields) return <Denied permission="master:manage" />;
  const game = games.games.find((g) => String(g.id) === id);
  if (!game) notFound();

  return (
    <div className="space-y-6">
      <DashHeader title={game.name} back={{ href: "/admin/games", label: "Game & Kolom" }} description={`/${game.slug} · ${game.listedCount} katalog tayang`} />

      <Panel
        title="Template kolom katalog"
        description="Tipe SELECT butuh daftar pilihan. Centang Filter agar kolom muncul sebagai filter pencarian; Wajib agar toko harus mengisinya sebelum mengajukan katalog."
      >
        <div className="space-y-2">
          {fields.fields.map((f) => (
            <FieldEditor key={f.id} gameId={game.id} field={f} usedBy={f.usedBy} />
          ))}
          <p className="pt-3 text-xs font-semibold text-text">Kolom baru</p>
          <FieldEditor gameId={game.id} />
        </div>
      </Panel>

      <Panel title="Data game">
        <ApiForm
          endpoint={`/api/admin/games/${game.id}`}
          method="PATCH"
          resetOnSuccess={false}
          fields={[
            { name: "name", label: "Nama", type: "text", required: true, defaultValue: game.name },
            { name: "publisher", label: "Publisher", type: "text", required: true, defaultValue: game.publisher },
            { name: "tagline", label: "Tagline", type: "text", required: true, defaultValue: game.tagline },
            { name: "gradient", label: "Gradien (Tailwind)", type: "text", defaultValue: game.gradient },
            { name: "uidLabel", label: "Label UID", type: "text", required: true, defaultValue: game.uidLabel },
            { name: "uidHint", label: "Petunjuk UID", type: "text", required: true, defaultValue: game.uidHint },
            { name: "uidExtraLabel", label: "Kolom tambahan (opsional)", type: "text", defaultValue: game.uidExtraLabel ?? "", placeholder: "Zone ID / Server" },
            { name: "uidExtraOptions", label: "Pilihan kolom tambahan", type: "list", defaultValue: game.uidExtraOptions ?? null, placeholder: "Asia, America, Europe", hint: "Pisahkan dengan koma. Kosong = isian bebas; diisi = dropdown dan divalidasi API." },
            { name: "topupCurrency", label: "Mata uang top-up", type: "text", defaultValue: game.topupCurrency ?? "" },
            { name: "sortOrder", label: "Urutan", type: "number", defaultValue: game.sortOrder },
            { name: "description", label: "Deskripsi", type: "textarea", required: true, defaultValue: game.description },
            { name: "supportsAccount", label: "Jual akun", type: "checkbox", defaultValue: game.supportsAccount },
            { name: "supportsTopup", label: "Top-up", type: "checkbox", defaultValue: game.supportsTopup },
            { name: "isHot", label: "Game populer", type: "checkbox", defaultValue: game.isHot },
            { name: "isActive", label: "Aktif (tampil di situs)", type: "checkbox", defaultValue: game.isActive ?? true },
          ]}
        />
      </Panel>
    </div>
  );
}
