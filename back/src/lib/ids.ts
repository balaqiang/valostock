import { randomInt, randomUUID } from 'node:crypto';

export const uuid = (): string => randomUUID();

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I — easy to read aloud

function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** "TU-260928-7K3QX2" — prefix + UTC date + random part (UNIQUE in the DB). */
export function documentNumber(prefix: 'TU' | 'BL' | 'ORD' | 'DP' | 'WD'): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${date}-${randomCode(6)}`;
}

/** Platform-issued catalog code, e.g. "VS7K3QX" (UNIQUE — anti double-sell). */
export const vsCode = (): string => `VS${randomCode(5)}`;
