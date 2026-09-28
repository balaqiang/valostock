// What a final payment result does to the business record it pays for
// (docs/ARCHITECTURE.md §5, DFD 4.0 / 6.0). Always runs inside the payment's
// transaction, after the payments row was locked and moved out of PENDING.
import type { PoolConnection } from 'mysql2/promise';
import { one, run } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { uuid } from '../../lib/ids.js';
import { moveStoreBalance, moveUserBalance } from '../../lib/ledger.js';
import type { PaymentRow } from './payments.repository.js';

type Final = 'PAID' | 'FAILED' | 'EXPIRED';

export async function settle(conn: PoolConnection, payment: PaymentRow, result: Final) {
  switch (payment.purpose) {
    case 'TOPUP':
      return settleTopup(conn, payment, result);
    case 'BALANCE_FILL':
      return settleBalanceFill(conn, payment, result);
    case 'ORDER':
      return settleOrder(conn, payment, result);
    case 'STORE_DEPOSIT':
      return settleDeposit(conn, payment, result);
  }
}

async function settleTopup(conn: PoolConnection, payment: PaymentRow, result: Final) {
  const order = await one<{ id: string; status: string; promo_code_id: number | null }>(
    conn,
    'SELECT id, status, promo_code_id FROM topup_orders WHERE id = ? FOR UPDATE',
    [payment.ref_id],
  );
  if (!order || order.status !== 'PENDING') return;
  if (result === 'PAID') {
    // Game-currency delivery is SIMULATED in the prototype (Digiflazz in the full design).
    await run(
      conn,
      "UPDATE topup_orders SET status = 'SUCCESS', paid_at = UTC_TIMESTAMP(), provider_ref = ? WHERE id = ?",
      [`SIM-${uuid().slice(0, 8).toUpperCase()}`, order.id],
    );
    if (order.promo_code_id) {
      await run(conn, 'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?', [order.promo_code_id]);
    }
  } else {
    await run(conn, 'UPDATE topup_orders SET status = ? WHERE id = ?', [result, order.id]);
  }
}

async function settleBalanceFill(conn: PoolConnection, payment: PaymentRow, result: Final) {
  const fill = await one<{ id: string; user_id: string; credit: number; status: string; invoice_number: string }>(
    conn,
    'SELECT id, user_id, credit, status, invoice_number FROM balance_topups WHERE id = ? FOR UPDATE',
    [payment.ref_id],
  );
  if (!fill || fill.status !== 'PENDING') return;
  if (result === 'PAID') {
    await run(conn, "UPDATE balance_topups SET status = 'PAID', paid_at = UTC_TIMESTAMP() WHERE id = ?", [fill.id]);
    await moveUserBalance(conn, fill.user_id, { type: 'TOPUP_CREDIT', amount: fill.credit, reference: fill.invoice_number });
  } else {
    await run(conn, 'UPDATE balance_topups SET status = ? WHERE id = ?', [result, fill.id]);
  }
}

async function settleOrder(conn: PoolConnection, payment: PaymentRow, result: Final) {
  const order = await one<{ id: string; status: string; catalog_id: string; store_id: string; item_price: number; room_code: string }>(
    conn,
    'SELECT id, status, catalog_id, store_id, item_price, room_code FROM orders WHERE id = ? FOR UPDATE',
    [payment.ref_id],
  );
  if (!order) return;
  if (order.status !== 'PENDING_PAYMENT') {
    if (result === 'PAID') {
      // Paid after the order was cancelled: needs a manual refund in the full design.
      await audit(conn, { actorId: null, action: 'payment.paid_after_cancel', targetType: 'order', targetId: order.id, detail: { invoice: payment.midtrans_order_id } });
    }
    return;
  }
  if (result === 'PAID') {
    await run(conn, "UPDATE orders SET status = 'PAID', paid_at = UTC_TIMESTAMP(), payment_method = ? WHERE id = ?", [
      payment.payment_method,
      order.id,
    ]);
    await run(conn, "UPDATE catalogs SET status = 'IN_ORDER' WHERE id = ?", [order.catalog_id]);
    await moveStoreBalance(conn, order.store_id, [
      { bucket: 'ESCROW', type: 'ESCROW_HOLD', amount: order.item_price, refType: 'order', refId: order.id },
    ]);
    await run(conn, "INSERT INTO rekber_messages (order_id, sender_id, sender_role, body) VALUES (?, NULL, 'SYSTEM', ?)", [
      order.id,
      `Pembayaran diterima. Rekber Room ${order.room_code} dibuka — dana ditahan (escrow) sampai pembeli menekan Selesai. Toko, silakan kirim data akun di sini.`,
    ]);
  } else {
    await run(conn, "UPDATE orders SET status = 'CANCELLED', cancelled_at = UTC_TIMESTAMP() WHERE id = ?", [order.id]);
    await run(conn, "UPDATE catalogs SET status = 'LISTED' WHERE id = ? AND status = 'LOCKED'", [order.catalog_id]);
  }
}

async function settleDeposit(conn: PoolConnection, payment: PaymentRow, result: Final) {
  if (result !== 'PAID') return; // the store can simply try again
  await run(
    conn,
    "UPDATE stores SET deposit_status = 'HELD', status = 'PENDING_REVIEW' WHERE id = ? AND status = 'PENDING_DEPOSIT'",
    [payment.ref_id],
  );
}
