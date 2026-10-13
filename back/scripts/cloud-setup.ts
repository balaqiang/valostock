// npm run cloud:setup -- "<session pooler URL as postgres>" [--reset]
//
// Installs valostock on a Supabase Cloud project (docs/SETUP_CLOUD.md), for
// laptops without Docker:
//   1. preflight: Postgres 16+ and a connecting role that may create a BYPASSRLS role,
//   2. `supabase db push --include-seed` (or `db reset` with --reset) — no Docker needed,
//   3. replaces the public dev password of `valostock_api` with a random one,
//   4. checks the role and the demo data,
//   5. writes DATABASE_URL (pooler, user valostock_api.<ref>) + DATABASE_SSL=require to back/.env.
// The postgres password is only used for this run; no secret is printed.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const backDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}
const step = (message: string) => console.log(`\n→ ${message}`);

// ── arguments ──
const args = process.argv.slice(2);
const reset = args.includes('--reset');
const rawUrl = args.find((a) => !a.startsWith('--'));
if (!rawUrl) fail('Tempel connection string "Session pooler" dari dashboard Supabase:\n  npm run cloud:setup -- "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"');

let adminUrl: URL;
try {
  adminUrl = new URL(rawUrl);
} catch {
  fail('Connection string tidak valid. Beri tanda kutip di sekelilingnya dan pastikan diawali postgresql://');
}
if (!/^postgres(ql)?:$/.test(adminUrl.protocol)) fail('Connection string harus diawali postgresql://');
const user = decodeURIComponent(adminUrl.username);
const password = decodeURIComponent(adminUrl.password);
const match = /^postgres\.([a-z0-9]{10,40})$/.exec(user);
if (!match || !adminUrl.hostname.endsWith('pooler.supabase.com')) {
  fail('Pakai connection string "Session pooler" (host *.pooler.supabase.com, user postgres.<project-ref>), bukan "Direct connection".');
}
if (!password || password.includes('YOUR-PASSWORD')) fail('Ganti [YOUR-PASSWORD] dengan password database project Supabase.');
const projectRef = match[1]!;
// The CLI wants a percent-encoded URL; normalise whatever was pasted.
const cliUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${adminUrl.host}${adminUrl.pathname || '/postgres'}`;

if (!existsSync(envPath)) fail('back/.env belum ada. Jalankan: cp .env.example .env, lalu isi SUPABASE_URL dan kedua kunci API (docs/SETUP_CLOUD.md langkah 3).');
if (!existsSync(cli)) fail('Supabase CLI belum terpasang. Jalankan npm install di folder back/.');
const envText = readFileSync(envPath, 'utf8');
const envValue = (key: string) => new RegExp(`^${key}=(.*)$`, 'm').exec(envText)?.[1]?.trim() ?? '';
if (!envValue('SUPABASE_URL').includes(projectRef)) {
  fail(`SUPABASE_URL di back/.env bukan project ini (harus https://${projectRef}.supabase.co). Isi dulu langkah 3.`);
}
if (envValue('SUPABASE_SERVICE_ROLE_KEY').length < 20 || envValue('SUPABASE_ANON_KEY').length < 20) {
  fail('SUPABASE_ANON_KEY dan SUPABASE_SERVICE_ROLE_KEY di back/.env belum diisi (Project Settings → API Keys).');
}

const connect = async (connectionString: string) => {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15_000 });
  await client.connect();
  return client;
};

async function main() {
  // 1. Preflight
  step(`Memeriksa project ${projectRef}…`);
  const admin = await connect(cliUrl).catch((error: Error) =>
    fail(`Tidak bisa terhubung sebagai postgres: ${error.message}\nPeriksa password database dan pastikan memakai Session pooler.`),
  );
  const pre = await admin.query<{ version: string; bypass: boolean; createrole: boolean }>(
    `select current_setting('server_version_num') as version, rolbypassrls as bypass, rolcreaterole as createrole
     from pg_roles where rolname = current_user`,
  );
  const info = pre.rows[0]!;
  if (Number(info.version) < 160000 || !info.bypass || !info.createrole) {
    await admin.end();
    fail(
      `Project ini tidak bisa membuat role API dengan BYPASSRLS (Postgres ${info.version}, bypassrls=${info.bypass}, createrole=${info.createrole}).\n` +
        'Buat project baru (Postgres 17 adalah bawaan project baru) lalu ulangi.',
    );
  }
  await admin.end();
  console.log(`  Postgres ${info.version} · role postgres boleh membuat role BYPASSRLS ✓`);

  // 2. Migrations + seed through the Supabase CLI (no Docker for push/reset --db-url)
  const cliArgs = reset
    ? ['db', 'reset', '--db-url', cliUrl, '--yes', '--workdir', repoRoot]
    : ['db', 'push', '--db-url', cliUrl, '--include-seed', '--yes', '--workdir', repoRoot];
  step(reset ? 'Mengosongkan database Cloud lalu memasang ulang migrasi + data demo…' : 'Memasang migrasi + data demo…');
  const run = spawnSync(process.execPath, [cli, ...cliArgs], { cwd: backDir, stdio: 'inherit' });
  if (run.status !== 0) fail('Supabase CLI gagal (lihat pesan di atas).');

  // 3. Replace the public dev password of the API role
  step('Mengganti password role valostock_api dengan password acak…');
  const apiPassword = randomBytes(24).toString('base64url');
  const db = await connect(cliUrl);
  await db.query(`alter role valostock_api with login password ${db.escapeLiteral(apiPassword)}`);

  // 4. Checks
  const checks = await db.query<{ bypass: boolean | null; users: number; products: number }>(
    `select (select rolbypassrls from pg_roles where rolname = 'valostock_api') as bypass,
       (select count(*)::int from public.profiles) as users,
       (select count(*)::int from public.topup_products) as products`,
  );
  await db.end();
  const c = checks.rows[0]!;
  if (!c.bypass) fail('Role valostock_api tidak punya BYPASSRLS — API tidak akan bisa membaca data.');
  console.log(`  role valostock_api ✓ · ${c.users} akun demo · ${c.products} produk top-up`);

  // 5. back/.env + a real connection as the API role
  const apiUrl = `postgresql://${encodeURIComponent(`valostock_api.${projectRef}`)}:${apiPassword}@${adminUrl.host}/postgres`;
  step('Menguji koneksi sebagai valostock_api lewat pooler…');
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const api = await connect(apiUrl);
      await api.query('select 1 from public.games limit 1');
      await api.end();
      lastError = '';
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  if (lastError) fail(`Role API belum bisa terhubung lewat pooler: ${lastError}`);

  const setEnv = (text: string, key: string, value: string) =>
    new RegExp(`^${key}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
  writeFileSync(envPath, setEnv(setEnv(readFileSync(envPath, 'utf8'), 'DATABASE_URL', apiUrl), 'DATABASE_SSL', 'require'));

  console.log('\n✓ Selesai. back/.env sekarang memakai project Cloud (DATABASE_URL + DATABASE_SSL=require).');
  console.log('  Jalankan: npm run dev (back/) lalu npm run dev (front/). Akun demo: README → "Akun demo".\n');
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
