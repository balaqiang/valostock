import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, StatusTabs } from "@/components/dashboard/ui";
import { CmsTextEditor } from "@/components/admin/cms/text-editor";
import { CmsBannerList } from "@/components/admin/cms/banner-list";
import { CmsBannerForm } from "@/components/admin/cms/banner-form";
import { CmsGameBanners } from "@/components/admin/cms/game-banners";
import { adminGet, type CmsBanner, type CmsTextGroup } from "@/lib/data/admin";
import { getGames } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "CMS Situs | Admin" };

const TABS = [
  { value: "texts", label: "Teks situs" },
  { value: "banners", label: "Banner beranda" },
  { value: "games", label: "Banner game" },
];

export default async function AdminCmsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? raw! : "texts";

  const header = (
    <DashHeader
      title="CMS Situs"
      description="Ganti teks situs, banner beranda, dan banner game tanpa mengubah kode. Perubahan langsung tampil dan tercatat di audit log."
      actions={
        <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          Lihat situs <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      }
    />
  );
  const tabs = <StatusTabs base="/admin/cms" param="tab" current={tab} tabs={TABS} />;

  if (tab === "texts") {
    const data = await adminGet<{ groups: CmsTextGroup[] }>("/cms/texts");
    if (!data) return <Denied permission="content:manage" />;
    return (
      <div className="space-y-6">
        {header}
        {tabs}
        <CmsTextEditor groups={data.groups} />
      </div>
    );
  }

  if (tab === "banners") {
    const data = await adminGet<{ banners: CmsBanner[] }>("/cms/banners");
    if (!data) return <Denied permission="content:manage" />;
    const nextOrder = data.banners.reduce((max, b) => Math.max(max, b.sortOrder + 1), 0);
    return (
      <div className="space-y-6">
        {header}
        {tabs}
        <p className="text-sm text-text-secondary">
          Banner aktif yang sedang dalam jadwal tampil sebagai slider di atas beranda (urutan kecil lebih dulu). Tanpa banner aktif, beranda memakai hero teks dari tab
          Teks situs. Banner ini promosi milik platform, bukan slot iklan berbayar.
        </p>
        <CmsBannerList banners={data.banners} />
        <Panel title="Tambah banner">
          <CmsBannerForm nextOrder={nextOrder} />
        </Panel>
      </div>
    );
  }

  // Games tab: a content:manage check first (the games list itself is public).
  const allowed = await adminGet<{ banners: CmsBanner[] }>("/cms/banners");
  if (!allowed) return <Denied permission="content:manage" />;
  const games = await getGames();
  return (
    <div className="space-y-6">
      {header}
      {tabs}
      <CmsGameBanners games={games} />
    </div>
  );
}
