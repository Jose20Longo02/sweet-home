#!/usr/bin/env node
/**
 * N10 — English blog versions with English keyword slugs.
 * - Adds slug_i18n column if missing
 * - Translates DE → EN (DeepL) where EN body is missing or N9 stub
 * - Sets slug_i18n.en per config/n10-berlin-post-slugs.js
 * - Rewrites in-content /blog/ links for EN locale
 *
 * Usage:
 *   node scripts/n10-publish-en-posts.js           # all Berlin posts
 *   node scripts/n10-publish-en-posts.js --dry-run
 *   node scripts/n10-publish-en-posts.js --slug immobilienpreise-berlin
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { translateText } = require('../config/translator');
const {
  N10_BERLIN_POSTS,
  DE_TO_EN_SLUG,
  rewriteBlogLinksForLang
} = require('../config/n10-berlin-post-slugs');

const MIGRATION = path.join(__dirname, '../mitigations/add_slug_i18n_to_blog_posts.sql');
const STUB_MARKERS = [/Full English version planned \(N10\)/i, /German guide:/i];
const HUMAN_EDIT_SLUG = 'auslaender-immobilien-kaufen-berlin';
const MIN_EN_WORDS = 120;
const DELAY_MS = 450;

function asObj(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return {};
  }
}

function wordCount(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(/\s+/).length : 0;
}

function isStubEn(html) {
  const text = String(html || '').trim();
  if (!text) return true;
  if (STUB_MARKERS.some((re) => re.test(text))) return true;
  return wordCount(text) < MIN_EN_WORDS;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateField(text, { isHtml = false } = {}) {
  if (!text || !String(text).trim()) return '';
  await sleep(DELAY_MS);
  const out = await translateText(String(text), 'en', { sourceLang: 'de', isHtml });
  return out || String(text);
}

async function ensureMigration(client) {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  await client.query(sql);
}

async function processPost(client, deSlug, { dryRun = false } = {}) {
  const enSlug = DE_TO_EN_SLUG[deSlug];
  if (!enSlug) throw new Error(`No EN slug mapped for ${deSlug}`);

  const { rows } = await client.query(
    `SELECT id, slug, title, excerpt, content, title_i18n, excerpt_i18n, content_i18n, slug_i18n
     FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1`,
    [deSlug]
  );
  if (!rows[0]) {
    console.log(`  skip: ${deSlug} not found or not published`);
    return { deSlug, status: 'missing' };
  }
  const row = rows[0];
  const titleI18n = asObj(row.title_i18n);
  const excerptI18n = asObj(row.excerpt_i18n);
  const contentI18n = asObj(row.content_i18n);

  const deTitle = (titleI18n.de && String(titleI18n.de).trim()) || row.title || '';
  const deExcerpt = (excerptI18n.de && String(excerptI18n.de).trim()) || row.excerpt || deTitle;
  const deContent = (contentI18n.de && String(contentI18n.de).trim()) || row.content || '';

  let enTitle = titleI18n.en && String(titleI18n.en).trim();
  let enExcerpt = excerptI18n.en && String(excerptI18n.en).trim();
  let enContent = contentI18n.en && String(contentI18n.en).trim();

  const needsTitle = !enTitle || enTitle === deTitle;
  const needsExcerpt = !enExcerpt || isStubEn(enExcerpt);
  const needsContent = isStubEn(enContent);

  if (deSlug === HUMAN_EDIT_SLUG && needsContent && wordCount(enContent) >= MIN_EN_WORDS) {
    console.log(`  ${deSlug}: keeping existing EN body (${wordCount(enContent)} words) — human-edit post`);
  } else if (needsTitle || needsExcerpt || needsContent) {
    console.log(`  ${deSlug}: translating DE → EN...`);
    if (needsTitle) enTitle = await translateField(deTitle);
    if (needsExcerpt) enExcerpt = await translateField(deExcerpt);
    if (needsContent) enContent = await translateField(deContent, { isHtml: true });
  }

  enContent = rewriteBlogLinksForLang(enContent, 'en');
  enTitle = enTitle || deTitle;
  enExcerpt = enExcerpt || deExcerpt;

  const nextTitleI18n = { ...titleI18n, de: deTitle, en: enTitle };
  const nextExcerptI18n = { ...excerptI18n, de: deExcerpt, en: enExcerpt };
  const nextContentI18n = { ...contentI18n, de: deContent, en: enContent };
  const nextSlugI18n = { de: deSlug, en: enSlug };

  const wc = wordCount(enContent);
  console.log(`  ${deSlug} → /en/blog/${enSlug} (~${wc} EN words)`);

  if (!dryRun) {
    await client.query(
      `UPDATE blog_posts SET
        title_i18n = $1::jsonb,
        excerpt_i18n = $2::jsonb,
        content_i18n = $3::jsonb,
        slug_i18n = $4::jsonb,
        updated_at = NOW()
      WHERE id = $5`,
      [
        JSON.stringify(nextTitleI18n),
        JSON.stringify(nextExcerptI18n),
        JSON.stringify(nextContentI18n),
        JSON.stringify(nextSlugI18n),
        row.id
      ]
    );
  }

  return { deSlug, enSlug, enWords: wc, status: dryRun ? 'dry-run' : 'updated' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const onlySlug = slugArg ? slugArg.split('=')[1] : null;
  const filterSlug = process.argv.includes('--slug')
    ? process.argv[process.argv.indexOf('--slug') + 1]
    : onlySlug;

  const targets = filterSlug
    ? N10_BERLIN_POSTS.filter((p) => p.de === filterSlug)
    : N10_BERLIN_POSTS;

  if (!targets.length) {
    console.error('No matching posts. Use --slug eigenkapital-wohnungskauf');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    if (!dryRun) await ensureMigration(client);
    console.log(`N10 publish: ${targets.length} post(s), mode=${dryRun ? 'dry-run' : 'write'}\n`);

    const results = [];
    for (const { de } of targets) {
      results.push(await processPost(client, de, { dryRun }));
    }

    console.log('\nSummary:');
    console.table(results);

    if (!dryRun) {
      const check = await client.query(
        `SELECT slug, slug_i18n->>'en' AS en_slug,
                length(content_i18n->>'en') AS en_chars
         FROM blog_posts WHERE slug = ANY($1) ORDER BY slug`,
        [targets.map((t) => t.de)]
      );
      console.table(check.rows);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
