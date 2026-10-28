/**
 * V3 — title, excerpt, and one answer block under the H1.
 * Blog bodies update in the database. No Admin-Save.
 * The English listings page is not in this script. That copy waits for Adi.
 *
 * Dry-run: DRY_RUN=1 node scripts/v3-rank-no-clicks.js
 */
require('dotenv').config();
const { Client } = require('pg');

const DRY = process.env.DRY_RUN === '1';
const MARKER = 'data-v3-answer="1"';

const GUTACHTER = 'https://www.berlin.de/gutachterausschuss/marktinformationen/marktanalyse/artikel.175633.php';
const VACANCY = 'https://www.empirica-institut.de/assets/content/typo3/Redaktion/Publikationen_Referenzen/PDFs/CBRE-empirica-Leerstandsindex-Methode-2025.pdf';
const IBB = 'https://www.ibb.de/de/ueber-uns/publikationen/wohnungsmarktbericht/2025.html';

const PRICE_SENTENCE = 'Existing apartments averaged €5,130/m² in 2025, up 3% year-on-year. New construction averaged €8,200/m².';
const PRICE_REPLACEMENT = 'The Gutachterausschuss für Grundstückswerte in Berlin reports an average purchase price of €5,511/m² for condominiums in 2025, up 5% from 2024. Newly built residential complexes averaged €8,108/m².';

function assertCopy(label, text) {
  if (text.includes('\u2014')) throw new Error(`${label} contains an em dash`);
  if (label.endsWith('excerpt') && text.length > 155) {
    throw new Error(`${label} is ${text.length} characters`);
  }
}

function prepend(html, block) {
  if (html.includes(MARKER)) return html;
  return block + html;
}

function rentTable() {
  const rows = [
    ['Mitte', '20,00 €/m²'],
    ['Friedrichshain-Kreuzberg', '19,40 €/m²'],
    ['Charlottenburg-Wilmersdorf', '19,17 €/m²'],
    ['Pankow', '17,00 €/m²'],
    ['Tempelhof-Schöneberg', '15,79 €/m²'],
    ['Treptow-Köpenick', '15,60 €/m²'],
    ['Steglitz-Zehlendorf', '15,00 €/m²'],
    ['Neukölln', '13,61 €/m²'],
    ['Lichtenberg', '13,33 €/m²'],
    ['Reinickendorf', '12,80 €/m²'],
    ['Spandau', '12,50 €/m²'],
    ['Marzahn-Hellersdorf', '11,56 €/m²']
  ];
  const tdL = 'style="padding:10px 14px;border-bottom:1px solid #e6efe9;text-align:left;color:#1f2937"';
  const tdR = 'style="padding:10px 14px;border-bottom:1px solid #e6efe9;text-align:right;font-weight:700;color:#174b38"';
  const body = rows.map(([name, rent]) => `<tr><td ${tdL}>${name}</td><td ${tdR}>${rent}</td></tr>`).join('');
  return `<div ${MARKER} style="margin:0 0 18px">
<p>Der Median der Nettokaltmiete im Berliner Mietspiegel 2026 liegt bei <strong>7,71 €/m²</strong>. Das ist die Vergleichsmiete aus dem Mietspiegel, nicht die Miete aus Inseraten.</p>
<div style="margin:14px 0 8px;background:#f8fbf9;border:1px solid #e6efe9;border-radius:16px;overflow:hidden">
<p style="margin:0;padding:14px 16px 0;color:#174b38">Angebotsmieten 2025 nach Bezirk. Median laut <a href="${IBB}" target="_blank" rel="noopener noreferrer">IBB Wohnungsmarktbericht 2025</a>. Das sind Inseratsmieten, keine Mietspiegelwerte. Berlin gesamt: 15,78 €/m².</p>
<table style="width:100%;border-collapse:collapse;margin:8px 0 0">
<thead><tr><th style="padding:10px 14px;text-align:left;color:#23804b;font-size:12px;letter-spacing:.04em;text-transform:uppercase">Bezirk</th><th style="padding:10px 14px;text-align:right;color:#23804b;font-size:12px;letter-spacing:.04em;text-transform:uppercase">Angebotsmiete</th></tr></thead>
<tbody>${body}</tbody>
</table>
</div>
</div>`;
}

const COPY = {
  163: {
    lang: 'en',
    title: 'Capital Gains Tax on German Property: 0% After 10 Years',
    excerpt: 'After more than 10 years, a private sale of German property falls outside section 23, so that gain is not taxed. Owner-occupation can exclude it sooner.',
    block: `<p ${MARKER}>After more than 10 years between purchase and sale, a privately held German property is not a private disposal under section 23 of the Income Tax Act, so that gain is not taxed. Living in the home yourself can take the gain out earlier. The binding view stays with your tax adviser.</p>\n`
  },
  131: {
    lang: 'en',
    title: 'Berlin Property Investment: 0.3% Vacancy, €5,511/m²',
    excerpt: 'Market-active vacancy in Berlin was 0.3% at the end of 2024. Condominiums averaged €5,511/m² in 2025.',
    block: `<p ${MARKER}>The market-active vacancy in Berlin was 0.3% at the end of 2024, in the <a href="${VACANCY}" target="_blank" rel="noopener noreferrer">CBRE-empirica vacancy index</a>. The <a href="${GUTACHTER}" target="_blank" rel="noopener noreferrer">Gutachterausschuss für Grundstückswerte in Berlin</a> puts the average purchase price for condominiums in 2025 at €5,511/m².</p>\n`,
    replace: [PRICE_SENTENCE, PRICE_REPLACEMENT]
  },
  158: {
    lang: 'de',
    title: 'Mietpreise Berlin: 7,71 €/m² im Mietspiegel 2026',
    excerpt: 'Der Mietspiegel 2026 liegt im Median bei 7,71 €/m². Angebotsmieten reichen von 11,56 €/m² in Marzahn-Hellersdorf bis 20,00 €/m² in Mitte.',
    block: rentTable()
  },
  157: {
    lang: 'de',
    title: 'Eigenkapital Wohnungskauf: 124.000 Euro bei 400.000 Euro',
    excerpt: 'Bei 400.000 Euro Kaufpreis sind 20 Prozent Eigenkapital 80.000 Euro. Mit rund 11 Prozent Kaufnebenkosten liegen die eigenen Mittel bei etwa 124.000 Euro.',
    block: `<div ${MARKER}><p>Bei einem Kaufpreis von 400.000 Euro sind 20 Prozent Eigenkapital 80.000 Euro, und 30 Prozent sind 120.000 Euro. Mit rund 11 Prozent Kaufnebenkosten, etwa 44.000 Euro, liegen die eigenen Mittel bei etwa 124.000 Euro bzw. 164.000 Euro.</p><p>Beim Kredit für den Wohnungskauf finanzieren Banken üblicherweise den Kaufpreis abzüglich Ihres Eigenkapitals. Die Kaufnebenkosten, in Berlin vor allem 6 Prozent Grunderwerbsteuer, bleiben in der Regel Eigenkapital.</p></div>\n`
  },
  143: {
    lang: 'en',
    title: 'Best Berlin Districts for Families: Prenzlauer Berg, Charlottenburg',
    excerpt: 'Prenzlauer Berg and Charlottenburg are two of the first family districts buyers compare in Berlin, for schools, parks, and daily life.',
    block: `<p ${MARKER}>Prenzlauer Berg and Charlottenburg are two of the districts families in Berlin compare first. Prenzlauer Berg is the walkable choice, with parks and everyday shops. Charlottenburg is the established choice, with larger apartments and stronger transport.</p>\n`
  },
  133: {
    lang: 'de',
    title: 'Vermietete Wohnung kaufen Berlin: 30–40 % unter Leerstand',
    excerpt: 'Eine vermietete Wohnung liegt oft 30–40 % unter einer vergleichbaren leeren Wohnung. Im Beispiel sind das 280.000 Euro statt 400.000 Euro.',
    block: `<p ${MARKER}>Eine vermietete Wohnung in Berlin kann 30–40 % unter dem Preis einer vergleichbaren leeren Wohnung liegen. Im Rechenbeispiel sind das 280.000 Euro statt 400.000 Euro. Das ist kein fester Rabatt. Der Abstand entsteht, wenn die Bestandsmiete unter der Vergleichsmiete liegt.</p>\n`
  },
  160: {
    lang: 'de',
    title: 'Immobilienfinanzierung Berlin: 20 % Eigenkapital plus Nebenkosten',
    excerpt: 'Bei 400.000 Euro Kaufpreis sind 20 Prozent Eigenkapital 80.000 Euro, plus etwa 10 bis 12 Prozent Kaufnebenkosten. Die Rate muss zum Nettoeinkommen passen.',
    block: `<p ${MARKER}>Für eine Wohnung von 400.000 Euro sind 20 Prozent Eigenkapital 80.000 Euro. Dazu kommen in Berlin oft 10 bis 12 Prozent Kaufnebenkosten, die Banken nur zum Teil finanzieren. Die Monatsrate aus Zins und Tilgung muss zum Nettoeinkommen passen. Eine feste Einkommensgrenze nennt das Gesetz nicht.</p>\n`
  }
};

function apply(row) {
  const spec = COPY[row.id];
  if (!spec) throw new Error(`No copy for ${row.id}`);
  assertCopy(`${row.id} excerpt`, spec.excerpt);
  assertCopy(`${row.id} block`, spec.block);
  const lang = spec.lang;
  const i18nContent = row.content_i18n && typeof row.content_i18n === 'object' ? { ...row.content_i18n } : {};
  const current = i18nContent[lang] || (lang === 'de' ? row.content : '');
  if (!current) throw new Error(`Empty ${lang} content for ${row.id}`);
  let next = prepend(current, spec.block);
  if (spec.replace) {
    const [from, to] = spec.replace;
    if (!next.includes(from) && !next.includes(to)) throw new Error(`Price sentence missing on ${row.id}`);
    next = next.replace(from, to);
  }
  i18nContent[lang] = next;
  const titleI18n = { ...(row.title_i18n || {}) };
  const excerptI18n = { ...(row.excerpt_i18n || {}) };
  const previousTitle = titleI18n[lang] || row.title;
  titleI18n[lang] = spec.title;
  excerptI18n[lang] = spec.excerpt;
  const title = row.title === previousTitle ? spec.title : row.title;
  const excerpt = row.excerpt === (row.excerpt_i18n && row.excerpt_i18n[lang]) ? spec.excerpt : row.excerpt;
  const content = lang === 'de' && row.content === current ? next : row.content;
  return { title, excerpt, content, titleI18n, excerptI18n, i18nContent, changed: next !== current || previousTitle !== spec.title };
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  const ids = Object.keys(COPY).map(Number);
  const { rows } = await client.query(
    'SELECT id, title, title_i18n, excerpt, excerpt_i18n, content, content_i18n FROM blog_posts WHERE id = ANY($1::int[])',
    [ids]
  );
  if (rows.length !== ids.length) throw new Error(`Expected ${ids.length} posts, found ${rows.length}`);
  for (const row of rows) {
    const next = apply(row);
    console.log(row.id, next.titleI18n[COPY[row.id].lang], `(${next.excerptI18n[COPY[row.id].lang].length})`, next.changed ? 'write' : 'already');
    if (DRY || !next.changed) continue;
    await client.query(
      `UPDATE blog_posts
          SET title = $1, excerpt = $2, content = $3,
              title_i18n = $4::jsonb, excerpt_i18n = $5::jsonb, content_i18n = $6::jsonb,
              updated_at = NOW()
        WHERE id = $7`,
      [next.title, next.excerpt, next.content, JSON.stringify(next.titleI18n), JSON.stringify(next.excerptI18n), JSON.stringify(next.i18nContent), row.id]
    );
  }
  await client.end();
  console.log(DRY ? 'dry-run' : 'updated');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
