// In-app store chat (buyer ↔ store) and user reports. Deals stay in-app:
// contact details and off-platform links are blocked in chat messages.
import { Router, type Request } from 'express';
import { z } from 'zod';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, forbidden, notFound, parse } from '../../lib/errors.js';
import { notify, notifyStore } from '../../lib/notify.js';
import { requireUser, type AuthUser } from '../../middlewares/auth.js';
import { writeLimiter } from '../../middlewares/security.js';
import { assertNoContact } from '../catalogs/catalogs.service.js';
import { findStoreOf, ownStore } from '../store/store.context.js';

export const chatRouter = Router();

const idParam = z.uuid('id tidak valid');

interface ConversationRow {
  id: string;
  buyer_id: string;
  store_id: string;
  last_message_at: string;
  buyer_unread: number;
  store_unread: number;
  buyer_name: string;
  store_name: string;
  store_slug: string;
  owner_id: string;
  last_body: string | null;
}

const CONVERSATION_SELECT = `select c.*, p.name as buyer_name, s.name as store_name, s.slug as store_slug, s.owner_id,
    (select m.body from chat_messages m where m.conversation_id = c.id order by m.id desc limit 1) as last_body
  from conversations c join profiles p on p.id = c.buyer_id join stores s on s.id = c.store_id`;

const toConversation = (c: ConversationRow, side: 'BUYER' | 'STORE') => ({
  id: c.id,
  side,
  counterpart: side === 'BUYER' ? { name: c.store_name, slug: c.store_slug } : { name: c.buyer_name, slug: null },
  lastMessage: c.last_body,
  lastMessageAt: c.last_message_at,
  unread: side === 'BUYER' ? c.buyer_unread : c.store_unread,
});

async function conversationFor(user: AuthUser, id: string) {
  const c = await one<ConversationRow>(pool, `${CONVERSATION_SELECT} where c.id = $1`, [id]);
  if (!c) throw notFound('Percakapan');
  if (c.buyer_id === user.id) return { c, side: 'BUYER' as const };
  if (c.owner_id === user.id) return { c, side: 'STORE' as const };
  throw notFound('Percakapan');
}

chatRouter.get('/chat/conversations', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<ConversationRow>(pool, `${CONVERSATION_SELECT} where c.buyer_id = $1 order by c.last_message_at desc`, [user.id]);
  res.json({ conversations: rows.map((c) => toConversation(c, 'BUYER')) });
});

chatRouter.get('/stores/me/conversations', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<ConversationRow>(pool, `${CONVERSATION_SELECT} where c.store_id = $1 order by c.last_message_at desc`, [store.id]);
  res.json({ conversations: rows.map((c) => toConversation(c, 'STORE')) });
});

const messageBody = z.string().trim().min(1, 'pesan kosong').max(2000);

async function appendMessage(user: AuthUser, c: ConversationRow, side: 'BUYER' | 'STORE', body: string, catalogId: string | null) {
  assertNoContact(body);
  await withTransaction(async (tx) => {
    await run(tx, 'insert into chat_messages (conversation_id, sender_id, sender_role, body, catalog_id) values ($1, $2, $3, $4, $5)', [
      c.id,
      user.id,
      side,
      body,
      catalogId,
    ]);
    await run(
      tx,
      `update conversations set last_message_at = now(),
         buyer_unread = buyer_unread + case when $2 = 'STORE' then 1 else 0 end,
         store_unread = store_unread + case when $2 = 'BUYER' then 1 else 0 end
       where id = $1`,
      [c.id, side],
    );
    // Notify only on the first unread message, not on every line.
    if (side === 'BUYER' && c.store_unread === 0) {
      await notifyStore(tx, c.store_id, { title: `Chat dari ${user.name}`, body: body.slice(0, 120), link: `/store-dashboard/chat?c=${c.id}` });
    }
    if (side === 'STORE' && c.buyer_unread === 0) {
      await notify(tx, c.buyer_id, { kind: 'STORE', title: `Balasan dari ${c.store_name}`, body: body.slice(0, 120), link: `/account/messages/chat?c=${c.id}` });
    }
  });
}

const startSchema = z.object({ storeSlug: z.string().regex(/^[a-z0-9-]{2,60}$/), body: messageBody, catalogId: z.uuid().optional() }).strict();

/** Start (or continue) a conversation with a store. */
chatRouter.post('/chat/conversations', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parse(startSchema, req.body);
  const store = await one<{ id: string; owner_id: string }>(pool, `select id, owner_id from stores where slug = $1 and status = 'ACTIVE'`, [input.storeSlug]);
  if (!store) throw notFound('Toko');
  if (store.owner_id === user.id) throw badRequest('Tidak bisa chat dengan tokomu sendiri.');
  if (input.catalogId && !(await one(pool, 'select 1 from catalogs where id = $1 and store_id = $2', [input.catalogId, store.id]))) {
    throw notFound('Katalog');
  }
  const row = await one<{ id: string }>(
    pool,
    `insert into conversations (buyer_id, store_id) values ($1, $2)
     on conflict (buyer_id, store_id) do update set buyer_id = excluded.buyer_id returning id`,
    [user.id, store.id],
  );
  const { c, side } = await conversationFor(user, row!.id);
  await appendMessage(user, c, side, input.body, input.catalogId ?? null);
  res.status(201).json({ conversationId: c.id });
});

async function messagesOf(req: Request) {
  const user = requireUser(req);
  const { c, side } = await conversationFor(user, parse(idParam, req.params.id));
  return { user, c, side };
}

chatRouter.get('/chat/conversations/:id/messages', async (req, res) => {
  const { c, side } = await messagesOf(req);
  const rows = await all<{ id: number; sender_role: string; body: string; catalog_id: string | null; catalog_title: string | null; created_at: string }>(
    pool,
    `select m.id, m.sender_role, m.body, m.catalog_id, k.title as catalog_title, m.created_at
     from chat_messages m left join catalogs k on k.id = m.catalog_id where m.conversation_id = $1 order by m.id desc limit 200`,
    [c.id],
  );
  await run(pool, `update conversations set ${side === 'BUYER' ? 'buyer_unread' : 'store_unread'} = 0 where id = $1`, [c.id]);
  res.json({
    conversation: toConversation(c, side),
    messages: rows.reverse().map((m) => ({
      id: m.id,
      mine: m.sender_role === side,
      senderRole: m.sender_role,
      body: m.body,
      catalog: m.catalog_id ? { id: m.catalog_id, title: m.catalog_title } : null,
      createdAt: m.created_at,
    })),
  });
});

chatRouter.post('/chat/conversations/:id/messages', writeLimiter, async (req, res) => {
  const { user, c, side } = await messagesOf(req);
  const { body } = parse(z.object({ body: messageBody }).strict(), req.body);
  await appendMessage(user, c, side, body, null);
  res.status(201).json({ ok: true });
});

// ── Reports (ADMIN_PANEL §3.4) ──

const reportSchema = z
  .object({
    targetType: z.enum(['CATALOG', 'STORE', 'USER']),
    targetId: z.uuid(),
    reason: z.enum(['SCAM', 'FAKE', 'OFF_PLATFORM', 'ABUSE', 'OTHER']),
    detail: z.string().trim().max(2000).optional(),
  })
  .strict();

chatRouter.post('/reports', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const r = parse(reportSchema, req.body);
  const table = { CATALOG: 'catalogs', STORE: 'stores', USER: 'profiles' }[r.targetType];
  if (!(await one(pool, `select 1 from ${table} where id = $1`, [r.targetId]))) throw notFound('Target laporan');
  if (r.targetType === 'USER' && r.targetId === user.id) throw forbidden('Tidak bisa melaporkan diri sendiri.');
  const own = await findStoreOf(pool, user.id);
  if (r.targetType === 'STORE' && own?.id === r.targetId) throw forbidden('Tidak bisa melaporkan tokomu sendiri.');
  if (await one(pool, `select 1 from reports where reporter_id = $1 and target_id = $2 and status in ('OPEN', 'REVIEWING')`, [user.id, r.targetId])) {
    throw badRequest('Laporanmu untuk target ini masih diproses.', 'REPORT_OPEN');
  }
  await run(pool, 'insert into reports (reporter_id, target_type, target_id, reason, detail) values ($1, $2, $3, $4, $5)', [
    user.id,
    r.targetType,
    r.targetId,
    r.reason,
    r.detail ?? null,
  ]);
  res.status(201).json({ ok: true });
});

chatRouter.get('/me/reports', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<{ id: string; target_type: string; target_id: string; reason: string; detail: string | null; status: string; resolution_note: string | null; created_at: string; target_name: string | null }>(
    pool,
    `select r.*, coalesce(c.title, s.name, p.name) as target_name from reports r
     left join catalogs c on r.target_type = 'CATALOG' and c.id = r.target_id
     left join stores s on r.target_type = 'STORE' and s.id = r.target_id
     left join profiles p on r.target_type = 'USER' and p.id = r.target_id
     where r.reporter_id = $1 order by r.created_at desc`,
    [user.id],
  );
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      targetName: r.target_name,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
    })),
  });
});
