export type NameMatch = 'MATCH' | 'REVIEW' | 'MISMATCH';

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Account Validation (docs/MONEY_RULES.md §9), prototype version: the account
 * holder name is compared with the store's verified owner legal name.
 * Same words → MATCH, some shared word → REVIEW (admin looks closer), else MISMATCH.
 */
export function matchName(accountName: string, ownerLegalName: string): NameMatch {
  const given = normalize(accountName);
  const expected = normalize(ownerLegalName);
  if (given.length === 0) return 'MISMATCH';
  if (given.join(' ') === expected.join(' ')) return 'MATCH';
  return given.some((part) => expected.includes(part)) ? 'REVIEW' : 'MISMATCH';
}
