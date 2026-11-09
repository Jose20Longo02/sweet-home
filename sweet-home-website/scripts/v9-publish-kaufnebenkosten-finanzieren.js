#!/usr/bin/env node
/**
 * V9: Kaufnebenkosten finanzieren. DE + EN.
 * The furnished-rental guide is not in this script. Its slug waits on Adi.
 *
 *   DRY_RUN=1 node scripts/v9-publish-kaufnebenkosten-finanzieren.js
 *   PUBLISH=1 node scripts/v9-publish-kaufnebenkosten-finanzieren.js
 *
 * Backlinks are written only with PUBLISH=1, so a draft is not linked from live guides.
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12;
const DRY_RUN = process.env.DRY_RUN === '1';
const STATUS = process.env.PUBLISH === '1' ? 'published' : 'draft';
const NOW = new Date().toISOString();

const POST = {
  slug: 'kaufnebenkosten-finanzieren',
  slug_en: 'financing-purchase-costs-germany',
  cover_image: '/images/blog/immobilienfinanzierung-berlin.jpg',
  title_de: 'Kaufnebenkosten finanzieren: geht das?',
  title_en: 'Financing purchase costs in Germany',
  excerpt_de: '20 bis 30 Prozent des Kaufpreises plus die Kaufnebenkosten bleiben Eigenkapital. Steuer, Notar und Makler finanziert die Bank in der Regel nicht mit.',
  excerpt_en: 'Bring 20 to 30 percent of the price plus the purchase costs as equity. The bank usually lends against the apartment, not the tax, notary, or agent.',
  content_de: `<p><strong>Kaufnebenkosten finanzieren</strong> geht beim üblichen Immobiliendarlehen nicht. Die <a href="https://www.verbraucherzentrale.de/wissen/geld-versicherungen/bau-und-immobilienfinanzierung/immobilienfinanzierung-diese-modelle-gibt-es-und-das-sollten-sie-beachten-5801" rel="noopener noreferrer" target="_blank">Verbraucherzentrale</a> rät, 20 bis 30 Prozent des Kaufpreises plus die Kaufnebenkosten aus eigenen Mitteln mitzubringen. Dazu gehören Grunderwerbsteuer, Notar, Grundbuch und, wenn ein Makler beteiligt ist, der Anteil des Käufers.</p>
<p>Die Bank prüft Kaufpreis, Einkommen und den Wert, den die Wohnung langfristig trägt. Die Nebenkosten stecken in diesem Wert nicht. Ob eine Bank im Einzelfall mehr leiht, entscheidet sie selbst. Dieser Beitrag ersetzt keine Finanzierungszusage und keine Steuerberatung.</p>
<h2>Was die Bank finanziert</h2>
<p>Ein Immobiliendarlehen ist ein Kredit, den die Wohnung sichert. Für Pfandbriefbanken ist der Wert, der der Beleihung zugrunde liegt, der Beleihungswert. <a href="https://www.gesetze-im-internet.de/belwertv/__3.html" rel="noopener noreferrer" target="_blank">§ 3 der Beleihungswertermittlungsverordnung</a> beschreibt ihn als den Wert, der über die Dauer der Beleihung voraussichtlich erzielt werden kann, ohne kurzfristige Marktschwankungen und ohne spekulative Elemente. Das ist nicht der Kaufpreis, und es sind nicht die Nebenkosten.</p>
<p>Wie Rate, Zinsbindung und Eigenkapital zur Wohnung passen, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>
<h2>Was Eigenkapital bleiben muss</h2>
<p>In Berlin beträgt die Grunderwerbsteuer 6 Prozent der Gegenleistung, in der Praxis meist des Kaufpreises. Das gilt für Vorgänge seit dem 1. Januar 2014. Die <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">Senatsverwaltung für Finanzen</a> nennt den Satz. Bei 400.000 Euro Kaufpreis sind das 24.000 Euro. Einen Freibetrag gibt es nicht. Liegt die Gegenleistung über 2.500 Euro, fällt die Steuer auf den ganzen Betrag an. Steuerschuldner sind Erwerber und Veräußerer. Im Vertrag wird meist vereinbart, dass der Käufer zahlt.</p>
<p>Bezahlt sein muss die Steuer, bevor der Käufer im Grundbuch steht. Nach der Zahlung stellt das Finanzamt die Unbedenklichkeitsbescheinigung aus und schickt sie an das Notariat. Ohne diese Bescheinigung trägt das Grundbuchamt den Eigentumsübergang nicht ein. Das beschreibt die Senatsverwaltung auf der Seite <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/artikel.1049925.php" rel="noopener noreferrer" target="_blank">Verkauf und Kauf von Immobilien</a>. Das Geld liegt also zum Bescheid bereit, nicht erst nach dem Einzug.</p>
<p>Notar und Grundbuch folgen dem Gerichts- und Notarkostengesetz. Einen festen Prozentsatz nennt das Gesetz nicht. Die Gebühr hängt von Beurkundung, Grundbuchanträgen und dem Geschäftswert ab. Die ausgearbeitete Berliner Rechnung steht im Beitrag <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>. Dieselbe Rechnung, mit dem Satz des Bundeslands, macht der <a href="/kaufnebenkosten-rechner">Kaufnebenkosten-Rechner</a>.</p>
<p>Ist ein Makler beteiligt und der Käufer Verbraucher, trägt der Käufer nicht mehr als die Hälfte des Maklerlohns. Beauftragen beide Seiten den Makler, müssen sich beide in gleicher Höhe verpflichten. Das steht in <a href="https://www.gesetze-im-internet.de/bgb/__656c.html" rel="noopener noreferrer" target="_blank">§ 656c BGB</a>. Hat nur eine Seite den Makler beauftragt, bleibt diese Seite mindestens in gleicher Höhe verpflichtet. Das regelt <a href="https://www.gesetze-im-internet.de/bgb/__656d.html" rel="noopener noreferrer" target="_blank">§ 656d BGB</a>. Der Prozentsatz selbst ist vereinbart, nicht gesetzlich fest.</p>
<h2>Wie die Lücke geschlossen wird</h2>
<p>Der erste Weg ist eigenes Geld. Guthaben, Wertpapiere und Bausparguthaben zählen dazu. Wer sie nicht einsetzt, nimmt einen höheren Kredit auf. Wie sich 20 und 30 Prozent an einem Berliner Kaufpreis rechnen, steht unter <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</p>
<p>Ein Geschenk der Familie kann die Lücke füllen, wenn das Geld dem Käufer gehört und nicht an eine Bank zurückzuzahlen ist. Bei unbeschränkter Steuerpflicht bleibt für ein Kind ein Erwerb von 400.000 Euro steuerfrei, für einen Ehegatten oder Lebenspartner 500.000 Euro. Das steht in <a href="https://www.gesetze-im-internet.de/erbstg_1974/__16.html" rel="noopener noreferrer" target="_blank">§ 16 des Erbschaftsteuer- und Schenkungsteuergesetzes</a>. Erwerbe derselben Person innerhalb von zehn Jahren werden zusammengerechnet. Ob die Schenkung im Einzelfall steuerfrei bleibt, prüft der Steuerberater. Ein Darlehen der Familie ist eine weitere Schuld. Ob die Bank es als Eigenkapital wertet, entscheidet sie.</p>
<p>Eine weitere Immobilie kann der Bank zusätzliche Sicherheit geben. Auch das ist ihre Entscheidung, kein Anspruch. Ein Kredit, der die Nebenkosten mit aufnimmt, liegt über dem Wert, den die Wohnung langfristig sichert. Die <a href="https://www.verbraucherzentrale.de/wissen/geld-versicherungen/bau-und-immobilienfinanzierung/immobilienfinanzierung-haeufige-fragen-rund-um-hauskauf-und-hauskredit-6992" rel="noopener noreferrer" target="_blank">Verbraucherzentrale</a> beschreibt die Folge von wenig Eigenkapital: höherer Zins, längere Entschuldung, und das Risiko, dass ein Verkauf vor dem Ende der Zinsbindung Schulden übrig lässt.</p>
<h2>Häufige Fragen</h2>
<p><strong>Finanziert die Bank die Grunderwerbsteuer?</strong><br>In der Regel nein. In Berlin sind das 6 Prozent der Gegenleistung, und dieser Betrag bleibt Eigenkapital.</p>
<p><strong>Kann eine Bank die Nebenkosten trotzdem mitfinanzieren?</strong><br>Manche prüfen das. Es ist ein höherer Kredit, kein Rechtsanspruch. Die Wohnung sichert den Beleihungswert, nicht die Steuer und nicht die Notarrechnung.</p>
<p><strong>Reichen 20 Prozent des Kaufpreises?</strong><br>Nein. Die Verbraucherzentrale nennt 20 bis 30 Prozent des Kaufpreises plus die Nebenkosten. 20 Prozent des Kaufpreises allein decken Steuer, Notar und Makler nicht.</p>
<p><strong>Ersetzt dieser Beitrag eine Finanzierungszusage?</strong><br>Nein. Die Bank entscheidet den Kredit. Steuer und Schenkung bleiben beim Berater.</p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn eine Wohnung in der engeren Wahl steht, rechnen wir Kaufpreis und Nebenkosten gegen das Eigenkapital, bevor die Rate allein entscheidet.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
  content_en: `<p><strong>Financing the purchase costs</strong> is not what a standard mortgage does. The <a href="https://www.verbraucherzentrale.de/wissen/geld-versicherungen/bau-und-immobilienfinanzierung/immobilienfinanzierung-diese-modelle-gibt-es-und-das-sollten-sie-beachten-5801" rel="noopener noreferrer" target="_blank">German consumer advice centre (Verbraucherzentrale)</a> says buyers should bring 20 to 30 percent of the purchase price, plus the purchase costs, from their own money. Those costs are the transfer tax, the notary, the land register, and, when an agent is involved, the buyer's share.</p>
<p>The bank looks at the price, the income, and the value the apartment can support over the life of the loan. The purchase costs are not inside that value. Whether a bank will lend more in one file is its own decision. This guide is not a loan offer and not tax advice.</p>
<h2>What the bank finances</h2>
<p>A property loan is a loan secured by the apartment. For Pfandbrief banks, the value used for that security is the lending value (Beleihungswert). <a href="https://www.gesetze-im-internet.de/belwertv/__3.html" rel="noopener noreferrer" target="_blank">Section 3 of the Lending Value Regulation (BelWertV)</a> defines it as the value that can be expected over the whole term of the loan, without short-term market swings and without speculative elements. It is not the purchase price, and it is not the purchase costs.</p>
<p>How the monthly payment, the fixed-rate period, and the equity fit the apartment is in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>
<h2>What has to stay equity</h2>
<p>In Berlin the transfer tax is 6 percent of the consideration, in practice usually the purchase price. That rate applies to transactions from 1 January 2014. The <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">Senate Department of Finance</a> states the rate. On a price of 400,000 euros the tax is 24,000 euros. There is no tax-free allowance. If the consideration is above 2,500 euros, the tax is charged on the whole amount. Buyer and seller both owe the tax. The contract usually says the buyer pays.</p>
<p>The tax has to be paid before the buyer is entered in the land register. After payment, the tax office issues a clearance certificate and sends it to the notary. Without that certificate the land register does not record the transfer. The Senate Department explains this on its page <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/artikel.1049925.php" rel="noopener noreferrer" target="_blank">buying and selling property</a>. The money has to be ready when the assessment arrives, not after moving in.</p>
<p>Notary and land-register fees follow the Court and Notary Costs Act. The statute does not set one flat percentage. The fee depends on the deed, the land-register applications, and the transaction value. The worked Berlin example is in <a href="/en/blog/cost-of-buying-property-berlin">the cost of buying property in Berlin</a>. The same reckoning, with the rate of the state where the property sits, is in the <a href="/en/property-purchase-costs-calculator-germany">purchase-costs calculator</a>.</p>
<p>When an agent is involved and the buyer is a consumer, the buyer pays no more than half of the agent's fee. If both sides appoint the agent, both must commit to the same amount. That rule is <a href="https://www.gesetze-im-internet.de/bgb/__656c.html" rel="noopener noreferrer" target="_blank">section 656c of the Civil Code (BGB)</a>. If only one side appointed the agent, that side must remain liable for at least the same amount. That is <a href="https://www.gesetze-im-internet.de/bgb/__656d.html" rel="noopener noreferrer" target="_blank">section 656d BGB</a>. The percentage itself is agreed. It is not a statutory fee on every contract.</p>
<h2>How buyers close the gap</h2>
<p>The first route is the buyer's own money. Savings, securities, and building-society balances count. Leaving them invested means borrowing more. How 20 and 30 percent work on a Berlin purchase price is in <a href="/en/blog/down-payment-for-buying-apartment-berlin">the down payment for buying an apartment</a>.</p>
<p>A gift from the family can fill the gap when the money belongs to the buyer and is not owed back to a bank. Where German gift tax applies without limit, a child can receive 400,000 euros tax free, and a spouse or civil partner 500,000 euros. That is <a href="https://www.gesetze-im-internet.de/erbstg_1974/__16.html" rel="noopener noreferrer" target="_blank">section 16 of the Inheritance and Gift Tax Act</a>. Gifts from the same person within ten years are added together. Whether one gift stays tax free is a question for a tax adviser. A loan from the family is another debt. The bank decides whether it counts as equity.</p>
<p>Another property can give the bank extra security. That too is the bank's decision, not a right. A loan that also covers the purchase costs sits above the value the apartment secures over the long term. The <a href="https://www.verbraucherzentrale.de/wissen/geld-versicherungen/bau-und-immobilienfinanzierung/immobilienfinanzierung-haeufige-fragen-rund-um-hauskauf-und-hauskredit-6992" rel="noopener noreferrer" target="_blank">Verbraucherzentrale</a> describes what little equity means: a higher interest rate, a longer time to clear the debt, and the risk that a sale before the fixed rate ends leaves debt behind.</p>
<h2>FAQ</h2>
<p><strong>Will the bank finance the transfer tax?</strong><br>Usually no. In Berlin that tax is 6 percent of the consideration, and that amount stays equity.</p>
<p><strong>Can a bank still include the purchase costs?</strong><br>Some will look at it. It is a larger loan, not a legal right. The apartment secures the lending value, not the tax and not the notary's bill.</p>
<p><strong>Is 20 percent of the price enough?</strong><br>No. The consumer advice centre calls for 20 to 30 percent of the price plus the purchase costs. Twenty percent of the price alone does not cover tax, notary, and agent.</p>
<p><strong>Does this replace a loan offer?</strong><br>No. The bank decides the loan. Tax and gifts stay with an adviser.</p>
<h2>Next step with Sweet Home Berlin</h2>
<p>When an apartment is on the shortlist, we set the price and the purchase costs against the equity before the monthly payment is the only number in the room.</p>
<p>[[landing:berlin_main|Buy an apartment in Berlin|inline]]</p>`
};

const BACKLINKS = [
  {
    slug: 'kaufnebenkosten-berlin',
    deNeedle: 'finanzieren die Kaufnebenkosten nicht mit',
    deParagraph: '<p>Ob eine Bank die Nebenkosten im Einzelfall doch mit aufnimmt, und was dann Eigenkapital bleiben muss, steht im Beitrag <a href="/blog/kaufnebenkosten-finanzieren">Kaufnebenkosten finanzieren</a>.</p>',
    enNeedle: 'additional capital is required to complete a property transaction',
    enParagraph: '<p>Whether a bank will take those costs into the loan, and what still has to stay equity, is in <a href="/en/blog/financing-purchase-costs-germany">financing the purchase costs</a>.</p>'
  },
  {
    slug: 'eigenkapital-wohnungskauf',
    deNeedle: 'bleiben in der Regel Eigenkapital',
    deParagraph: '<p>Wie Käufer die Lücke zwischen Kaufpreis und Nebenkosten schließen, steht im Beitrag <a href="/blog/kaufnebenkosten-finanzieren">Kaufnebenkosten finanzieren</a>.</p>',
    enNeedle: 'Banks often provide only limited financing',
    enParagraph: '<p>How buyers close the gap between the price and those costs is in <a href="/en/blog/financing-purchase-costs-germany">financing the purchase costs</a>.</p>'
  },
  {
    slug: 'immobilienfinanzierung-berlin',
    deNeedle: 'nur zum Teil finanzieren',
    deParagraph: '<p>Welche Posten die Bank in der Regel nicht mitfinanziert, steht im Beitrag <a href="/blog/kaufnebenkosten-finanzieren">Kaufnebenkosten finanzieren</a>.</p>',
    enNeedle: 'A typical financing package covers the purchase price',
    enParagraph: '<p>Which costs the bank usually leaves as equity is in <a href="/en/blog/financing-purchase-costs-germany">financing the purchase costs</a>.</p>'
  }
];

function words(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function assertCopy(post) {
  for (const lang of ['de', 'en']) {
    const html = post[`content_${lang}`];
    const excerpt = post[`excerpt_${lang}`];
    if (excerpt.length > 155) throw new Error(`excerpt too long ${lang}: ${excerpt.length}`);
    if (/[\u2014]/.test(html) || /[\u2014]/.test(excerpt)) throw new Error(`em dash in ${lang}`);
    const anchors = [...html.matchAll(/<a\b([^>]*)>/g)];
    const hrefs = [];
    for (const match of anchors) {
      const attrs = match[1];
      const href = (attrs.match(/href="([^"]+)"/) || [])[1];
      if (!href) throw new Error(`anchor without href in ${lang}`);
      hrefs.push(href);
      const internal = href.startsWith('/');
      const blank = /target="_blank"/.test(attrs);
      if (internal && blank) throw new Error(`internal link opens a new tab in ${lang}: ${href}`);
      if (!internal && !blank) throw new Error(`external link stays in the same tab in ${lang}: ${href}`);
    }
    const counts = {};
    for (const href of hrefs) counts[href] = (counts[href] || 0) + 1;
    const dup = Object.entries(counts).filter(([, n]) => n > 1);
    if (dup.length) throw new Error(`duplicate href in ${lang}: ${dup.map(([h]) => h).join(', ')}`);
    if (lang === 'en') {
      const bad = hrefs.filter((h) => h.startsWith('/') && !h.startsWith('/en/'));
      if (bad.length) throw new Error(`English internal link off /en: ${bad.join(', ')}`);
    }
  }
}

function insertAfterParagraph(html, needle, paragraph) {
  if (html.includes(paragraph)) return html;
  const at = html.indexOf(needle);
  if (at < 0) throw new Error(`anchor missing: ${needle}`);
  const end = html.indexOf('</p>', at);
  if (end < 0) throw new Error(`paragraph end missing: ${needle}`);
  const cut = end + 4;
  return `${html.slice(0, cut)}${paragraph}${html.slice(cut)}`;
}

async function upsert(client) {
  const titleI18n = { de: POST.title_de, en: POST.title_en };
  const excerptI18n = { de: POST.excerpt_de, en: POST.excerpt_en };
  const contentI18n = { de: POST.content_de, en: POST.content_en };
  const slugI18n = { de: POST.slug, en: POST.slug_en };
  const found = await client.query(
    `SELECT id FROM blog_posts WHERE slug = $1 OR slug_i18n->>'en' = $2 LIMIT 1`,
    [POST.slug, POST.slug_en]
  );
  if (found.rows[0]) {
    if (DRY_RUN) {
      console.log(`  would update id=${found.rows[0].id}`);
      return found.rows[0].id;
    }
    await client.query(
      `UPDATE blog_posts SET
        author_id = $1,
        status = $2::varchar,
        cover_image = $3,
        title = $4,
        excerpt = $5,
        content = $6,
        title_i18n = $7::jsonb,
        excerpt_i18n = $8::jsonb,
        content_i18n = $9::jsonb,
        slug_i18n = $10::jsonb,
        published_at = CASE WHEN $2::varchar = 'published' THEN COALESCE(published_at, $11::timestamptz) ELSE published_at END,
        updated_at = $11::timestamptz
      WHERE id = $12`,
      [
        AUTHOR_ID, STATUS, POST.cover_image,
        POST.title_de, POST.excerpt_de, POST.content_de,
        JSON.stringify(titleI18n), JSON.stringify(excerptI18n), JSON.stringify(contentI18n), JSON.stringify(slugI18n),
        NOW, found.rows[0].id
      ]
    );
    console.log(`  updated id=${found.rows[0].id} status=${STATUS}`);
    return found.rows[0].id;
  }
  if (DRY_RUN) {
    console.log('  would insert');
    return null;
  }
  const ins = await client.query(
    `INSERT INTO blog_posts (
      author_id, slug, status, cover_image,
      title, excerpt, content,
      title_i18n, excerpt_i18n, content_i18n, slug_i18n,
      published_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb,
      $12::timestamptz, $13::timestamptz, $13::timestamptz
    ) RETURNING id`,
    [
      AUTHOR_ID, POST.slug, STATUS, POST.cover_image,
      POST.title_de, POST.excerpt_de, POST.content_de,
      JSON.stringify(titleI18n), JSON.stringify(excerptI18n), JSON.stringify(contentI18n), JSON.stringify(slugI18n),
      STATUS === 'published' ? NOW : null, NOW
    ]
  );
  console.log(`  inserted id=${ins.rows[0].id} status=${STATUS}`);
  return ins.rows[0].id;
}

async function linkGuides(client) {
  if (STATUS !== 'published' || DRY_RUN) {
    console.log('Backlinks skipped until PUBLISH=1.');
    return;
  }
  for (const link of BACKLINKS) {
    const { rows } = await client.query(
      `SELECT id, content_i18n FROM blog_posts WHERE slug = $1`,
      [link.slug]
    );
    if (!rows[0]) throw new Error(`missing ${link.slug}`);
    let i18n = rows[0].content_i18n;
    if (typeof i18n === 'string') i18n = JSON.parse(i18n);
    i18n = { ...(i18n || {}) };
    const before = JSON.stringify(i18n);
    i18n.de = insertAfterParagraph(i18n.de || '', link.deNeedle, link.deParagraph);
    i18n.en = insertAfterParagraph(i18n.en || '', link.enNeedle, link.enParagraph);
    if (JSON.stringify(i18n) === before) {
      console.log(`  ${link.slug} already linked`);
      continue;
    }
    await client.query(
      `UPDATE blog_posts SET content_i18n = $1::jsonb, updated_at = $2::timestamptz WHERE id = $3`,
      [JSON.stringify(i18n), NOW, rows[0].id]
    );
    console.log(`  linked ${link.slug}`);
  }
}

async function main() {
  assertCopy(POST);
  console.log(`de ${words(POST.content_de)} words, en ${words(POST.content_en)} words`);
  console.log(`excerpt de ${POST.excerpt_de.length}, en ${POST.excerpt_en.length}`);
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: connectionString && connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await upsert(client);
    await linkGuides(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
