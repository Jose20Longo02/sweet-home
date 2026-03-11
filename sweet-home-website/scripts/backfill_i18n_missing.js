// scripts/backfill_i18n_missing.js
// Fills missing title_i18n / description_i18n for properties and projects
// that have 1 or 2 missing languages (en/de/es). Detects source language
// and uses ensureCompleteTranslations. Requires DEEPL_API_KEY in .env.
// Run: node scripts/backfill_i18n_missing.js

require('dotenv').config();
const { query, connectDB } = require('../config/db');
const { ensureCompleteTranslations } = require('../utils/translationHelper');

function hasMissingLanguages(i18n) {
  if (!i18n || typeof i18n !== 'object') return true;
  const keys = Object.keys(i18n).filter(k => ['en', 'de', 'es'].includes(k));
  const hasContent = (v) => v && String(v).trim() !== '';
  const filled = keys.filter(k => hasContent(i18n[k])).length;
  return filled < 3;
}

async function backfillProperties() {
  const { rows } = await query(`SELECT id, title, description, title_i18n, description_i18n FROM properties`);
  let updated = 0;
  for (const r of rows) {
    const titleNeeds = hasMissingLanguages(r.title_i18n);
    const descNeeds = hasMissingLanguages(r.description_i18n);
    if (!titleNeeds && !descNeeds) continue;

    const fields = {
      title: r.title || '',
      description: r.description || ''
    };
    const existingI18n = {
      title_i18n: r.title_i18n || {},
      description_i18n: r.description_i18n || {}
    };
    const complete = await ensureCompleteTranslations(fields, existingI18n);
    if (complete.title_i18n || complete.description_i18n) {
      await query(
        `UPDATE properties SET title_i18n = $1, description_i18n = $2, updated_at = NOW() WHERE id = $3`,
        [complete.title_i18n || r.title_i18n, complete.description_i18n || r.description_i18n, r.id]
      );
      updated += 1;
      console.log(`[properties] Updated id=${r.id}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  return updated;
}

async function backfillProjects() {
  const { rows } = await query(`SELECT id, title, description, title_i18n, description_i18n FROM projects`);
  let updated = 0;
  for (const r of rows) {
    const titleNeeds = hasMissingLanguages(r.title_i18n);
    const descNeeds = hasMissingLanguages(r.description_i18n);
    if (!titleNeeds && !descNeeds) continue;

    const fields = {
      title: r.title || '',
      description: r.description || ''
    };
    const existingI18n = {
      title_i18n: r.title_i18n || {},
      description_i18n: r.description_i18n || {}
    };
    const complete = await ensureCompleteTranslations(fields, existingI18n);
    if (complete.title_i18n || complete.description_i18n) {
      await query(
        `UPDATE projects SET title_i18n = $1, description_i18n = $2, updated_at = NOW() WHERE id = $3`,
        [complete.title_i18n || r.title_i18n, complete.description_i18n || r.description_i18n, r.id]
      );
      updated += 1;
      console.log(`[projects] Updated id=${r.id}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  return updated;
}

(async function run() {
  if (!process.env.DEEPL_API_KEY) {
    console.error('DEEPL_API_KEY is required in .env');
    process.exit(1);
  }
  await connectDB();
  const pr = await backfillProperties();
  const pj = await backfillProjects();
  console.log(JSON.stringify({ properties_updated: pr, projects_updated: pj }));
  process.exit(0);
})().catch(err => {
  console.error(err && (err.stack || err.message || err));
  process.exit(1);
});
