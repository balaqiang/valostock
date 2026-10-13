import { NavbarClient } from "@/components/marketing/navbar-client";
import { getGames } from "@/lib/data/catalog";
import { getSite } from "@/lib/data/site";

/**
 * Site navbar. Loads the games menu and the CMS announcement, then renders the
 * interactive client navbar. `overlay` (default) is transparent over a dark
 * hero and turns solid on scroll; `solid` is always solid.
 */
export async function Navbar({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const [games, site] = await Promise.all([getGames(), getSite()]);
  const text = site.texts["announcement.text"];
  const announcement =
    site.texts["announcement.enabled"] === "true" && text ? { text, link: site.texts["announcement.link"] || null } : null;
  return (
    <>
      <NavbarClient variant={variant} games={games} announcement={announcement} />
      {/* The navbar is fixed; this keeps the page content below the announcement bar. */}
      {announcement && <div aria-hidden className="h-9" />}
    </>
  );
}
