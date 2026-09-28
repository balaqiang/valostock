import { one, run, type Db } from '../db/pool.js';

export type NotificationKind = 'ORDER' | 'SYSTEM' | 'STORE';

/** In-app notification (WhatsApp/Discord/Telegram delivery is simulated — not sent). */
export async function notify(
  db: Db,
  userId: string,
  n: { kind: NotificationKind; title: string; body: string; link?: string | null },
): Promise<void> {
  await run(db, 'insert into notifications (user_id, kind, title, body, link) values ($1, $2, $3, $4, $5)', [
    userId,
    n.kind,
    n.title,
    n.body,
    n.link ?? null,
  ]);
}

/** Notify the owner of a store. */
export async function notifyStore(
  db: Db,
  storeId: string,
  n: { kind?: NotificationKind; title: string; body: string; link?: string | null },
): Promise<void> {
  const store = await one<{ owner_id: string }>(db, 'select owner_id from stores where id = $1', [storeId]);
  if (store) await notify(db, store.owner_id, { kind: n.kind ?? 'STORE', title: n.title, body: n.body, link: n.link });
}
