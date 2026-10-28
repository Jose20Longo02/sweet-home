/**
 * V2 — official 2025 condominium prices by former borough on the Immobilienpreise guide.
 * Source: Gutachterausschuss für Grundstückswerte in Berlin,
 * Immobilienmarktbericht Berlin 2025/2026, figure 42 (data year 2025).
 * Means are after a 10 percent outlier trim. Updates content + content_i18n.
 * No Admin-Save.
 *
 * Dry-run: DRY_RUN=1 node scripts/v2-district-price-table.js
 */
require('dotenv').config();
const { Client } = require('pg');

const POST_ID = 154;
const MARKER = 'data-v2-district-prices';
const PDF = 'https://www.berlin.de/gutachterausschuss/_assets/amarktinformationen/amarktanalyse/04-03-010-2500.pdf';
const DRY = process.env.DRY_RUN === '1';

/** Official rows, report order. mean/low/high are euros per m², cases are 2025. */
const ROWS = [
  ['Mitte', 779, 3501, 15914, 9374],
  ['Tiergarten', 301, 3097, 8477, 5486],
  ['Wedding', 307, 2546, 6078, 4197],
  ['Friedrichshain', 832, 3844, 8060, 5887],
  ['Kreuzberg', 458, 3160, 8212, 5647],
  ['Prenzlauer Berg', 663, 3911, 8656, 6300],
  ['Weißensee', 162, 3139, 7629, 5563],
  ['Pankow', 540, 2751, 7673, 5194],
  ['Charlottenburg', 936, 3019, 7583, 5201],
  ['Wilmersdorf', 761, 3251, 8009, 5547],
  ['Grunewald', 61, 4005, 8560, 6111],
  ['Schmargendorf', 106, 3166, 7558, 5183],
  ['Spandau', 456, 1981, 4579, 3235],
  ['Steglitz', 712, 2435, 6428, 4390],
  ['Zehlendorf', 271, 2833, 6892, 4768],
  ['Dahlem', 57, 4400, 8340, 6427],
  ['Schöneberg', 677, 3253, 7566, 5421],
  ['Tempelhof', 495, 2474, 5707, 4011],
  ['Neukölln', 500, 2200, 6776, 4425],
  ['Treptow', 320, 2220, 6184, 4066],
  ['Köpenick', 711, 2158, 11841, 7134],
  ['Marzahn', 45, 2336, 4500, 3372],
  ['Hellersdorf', 56, 1735, 5354, 3356],
  ['Lichtenberg', 311, 2985, 6925, 4990],
  ['Rummelsburg', 41, 2948, 7789, 5538],
  ['Hohenschönhausen', 104, 2227, 5059, 3494],
  ['Reinickendorf', 539, 2262, 5528, 3755]
];

function money(n, lang) {
  return n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
}

function chart(lang) {
  const rows = ROWS.map(([name, , , , mean]) => ({ name, mean }))
    .sort((a, b) => b.mean - a.mean);
  const max = rows[0].mean;
  const rowH = 26;
  const height = rows.length * rowH + 8;
  const labelW = 158;
  const barMax = 390;
  const bars = rows.map((row, i) => {
    const y = 6 + i * rowH;
    const width = Math.max(4, Math.round((row.mean / max) * barMax));
    const label = money(row.mean, lang);
    return `<text x="0" y="${y + 16}" font-size="13" fill="#174b38">${row.name}</text>`
      + `<rect x="${labelW}" y="${y + 4}" width="${width}" height="16" rx="4" fill="#2ea862"></rect>`
      + `<text x="${labelW + width + 8}" y="${y + 16}" font-size="12" fill="#334155">${label}</text>`;
  }).join('');
  const title = lang === 'de'
    ? 'Mittlerer Kaufpreis 2025 in Euro je Quadratmeter Wohnfläche, vom höchsten zum niedrigsten Altbezirk'
    : 'Average 2025 purchase price in euros per square meter, from the highest former borough to the lowest';
  const caption = lang === 'de'
    ? 'Dieselben Mittelwerte wie in der Tabelle, sortiert vom höchsten zum niedrigsten. Berlin gesamt nach derselben Bereinigung: 5.017 €/m².'
    : 'The same averages as the table, sorted from highest to lowest. Berlin as a whole, on the same basis, is €5,017 per square meter.';
  return `<figure ${MARKER}="chart" style="margin:8px 0 22px">`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${height}" role="img" aria-label="${title}" style="width:100%;height:auto;display:block;background:#f8fbf9;border:1px solid #e6efe9;border-radius:16px">${bars}</svg>`
    + `<figcaption style="margin-top:8px;color:#64748b;font-size:14px;line-height:1.45">${caption}</figcaption>`
    + `</figure>`;
}

function table(lang) {
  const de = lang === 'de';
  const head = de
    ? ['Altbezirk oder Ortsteil', 'Kauffälle 2025', 'Preisspanne 2025', 'Mittel 2025']
    : ['Former borough or locality', 'Sales in 2025', '2025 price range', '2025 average'];
  const cell = 'style="text-align:left;padding:8px 10px;border-bottom:1px solid #e6efe9;white-space:nowrap"';
  const headCell = 'style="text-align:left;padding:8px 10px;border-bottom:1px solid #cfe8d8;color:#23804b;font-size:13px"';
  const body = ROWS.map(([name, cases, low, high, mean]) => {
    const range = de
      ? `${money(low, lang)} bis ${money(high, lang)}`
      : `${money(low, lang)} to ${money(high, lang)}`;
    const meanText = de ? `${money(mean, lang)} €/m²` : `€${money(mean, lang)}/m²`;
    const note = name === 'Köpenick' ? '*' : '';
    return `<tr><td ${cell}>${name}${note}</td><td ${cell}>${money(cases, lang)}</td><td ${cell}>${range}</td><td ${cell}>${meanText}</td></tr>`;
  }).join('');
  const totalRange = de ? '2.347 bis 7.999' : '2,347 to 7,999';
  const totalMean = de ? '5.017 €/m²' : '€5,017/m²';
  const totalLabel = de ? 'Berlin gesamt' : 'Berlin, all areas';
  const caption = de
    ? 'Eigentumswohnungen 2025, mittlerer Kaufpreis nach Ausreißerbereinigung'
    : 'Condominiums in 2025, average purchase price after outlier removal';
  return `<div style="overflow-x:auto;margin:8px 0 16px">`
    + `<table ${MARKER}="table" style="width:100%;border-collapse:collapse;font-size:15px;line-height:1.4">`
    + `<caption style="caption-side:bottom;text-align:left;padding-top:8px;color:#64748b;font-size:13px">${caption}</caption>`
    + `<thead><tr>${head.map((label) => `<th ${headCell}>${label}</th>`).join('')}</tr></thead>`
    + `<tbody>${body}`
    + `<tr><td ${cell}><strong>${totalLabel}</strong></td><td ${cell}>${de ? '11.110' : '11,110'}</td><td ${cell}>${totalRange}</td><td ${cell}><strong>${totalMean}</strong></td></tr>`
    + `</tbody></table></div>`;
}

function block(lang) {
  const de = lang === 'de';
  const pdf = `<a href="${PDF}" target="_blank" rel="noopener noreferrer">${de ? 'Immobilienmarktbericht Berlin 2025/2026' : 'Immobilienmarktbericht Berlin 2025/2026'}</a>`;
  if (de) {
    return `<h2>Kaufpreise 2025 nach Altbezirk</h2>
<p ${MARKER}="intro">Der Gutachterausschuss für Grundstückswerte in Berlin weist Eigentumswohnungen nicht nach den zwölf heutigen Bezirken aus. Die Tabelle folgt den früheren Altbezirken und einzelnen Ortsteilen, so wie sie im ${pdf} stehen. Die Mittelwerte sind um die höchsten und niedrigsten 10 Prozent der Verkäufe bereinigt. Deshalb liegt Berlin in dieser Tabelle bei <strong>5.017 €/m²</strong>. Der rechnerische Durchschnitt aller Eigentumswohnungen, die 2025 nicht in Paketen verkauft wurden, liegt ohne diese Bereinigung bei <strong>5.511 €/m²</strong>. Beide Zahlen stehen in demselben Bericht, Datenjahr 2025.</p>
${chart('de')}
${table('de')}
<p>Im Altbezirk Köpenick wurden 2025 viele Mikroapartments mit bis zu 30 m² verkauft, oft über 10.000 €/m². Ohne diese Wohnungen nennt der Bericht dort <strong>5.321 €/m²</strong>. Lagen mit wenigen Verkäufen, etwa Marzahn, Hellersdorf, Dahlem oder Grunewald, schwanken stärker als Altbezirke mit mehreren hundert Kauffällen.</p>
<p><em>Quelle: Gutachterausschuss für Grundstückswerte in Berlin, ${pdf}, Datenjahr 2025, Abbildung 42. Veröffentlicht mit der Pressemitteilung vom 31. Juli 2026.</em></p>
<p><br></p>
`;
  }
  return `<h2>2025 purchase prices by former borough</h2>
<p ${MARKER}="intro">The Berlin committee of valuation experts does not publish these condominium prices for the city's 12 current boroughs. The table follows the former boroughs and a few localities, as printed in the ${pdf}. The averages leave out the highest and lowest 10 percent of sales. That is why Berlin as a whole is <strong>€5,017 per square meter</strong> in this table. The plain average of every condominium that was not sold as part of a package in 2025, without that trim, is <strong>€5,511 per square meter</strong>. Both figures are in the same report, for the year 2025.</p>
${chart('en')}
${table('en')}
<p>In the former borough of Köpenick, many micro-apartments of up to 30 square meters sold in 2025, often above €10,000 per square meter. Without those flats, the report puts the average there at <strong>€5,321 per square meter</strong>. Places with few sales, such as Marzahn, Hellersdorf, Dahlem, or Grunewald, move more than former boroughs with several hundred sales.</p>
<p><em>Source: Gutachterausschuss für Grundstückswerte in Berlin, ${pdf}, data year 2025, figure 42. Published with the press release of 31 July 2026.</em></p>
<p><br></p>
`;
}

function insertBefore(html, marker, snippet) {
  if (html.includes(MARKER)) return { html, status: 'already' };
  const i = html.indexOf(marker);
  if (i < 0) return { html, status: 'missing-marker' };
  return { html: html.slice(0, i) + snippet + html.slice(i), status: 'inserted' };
}

function patchCopy(html, lang) {
  let next = html;
  if (lang === 'de') {
    const from = 'Toplagen in Mitte gehören zu den teuersten. Innerhalb der Bezirke gibt es große Unterschiede, etwa zwischen zentralen Ortsteilen und Wedding im selben Bezirk Mitte.';
    const to = 'Toplagen in Mitte gehören zu den teuersten. Im Immobilienmarktbericht 2025/2026 liegt der Mittelwert für den Ortsteil Mitte bei 9.374 €/m². Der niedrigste Altbezirk in derselben Tabelle ist Spandau mit 3.235 €/m². Innerhalb der Bezirke gibt es große Unterschiede, etwa zwischen zentralen Ortsteilen und Wedding im selben Bezirk Mitte.';
    if (next.includes(from) && !next.includes('9.374 €/m². Der niedrigste')) next = next.replace(from, to);
  } else {
    next = next.replace(
      'the median purchase price for condominiums in 2025 was <strong>€5,511 per square meter</strong>',
      'the average purchase price for condominiums in 2025 was <strong>€5,511 per square meter</strong>'
    );
    next = next.replace(
      'the median purchase price for condominiums in 2025 was €5,511 per square meter',
      'the average purchase price for condominiums in 2025 was €5,511 per square meter'
    );
    const from = 'Prime locations in Mitte are among the most expensive. There are significant differences within the districts, for example, between central neighborhoods and Wedding, both in the Mitte district.';
    const to = 'Prime locations in Mitte are among the most expensive. In the 2025/2026 market report, the average for the locality of Mitte is €9,374 per square meter. The lowest former borough in the same table is Spandau, at €3,235 per square meter. There are significant differences within the districts, for example, between central neighborhoods and Wedding, both in the Mitte district.';
    if (next.includes(from) && !next.includes('€9,374 per square meter. The lowest')) next = next.replace(from, to);
  }
  return next;
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
    'SELECT id, content, content_i18n FROM blog_posts WHERE id = $1',
    [POST_ID]
  );
  if (!rows.length) throw new Error('Post 154 not found');
  const i18n = typeof rows[0].content_i18n === 'string'
    ? JSON.parse(rows[0].content_i18n)
    : { ...(rows[0].content_i18n || {}) };

  let de = patchCopy(i18n.de || rows[0].content || '', 'de');
  let en = patchCopy(i18n.en || '', 'en');
  const deInsert = insertBefore(de, '<h2>Was die Spreizung für Käufer bedeutet</h2>', block('de'));
  const enInsert = insertBefore(en, '<h2>What the Price Range Means for Buyers</h2>', block('en'));
  de = deInsert.html;
  en = enInsert.html;
  console.log('DE', deInsert.status, 'EN', enInsert.status);
  console.log('DE marker', de.includes(MARKER), 'EN marker', en.includes(MARKER));
  console.log('DE dash', de.includes('—'), 'EN dash', en.includes('—'));
  if (de.includes('—') || en.includes('—')) throw new Error('em dash in new copy');

  if (DRY) {
    console.log('DRY_RUN=1, no write');
    await client.end();
    return;
  }

  i18n.de = de;
  i18n.en = en;
  await client.query(
    `UPDATE blog_posts
     SET content = $1, content_i18n = $2::jsonb, updated_at = NOW()
     WHERE id = $3`,
    [de, JSON.stringify(i18n), POST_ID]
  );
  console.log('Updated post 154 content + content_i18n.de/en');
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
