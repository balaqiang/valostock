// Store owner area (DFD 2.0, 3.0, 7.0). Every query is scoped to the store the
// logged-in user owns — never to an id from the URL alone.
import { BANK_TAX, STORE_DEPOSIT, WITHDRAW_FEE, type GatewayMethod } from '../../config/money.js';
import { all, one, pool, run, withTransaction, type SqlParam } from '../../db/pool.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { documentNumber, uuid, vsCode } from '../../lib/ids.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { matchName } from '../../lib/name-match.js';
import type { AuthUser } from '../../middlewares/auth.js';
import * as payments from '../payments/payments.service.js';
import { findGameRow } from '../catalog/catalog.repository.js';

interface StoreRow {
  id: string;
  slug: string;
  name: string;
  type: 'OWNER' | 'RESELLER';
  status: 'PENDING_DEPOSIT' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  owner_legal_name: string;
  description: string | null;
  deposit_amount: number;
  deposit_status: string;
  identity_verified: number;
  review_note: string | null;
  created_at: string;
}

const toStoreContext = (s: StoreRow) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  type: s.type,
  status: s.status,
  ownerLegalName: s.owner_legal_name,
  description: s.description ?? '',
  depositAmount: s.deposit_amount,
  depositStatus: s.deposit_status,
  identityVerified: s.identity_verified === 1,
  reviewNote: s.review_note,
  createdAt: s.created_at,
});

const findOwnStore = (userId: string) => one<StoreRow>(pool, 'SELECT * FROM stores WHERE owner_id = ?', [userId]);

export async function myStore(user: AuthUser) {
  const store = await findOwnStore(user.id);
  return store ? toStoreContext(store) : null;
}

/** The user's store, which must be ACTIVE (admin-verified) to sell. */
async function activeStore(user: AuthUser): Promise<StoreRow> {
  const store = await findOwnStore(user.id);
  if (!store) throw notFound('Toko');
  if (store.status !== 'ACTIVE') throw forbidden('Toko belum aktif — tunggu verifikasi admin.');
  return store;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'toko';

/** DFD 2.0 step 1: store profile → PENDING_DEPOSIT. No KYC provider — an admin verifies later. */
export async function openStore(
  user: AuthUser,
  input: { name: string; type: 'OWNER' | 'RESELLER'; ownerLegalName: string; description?: string },
) {
  if (await findOwnStore(user.id)) throw conflict('Kamu sudah punya toko.', 'STORE_EXISTS');
  const base = slugify(input.name);
  let slug = base;
  for (let n = 2; await one(pool, 'SELECT 1 FROM stores WHERE slug = ?', [slug]); n += 1) slug = `${base}-${n}`;
  await run(
    pool,
    `INSERT INTO stores (id, owner_id, slug, name, type, owner_legal_name, description, deposit_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), user.id, slug, input.name, input.type, input.ownerLegalName, input.description ?? null, STORE_DEPOSIT],
  );
  return myStore(user);
}

/** DFD 2.0 step 2: pay the Rp500.000 deposit via Midtrans. */
export async function payDeposit(user: AuthUser, method: GatewayMethod) {
  const store = await findOwnStore(user.id);
  if (!store) throw notFound('Toko');
  if (store.status !== 'PENDING_DEPOSIT') throw conflict('Deposit sudah dibayar.', 'BAD_STATE');
  const pending = await one<{ midtrans_order_id: string }>(
    pool,
    "SELECT midtrans_order_id FROM payments WHERE purpose = 'STORE_DEPOSIT' AND ref_id = ? AND status = 'PENDING'",
    [store.id],
  );
  const invoice = pending?.midtrans_order_id ?? documentNumber('DP');
  if (!pending) {
    await payments.recordPayment(pool, {
      invoice,
      purpose: 'STORE_DEPOSIT',
      refId: store.id,
      userId: user.id,
      amount: store.deposit_amount,
      method,
      customer: {},
    });
  }
  return { invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) };
}

// ── Catalogs (DFD 3.0) ──

interface CatalogRow {
  id: string;
  vs_code: string;
  title: string;
  game_slug: string;
  price: number;
  status: string;
  views: number;
  account_checked: number;
  created_at: string;
}

const toStoreCatalog = (c: CatalogRow) => ({
  id: c.id,
  vsCode: c.vs_code,
  title: c.title,
  game: c.game_slug,
  price: c.price,
  status: c.status,
  views: c.views,
  accountChecked: c.account_checked === 1,
  createdAt: c.created_at,
});

const CATALOG_SELECT = `SELECT c.id, c.vs_code, c.title, g.slug AS game_slug, c.price, c.status, c.views, c.account_checked, c.created_at
  FROM catalogs c JOIN games g ON g.id = c.game_id`;

export async function listCatalogs(user: AuthUser) {
  const store = await findOwnStore(user.id);
  if (!store) throw notFound('Toko');
  return (await all<CatalogRow>(pool, `${CATALOG_SELECT} WHERE c.store_id = ? ORDER BY c.created_at DESC`, [store.id])).map(toStoreCatalog);
}

export async function createCatalog(
  user: AuthUser,
  input: { gameSlug: string; title: string; price: number; description?: string; image?: string; images?: string[]; attributes?: Record<string, unknown> },
) {
  const store = await activeStore(user);
  const game = await findGameRow(pool, input.gameSlug);
  if (!game || game.supports_account !== 1) throw badRequest('Game tidak tersedia untuk jual akun.');
  const id = uuid();
  // The platform issues the VS code (UNIQUE); retry on the rare collision.
  for (let attempt = 0; ; attempt += 1) {
    try {
      await run(
        pool,
        `INSERT INTO catalogs (id, vs_code, store_id, game_id, title, description, price, status, image, images, attributes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'LISTED', ?, ?, ?)`,
        [
          id, vsCode(), store.id, game.id, input.title, input.description ?? null, input.price,
          input.image ?? input.images?.[0] ?? null, JSON.stringify(input.images ?? []), JSON.stringify(input.attributes ?? {}),
        ],
      );
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== 'ER_DUP_ENTRY' || attempt >= 3) throw error;
    }
  }
  const row = await one<CatalogRow>(pool, `${CATALOG_SELECT} WHERE c.id = ?`, [id]);
  return toStoreCatalog(row!);
}

/** Edit / delist / relist — only while no order is running on it. */
export async function updateCatalog(
  user: AuthUser,
  catalogId: string,
  input: { title?: string; price?: number; description?: string; status?: 'LISTED' | 'DELISTED' },
) {
  const store = await activeStore(user);
  const catalog = await one<{ status: string }>(pool, 'SELECT status FROM catalogs WHERE id = ? AND store_id = ?', [catalogId, store.id]);
  if (!catalog) throw notFound('Katalog');
  if (!['LISTED', 'DELISTED', 'DRAFT'].includes(catalog.status)) {
    throw conflict('Katalog sedang dalam transaksi atau sudah terjual.', 'BAD_STATE');
  }
  const sets: string[] = [];
  const params: SqlParam[] = [];
  if (input.title !== undefined) (sets.push('title = ?'), params.push(input.title));
  if (input.price !== undefined) (sets.push('price = ?'), params.push(input.price));
  if (input.description !== undefined) (sets.push('description = ?'), params.push(input.description));
  if (input.status !== undefined) (sets.push('status = ?'), params.push(input.status));
  if (sets.length > 0) await run(pool, `UPDATE catalogs SET ${sets.join(', ')} WHERE id = ?`, [...params, catalogId]);
  const row = await one<CatalogRow>(pool, `${CATALOG_SELECT} WHERE c.id = ?`, [catalogId]);
  return toStoreCatalog(row!);
}

// ── Orders, balance, withdrawals (DFD 7.0) ──

export async function ownStoreId(user: AuthUser): Promise<string> {
  const store = await findOwnStore(user.id);
  if (!store) throw notFound('Toko');
  return store.id;
}

export async function balance(user: AuthUser) {
  const storeId = await ownStoreId(user);
  const summary = await one<{ escrow: number; available: number }>(pool, 'SELECT escrow, available FROM store_balances WHERE store_id = ?', [storeId]);
  const ledger = await all<{ id: number; bucket: string; type: string; amount: number; balance_after: number; ref_type: string; ref_id: string; note: string | null; created_at: string }>(
    pool,
    'SELECT id, bucket, type, amount, balance_after, ref_type, ref_id, note, created_at FROM store_ledger WHERE store_id = ? ORDER BY id DESC LIMIT 100',
    [storeId],
  );
  return {
    escrow: summary?.escrow ?? 0,
    available: summary?.available ?? 0,
    ledger: ledger.map((l) => ({ ...l, id: String(l.id), balanceAfter: l.balance_after, refType: l.ref_type, refId: l.ref_id, createdAt: l.created_at })),
  };
}

interface WithdrawalRow {
  id: string;
  withdrawal_number: string;
  amount: number;
  fee: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  name_match: 'MATCH' | 'REVIEW' | 'MISMATCH';
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  review_note: string | null;
  created_at: string;
}

export const toWithdrawal = (w: WithdrawalRow) => ({
  id: w.withdrawal_number,
  amount: w.amount,
  fee: w.fee,
  bank: `${w.bank_name} •• ${w.account_number.slice(-4)}`,
  accountName: w.account_name,
  nameMatch: w.name_match,
  status: w.status,
  reviewNote: w.review_note,
  date: w.created_at,
});

export async function listWithdrawals(user: AuthUser) {
  const storeId = await ownStoreId(user);
  return (await all<WithdrawalRow>(pool, 'SELECT * FROM withdrawals WHERE store_id = ? ORDER BY created_at DESC LIMIT 100', [storeId])).map(toWithdrawal);
}

/** Debit now (WITHDRAW + WITHDRAW_FEE); an admin completes or rejects (reversal) it. Iris is simulated. */
export async function requestWithdrawal(
  user: AuthUser,
  input: { amount: number; bankName: string; accountNumber: string; accountName: string },
) {
  const store = await activeStore(user);
  const fee = WITHDRAW_FEE + BANK_TAX;
  if (input.amount <= fee) throw badRequest(`Minimal penarikan lebih dari ${fee.toLocaleString('id-ID')} (biaya).`);
  const nameMatch = matchName(input.accountName, store.owner_legal_name);
  if (nameMatch === 'MISMATCH') {
    throw badRequest('Nama pemilik rekening tidak cocok dengan nama pemilik toko yang terverifikasi.', 'NAME_MISMATCH');
  }
  const id = uuid();
  await withTransaction(async (conn) => {
    await run(
      conn,
      `INSERT INTO withdrawals (id, withdrawal_number, store_id, amount, fee, bank_name, account_number, account_name, name_match)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, documentNumber('WD'), store.id, input.amount, fee, input.bankName, input.accountNumber, input.accountName, nameMatch],
    );
    await moveStoreBalance(conn, store.id, [
      { bucket: 'AVAILABLE', type: 'WITHDRAW', amount: -(input.amount - fee), refType: 'withdrawal', refId: id },
      { bucket: 'AVAILABLE', type: 'WITHDRAW_FEE', amount: -fee, refType: 'withdrawal', refId: id },
    ]);
  });
  const row = await one<WithdrawalRow>(pool, 'SELECT * FROM withdrawals WHERE id = ?', [id]);
  return toWithdrawal(row!);
}
