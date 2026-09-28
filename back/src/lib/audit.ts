import { json, run, type Db } from '../db/pool.js';

/** Records a sensitive action (admin decisions, anomalies) in audit_logs. */
export async function audit(
  db: Db,
  entry: { actorId: string | null; action: string; targetType: string; targetId: string; detail?: unknown; ip?: string | null },
): Promise<void> {
  await run(
    db,
    'insert into audit_logs (actor_id, action, target_type, target_id, detail, ip) values ($1, $2, $3, $4, $5, $6)',
    [
      entry.actorId,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.detail === undefined ? null : json(entry.detail),
      entry.ip ?? null,
    ],
  );
}
