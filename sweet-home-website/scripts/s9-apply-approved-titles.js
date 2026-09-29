/**
 * S9 — apply Adi's approved blog titles (2026-09-29).
 * Updates title + title_i18n only. Does not touch content (no Admin-Save / DeepL).
 *
 * The `title` column is updated only when it currently equals the language
 * string being replaced, so an English fallback title is not overwritten by German.
 *
 * Usage: node scripts/s9-apply-approved-titles.js
 * Dry-run: DRY_RUN=1 node scripts/s9-apply-approved-titles.js
 */
require('dotenv').config();
const { Client } = require('pg');

const DRY = process.env.DRY_RUN === '1';

/** id → fields to set. Only listed languages change. */
const UPDATES = [
  { id: 139, de: 'Kaufnebenkosten Berlin 2026: 10–12 % richtig planen' },
  {
    id: 155,
    de: 'Grunderwerbsteuer Berlin: 6 % mit Beispielen',
    en: 'Berlin Transfer Tax (Grunderwerbsteuer): 6% Guide'
  },
  {
    id: 156,
    de: 'Mietrendite berechnen: Formel und Beispiele',
    en: 'Rental Yield in Berlin: Formula and Examples'
  },
  {
    id: 158,
    de: 'Mietpreise Berlin 2026: Mietspiegel und Wohnlage',
    en: 'Berlin Rents 2026: Rent Index for Buyers'
  },
  {
    id: 154,
    de: 'Immobilienpreise Berlin 2026: 5.511 €/m² nach Bezirk',
    en: 'Berlin Property Prices 2026: €5,511/m² by District'
  },
  { id: 133, de: 'Vermietete Wohnung Berlin kaufen: Preisvorteil' },
  { id: 140, de: 'Mietrecht Berlin für Käufer: 5 Regeln für die Rendite' },
  {
    id: 159,
    de: 'Wo in Berlin Wohnung kaufen? Bezirke 2026',
    en: 'Where to Buy an Apartment in Berlin: Districts Compared'
  },
  { id: 138, de: 'Wohnungskauf Berlin: Checkliste mit 8 Punkten' },
  { id: 157, en: 'Down Payment for Buying an Apartment in Berlin' },
  { id: 162, en: 'Taxes for Landlords in Germany' },
  { id: 136, de: 'Beste Bezirke für Immobilien in Berlin 2026' }
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();

  for (const upd of UPDATES) {
    const { rows } = await client.query(
      'SELECT id, slug, title, title_i18n FROM blog_posts WHERE id = $1',
      [upd.id]
    );
    if (!rows.length) throw new Error(`post ${upd.id} not found`);
    const row = rows[0];
    const i18n = { ...(row.title_i18n || {}) };
    let title = row.title;
    const notes = [];

    if (upd.de) {
      if (i18n.de === upd.de) notes.push('de already set');
      else {
        if (title === i18n.de) title = upd.de;
        notes.push(`de: ${i18n.de} → ${upd.de} (${upd.de.length} chars)`);
        i18n.de = upd.de;
      }
    }
    if (upd.en) {
      if (i18n.en === upd.en) notes.push('en already set');
      else {
        if (title === i18n.en) title = upd.en;
        notes.push(`en: ${i18n.en} → ${upd.en} (${upd.en.length} chars)`);
        i18n.en = upd.en;
      }
    }

    const changed = notes.some((n) => n.includes('→'));
    console.log(`#${row.id} ${row.slug}${changed ? '' : ' (skip)'}`);
    notes.forEach((n) => console.log(`   ${n}`));
    if (title !== row.title) console.log(`   title column → ${title}`);

    if (!changed || DRY) continue;

    await client.query(
      `UPDATE blog_posts
          SET title = $1, title_i18n = $2::jsonb, updated_at = NOW()
        WHERE id = $3`,
      [title, JSON.stringify(i18n), row.id]
    );
  }

  console.log(DRY ? '\nDRY_RUN=1 — no DB write' : '\nwritten. verify live titles.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
