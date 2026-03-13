#!/usr/bin/env node
const { query } = require('../config/db');
const { ensureLocalizedFields } = require('../config/translator');

function asObj(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return {};
  }
}

function isMissing(i18nObj, lang) {
  return !i18nObj || !i18nObj[lang] || String(i18nObj[lang]).trim() === '';
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const onlyPublished = !process.argv.includes('--all-statuses');

  const rowsSql = `
    SELECT
      id,
      slug,
      status,
      title,
      excerpt,
      content,
      title_i18n,
      excerpt_i18n,
      content_i18n
    FROM blog_posts
    ${onlyPublished ? "WHERE status = 'published'" : ''}
    ORDER BY COALESCE(published_at, created_at) ASC, id ASC
  `;

  const { rows } = await query(rowsSql);
  let processed = 0;
  let skipped = 0;
  let updated = 0;
  let failed = 0;

  console.log(`Backfill start: rows=${rows.length}, mode=${dryRun ? 'dry-run' : 'write'}, scope=${onlyPublished ? 'published' : 'all'}`);

  for (const row of rows) {
    processed += 1;

    const titleI18n = asObj(row.title_i18n);
    const excerptI18n = asObj(row.excerpt_i18n);
    const contentI18n = asObj(row.content_i18n);

    const missingAny =
      isMissing(titleI18n, 'de') ||
      isMissing(titleI18n, 'es') ||
      isMissing(excerptI18n, 'de') ||
      isMissing(excerptI18n, 'es') ||
      isMissing(contentI18n, 'de') ||
      isMissing(contentI18n, 'es');

    if (!missingAny) {
      skipped += 1;
      continue;
    }

    const sourceTitle = (titleI18n.en && String(titleI18n.en).trim()) ? titleI18n.en : (row.title || '');
    const sourceExcerpt = (excerptI18n.en && String(excerptI18n.en).trim())
      ? excerptI18n.en
      : ((row.excerpt && String(row.excerpt).trim()) ? row.excerpt : sourceTitle);
    const sourceContent = (contentI18n.en && String(contentI18n.en).trim()) ? contentI18n.en : (row.content || '');

    try {
      const localized = await ensureLocalizedFields({
        fields: {
          title: sourceTitle,
          excerpt: sourceExcerpt,
          content: sourceContent
        },
        existing: {
          title_i18n: titleI18n,
          excerpt_i18n: excerptI18n,
          content_i18n: contentI18n
        },
        sourceLang: 'en',
        targetLangs: ['es', 'de'],
        htmlFields: ['content']
      });

      const nextTitleI18n = localized.title_i18n || titleI18n;
      const nextExcerptI18n = localized.excerpt_i18n || excerptI18n;
      const nextContentI18n = localized.content_i18n || contentI18n;

      // If excerpt is still missing in target locale, use localized title as a safe fallback.
      ['de', 'es'].forEach((lang) => {
        const hasExcerpt = nextExcerptI18n[lang] && String(nextExcerptI18n[lang]).trim();
        const titleFallback = nextTitleI18n[lang] && String(nextTitleI18n[lang]).trim();
        if (!hasExcerpt && titleFallback) {
          nextExcerptI18n[lang] = titleFallback;
        }
      });

      if (!dryRun) {
        await query(
          `UPDATE blog_posts
              SET title_i18n = $1,
                  excerpt_i18n = $2,
                  content_i18n = $3,
                  updated_at = NOW()
            WHERE id = $4`,
          [
            nextTitleI18n,
            nextExcerptI18n,
            nextContentI18n,
            row.id
          ]
        );
      }

      updated += 1;
      console.log(`[${processed}/${rows.length}] OK ${row.slug}`);
    } catch (err) {
      failed += 1;
      console.error(`[${processed}/${rows.length}] FAIL ${row.slug}: ${err.message || err}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        processed,
        skipped,
        updated,
        failed,
        dryRun,
        onlyPublished
      },
      null,
      2
    )
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.stack || err.message || err);
    process.exit(1);
  });

