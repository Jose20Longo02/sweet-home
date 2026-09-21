/**
 * S5 reciprocal links for the tenant-occupied strategy page.
 * Updates content_i18n.de and content_i18n.en for vermietete-wohnung-kaufen-berlin.
 * Also updates the German `content` column when it still matches the German body.
 * Does NOT Admin-Save (avoids a DeepL overwrite).
 *
 * Usage: node scripts/adi-s5-strategy-page-links.js
 * Dry-run: DRY_RUN=1 node scripts/adi-s5-strategy-page-links.js
 */
require('dotenv').config();
const { Client } = require('pg');

const SLUG = 'vermietete-wohnung-kaufen-berlin';
const DE_MARKER = '/berlin-mieter-belegte-einstiegsstrategie';
const EN_MARKER = '/en/berlin-tenant-occupied-entry-strategy';
const DE_PARAGRAPH = '<p>Wer den Einstieg über eine vermietete Wohnung genauer durchrechnen will, findet die Logik hinter Preisabschlag, Miete ab dem ersten Tag und einem kurzen Eignungscheck auf der Seite zur <a href="/berlin-mieter-belegte-einstiegsstrategie">mieterbelegten Einstiegsstrategie in Berlin</a>.</p>';
const EN_PARAGRAPH = '<p>If you want to test whether a tenant-occupied entry fits your numbers, the <a href="/en/berlin-tenant-occupied-entry-strategy">tenant-occupied entry strategy</a> walks through the discount, income from day one, and a short fit check.</p>';
const DE_ANCHOR = '<h2>Nächster Schritt</h2>';
const EN_ANCHOR = '<p><br></p><p>[[landing:berlin_main|Talk to a Berlin property specialist at Sweet Home|button]]</p>';

function insertBefore(html, anchor, paragraph) {
  const index = html.indexOf(anchor);
  if (index === -1) return null;
  return html.slice(0, index) + paragraph + '\n' + html.slice(index);
}

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  const result = await client.query(
    'SELECT id, content, content_i18n FROM blog_posts WHERE slug = $1',
    [SLUG]
  );
  if (!result.rows.length) throw new Error('Post not found: ' + SLUG);
  const row = result.rows[0];
  const i18n = typeof row.content_i18n === 'string' ? JSON.parse(row.content_i18n) : { ...(row.content_i18n || {}) };
  let de = i18n.de || '';
  let en = i18n.en || '';
  let content = row.content || '';
  const contentMatchedDe = content === de;

  if (!de.includes(DE_MARKER)) {
    const next = insertBefore(de, DE_ANCHOR, DE_PARAGRAPH);
    if (!next) throw new Error('German anchor not found');
    de = next;
  }
  if (en && !en.includes(EN_MARKER)) {
    const next = insertBefore(en, EN_ANCHOR, EN_PARAGRAPH);
    if (!next) throw new Error('English anchor not found');
    en = next;
  }
  if (contentMatchedDe) content = de;

  i18n.de = de;
  if (en) i18n.en = en;

  console.log(JSON.stringify({
    id: row.id,
    deHasLink: de.includes(DE_MARKER),
    enHasLink: en.includes(EN_MARKER),
    contentSynced: contentMatchedDe
  }));

  if (process.env.DRY_RUN === '1') {
    await client.end();
    return;
  }

  await client.query(
    'UPDATE blog_posts SET content = $1, content_i18n = $2::jsonb, updated_at = NOW() WHERE id = $3',
    [content, JSON.stringify(i18n), row.id]
  );
  console.log('Updated post', row.id);
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
