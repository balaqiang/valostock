// Site CMS content (texts + live home banners) — GET /api/site, once per request.
import { cache } from "react";
import { publicApiGet } from "@/lib/api-server";

export type SiteBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  linkUrl: string | null;
};

export type SiteContent = { texts: Record<string, string>; banners: SiteBanner[] };

export const getSite = cache(async (): Promise<SiteContent> => {
  return (await publicApiGet<SiteContent>("/api/site")) ?? { texts: {}, banners: [] };
});

/** Text lookup; the API always sends every registered key (changed or default), "" when the API is down. */
export async function siteText(): Promise<(key: string) => string> {
  const { texts } = await getSite();
  return (key: string) => texts[key] ?? "";
}
