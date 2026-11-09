#!/usr/bin/env node
/**
 * V4 guide excerpts Adi approved on 2026-11-09.
 * Updates excerpt_i18n only. Does not touch article bodies or updated_at.
 *
 *   node scripts/v4-apply-approved-excerpts.js
 */
require('dotenv').config();
const { Client } = require('pg');

const UPDATES = [
  { match: 'hausgeld-eigentumswohnung', lang: 'de', text: 'Hausgeld ist der beschlossene Vorschuss auf Kosten und Rücklage. Nur der Betriebskostenanteil kann auf den Mieter fallen.' },
  { match: 'hausgeld-service-charges-germany', lang: 'en', text: 'Hausgeld is the voted advance for costs and the reserve. Only the operating-cost share can pass to a tenant.' },
  { match: 'wohnung-kaufen-prenzlauer-berg-ratgeber', lang: 'de', text: 'Prenzlauer Berg: 6.300 €/m² mittlere Kaufpreise 2025. Der Ratgeber prüft Straße und Haus, nicht nur den Namen.' },
  { match: 'buying-apartment-prenzlauer-berg-guide', lang: 'en', text: 'Prenzlauer Berg: €6,300/m² mean purchase price in 2025. The guide checks the street and the building.' },
  { match: 'wohnung-kaufen-kreuzberg-ratgeber', lang: 'de', text: 'Kreuzberg: 5.647 €/m² mittlere Kaufpreise 2025. Der Ratgeber prüft Kiez, Lärm und das Haus.' },
  { match: 'buying-apartment-kreuzberg-guide', lang: 'en', text: 'Kreuzberg: €5,647/m² mean purchase price in 2025. The guide checks the pocket, the noise, and the building.' },
  { match: 'spekulationssteuer-immobilie', lang: 'de', text: 'Nach mehr als 10 Jahren fällt ein privater Verkauf nicht unter § 23. Die Seite erklärt Frist und Eigennutzung.' },
  { match: 'capital-gains-tax-property-germany', lang: 'en', text: 'After more than 10 years, a private sale falls outside section 23. This page explains the period and owner-occupation.' },
  { match: 'wohnung-kaufen-moabit-ratgeber', lang: 'de', text: 'Moabit hat keinen eigenen amtlichen €/m²-Mittelwert. Der Ratgeber trennt die Lagen im Ortsteil.' },
  { match: 'buying-apartment-moabit-guide', lang: 'en', text: 'Moabit has no separate official price average. The guide separates the pockets inside Mitte.' },
  { match: 'wohnung-kaufen-neukoelln-ratgeber', lang: 'de', text: 'Neukölln: 4.425 €/m² mittlere Kaufpreise 2025. Die fünf Ortsteile sind nicht derselbe Kauf.' },
  { match: 'buying-apartment-neukoelln-guide', lang: 'en', text: 'Neukölln: €4,425/m² mean purchase price in 2025. The five localities are not the same purchase.' }
];

async function main() {
  for (const row of UPDATES) {
    if (row.text.length > 155) throw new Error(`too long ${row.match}: ${row.text.length}`);
    if (/[\u2014\u2013]/.test(row.text)) throw new Error(`dash in ${row.match}`);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    for (const row of UPDATES) {
      const found = await client.query(
        `SELECT id, slug FROM blog_posts
         WHERE slug = $1 OR slug_i18n->>'de' = $1 OR slug_i18n->>'en' = $1`,
        [row.match]
      );
      if (found.rows.length !== 1) {
        throw new Error(`${row.match} matched ${found.rows.length} posts`);
      }
      const id = found.rows[0].id;
      const updated = await client.query(
        `UPDATE blog_posts
         SET excerpt_i18n = jsonb_set(COALESCE(excerpt_i18n, '{}'::jsonb), $2::text[], to_jsonb($3::text), true),
             excerpt = CASE WHEN $4 = 'de' THEN $3 ELSE excerpt END
         WHERE id = $1
         RETURNING id, slug, char_length(excerpt_i18n->>$4) AS len`,
        [id, [row.lang], row.text, row.lang]
      );
      const saved = updated.rows[0];
      console.log(`${saved.id} ${saved.slug} ${row.lang} ${saved.len}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
