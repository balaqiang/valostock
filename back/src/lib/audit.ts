import { run, type Db } from '../db/pool.js';

/** Records a sensitive action (admin decisions, anomalies) in audit_logs. */
export async function audit(
  db: Db,
  entry: { actorId: string | null; action: string; targetType: string; targetId: string; detail?: unknown; ip?: string | null },
): Promise<void> {
  await run(
    db,
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
    [
      entry.actorId,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.detail === undefined ? null : JSON.stringify(entry.detail),
      entry.ip ?? null,
    ],
  );
}
