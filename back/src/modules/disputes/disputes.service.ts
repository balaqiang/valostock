// Disputes (docs/STORE_RULES.md, ADMIN_PANEL.md §3.6): opened by the buyer while the
// escrow is held (PAID/IN_REKBER/SAFE) or during the protection window after
// completion. The store answers within 72 h; an admin decides.
import { DISPUTE_STORE_HOURS } from '../../config/money.js';
import { all, json, one, pool, run, withTransaction, type Tx } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { notify, notifyStore } from '../../lib/notify.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { PRIVATE_BUCKET, removeObjects, signedUrls, uploadObject } from '../../supabase/storage.js';
import { setOrderCatalogs, systemMessage } from '../orders/order-state.js';
import { completeOrderTx, getOrderFor } from '../orders/orders.service.js';

const EVIDENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'application/pdf'];
export type DisputeReason = 'NOT_DELIVERED' | 'NOT_AS_DESCRIBED' | 'RECALLED' | 'OTHER';

interface DisputeRow {
  id: string;
  order_id: string;
  opened_by: string;
  reason: DisputeReason;
  description: string;
  status: string;
  store_deadline: string;
  opened_after_completion: boolean;
  refund_amount: number;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  order_number: string;
  order_status: string;
  buyer_id: string;
  buyer_name: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_owner_id: string;
  item_price: number;
  total_paid: number;
}

export const DISPUTE_SELECT = `select d.*, o.order_number, o.status as order_status, o.buyer_id, o.store_id, o.item_price, o.total_paid,
    p.name as buyer_name, s.name as store_name, s.slug as store_slug, s.owner_id as store_owner_id
  from disputes d join orders o on o.id = d.order_id join profiles p on p.id = o.buyer_id join stores s on s.id = o.store_id`;

export const toDisputeSummary = (d: DisputeRow) => ({
  id: d.id,
  orderId: d.order_id,
  orderNumber: d.order_number,
  reason: d.reason,
  description: d.description,
  status: d.status,
  storeDeadline: d.store_deadline,
  overdue: d.status === 'OPEN' && new Date(d.store_deadline).getTime() < Date.now(),
  openedAfterCompletion: d.opened_after_completion,
  refundAmount: d.refund_amount,
  resolutionNote: d.resolution_note,
  resolvedAt: d.resolved_at,
  createdAt: d.created_at,
  buyer: { name: d.buyer_name },
  store: { name: d.store_name, slug: d.store_slug },
  itemPrice: d.item_price,
  totalPaid: d.total_paid,
});

async function uploadEvidence(disputeKey: string, files: { buffer: Buffer }[]) {
  const paths: string[] = [];
  try {
    for (const file of files) paths.push(await uploadObject(PRIVATE_BUCKET, `disputes/${disputeKey}`, file, EVIDENCE_TYPES));
  } catch (error) {
    await removeObjects(PRIVATE_BUCKET, paths).catch(() => undefined);
    throw error;
  }
  return paths;
}

export async function openDispute(user: AuthUser, orderId: string, input: { reason: DisputeReason; description: string }, files: { buffer: Buffer }[]) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  const paths = await uploadEvidence(order.id, files);
  try {
    return await withTransaction(async (tx) => {
      const o = await one<{ status: string; protection_until: string | null }>(tx, 'select status, protection_until from orders where id = $1 for update', [order.id]);
      const beforeCompletion = ['PAID', 'IN_REKBER', 'SAFE'].includes(o!.status);
      const inProtection = o!.status === 'COMPLETED' && o!.protection_until !== null && new Date(o!.protection_until).getTime() > Date.now();
      if (!beforeCompletion && !inProtection) throw conflict('Sengketa hanya bisa dibuka saat dana masih ditahan atau selama masa proteksi.', 'BAD_STATE');
      if (await one(tx, 'select 1 from disputes where order_id = $1', [order.id])) throw conflict('Pesanan ini sudah punya sengketa.', 'DISPUTE_EXISTS');
      const d = await one<{ id: string }>(
        tx,
        `insert into disputes (order_id, opened_by, reason, description, store_deadline, opened_after_completion)
         values ($1, $2, $3, $4, now() + make_interval(hours => $5), $6) returning id`,
        [order.id, user.id, input.reason, input.description, DISPUTE_STORE_HOURS, !beforeCompletion],
      );
      await run(tx, `insert into dispute_events (dispute_id, actor_id, actor_role, type, body, attachments) values ($1, $2, 'BUYER', 'OPENED', $3, $4)`, [
        d!.id,
        user.id,
        input.description,
        json(paths),
      ]);
      if (beforeCompletion) await run(tx, `update orders set status = 'DISPUTED' where id = $1`, [order.id]);
      await systemMessage(tx, order.id, `Pembeli membuka sengketa. Dana tetap ditahan. Toko wajib menanggapi dalam ${DISPUTE_STORE_HOURS} jam.`);
      await notifyStore(tx, order.store_id, {
        kind: 'ORDER',
        title: 'Sengketa dibuka',
        body: `${order.order_number}: tanggapi dalam ${DISPUTE_STORE_HOURS} jam dengan pernyataan dan bukti.`,
        link: `/disputes/${d!.id}`,
      });
      return d!.id;
    });
  } catch (error) {
    await removeObjects(PRIVATE_BUCKET, paths).catch(() => undefined);
    throw error;
  }
}

async function loadDispute(id: string) {
  const d = await one<DisputeRow>(pool, `${DISPUTE_SELECT} where d.id = $1`, [id]);
  if (!d) throw notFound('Sengketa');
  return d;
}

function roleIn(user: AuthUser, d: DisputeRow): 'BUYER' | 'STORE' | 'ADMIN' | null {
  if (d.buyer_id === user.id) return 'BUYER';
  if (d.store_owner_id === user.id) return 'STORE';
  if (user.role === 'ADMIN') return 'ADMIN';
  return null;
}

export async function disputeDetail(user: AuthUser, id: string) {
  const d = await loadDispute(id);
  const role = roleIn(user, d);
  if (!role) throw notFound('Sengketa');
  const events = await all<{ id: number; actor_role: string; actor_name: string | null; type: string; body: string; attachments: string[]; created_at: string }>(
    pool,
    `select e.id, e.actor_role, p.name as actor_name, e.type, e.body, e.attachments, e.created_at
     from dispute_events e left join profiles p on p.id = e.actor_id where e.dispute_id = $1 order by e.id`,
    [id],
  );
  const urls = new Map((await signedUrls(events.flatMap((e) => e.attachments))).map((u) => [u.path, u.url]));
  return {
    dispute: toDisputeSummary(d),
    viewerRole: role,
    events: events.map((e) => ({
      id: e.id,
      actorRole: e.actor_role,
      actorName: e.actor_role === 'ADMIN' ? 'Admin valostock' : e.actor_role === 'SYSTEM' ? 'Sistem' : (e.actor_name ?? '-'),
      type: e.type,
      body: e.body,
      attachments: e.attachments.map((path) => ({ path, url: urls.get(path) ?? null })),
      createdAt: e.created_at,
    })),
  };
}

const OPEN_STATES = ['OPEN', 'STORE_RESPONDED', 'IN_REVIEW'];

/** A statement / evidence from the buyer, the store, or an admin note. */
export async function addEvent(user: AuthUser, id: string, body: string, files: { buffer: Buffer }[], adminAllowed: boolean) {
  const d = await loadDispute(id);
  const role = roleIn(user, d);
  if (!role || (role === 'ADMIN' && !adminAllowed)) throw notFound('Sengketa');
  if (!OPEN_STATES.includes(d.status)) throw conflict('Sengketa sudah selesai.', 'BAD_STATE');
  const paths = await uploadEvidence(d.order_id, files);
  try {
    await withTransaction(async (tx) => {
      const type = role === 'ADMIN' ? 'ADMIN_NOTE' : paths.length > 0 ? 'EVIDENCE' : 'STATEMENT';
      await run(tx, 'insert into dispute_events (dispute_id, actor_id, actor_role, type, body, attachments) values ($1, $2, $3, $4, $5, $6)', [
        id,
        user.id,
        role,
        type,
        body,
        json(paths),
      ]);
      if (role === 'STORE' && d.status === 'OPEN') await run(tx, `update disputes set status = 'STORE_RESPONDED' where id = $1`, [id]);
      if (role === 'ADMIN' && d.status !== 'IN_REVIEW') await run(tx, `update disputes set status = 'IN_REVIEW' where id = $1`, [id]);
      const link = `/disputes/${id}`;
      if (role !== 'BUYER') await notify(tx, d.buyer_id, { kind: 'ORDER', title: 'Update sengketa', body: `${d.order_number}: ${body.slice(0, 120)}`, link });
      if (role !== 'STORE') await notifyStore(tx, d.store_id, { kind: 'ORDER', title: 'Update sengketa', body: `${d.order_number}: ${body.slice(0, 120)}`, link });
    });
  } catch (error) {
    await removeObjects(PRIVATE_BUCKET, paths).catch(() => undefined);
    throw error;
  }
}

/** Buyer withdraws the dispute: the order continues where it was. */
export async function cancelDispute(user: AuthUser, id: string) {
  const d = await loadDispute(id);
  if (d.buyer_id !== user.id) throw notFound('Sengketa');
  await withTransaction(async (tx) => {
    const changed = await run(tx, `update disputes set status = 'CANCELLED', resolved_at = now() where id = $1 and status = any($2::dispute_status[])`, [
      id,
      OPEN_STATES,
    ]);
    if (changed === 0) throw conflict('Sengketa sudah selesai.', 'BAD_STATE');
    await restoreOrderAfterDispute(tx, d.order_id);
    await run(tx, `insert into dispute_events (dispute_id, actor_id, actor_role, type, body) values ($1, $2, 'BUYER', 'RESOLVED', 'Sengketa dibatalkan pembeli.')`, [
      id,
      user.id,
    ]);
    await notifyStore(tx, d.store_id, { kind: 'ORDER', title: 'Sengketa dibatalkan', body: d.order_number, link: `/store-dashboard/orders/${d.order_id}` });
  });
}

/** DISPUTED → back to the step it was on (derived from the timestamps). */
async function restoreOrderAfterDispute(tx: Tx, orderId: string) {
  await run(
    tx,
    `update orders set status = case when safe_at is not null then 'SAFE'::order_status
                                     when delivered_at is not null then 'IN_REKBER'::order_status
                                     else 'PAID'::order_status end
     where id = $1 and status = 'DISPUTED'`,
    [orderId],
  );
}

export interface Resolution {
  winner: 'BUYER' | 'STORE';
  note: string;
  /** After completion only: compensation taken from the store (default = item price). */
  compensation?: number;
  sanction?: { type: 'WARNING' | 'SUSPEND' | 'FINE'; amount?: number; reason?: string };
}

/** Admin verdict (disputes:resolve). Money moves only through the store ledger. */
export async function resolveDispute(admin: AuthUser, id: string, r: Resolution, ip: string | undefined) {
  await withTransaction(async (tx) => {
    const d = await one<DisputeRow>(tx, `${DISPUTE_SELECT} where d.id = $1 for update of d`, [id]);
    if (!d) throw notFound('Sengketa');
    if (!OPEN_STATES.includes(d.status)) throw conflict('Sengketa sudah diputus.', 'BAD_STATE');
    let refund = 0;

    if (r.winner === 'BUYER') {
      if (!d.opened_after_completion) {
        // Escrow still held → refund the buyer (Midtrans refund simulated), accounts back on sale.
        await moveStoreBalance(tx, d.store_id, [
          { bucket: 'ESCROW', type: 'REFUND', amount: -d.item_price, refType: 'dispute', refId: d.id, note: `Refund ${d.order_number}` },
        ]);
        await run(tx, `update orders set status = 'REFUNDED' where id = $1`, [d.order_id]);
        await setOrderCatalogs(tx, d.order_id, ['IN_ORDER'], 'LISTED');
        refund = d.total_paid;
        await systemMessage(tx, d.order_id, `Sengketa dimenangkan pembeli. Dana Rp${refund.toLocaleString('id-ID')} dikembalikan (refund Midtrans disimulasikan).`);
      } else {
        // After completion → compensation from the store's available balance; the rest is owed from the deposit.
        const want = r.compensation ?? d.item_price;
        if (want <= 0 || want > d.total_paid) throw badRequest('Nilai kompensasi tidak valid.');
        const bal = await one<{ available: number }>(tx, 'select available from store_balances where store_id = $1', [d.store_id]);
        const fromBalance = Math.min(want, bal?.available ?? 0);
        if (fromBalance > 0) {
          await moveStoreBalance(tx, d.store_id, [
            { bucket: 'AVAILABLE', type: 'COMPENSATION', amount: -fromBalance, refType: 'dispute', refId: d.id, note: `Kompensasi ${d.order_number}` },
          ]);
        }
        if (want > fromBalance) {
          await run(tx, `insert into store_sanctions (store_id, type, amount, reason, created_by) values ($1, 'FINE', $2, $3, $4)`, [
            d.store_id,
            want - fromBalance,
            `Sisa kompensasi ${d.order_number} dipotong dari deposit`,
            admin.id,
          ]);
        }
        refund = want;
        await systemMessage(tx, d.order_id, `Sengketa dimenangkan pembeli. Kompensasi Rp${want.toLocaleString('id-ID')} dibayarkan (disimulasikan).`);
      }
    } else if (!d.opened_after_completion) {
      await restoreOrderAfterDispute(tx, d.order_id);
      await completeOrderTx(tx, d.order_id, 'ADMIN', ['PAID', 'IN_REKBER', 'SAFE']);
    }

    await run(
      tx,
      `update disputes set status = $1, refund_amount = $2, resolution_note = $3, resolved_by = $4, resolved_at = now() where id = $5`,
      [r.winner === 'BUYER' ? 'RESOLVED_BUYER' : 'RESOLVED_STORE', refund, r.note, admin.id, id],
    );
    await run(tx, `insert into dispute_events (dispute_id, actor_id, actor_role, type, body) values ($1, $2, 'ADMIN', 'RESOLVED', $3)`, [
      id,
      admin.id,
      `Putusan: ${r.winner === 'BUYER' ? 'pembeli' : 'toko'} menang. ${r.note}`,
    ]);

    if (r.sanction) {
      await run(tx, 'insert into store_sanctions (store_id, type, amount, reason, created_by) values ($1, $2, $3, $4, $5)', [
        d.store_id,
        r.sanction.type,
        r.sanction.amount ?? 0,
        r.sanction.reason ?? `Sengketa ${d.order_number}`,
        admin.id,
      ]);
      if (r.sanction.type === 'SUSPEND') await run(tx, `update stores set status = 'SUSPENDED', review_note = $1 where id = $2`, [r.sanction.reason ?? r.note, d.store_id]);
    }

    await audit(tx, { actorId: admin.id, action: 'dispute.resolve', targetType: 'dispute', targetId: id, detail: { ...r, refund }, ip });
    const verdict = r.winner === 'BUYER' ? 'dimenangkan pembeli' : 'dimenangkan toko';
    await notify(tx, d.buyer_id, { kind: 'ORDER', title: `Sengketa ${verdict}`, body: `${d.order_number}: ${r.note}`, link: `/disputes/${id}` });
    await notifyStore(tx, d.store_id, { kind: 'ORDER', title: `Sengketa ${verdict}`, body: `${d.order_number}: ${r.note}`, link: `/disputes/${id}` });
  });
}
