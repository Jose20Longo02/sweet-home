// scripts/backfill_i18n.js
// One-off backfill: populate title_i18n / description_i18n / excerpt_i18n / content_i18n
// for existing BlogPost, Property, and Project records. Safe to run multiple times.

require('dotenv').config();
const { query, connectDB } = require('../config/db');
const { ensureLocalizedFields } = require('../config/translator');

async function backfillBlogPosts() {
  const { rows } = await query(`SELECT id, title, excerpt, content, title_i18n, excerpt_i18n, content_i18n FROM blog_posts`);
  let updated = 0;
  for (const r of rows) {
    const i18n = await ensureLocalizedFields({
      fields: { title: r.title || '', excerpt: r.excerpt || '', content: r.content || '' },
      existing: { title_i18n: r.title_i18n, excerpt_i18n: r.excerpt_i18n, content_i18n: r.content_i18n },
      sourceLang: 'en', targetLangs: ['es','de'], htmlFields: ['content']
    });
    await query(`UPDATE blog_posts SET title_i18n=$1, excerpt_i18n=$2, content_i18n=$3 WHERE id=$4`, [i18n.title_i18n, i18n.excerpt_i18n, i18n.content_i18n, r.id]);
    updated += 1;
  }
  return updated;
}

async function backfillProperties() {
  const { rows } = await query(`SELECT id, title, description, title_i18n, description_i18n FROM properties`);
  let updated = 0;
  for (const r of rows) {
    const i18n = await ensureLocalizedFields({
      fields: { title: r.title || '', description: r.description || '' },
      existing: { title_i18n: r.title_i18n, description_i18n: r.description_i18n },
      sourceLang: 'en', targetLangs: ['es','de'], htmlFields: ['description']
    });
    await query(`UPDATE properties SET title_i18n=$1, description_i18n=$2 WHERE id=$3`, [i18n.title_i18n, i18n.description_i18n, r.id]);
    updated += 1;
  }
  return updated;
}

async function backfillProjects() {
  const { rows } = await query(`SELECT id, title, description, title_i18n, description_i18n FROM projects`);
  let updated = 0;
  for (const r of rows) {
    const i18n = await ensureLocalizedFields({
      fields: { title: r.title || '', description: r.description || '' },
      existing: { title_i18n: r.title_i18n, description_i18n: r.description_i18n },
      sourceLang: 'en', targetLangs: ['es','de'], htmlFields: ['description']
    });
    await query(`UPDATE projects SET title_i18n=$1, description_i18n=$2 WHERE id=$3`, [i18n.title_i18n, i18n.description_i18n, r.id]);
    updated += 1;
  }
  return updated;
}

(async function run(){
  await connectDB();
  const bp = await backfillBlogPosts();
  const pr = await backfillProperties();
  const pj = await backfillProjects();
  console.log(JSON.stringify({ blog_posts_updated: bp, properties_updated: pr, projects_updated: pj }));
  process.exit(0);
})().catch(err => {
  console.error(err && (err.stack || err));
  process.exit(1);
});


