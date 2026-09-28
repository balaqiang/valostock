import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { startScheduler } from './jobs/scheduler.js';

try {
  await pool.query('select 1');
} catch (error) {
  console.error(
    'Tidak bisa terhubung ke Postgres (Supabase lokal "valostock"). Jalankan `npx supabase start` di root repo, ' +
      'lalu `npx supabase db reset` untuk migrasi + seed, dan cek DATABASE_URL di back/.env.',
  );
  console.error((error as Error).message);
  process.exit(1);
}

createApp().listen(env.PORT, () => {
  console.log(`valostock API → http://localhost:${env.PORT}/api  (payment mode: ${env.PAYMENT_MODE})`);
  startScheduler();
});
