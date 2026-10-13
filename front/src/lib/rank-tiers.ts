// Rank tiers for the /search filter, derived from each game's `rank` field
// template (Admin → Game → kolom). "Gold 3" → "Gold"; "Mythical Glory" stays.

/** Tier of one rank value: drops a trailing division number or roman numeral. */
export const rankTier = (rank: string): string => rank.replace(/\s+(\d+|I{1,3}|IV|V)$/i, "").trim();

/** Unique tiers of a game's rank options, highest first (templates list them low → high). */
export function tiersFromOptions(options: string[]): string[] {
  return [...new Set(options.map(rankTier))].reverse();
}
