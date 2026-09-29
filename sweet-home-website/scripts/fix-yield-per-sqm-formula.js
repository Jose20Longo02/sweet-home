/**
 * Fix the per-m² gross yield line in /blog/mietrendite-berechnen (DE + EN).
 * Monthly rent per m² was divided by price per m² without ×12.
 * Touches content + content_i18n only (no Admin-Save / DeepL).
 *
 * Usage: node scripts/fix-yield-per-sqm-formula.js
 * Dry-run: DRY_RUN=1 node scripts/fix-yield-per-sqm-formula.js
 */
require('dotenv').config();
const { Client } = require('pg');

const DRY = process.env.DRY_RUN === '1';
const POST_ID = 156;

const REPLACEMENTS = [
  {
    old: 'Alternative über Quadratmeter:<br>Brutto (%) ≈ (Kaltmiete €/m² ÷ Kaufpreis €/m²) × 100',
    next: 'Alternative über Quadratmeter (monatliche Kaltmiete):<br>Brutto (%) ≈ (Kaltmiete €/m² × 12 ÷ Kaufpreis €/m²) × 100'
  },
  {
    old: 'Alternative calculation using square meters:<br>Gross (%) ≈ (Base rent €/m² ÷ Purchase price €/m²) × 100',
    next: 'Alternative calculation using square meters (monthly base rent):<br>Gross (%) ≈ (Base rent €/m² × 12 ÷ Purchase price €/m²) × 100'
  }
];

function apply(label, html) {
  if (!html) return { html, note: `${label}: empty` };
  let out = html;
  const notes = [];
  for (const r of REPLACEMENTS) {
    const hits = out.split(r.old).length - 1;
    if (hits === 0) {
      notes.push(out.includes(r.next) ? `${label}: already fixed (${r.next.slice(0, 40)}…)` : `${label}: pattern not found`);
      continue;
    }
    if (hits !== 1) throw new Error(`${label}: pattern appears ${hits} times`);
    out = out.replace(r.old, r.next);
    notes.push(`${label}: replaced 1`);
  }
  return { html: out, note: notes.join('; ') };
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();
  const { rows } = await client.query(
    'SELECT id, content, content_i18n FROM blog_posts WHERE id = $1',
    [POST_ID]
  );
  if (!rows.length) throw new Error('post not found');
  const row = rows[0];
  const i18n = { ...(row.content_i18n || {}) };

  const content = apply('content', row.content);
  const de = apply('de', i18n.de);
  const en = apply('en', i18n.en);
  i18n.de = de.html;
  i18n.en = en.html;

  console.log(content.note);
  console.log(de.note);
  console.log(en.note);

  const changed = content.html !== row.content || de.html !== (row.content_i18n || {}).de || en.html !== (row.content_i18n || {}).en;
  if (!changed || DRY) {
    console.log(DRY ? 'DRY_RUN — no write' : 'nothing to write');
    await client.end();
    return;
  }

  await client.query(
    `UPDATE blog_posts
        SET content = $1, content_i18n = $2::jsonb, updated_at = NOW()
      WHERE id = $3`,
    [content.html, JSON.stringify(i18n), POST_ID]
  );
  console.log('written');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
