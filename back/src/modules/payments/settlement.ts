// What a final payment result does to the invoice it pays for (docs/ARCHITECTURE.md §5.2,
// DFD 4.4 / 5.3). Always runs inside the payment's transaction, after the payments row was
// locked and moved out of PENDING.
import { one, run, type Tx } from '../../db/pool.js';
import { moveUserBalance, rewardReferral } from '../../lib/ledger.js';
import type { PaymentRow } from './payments.service.js';

type Final = 'PAID' | 'FAILED' | 'EXPIRED';

export async function settle(tx: Tx, payment: PaymentRow, result: Final) {
  if (payment.purpose === 'TOPUP') return settleTopup(tx, payment, result);
  return settleBalanceFill(tx, payment, result);
}

async function settleTopup(tx: Tx, payment: PaymentRow, result: Final) {
  const order = await one<{ id: string; status: string; promo_code_id: number | null; user_id: string | null; invoice_number: string }>(
    tx,
    'select id, status, promo_code_id, user_id, invoice_number from topup_orders where id = $1 for update',
    [payment.ref_id],
  );
  if (!order || order.status !== 'PENDING') return;
  if (result !== 'PAID') {
    await run(tx, 'update topup_orders set status = $1 where id = $2', [result, order.id]);
    return;
  }
  // Game-currency delivery is SIMULATED (Digiflazz in the full design): paid → SUCCESS.
  await run(tx, `update topup_orders set status = 'SUCCESS', paid_at = now() where id = $1`, [order.id]);
  if (order.promo_code_id) await run(tx, 'update promo_codes set used_count = used_count + 1 where id = $1', [order.promo_code_id]);
  if (order.user_id) await rewardReferral(tx, order.user_id, order.invoice_number);
}

/** DFD 5.3 Tambah Saldo: the Balance grows only here, after the voucher payment is PAID. */
async function settleBalanceFill(tx: Tx, payment: PaymentRow, result: Final) {
  const fill = await one<{ id: string; user_id: string; credit: number; status: string; invoice_number: string }>(
    tx,
    'select id, user_id, credit, status, invoice_number from balance_topups where id = $1 for update',
    [payment.ref_id],
  );
  if (!fill || fill.status !== 'PENDING') return;
  if (result !== 'PAID') {
    await run(tx, 'update balance_topups set status = $1 where id = $2', [result, fill.id]);
    return;
  }
  await run(tx, `update balance_topups set status = 'PAID', paid_at = now() where id = $1`, [fill.id]);
  await moveUserBalance(tx, fill.user_id, { type: 'TOPUP_CREDIT', amount: fill.credit, reference: fill.invoice_number });
}
