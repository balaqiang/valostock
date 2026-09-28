// Account purchase with escrow and rekber (DFD 6.0). State machine:
// PENDING_PAYMENT → PAID → IN_REKBER → SAFE → COMPLETED, or → CANCELLED before payment.
import { COMMISSION_RATE, PROTECTION_FEE, commissionFor, handlingFeeFor, type GatewayMethod } from '../../config/money.js';
import { one, parseJson, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { documentNumber, uuid } from '../../lib/ids.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import type { AuthUser } from '../../middlewares/auth.js';
import * as payments from '../payments/payments.service.js';
import * as repo from './orders.repository.js';

export type ViewerRole = 'BUYER' | 'STORE' | 'ADMIN';

function roleOf(user: AuthUser, order: repo.OrderRow): ViewerRole | null {
  if (order.buyer_id === user.id) return 'BUYER';
  if (order.store_owner_id === user.id) return 'STORE';
  if (user.role === 'ADMIN') return 'ADMIN';
  return null;
}

export function toOrderView(order: repo.OrderRow, viewer: ViewerRole) {
  const images = parseJson<string[]>(order.catalog_images, []);
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    viewerRole: viewer,
    catalog: {
      id: order.catalog_id,
      title: order.catalog_title,
      image: order.catalog_image ?? images[0] ?? '/images/Valorant_Points.png',
      game: order.game_slug,
    },
    store: { slug: order.store_slug, name: order.store_name },
    buyer: { name: order.buyer_name },
    roomCode: order.room_code,
    itemPrice: order.item_price,
    handlingFee: order.handling_fee,
    protectionFee: order.protection_fee,
    totalPaid: order.total_paid,
    commissionRate: order.commission_rate,
    commission: order.commission,
    storeReceives: order.store_receives,
    paymentMethod: order.payment_method,
    payment: order.payment_invoice
      ? { invoice: order.payment_invoice, status: order.payment_status, redirectUrl: order.payment_redirect }
      : null,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    safeAt: order.safe_at,
    completedAt: order.completed_at,
    cancelledAt: order.cancelled_at,
  };
}

/** Loads an order the user may see (buyer, owner of its store, or admin) — anti-IDOR. */
export async function getOrderFor(user: AuthUser, orderId: string) {
  const order = await repo.findOrder(pool, orderId);
  if (!order) throw notFound('Pesanan');
  const role = roleOf(user, order);
  if (!role) throw notFound('Pesanan'); // don't reveal that the id exists
  return { order, role };
}

export async function listMine(user: AuthUser) {
  return (await repo.listBuyerOrders(pool, user.id)).map((order) => toOrderView(order, 'BUYER'));
}

/** DFD 6.1: create the order and lock the catalog (anti double-sell). */
export async function createOrder(user: AuthUser, catalogId: string) {
  const orderId = await withTransaction(async (conn) => {
    const catalog = await one<{ id: string; vs_code: string; price: number; status: string; store_id: string; store_status: string; owner_id: string }>(
      conn,
      `SELECT c.id, c.vs_code, c.price, c.status, c.store_id, s.status AS store_status, s.owner_id
       FROM catalogs c JOIN stores s ON s.id = c.store_id WHERE c.id = ? FOR UPDATE`,
      [catalogId],
    );
    if (!catalog || catalog.store_status !== 'ACTIVE') throw notFound('Katalog');
    if (catalog.owner_id === user.id) throw badRequest('Tidak bisa membeli katalog tokomu sendiri.');

    // The same buyer clicking "Beli" again gets their open order back.
    const open = await one<{ id: string }>(
      conn,
      "SELECT id FROM orders WHERE catalog_id = ? AND buyer_id = ? AND status = 'PENDING_PAYMENT'",
      [catalog.id, user.id],
    );
    if (open) return open.id;
    if (catalog.status !== 'LISTED') throw conflict('Akun ini sedang dalam transaksi lain atau sudah terjual.', 'CATALOG_UNAVAILABLE');

    const handling = handlingFeeFor(catalog.price);
    const commission = commissionFor(catalog.price, COMMISSION_RATE);
    const id = uuid();
    await run(
      conn,
      `INSERT INTO orders (id, order_number, catalog_id, buyer_id, store_id, item_price, handling_fee, protection_fee,
         total_paid, commission_rate, commission, store_receives, room_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, documentNumber('ORD'), catalog.id, user.id, catalog.store_id, catalog.price, handling, PROTECTION_FEE,
        catalog.price + handling + PROTECTION_FEE, COMMISSION_RATE, commission, catalog.price - commission, catalog.vs_code,
      ],
    );
    await run(conn, "UPDATE catalogs SET status = 'LOCKED' WHERE id = ?", [catalog.id]);
    return id;
  });
  const { order } = await getOrderFor(user, orderId);
  return toOrderView(order, 'BUYER');
}

/** Start (or resume) the Midtrans payment of an order. */
export async function payOrder(user: AuthUser, orderId: string, method: GatewayMethod) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  if (order.status !== 'PENDING_PAYMENT') throw conflict('Pesanan ini tidak menunggu pembayaran.', 'BAD_STATE');

  const pending = await one<{ midtrans_order_id: string }>(
    pool,
    "SELECT midtrans_order_id FROM payments WHERE purpose = 'ORDER' AND ref_id = ? AND status = 'PENDING'",
    [order.id],
  );
  const invoice = pending?.midtrans_order_id ?? order.order_number;
  if (!pending) {
    await payments.recordPayment(pool, {
      invoice,
      purpose: 'ORDER',
      refId: order.id,
      userId: user.id,
      amount: order.total_paid,
      method,
      customer: {},
    });
  }
  const payment = await payments.openPaymentPage(invoice, { name: user.name, email: user.email });
  return { invoice, payment };
}

export async function cancelOrder(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  await withTransaction(async (conn) => {
    const locked = await one<{ status: string }>(conn, 'SELECT status FROM orders WHERE id = ? FOR UPDATE', [order.id]);
    if (locked?.status !== 'PENDING_PAYMENT') throw conflict('Pesanan yang sudah dibayar tidak bisa dibatalkan.', 'BAD_STATE');
    await run(conn, "UPDATE orders SET status = 'CANCELLED', cancelled_at = UTC_TIMESTAMP() WHERE id = ?", [order.id]);
    await run(conn, "UPDATE catalogs SET status = 'LISTED' WHERE id = ? AND status = 'LOCKED'", [order.catalog_id]);
    await run(conn, "UPDATE payments SET status = 'FAILED' WHERE purpose = 'ORDER' AND ref_id = ? AND status = 'PENDING'", [order.id]);
  });
}

// ── Rekber room (DFD 6.3) ──

const REKBER_OPEN = new Set<repo.OrderStatus>(['PAID', 'IN_REKBER', 'SAFE', 'COMPLETED']);

export async function listMessages(user: AuthUser, orderId: string) {
  const { order } = await getOrderFor(user, orderId);
  if (!REKBER_OPEN.has(order.status)) return [];
  return (await repo.listMessages(pool, order.id)).map((m) => ({
    id: m.id,
    senderRole: m.sender_role,
    senderName: m.sender_name ?? 'Sistem',
    body: m.body,
    createdAt: m.created_at,
  }));
}

export async function sendMessage(user: AuthUser, orderId: string, body: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (!['PAID', 'IN_REKBER', 'SAFE'].includes(order.status)) throw conflict('Rekber Room belum/sudah tidak aktif.', 'BAD_STATE');
  await withTransaction(async (conn) => {
    await run(conn, 'INSERT INTO rekber_messages (order_id, sender_id, sender_role, body) VALUES (?, ?, ?, ?)', [
      order.id,
      user.id,
      role,
      body,
    ]);
    // The store's first message is the hand-over → the order is now in rekber.
    if (role === 'STORE') {
      await run(conn, "UPDATE orders SET status = 'IN_REKBER' WHERE id = ? AND status = 'PAID'", [order.id]);
    }
  });
}

/** DFD 6.4: the buyer secured the account (changed email/password). */
export async function markSafe(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  const result = await run(pool, "UPDATE orders SET status = 'SAFE', safe_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'IN_REKBER'", [order.id]);
  if (result.affectedRows === 0) throw conflict('Tunggu toko mengirim data akun di Rekber Room dulu.', 'BAD_STATE');
  await run(pool, "INSERT INTO rekber_messages (order_id, sender_id, sender_role, body) VALUES (?, NULL, 'SYSTEM', ?)", [
    order.id,
    'Pembeli mengonfirmasi akun sudah aman (email & password diganti).',
  ]);
}

/**
 * DFD 6.5: complete the order and release escrow in ONE transaction:
 * escrow −price, available +price, available −commission (3 ledger rows).
 * Prototype simplification: released on "Selesai" instead of safe_at + 5h.
 */
export async function completeOrder(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  await withTransaction(async (conn) => {
    const locked = await one<{ status: string }>(conn, 'SELECT status FROM orders WHERE id = ? FOR UPDATE', [order.id]);
    if (locked?.status !== 'SAFE') throw conflict('Konfirmasi "Akun aman" dulu sebelum menyelesaikan pesanan.', 'BAD_STATE');
    await run(conn, "UPDATE orders SET status = 'COMPLETED', completed_at = UTC_TIMESTAMP() WHERE id = ?", [order.id]);
    await run(conn, "UPDATE catalogs SET status = 'SOLD' WHERE id = ?", [order.catalog_id]);
    await run(conn, 'UPDATE stores SET sold = sold + 1 WHERE id = ?', [order.store_id]);
    await moveStoreBalance(conn, order.store_id, [
      { bucket: 'ESCROW', type: 'ESCROW_RELEASE', amount: -order.item_price, refType: 'order', refId: order.id },
      { bucket: 'AVAILABLE', type: 'ESCROW_RELEASE', amount: order.item_price, refType: 'order', refId: order.id },
      { bucket: 'AVAILABLE', type: 'COMMISSION', amount: -order.commission, refType: 'order', refId: order.id, note: `Komisi ${order.commission_rate * 100}%` },
    ]);
    await run(conn, "INSERT INTO rekber_messages (order_id, sender_id, sender_role, body) VALUES (?, NULL, 'SYSTEM', ?)", [
      order.id,
      'Pesanan selesai. Dana (dikurangi komisi) diteruskan ke saldo toko.',
    ]);
  });
}
