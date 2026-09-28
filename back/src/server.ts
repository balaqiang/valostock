import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

try {
  await pool.query('SELECT 1');
} catch (error) {
  console.error(
    `Tidak bisa terhubung ke MySQL ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME} — pastikan MySQL di XAMPP sudah Start ` +
      'dan database/schema.sql + seed.sql sudah di-import.',
  );
  console.error((error as Error).message);
  process.exit(1);
}

createApp().listen(env.PORT, () => {
  console.log(`valostock API → http://localhost:${env.PORT}/api  (payment mode: ${env.PAYMENT_MODE})`);
});
