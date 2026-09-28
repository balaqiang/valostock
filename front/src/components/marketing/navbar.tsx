import { NavbarClient } from "@/components/marketing/navbar-client";
import { getGames } from "@/lib/data/catalog";

/**
 * Site navbar. Loads the games menu from the database, then renders the
 * interactive client navbar. `overlay` (default) is transparent over a dark
 * hero and turns solid on scroll; `solid` is always solid.
 */
export async function Navbar({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const games = await getGames();
  return <NavbarClient variant={variant} games={games} />;
}
