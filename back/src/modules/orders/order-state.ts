// Small state helpers shared by orders, payments settlement, disputes and jobs.
import { run, type Db, type Tx } from '../../db/pool.js';

/** A SYSTEM line in the rekber room. */
export const systemMessage = (db: Db, orderId: string, body: string) =>
  run(db, `insert into rekber_messages (order_id, sender_id, sender_role, body) values ($1, null, 'SYSTEM', $2)`, [orderId, body]);

/** Moves every catalog of an order from one of `from` to `to`. */
export const setOrderCatalogs = (tx: Tx, orderId: string, from: string[], to: string) =>
  run(
    tx,
    `update catalogs set status = $1 where status = any($2::catalog_status[])
       and id in (select catalog_id from order_items where order_id = $3)`,
    [to, from, orderId],
  );

/** Unpaid order → CANCELLED, its catalogs back on sale. Returns false if it was no longer PENDING_PAYMENT. */
export async function cancelUnpaidOrder(tx: Tx, orderId: string, reason: string): Promise<boolean> {
  const changed = await run(
    tx,
    `update orders set status = 'CANCELLED', cancelled_at = now() where id = $1 and status = 'PENDING_PAYMENT'`,
    [orderId],
  );
  if (changed === 0) return false;
  await setOrderCatalogs(tx, orderId, ['LOCKED'], 'LISTED');
  await run(tx, `update payments set status = 'FAILED' where purpose = 'ORDER' and ref_id = $1 and status = 'PENDING'`, [orderId]);
  await systemMessage(tx, orderId, reason);
  return true;
}
