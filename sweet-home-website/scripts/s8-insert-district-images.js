/**
 * S8 — insert district area photos into /blog/wo-in-berlin-wohnung-kaufen (DE + EN).
 * Updates content + content_i18n via DB (no Admin-Save / DeepL).
 *
 * Photos live at /images/blog/wo-in-berlin-{district}.jpg and link to district landings.
 *
 * Usage: node scripts/s8-insert-district-images.js
 * Dry-run: DRY_RUN=1 node scripts/s8-insert-district-images.js
 */
require('dotenv').config();
const { Client } = require('pg');

const SLUG = 'wo-in-berlin-wohnung-kaufen';
const DRY = process.env.DRY_RUN === '1';

/** After these DE H3s, insert linked photo (once). */
const DE_INSERTS = [
  {
    after: '<h3>Mitte</h3>',
    html: `<p><a href="/wohnung-kaufen-berlin-mitte"><img src="/images/blog/wo-in-berlin-mitte.jpg" alt="Berlin Mitte – Lage für Wohnungskäufer" width="1200" height="800" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Charlottenburg</h3>',
    html: `<p><a href="/wohnung-kaufen-charlottenburg"><img src="/images/blog/wo-in-berlin-charlottenburg.jpg" alt="Charlottenburg Berlin – Lage für Wohnungskäufer" width="960" height="640" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Kreuzberg</h3>',
    html: `<p><a href="/wohnung-kaufen-kreuzberg"><img src="/images/blog/wo-in-berlin-kreuzberg.jpg" alt="Kreuzberg Berlin – Lage für Wohnungskäufer" width="1024" height="683" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Schöneberg</h3>',
    html: `<p><a href="/wohnung-kaufen-schoeneberg"><img src="/images/blog/wo-in-berlin-schoeneberg.jpg" alt="Schöneberg Berlin – Lage für Wohnungskäufer" width="678" height="452" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Moabit</h3>',
    html: `<p><a href="/wohnung-kaufen-moabit"><img src="/images/blog/wo-in-berlin-moabit.jpg" alt="Moabit Berlin – Lage für Wohnungskäufer" width="1200" height="800" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Neukölln</h3>',
    html: `<p><a href="/wohnung-kaufen-neukoelln"><img src="/images/blog/wo-in-berlin-neukoelln.jpg" alt="Neukölln Berlin – Lage für Wohnungskäufer" width="886" height="480" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Pankow</h3>',
    html: `<p><a href="/wohnung-kaufen-pankow"><img src="/images/blog/wo-in-berlin-pankow.jpg" alt="Pankow Berlin – Lage für Wohnungskäufer" width="1200" height="910" loading="lazy" /></a></p>`
  },
  {
    after: '<h3>Spandau</h3>',
    html: `<p><a href="/wohnung-kaufen-spandau"><img src="/images/blog/wo-in-berlin-spandau.jpg" alt="Spandau Berlin – Lage für Wohnungskäufer" width="1250" height="724" loading="lazy" /></a></p>`
  }
];

/** Before these unique EN paragraph openings, insert linked photo (once). */
const EN_INSERTS = [
  {
    before:
      '<p><strong><a href="/wohnung-kaufen-berlin-mitte">Buying an apartment in Berlin Mitte</a></strong>',
    html: `<p><a href="/en/properties-for-sale-mitte"><img src="/images/blog/wo-in-berlin-mitte.jpg" alt="Berlin Mitte — location for apartment buyers" width="1200" height="800" loading="lazy" /></a></p>`
  },
  {
    before:
      '<p><strong>[[landing:berlin_charlottenburg|Buying an Apartment in Charlottenburg|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-charlottenburg"><img src="/images/blog/wo-in-berlin-charlottenburg.jpg" alt="Charlottenburg, Berlin — location for apartment buyers" width="960" height="640" loading="lazy" /></a></p>`
  },
  {
    before:
      '<p><strong>[[landing:berlin_friedrichshain_kreuzberg|Buy an apartment in Friedrichshain-Kreuzberg|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-kreuzberg"><img src="/images/blog/wo-in-berlin-kreuzberg.jpg" alt="Kreuzberg, Berlin — location for apartment buyers" width="1024" height="683" loading="lazy" /></a></p>`
  },
  {
    before:
      '<p><strong>[[landing:berlin_schoeneberg|Buying an Apartment in Schöneberg|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-schoeneberg"><img src="/images/blog/wo-in-berlin-schoeneberg.jpg" alt="Schöneberg, Berlin — location for apartment buyers" width="678" height="452" loading="lazy" /></a></p>`
  },
  {
    before: '<p><strong>[[landing:berlin_moabit|Buy an apartment in Moabit|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-moabit"><img src="/images/blog/wo-in-berlin-moabit.jpg" alt="Moabit, Berlin — location for apartment buyers" width="1200" height="800" loading="lazy" /></a></p>`
  },
  {
    before: '<p><strong>[[landing:berlin_neukoelln|Buy an apartment in Neukölln|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-neukoelln"><img src="/images/blog/wo-in-berlin-neukoelln.jpg" alt="Neukölln, Berlin — location for apartment buyers" width="886" height="480" loading="lazy" /></a></p>`
  },
  {
    before: '<p><strong><a href="/wohnung-kaufen-pankow">Buying an Apartment in Pankow</a></strong>',
    html: `<p><a href="/en/properties-for-sale-pankow"><img src="/images/blog/wo-in-berlin-pankow.jpg" alt="Pankow, Berlin — location for apartment buyers" width="1200" height="910" loading="lazy" /></a></p>`
  },
  {
    before: '<p><strong>[[landing:berlin_spandau|Buy an apartment in Spandau|inline]]</strong>',
    html: `<p><a href="/en/properties-for-sale-spandau"><img src="/images/blog/wo-in-berlin-spandau.jpg" alt="Spandau, Berlin — location for apartment buyers" width="1250" height="724" loading="lazy" /></a></p>`
  }
];

function insertAfter(html, marker, block) {
  if (html.includes(block.trim()) || html.includes(srcFrom(block))) {
    return { html, status: 'skip' };
  }
  const i = html.indexOf(marker);
  if (i < 0) return { html, status: 'missing-marker' };
  const at = i + marker.length;
  return { html: html.slice(0, at) + '\n' + block + html.slice(at), status: 'inserted' };
}

function insertBefore(html, marker, block) {
  if (html.includes(srcFrom(block))) {
    return { html, status: 'skip' };
  }
  const i = html.indexOf(marker);
  if (i < 0) return { html, status: 'missing-marker' };
  return { html: html.slice(0, i) + block + '\n' + html.slice(i), status: 'inserted' };
}

function srcFrom(block) {
  const m = block.match(/src="([^"]+)"/);
  return m ? m[1] : block;
}

function countImgs(html) {
  return (html.match(/\/images\/blog\/wo-in-berlin-(?!wohnung)/g) || []).length;
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
    `SELECT id, content, content_i18n FROM blog_posts WHERE slug = $1`,
    [SLUG]
  );
  if (!rows.length) throw new Error(`Post not found: ${SLUG}`);

  const row = rows[0];
  const i18n =
    typeof row.content_i18n === 'string'
      ? JSON.parse(row.content_i18n)
      : { ...(row.content_i18n || {}) };

  let de = i18n.de || row.content || '';
  let en = i18n.en || '';

  console.log(`Post id=${row.id} slug=${SLUG}`);
  console.log(`Before: DE district imgs=${countImgs(de)} EN=${countImgs(en)}`);

  for (const item of DE_INSERTS) {
    const r = insertAfter(de, item.after, item.html);
    de = r.html;
    console.log(`  DE ${item.after.replace(/<[^>]+>/g, '')}: ${r.status}`);
  }
  for (const item of EN_INSERTS) {
    const label = (item.before.match(/Buying[^<]+|Buy an[^|]+/) || ['district'])[0];
    const r = insertBefore(en, item.before, item.html);
    en = r.html;
    console.log(`  EN ${label}: ${r.status}`);
  }

  console.log(`After:  DE district imgs=${countImgs(de)} EN=${countImgs(en)}`);

  if (DRY) {
    console.log('DRY_RUN=1 — no DB write');
    await client.end();
    return;
  }

  i18n.de = de;
  i18n.en = en;

  await client.query(
    `UPDATE blog_posts
     SET content = $1,
         content_i18n = $2::jsonb,
         updated_at = NOW()
     WHERE id = $3`,
    [de, JSON.stringify(i18n), row.id]
  );

  console.log('Updated content + content_i18n.de/en (no Admin-Save).');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
