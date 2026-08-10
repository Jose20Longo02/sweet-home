/**
 * Phase N2 (+ N1 content for #4–#9): blog slug cleanup
 * - Unpublish zz-archived twins
 * - Apply approved draft DE into live posts #4–#9
 * - Rename Berlin posts to German keyword slugs
 * - Rewrite internal /blog/... links to new slugs
 * - Archive draft-review rows (status stays draft)
 *
 * Usage: node scripts/n2-blog-slug-cleanup.js
 */
require('dotenv').config();
const { Client } = require('pg');

const SLUG_MAP = [
  { id: 139, from: 'hidden-costs-of-buying-property-in-berlin', to: 'kaufnebenkosten-berlin' },
  { id: 131, from: 'berlin-real-estate-investment-guide-2026', to: 'immobilie-als-kapitalanlage-berlin' },
  { id: 135, from: 'how-foreigners-can-buy-property-in-berlin', to: 'auslaender-immobilien-kaufen-berlin' },
  { id: 136, from: 'best-berlin-districts-for-property-investment', to: 'beste-bezirke-immobilien-berlin', draftId: 148 },
  { id: 138, from: 'what-to-check-before-buying-an-apartment-in-berlin', to: 'wohnungskauf-berlin-checkliste', draftId: 149 },
  { id: 140, from: 'berlin-rental-laws-explained-for-property-buyers', to: 'mietrecht-berlin-kaeufer', draftId: 150 },
  { id: 141, from: 'new-build-vs-altbau-in-berlin-which-is-better', to: 'neubau-oder-altbau-berlin', draftId: 151 },
  { id: 143, from: 'best-berlin-districts-for-families', to: 'berlin-stadtteile-familien', draftId: 152 },
  { id: 133, from: 'how-smart-investors-buy-berlin-at-a-40-discount', to: 'vermietete-wohnung-kaufen-berlin', draftId: 153 }
];

const ARCHIVE_PUBLISHED_IDS = [145, 146, 147];

function stripDraftPrefix(text) {
  return String(text || '')
    .replace(/^\[DRAFT FOR REVIEW\]\s*/i, '')
    .trim();
}

function rewriteBlogLinks(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html;
  for (const { from, to } of SLUG_MAP) {
    const patterns = [
      new RegExp(`/blog/${from}(?=["'#?\\s>]|$)`, 'g'),
      new RegExp(`/en/blog/${from}(?=["'#?\\s>]|$)`, 'g')
    ];
    out = out.replace(patterns[0], `/blog/${to}`);
    out = out.replace(patterns[1], `/en/blog/${to}`);
  }
  return out;
}

function rewriteI18nJson(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const next = { ...obj };
  for (const lang of Object.keys(next)) {
    if (typeof next[lang] === 'string') {
      next[lang] = rewriteBlogLinks(next[lang]);
    }
  }
  return next;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query('BEGIN');

  try {
    // 1) Unpublish zz-archived twins that were wrongly published
    for (const id of ARCHIVE_PUBLISHED_IDS) {
      const r = await client.query(
        `UPDATE blog_posts SET status = 'draft', updated_at = NOW() WHERE id = $1 RETURNING id, slug, status`,
        [id]
      );
      console.log('unpublish', r.rows[0]);
    }

    // 2) Apply approved draft DE → live (#4–#9)
    for (const row of SLUG_MAP.filter((x) => x.draftId)) {
      const draft = await client.query(
        `SELECT title, title_i18n, excerpt, excerpt_i18n, content, content_i18n
         FROM blog_posts WHERE id = $1`,
        [row.draftId]
      );
      if (!draft.rows[0]) throw new Error(`Missing draft ${row.draftId}`);
      const d = draft.rows[0];
      const titleDe = stripDraftPrefix((d.title_i18n && d.title_i18n.de) || d.title);
      const excerptDe = stripDraftPrefix((d.excerpt_i18n && d.excerpt_i18n.de) || d.excerpt || '');
      const contentDe = (d.content_i18n && d.content_i18n.de) || d.content;

      await client.query(
        `UPDATE blog_posts SET
           title_i18n = jsonb_set(COALESCE(title_i18n, '{}'::jsonb), '{de}', to_jsonb($2::text), true),
           excerpt_i18n = jsonb_set(COALESCE(excerpt_i18n, '{}'::jsonb), '{de}', to_jsonb($3::text), true),
           content_i18n = jsonb_set(COALESCE(content_i18n, '{}'::jsonb), '{de}', to_jsonb($4::text), true),
           updated_at = NOW()
         WHERE id = $1`,
        [row.id, titleDe, excerptDe, contentDe]
      );
      console.log(`applied draft ${row.draftId} → live ${row.id} (${titleDe.slice(0, 50)}…)`);
    }

    // 3) Archive draft-review rows (keep draft; rename so they never look like live URLs)
    for (const row of SLUG_MAP.filter((x) => x.draftId)) {
      const newDraftSlug = `zz-archived-${row.to}-draft-review`;
      await client.query(
        `UPDATE blog_posts SET slug = $2, status = 'draft', updated_at = NOW() WHERE id = $1`,
        [row.draftId, newDraftSlug]
      );
      console.log(`archived draft ${row.draftId} → ${newDraftSlug}`);
    }

    // 4) Rewrite internal blog links in all posts
    const posts = await client.query(
      `SELECT id, slug, content, content_i18n, excerpt, excerpt_i18n FROM blog_posts`
    );
    for (const p of posts.rows) {
      const content = rewriteBlogLinks(p.content);
      const excerpt = rewriteBlogLinks(p.excerpt);
      const contentI18n = rewriteI18nJson(p.content_i18n);
      const excerptI18n = rewriteI18nJson(p.excerpt_i18n);
      await client.query(
        `UPDATE blog_posts SET
           content = $2,
           excerpt = $3,
           content_i18n = $4::jsonb,
           excerpt_i18n = $5::jsonb,
           updated_at = NOW()
         WHERE id = $1`,
        [p.id, content, excerpt, JSON.stringify(contentI18n || {}), JSON.stringify(excerptI18n || {})]
      );
    }
    console.log(`rewrote internal links in ${posts.rows.length} posts`);

    // 5) Rename live posts to German keyword slugs
    for (const row of SLUG_MAP) {
      const clash = await client.query(
        `SELECT id, slug, status FROM blog_posts WHERE slug = $1 AND id <> $2`,
        [row.to, row.id]
      );
      if (clash.rows.length) {
        throw new Error(`Slug clash for ${row.to}: ${JSON.stringify(clash.rows)}`);
      }
      const r = await client.query(
        `UPDATE blog_posts SET slug = $2, updated_at = NOW() WHERE id = $1 AND slug = $3 RETURNING id, slug`,
        [row.id, row.to, row.from]
      );
      if (!r.rows[0]) {
        // already renamed?
        const cur = await client.query(`SELECT id, slug FROM blog_posts WHERE id = $1`, [row.id]);
        console.log('rename skip/check', cur.rows[0]);
      } else {
        console.log('renamed', r.rows[0]);
      }
    }

    await client.query('COMMIT');
    console.log('N2 cleanup committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
