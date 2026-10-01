/**
 * T1 — English blog bodies link only to English pages.
 * Updates content_i18n.en. Does not touch content or content_i18n.de.
 *
 *   DRY_RUN=1 node scripts/t1-fix-en-internal-links.js
 *   node scripts/t1-fix-en-internal-links.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { rewriteEnBlogInternalLinks } = require('../config/n10-berlin-post-slugs');

const DRY_RUN = process.env.DRY_RUN === '1';

function hrefs(html) {
  return [...String(html || '').matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
}

function germanInternal(list) {
  return list.filter((href) => {
    if (!href.startsWith('/')) return false;
    if (href.startsWith('/en/') || href.startsWith('/images/') || href.startsWith('/css/') || href.startsWith('/js/')) {
      return false;
    }
    return true;
  });
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, slug, slug_i18n->>'en' AS en_slug, content_i18n->>'en' AS en
    FROM blog_posts
    WHERE status = 'published'
      AND content_i18n ? 'en'
      AND length(COALESCE(content_i18n->>'en', '')) > 40
    ORDER BY id
  `);

  const backup = [];
  let changed = 0;
  for (const row of rows) {
    const next = rewriteEnBlogInternalLinks(row.en);
    if (next === row.en) continue;
    const before = [...new Set(germanInternal(hrefs(row.en)))];
    const after = [...new Set(germanInternal(hrefs(next)))];
    changed += 1;
    console.log(`#${row.id} ${row.en_slug || row.slug}`);
    before.forEach((href) => console.log('  -', href));
    after.forEach((href) => console.log('  still', href));
    backup.push({ id: row.id, slug: row.slug, en_slug: row.en_slug, en: row.en });
    if (!DRY_RUN) {
      await client.query(
        `UPDATE blog_posts
            SET content_i18n = jsonb_set(content_i18n, '{en}', to_jsonb($2::text), true),
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, next]
      );
    }
  }

  if (!DRY_RUN && backup.length) {
    const file = path.join('/tmp', `t1-en-links-backup-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log('backup', file);
  }
  console.log(DRY_RUN ? `dry-run posts ${changed}` : `updated posts ${changed}`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
