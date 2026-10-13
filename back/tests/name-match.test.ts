// Unit tests for account-name validation (docs/MONEY_RULES.md §9): withdrawals and
// transfers are only accepted when the account holder matches the owner's legal name.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchName } from '../src/lib/name-match.ts';

describe('matchName', () => {
  it('matches the same name regardless of case, spacing and punctuation', () => {
    assert.equal(matchName('Budi Santoso', 'Budi Santoso'), 'MATCH');
    assert.equal(matchName('  BUDI   santoso ', 'budi santoso'), 'MATCH');
    assert.equal(matchName('Budi Santoso, S.Kom', 'Budi Santoso S Kom'), 'MATCH');
  });
  it('asks for review when only part of the name is shared', () => {
    assert.equal(matchName('Budi', 'Budi Santoso'), 'REVIEW');
    assert.equal(matchName('Budi Hartono', 'Budi Santoso'), 'REVIEW');
  });
  it('rejects a different person', () => {
    assert.equal(matchName('Andi Wijaya', 'Budi Santoso'), 'MISMATCH');
  });
  it('rejects an empty or non-letter account name', () => {
    assert.equal(matchName('', 'Budi Santoso'), 'MISMATCH');
    assert.equal(matchName('12345 !!', 'Budi Santoso'), 'MISMATCH');
  });
});
