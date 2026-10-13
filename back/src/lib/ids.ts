import { randomInt, randomUUID } from 'node:crypto';

export const uuid = (): string => randomUUID();

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I, easy to read aloud

export function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** TU = game top-up invoice, BL = Balance voucher invoice. */
export type InvoicePrefix = 'TU' | 'BL';

/** "TU-260928-7K3QX2" — prefix + UTC date + random part (UNIQUE in the DB). */
export function invoiceNumber(prefix: InvoicePrefix): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${date}-${randomCode(6)}`;
}
