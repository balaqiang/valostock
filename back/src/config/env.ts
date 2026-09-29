import { z } from 'zod';

// Validated once at start-up: a missing or malformed variable stops the server
// with a clear message instead of failing later inside a request.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().startsWith('postgresql://', 'DATABASE_URL harus berupa URL postgresql://'),
  DATABASE_SSL: z.enum(['off', 'require']).default('off'),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20, 'isi dari `npx supabase status`'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'isi dari `npx supabase status`'),
  PAYMENT_MODE: z.enum(['simulation', 'midtrans']).default('simulation'),
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  JOBS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
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
