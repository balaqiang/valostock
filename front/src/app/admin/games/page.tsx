import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminGame } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Game & Kolom — Admin" };

export default async function AdminGamesPage() {
  const data = await adminGet<{ games: AdminGame[] }>("/games");
  if (!data) return <Denied permission="master:manage" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Game & Template Kolom"
        description="Daftar game dan kolom katalog per game. Kolom menentukan form katalog toko, validasi server, dan filter pencarian pembeli."
      />
      <Table head={["Game", "Jual akun / top-up", "Kolom", "Katalog tayang", "Produk top-up", "Status", ""]}>
        {data.games.map((g) => (
          <tr key={g.id}>
            <Td>
              <span className="font-medium text-text">{g.name}</span>
              <span className="block text-xs text-text-secondary">
                /{g.slug} · {g.publisher}
              </span>
            </Td>
            <Td className="text-xs">
              {g.supportsAccount ? "Akun ✓" : "Akun ✗"} · {g.supportsTopup ? "Top-up ✓" : "Top-up ✗"}
            </Td>
            <Td className="num">{g.fieldCount}</Td>
            <Td className="num">{g.listedCount}</Td>
            <Td className="num">{g.productCount}</Td>
            <Td>
              <Tone tone={g.isActive ? "success" : "secondary"}>{g.isActive ? "Aktif" : "Nonaktif"}</Tone>
            </Td>
            <Td>
              <Link href={`/admin/games/${g.id}`} className="text-xs font-medium text-primary">
                Kelola →
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Tambah game">
        <ApiForm
          endpoint="/api/admin/games"
          submitLabel="Tambah game"
          fields={[
            { name: "slug", label: "Slug", type: "text", required: true, placeholder: "genshin-impact" },
            { name: "name", label: "Nama", type: "text", required: true },
            { name: "publisher", label: "Publisher", type: "text", required: true },
            { name: "tagline", label: "Tagline", type: "text", required: true },
            { name: "uidLabel", label: "Label UID (top-up)", type: "text", required: true, defaultValue: "User ID" },
            { name: "uidHint", label: "Petunjuk UID", type: "text", required: true, defaultValue: "Lihat di profil game" },
            { name: "description", label: "Deskripsi", type: "textarea", required: true },
            { name: "supportsAccount", label: "Jual akun", type: "checkbox", defaultValue: true },
            { name: "supportsTopup", label: "Top-up", type: "checkbox", defaultValue: false },
          ]}
        />
      </Panel>
    </div>
  );
}
