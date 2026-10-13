// Generates docs/modeling/05-struktur-tabel.md from the live database (information_schema),
// so the documented table structure always equals supabase/migrations.
// Run: npm run docs:tables   (needs the valostock Supabase project running)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { generic, specific, tableOrder } from './table-docs-descriptions.ts';

// Local Supabase default superuser (documented, local only) — reads catalog metadata.
const url = process.env.DOCS_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

interface Col {
  table_name: string;
  ordinal_position: number;
  column_name: string;
  data_type: string;
  udt_name: string;
  char_len: number | null;
  num_precision: number | null;
  num_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  is_identity: string;
  comment: string | null;
  pk: boolean;
  fk: string | null;
  unique: boolean;
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query<Col>(`
  select c.table_name, c.ordinal_position, c.column_name, c.data_type, c.udt_name,
         c.character_maximum_length as char_len, c.numeric_precision as num_precision, c.numeric_scale as num_scale,
         c.is_nullable, c.column_default, c.is_identity,
         col_description(format('public.%I', c.table_name)::regclass, c.ordinal_position) as comment,
         exists (select 1 from information_schema.table_constraints tc
                 join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema
                 where tc.table_schema = 'public' and tc.table_name = c.table_name and tc.constraint_type = 'PRIMARY KEY'
                   and k.column_name = c.column_name) as pk,
         (select ccu.table_schema || '.' || ccu.table_name || '.' || ccu.column_name
            from information_schema.table_constraints tc
            join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema
            join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
           where tc.table_schema = 'public' and tc.table_name = c.table_name and tc.constraint_type = 'FOREIGN KEY'
             and k.column_name = c.column_name limit 1) as fk,
         exists (select 1 from pg_index i
                 join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
                 where i.indrelid = format('public.%I', c.table_name)::regclass and i.indisunique and not i.indisprimary
                   and i.indnatts = 1 and a.attname = c.column_name) as unique
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position`);
const enums = await client.query<{ name: string; labels: string }>(`
  select t.typname as name, string_agg(e.enumlabel, ', ' order by e.enumsortorder) as labels
  from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' group by t.typname order by t.typname`);
const checks = await client.query<{ table_name: string; name: string; def: string }>(`
  select rel.relname as table_name, con.conname as name, pg_get_constraintdef(con.oid) as def
  from pg_constraint con join pg_class rel on rel.oid = con.conrelid join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public' and con.contype = 'c' order by rel.relname, con.conname`);
await client.end();

const byTable = new Map<string, Col[]>();
for (const r of rows) byTable.set(r.table_name, [...(byTable.get(r.table_name) ?? []), r]);

const documented = new Set(tableOrder.map(([t]) => t));
const undocumented = [...byTable.keys()].filter((t) => !documented.has(t));
if (undocumented.length) throw new Error(`Tables without a description in table-docs-descriptions.ts: ${undocumented.join(', ')}`);

function typeOf(c: Col): string {
  if (c.data_type === 'USER-DEFINED') return `enum ${c.udt_name}`;
  if (c.data_type === 'ARRAY') return `${c.udt_name.replace(/^_/, '')}[]`;
  if (c.data_type === 'character varying') return c.char_len ? `varchar(${c.char_len})` : 'varchar';
  if (c.data_type === 'numeric') return c.num_precision ? `numeric(${c.num_precision},${c.num_scale})` : 'numeric';
  if (c.data_type === 'timestamp with time zone') return 'timestamptz';
  return c.data_type;
}

function defaultOf(c: Col): string {
  if (c.is_identity === 'YES') return 'IDENTITY';
  if (!c.column_default) return '—';
  return c.column_default.replace(/::[a-z_ ."]+/gi, '').replace(/\|/g, '\\|');
}

const missing: string[] = [];
let md = `# 5. Struktur Tabel

> **Dibuat otomatis** oleh \`back/scripts/generate-table-docs.ts\` dari database Supabase \`valostock\` (PostgreSQL 17). Jangan diedit manual; ubah migrasi di \`supabase/migrations/\` lalu jalankan \`npm run docs:tables\`.

Kolom **Kunci**: **PK** = primary key · **FK** = foreign key (\`schema.tabel.kolom\`) · **UK** = unique. **Null** = boleh kosong. Uang dalam **Rupiah bulat** (\`integer\`). Semua tabel memakai **Row Level Security** tanpa policy, sehingga hanya API yang bisa mengakses.

Jumlah tabel: **${byTable.size}**.

`;

tableOrder.forEach(([table, description], index) => {
  const cols = byTable.get(table);
  if (!cols) throw new Error(`Table ${table} is described but does not exist`);
  md += `## 5.${index + 1} Tabel \`${table}\`\n\n${description}\n\n| No | Kolom | Tipe | Null | Default | Kunci | Keterangan |\n|---|---|---|---|---|---|---|\n`;
  for (const c of cols) {
    const keys = [c.pk ? 'PK' : null, c.fk ? `FK → \`${c.fk}\`` : null, c.unique && !c.pk ? 'UK' : null].filter(Boolean);
    const desc = c.comment ?? specific[`${table}.${c.column_name}`] ?? generic[c.column_name] ?? '';
    if (!desc) missing.push(`${table}.${c.column_name}`);
    md += `| ${c.ordinal_position} | \`${c.column_name}\` | ${typeOf(c)} | ${c.is_nullable === 'YES' ? 'Ya' : 'Tidak'} | ${defaultOf(c)} | ${keys.join(', ') || '—'} | ${desc.replace(/\|/g, '\\|')} |\n`;
  }
  md += '\n';
});

md += `## Tipe ENUM\n\n| Tipe | Nilai |\n|---|---|\n${enums.rows.map((e) => `| \`${e.name}\` | ${e.labels} |`).join('\n')}\n\n`;
md += `## Constraint CHECK\n\n| Tabel | Constraint | Aturan |\n|---|---|---|\n${checks.rows
  .map((c) => `| ${c.table_name} | \`${c.name}\` | \`${c.def.replace(/\|/g, '\\|')}\` |`)
  .join('\n')}\n`;

writeFileSync(fileURLToPath(new URL('../../docs/modeling/05-struktur-tabel.md', import.meta.url)), md);
console.log(`05-struktur-tabel.md: ${byTable.size} tables, ${rows.length} columns, ${enums.rows.length} enums, ${checks.rows.length} checks`);
if (missing.length) console.warn(`Columns without a description (${missing.length}): ${missing.join(', ')}`);
