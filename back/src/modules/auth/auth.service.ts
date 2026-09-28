import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool.js';
import { AppError, conflict } from '../../lib/errors.js';
import { uuid } from '../../lib/ids.js';
import * as repo from './auth.repository.js';

// Compared against when the account doesn't exist, so a wrong email and a
// wrong password take the same time (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

/** "+62 812-3456-7890" / "6281234567890" → "081234567890". */
export function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s\-().]/g, '');
  if (compact.startsWith('+62')) return `0${compact.slice(3)}`;
  if (compact.startsWith('62')) return `0${compact.slice(2)}`;
  return compact;
}

export async function register(input: { name: string; email: string; phone: string | null; password: string }) {
  if (await repo.findUserByEmail(pool, input.email)) throw conflict('Email sudah terdaftar.', 'EMAIL_TAKEN');
  if (input.phone && (await repo.findUserByPhone(pool, input.phone))) {
    throw conflict('Nomor HP sudah terdaftar.', 'PHONE_TAKEN');
  }
  const id = uuid();
  await repo.insertUser(pool, {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    password_hash: await bcrypt.hash(input.password, 10),
  });
  const user = await repo.findUserById(pool, id);
  return repo.toPublicUser(user!);
}

export async function login(identity: string, password: string) {
  const user = identity.includes('@')
    ? await repo.findUserByEmail(pool, identity.toLowerCase())
    : await repo.findUserByPhone(pool, normalizePhone(identity));
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'BAD_CREDENTIALS', 'Email/nomor HP atau password salah.');
  return repo.toPublicUser(user);
}

export async function me(userId: string) {
  const user = await repo.findUserById(pool, userId);
  return user ? repo.toPublicUser(user) : null;
}
