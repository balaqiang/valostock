import { one, run, type Db } from '../../db/pool.js';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  created_at: string;
}

export type PublicUser = Omit<UserRow, 'password_hash'>;

export const toPublicUser = ({ password_hash: _hash, ...user }: UserRow): PublicUser => user;

export const findUserById = (db: Db, id: string) => one<UserRow>(db, 'SELECT * FROM users WHERE id = ?', [id]);
export const findUserByEmail = (db: Db, email: string) => one<UserRow>(db, 'SELECT * FROM users WHERE email = ?', [email]);
export const findUserByPhone = (db: Db, phone: string) => one<UserRow>(db, 'SELECT * FROM users WHERE phone = ?', [phone]);

export async function insertUser(db: Db, user: Pick<UserRow, 'id' | 'name' | 'email' | 'phone' | 'password_hash'>) {
  await run(db, 'INSERT INTO users (id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)', [
    user.id,
    user.name,
    user.email,
    user.phone,
    user.password_hash,
  ]);
}
