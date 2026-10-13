// Panel Admin (role ADMIN): Kelola Produk Top-Up (SKPL-F-02, DFD 2.0), Top-Up & Balance invoices and
// Analitik Top-Up (SKPL-F-06.3, DFD 6.0). Every product change is written to audit_logs.
import { Router, type Request } from 'express';
import { z } from 'zod';
import { topupRetailFor } from '../../config/money.js';
import { all, one, pool, run, type SqlParam } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notFound, parse } from '../../lib/errors.js';
import { requireAdmin } from '../../middlewares/auth.js';
import { listAllBalanceTx, listAllTopupTx } from '../topup/topup.repository.js';

export const adminRouter = Router();

const ipOf = (req: Request): string | null => req.ip ?? null;

// ── 2.1 Tampilkan Produk ──

interface ProductRow {
  id: string;
  game_id: number;
  game_name: string;
  name: string;
  amount_label: string;
  supplier_price: number;
  retail_price: number;
  section: 'SPECIAL' | 'INSTANT';
  icon: string | null;
  popular: boolean;
  is_active: boolean;
  sort_order: number;
  sold: number;
}

adminRouter.get('/admin/topup-products', async (req, res) => {
  requireAdmin(req);
  const [rows, games] = await Promise.all([
    all<ProductRow>(
      pool,
      `select p.id, p.game_id, g.name as game_name, p.name, p.amount_label, p.supplier_price, p.retail_price, p.section,
         p.icon, p.popular, p.is_active, p.sort_order,
         (select count(*)::int from topup_orders t where t.product_id = p.id and t.status = 'SUCCESS') as sold
       from topup_products p join games g on g.id = p.game_id order by g.sort_order, p.sort_order`,
    ),
    all<{ id: number; name: string }>(pool, 'select id, name from games order by sort_order, name'),
  ]);
  res.json({
    games,
    products: rows.map((p) => ({
      id: p.id,
      gameId: p.game_id,
      gameName: p.game_name,
      name: p.name,
      amountLabel: p.amount_label,
      supplierPrice: p.supplier_price,
      retailPrice: p.retail_price,
      margin: p.retail_price - p.supplier_price,
      section: p.section,
      icon: p.icon,
      popular: p.popular,
      isActive: p.is_active,
      sortOrder: p.sort_order,
      sold: p.sold,
    })),
  });
});

// ── 2.2 Tambah Produk ──

const productIdParam = z.string().regex(/^[a-z0-9-]{2,36}$/, 'id: huruf kecil, angka, minus');

const productFields = {
  gameId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  amountLabel: z.string().trim().min(1).max(60),
  supplierPrice: z.number().int().positive().max(100_000_000),
  retailPrice: z.number().int().positive().max(100_000_000),
  section: z.enum(['SPECIAL', 'INSTANT']),
  icon: z
    .string()
    .trim()
    .regex(/^\/images\/[a-z0-9/_.-]+$/, 'ikon harus dari /images/')
    .nullable(),
  popular: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
};

const PRODUCT_COLUMNS: Record<keyof typeof productFields, string> = {
  gameId: 'game_id',
  name: 'name',
  amountLabel: 'amount_label',
  supplierPrice: 'supplier_price',
  retailPrice: 'retail_price',
  section: 'section',
  icon: 'icon',
  popular: 'popular',
  isActive: 'is_active',
  sortOrder: 'sort_order',
};

function assertMargin(supplierPrice: number, retailPrice: number) {
  if (retailPrice < supplierPrice) throw badRequest('Harga jual tidak boleh di bawah harga modal Digiflazz.', 'BELOW_COST');
}

adminRouter.post('/admin/topup-products', async (req, res) => {
  const user = requireAdmin(req);
  const p = parse(
    z
      .object({ id: productIdParam, ...productFields })
      .partial({ retailPrice: true, section: true, icon: true, popular: true, isActive: true, sortOrder: true })
      .strict(),
    req.body,
  );
  // MONEY_RULES §2: no retail price → Digiflazz price + 3%; never below cost.
  const retailPrice = p.retailPrice ?? topupRetailFor(p.supplierPrice);
  assertMargin(p.supplierPrice, retailPrice);
  await run(
    pool,
    `insert into topup_products (id, game_id, name, amount_label, supplier_price, retail_price, section, icon, popular, is_active, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [p.id, p.gameId, p.name, p.amountLabel, p.supplierPrice, retailPrice, p.section ?? 'INSTANT', p.icon ?? null, p.popular ?? false, p.isActive ?? true, p.sortOrder ?? 0],
  );
  await audit(pool, { actorId: user.id, action: 'topup_product.create', targetType: 'topup_product', targetId: p.id, detail: { ...p, retailPrice }, ip: ipOf(req) });
  res.status(201).json({ ok: true });
});

// ── 2.3 Ubah / Nonaktifkan Produk ──

adminRouter.patch('/admin/topup-products/:id', async (req, res) => {
  const user = requireAdmin(req);
  const id = parse(productIdParam, req.params.id);
  const input = parse(z.object(productFields).partial().strict(), req.body);
  if (input.supplierPrice !== undefined || input.retailPrice !== undefined) {
    const current = await one<{ supplier_price: number; retail_price: number }>(pool, 'select supplier_price, retail_price from topup_products where id = $1', [id]);
    if (!current) throw notFound('Produk');
    // A new cost without a retail price re-applies the margin rule.
    if (input.supplierPrice !== undefined && input.retailPrice === undefined) input.retailPrice = topupRetailFor(input.supplierPrice);
    assertMargin(input.supplierPrice ?? current.supplier_price, input.retailPrice ?? current.retail_price);
  }
  const sets: string[] = [];
  const params: SqlParam[] = [];
  for (const [key, column] of Object.entries(PRODUCT_COLUMNS) as [keyof typeof productFields, string][]) {
    const value = input[key];
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) throw badRequest('Tidak ada perubahan.');
  if ((await run(pool, `update topup_products set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
    throw notFound('Produk');
  }
  await audit(pool, { actorId: user.id, action: 'topup_product.update', targetType: 'topup_product', targetId: id, detail: input, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── 2.4 Hapus Produk: only while no invoice refers to it; otherwise deactivate ──

adminRouter.delete('/admin/topup-products/:id', async (req, res) => {
  const user = requireAdmin(req);
  const id = parse(productIdParam, req.params.id);
  const product = await one<{ name: string; amount_label: string }>(pool, 'select name, amount_label from topup_products where id = $1', [id]);
  if (!product) throw notFound('Produk');
  if (await one(pool, 'select 1 from topup_orders where product_id = $1 limit 1', [id])) {
    throw conflict('Produk sudah pernah dipesan, nonaktifkan saja agar riwayat invoice tetap utuh.', 'PRODUCT_IN_USE');
  }
  await run(pool, 'delete from topup_products where id = $1', [id]);
  await audit(pool, { actorId: user.id, action: 'topup_product.delete', targetType: 'topup_product', targetId: id, detail: product, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Top-Up & Balance invoices ──

adminRouter.get('/admin/topups', async (req, res) => {
  requireAdmin(req);
  const q = parse(
    z.object({ q: z.string().trim().max(80).optional(), status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED']).optional() }).strict(),
    req.query,
  );
  const [topups, balanceFills] = await Promise.all([listAllTopupTx(pool, q.q, q.status), listAllBalanceTx(pool, q.q)]);
  res.json({ topups, balanceFills });
});

// ── Analitik Top-Up per game account ──

adminRouter.get('/admin/analytics', async (req, res) => {
  requireAdmin(req);
  const [summary, accounts] = await Promise.all([
    one<{ total_revenue: number; total_transactions: number; unique_accounts: number; avg_ticket: number }>(
      pool,
      `select coalesce(sum(amount), 0)::bigint as total_revenue, count(*)::int as total_transactions,
              count(distinct user_game_id || '|' || coalesce(game_zone_id, ''))::int as unique_accounts,
              coalesce(round(avg(amount)), 0)::bigint as avg_ticket
       from topup_orders where status = 'SUCCESS'`,
    ),
    all(
      pool,
      `select user_game_id, game_zone_id, count(*)::int as topup_count, sum(amount)::bigint as total_spent,
              round(avg(amount))::bigint as avg_spent, min(created_at) as first_topup_at, max(created_at) as last_topup_at,
              bool_or(user_id is not null) as linked_to_user
       from topup_orders where status = 'SUCCESS'
       group by user_game_id, game_zone_id order by total_spent desc, topup_count desc limit 100`,
    ),
  ]);
  res.json({
    summary: {
      totalRevenue: summary?.total_revenue ?? 0,
      totalTransactions: summary?.total_transactions ?? 0,
      uniqueAccounts: summary?.unique_accounts ?? 0,
      avgTicket: summary?.avg_ticket ?? 0,
    },
    accounts,
  });
});
