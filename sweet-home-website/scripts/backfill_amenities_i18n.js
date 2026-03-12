// scripts/backfill_amenities_i18n.js
// Populates amenities_i18n for projects that have amenities but no translations.
// Requires DEEPL_API_KEY in .env.
// Run: node scripts/backfill_amenities_i18n.js

require('dotenv').config();
const { query, connectDB } = require('../config/db');
const { ensureAmenitiesTranslations } = require('../utils/translationHelper');
const { detectLanguageFromFields } = require('../utils/languageDetection');

function needsAmenitiesBackfill(amenities, amenitiesI18n) {
  if (!Array.isArray(amenities) || amenities.length === 0) return false;
  const items = amenities.map(s => String(s || '').trim()).filter(Boolean);
  if (items.length === 0) return false;
  if (!amenitiesI18n || typeof amenitiesI18n !== 'object') return true;
  const hasAllLangs = ['en', 'de', 'es'].every(lang => {
    const arr = amenitiesI18n[lang];
    return Array.isArray(arr) && arr.length === items.length && arr.every(v => v && String(v).trim());
  });
  return !hasAllLangs;
}

(async function run() {
  if (!process.env.DEEPL_API_KEY) {
    console.error('DEEPL_API_KEY is required in .env');
    process.exit(1);
  }
  await connectDB();

  const { rows } = await query(`
    SELECT id, title, description, amenities, amenities_i18n
    FROM projects
    WHERE amenities IS NOT NULL
  `);

  let updated = 0;
  for (const r of rows) {
    let amenities = r.amenities;
    if (typeof amenities === 'string') {
      try {
        amenities = JSON.parse(amenities);
      } catch (_) {
        if (amenities.startsWith('{')) {
          amenities = amenities.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
        } else {
          amenities = [amenities];
        }
      }
    }
    if (!Array.isArray(amenities)) amenities = [];
    const items = amenities.map(s => String(s || '').trim()).filter(Boolean);
    if (items.length === 0) continue;
    if (!needsAmenitiesBackfill(items, r.amenities_i18n)) continue;

    let sourceLang = detectLanguageFromFields({ title: r.title || '', description: r.description || '' });
    if (!sourceLang || sourceLang === 'auto') sourceLang = 'en';
    const existing = r.amenities_i18n && typeof r.amenities_i18n === 'object' ? r.amenities_i18n : {};
    const amenitiesI18n = await ensureAmenitiesTranslations(items, sourceLang, existing);

    await query(
      `UPDATE projects SET amenities_i18n = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(amenitiesI18n), r.id]
    );
    updated += 1;
    console.log(`[projects] Updated amenities_i18n id=${r.id}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(JSON.stringify({ projects_amenities_updated: updated }));
  process.exit(0);
})().catch(err => {
  console.error(err && (err.stack || err.message || err));
  process.exit(1);
});
