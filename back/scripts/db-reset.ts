// Re-imports database/schema.sql + database/seed.sql using the XAMPP MySQL CLI
// (same result as importing both files in phpMyAdmin). Needs a MySQL account
// that may DROP/CREATE databases — by default XAMPP's `root` without password.
//   MYSQL_BIN            default C:/xampp/mysql/bin/mysql.exe
//   MYSQL_ADMIN          default root
//   MYSQL_ADMIN_PASSWORD optional
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bin = process.env.MYSQL_BIN ?? 'C:/xampp/mysql/bin/mysql.exe';
const user = process.env.MYSQL_ADMIN ?? 'root';
const password = process.env.MYSQL_ADMIN_PASSWORD;

for (const file of ['schema.sql', 'seed.sql']) {
  const sql = readFileSync(fileURLToPath(new URL(`../database/${file}`, import.meta.url)), 'utf8');
  const args = ['-h', '127.0.0.1', '-u', user, ...(password ? [`-p${password}`] : [])];
  const result = spawnSync(bin, args, { input: sql, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`Import ${file} gagal:\n${result.stderr || result.error?.message}`);
    process.exit(1);
  }
  console.log(`✓ ${file}`);
}
console.log('Database valostock di-reset (schema + seed).');
