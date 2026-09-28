import { all, one, type Db } from '../../db/pool.js';

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'IN_REKBER' | 'SAFE' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED';

export interface OrderRow {
  id: string;
  order_number: string;
  catalog_id: string;
  buyer_id: string;
  store_id: string;
  item_price: number;
  handling_fee: number;
  protection_fee: number;
  total_paid: number;
  commission_rate: number;
  commission: number;
  store_receives: number;
  payment_method: string | null;
  status: OrderStatus;
  room_code: string;
  created_at: string;
  paid_at: string | null;
  safe_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  // joined
  catalog_title: string;
  catalog_image: string | null;
  catalog_images: unknown;
  game_slug: string;
  store_slug: string;
  store_name: string;
  store_owner_id: string;
  buyer_name: string;
  payment_invoice: string | null;
  payment_status: string | null;
  payment_redirect: string | null;
}

const ORDER_SELECT = `
  SELECT o.*, c.title AS catalog_title, c.image AS catalog_image, c.images AS catalog_images,
         g.slug AS game_slug, s.slug AS store_slug, s.name AS store_name, s.owner_id AS store_owner_id,
         u.name AS buyer_name,
         p.midtrans_order_id AS payment_invoice, p.status AS payment_status, p.redirect_url AS payment_redirect
  FROM orders o
  JOIN catalogs c ON c.id = o.catalog_id
  JOIN games g ON g.id = c.game_id
  JOIN stores s ON s.id = o.store_id
  JOIN users u ON u.id = o.buyer_id
  LEFT JOIN payments p ON p.id = (
    SELECT p2.id FROM payments p2 WHERE p2.purpose = 'ORDER' AND p2.ref_id = o.id ORDER BY p2.created_at DESC LIMIT 1
  )`;

export const findOrder = (db: Db, id: string) => one<OrderRow>(db, `${ORDER_SELECT} WHERE o.id = ?`, [id]);

export const listBuyerOrders = (db: Db, buyerId: string) =>
  all<OrderRow>(db, `${ORDER_SELECT} WHERE o.buyer_id = ? ORDER BY o.created_at DESC LIMIT 100`, [buyerId]);

/** Paid onwards — the orders a store has to act on or has handled. */
export const listStoreOrders = (db: Db, storeId: string) =>
  all<OrderRow>(
    db,
    `${ORDER_SELECT} WHERE o.store_id = ? AND o.status NOT IN ('PENDING_PAYMENT', 'CANCELLED') ORDER BY o.created_at DESC LIMIT 100`,
    [storeId],
  );

export interface MessageRow {
  id: number;
  sender_role: 'BUYER' | 'STORE' | 'ADMIN' | 'SYSTEM';
  sender_name: string | null;
  body: string;
  created_at: string;
}

export const listMessages = (db: Db, orderId: string) =>
  all<MessageRow>(
    db,
    `SELECT m.id, m.sender_role, u.name AS sender_name, m.body, m.created_at
     FROM rekber_messages m LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = ? ORDER BY m.id`,
    [orderId],
  );
