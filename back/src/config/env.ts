import { z } from 'zod';

// Validated once at start-up: a missing or malformed variable stops the server
// with a clear message instead of failing later inside a request.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('valostock'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  PAYMENT_MODE: z.enum(['simulation', 'midtrans']).default('simulation'),
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Konfigurasi .env tidak valid:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;

if (env.PAYMENT_MODE === 'midtrans' && !env.MIDTRANS_SERVER_KEY) {
  console.error('PAYMENT_MODE=midtrans membutuhkan MIDTRANS_SERVER_KEY (Sandbox) di .env');
  process.exit(1);
}
