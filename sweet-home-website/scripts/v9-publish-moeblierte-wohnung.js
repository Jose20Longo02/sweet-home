#!/usr/bin/env node
/**
 * V9: Möblierte Wohnung Berlin. DE + EN.
 * Sources checked 2026-11-12: Senate Zweckentfremdung page, Steglitz-Zehlendorf
 * Wohnungsamt (definition and fine), furniture-surcharge guideline, BGB §§ 549
 * and 575, Senate press release of 17 April 2026 on social-preservation areas.
 *
 *   DRY_RUN=1 node scripts/v9-publish-moeblierte-wohnung.js
 *   PUBLISH=1 node scripts/v9-publish-moeblierte-wohnung.js
 *
 * Backlinks are written only with PUBLISH=1. A catalogue link back to this
 * post waits until the post is live, so the listing page never points at a 404.
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12;
const DRY_RUN = process.env.DRY_RUN === '1';
const STATUS = process.env.PUBLISH === '1' ? 'published' : 'draft';
const NOW = new Date().toISOString();

const POST = {
  slug: 'moeblierte-wohnung-berlin',
  slug_en: 'furnished-apartments-berlin',
  cover_image: '/images/blog/mietpreise-berlin-bezirk.jpg',
  title_de: 'Möblierte Wohnung Berlin: Miete, Zeitvertrag und Genehmigung',
  title_en: 'Furnished apartments in Berlin: rent, term, and permit',
  excerpt_de: 'Möbliert heißt in Berlin nicht automatisch kurz oder ohne Mieterschutz. Zuschlag, Zeitvertrag und Genehmigung sind drei verschiedene Fragen.',
  excerpt_en: 'Furnished does not by itself make a Berlin tenancy short or exempt from the rent rules. Surcharge, fixed term, and permit are three separate questions.',
  content_de: `<p><strong>Möblierte Wohnung Berlin</strong> bleibt ein Mietvertrag über Wohnraum. Die Möbel allein machen den Vertrag nicht kurz und nehmen den Mieterschutz nicht weg. Der Zuschlag in der Miete, eine Befristung und eine Genehmigung des Bezirksamts sind drei verschiedene Prüfungen. Aktuelle Angebote stehen bei den <a href="/moeblierte-wohnungen-berlin">möblierten Wohnungen in Berlin</a>.</p>
<p>Dieser Beitrag fasst die amtlichen Regeln zusammen. Er ersetzt keine Prüfung durch das Bezirksamt und keine Beratung zum einzelnen Vertrag.</p>
<h2>Was in der Miete steckt</h2>
<p>Auf die möblierte Vermietung von Wohnraum findet grundsätzlich das allgemeine Mietrecht Anwendung. Das hält die <a href="https://www.berlin.de/sen/wohnen/service/leitlinie-moeblierungszuschlaege-wohnraum/" rel="noopener noreferrer" target="_blank">Leitlinie der Senatsverwaltung für Möblierungszuschläge</a> fest. Von einer möblierten Wohnung im Rechtssinne spricht sie nur, wenn die vermietende Seite die Möblierung schuldet und für Mängel daran einsteht. Einzelne Stücke, etwa ein Einbauschrank, tragen im Regelfall keinen Zuschlag. Die Leitlinie ist nicht rechtsverbindlich. Über einen Streit entscheidet das Gericht.</p>
<p>Ein Zuschlag ist möglich, wenn die vereinbarte Miete ihn eindeutig enthält. Die Leitlinie empfiehlt, den Zuschlag und seine Rechnung schon im Vertrag auszuweisen. Eine gesetzliche Pflicht zu dieser gesonderten Zeile gibt es nicht. Dieselbe Leitlinie hält fest, dass die Mietpreisbremse aufgrund der Mietenbegrenzungsverordnung in ganz Berlin seit Juni 2015 gilt. Auf Verlangen muss die vermietende Seite die Tatsachen nennen, die für die zulässige Miete bei Mietbeginn zählen. Dazu gehören die Höhe des Zuschlags und seine Berechnung. Die Leitlinie nennt dafür § 556g Absatz 3 BGB.</p>
<p>Als Berliner Rechenweg nennt die Leitlinie 2 Prozent im Monat vom Zeitwert bei der Übergabe, gestützt auf die bisherige Rechtsprechung. Bei neuen Möbeln für 5.000 Euro sind das 100 Euro im Monat. Sind dieselben Möbel bei einer Nutzungsdauer von zehn Jahren schon vier Jahre alt, liegt der Zeitwert bei 60 Prozent und der Zuschlag bei 60 Euro im Monat. Das ist in dieser Rechnung der Höchstwert, kein automatischer Satz für jeden Vertrag. Eine Einbauküche mit Ober- und Unterschränken, Herd und Spüle steht schon im Berliner Mietspiegel 2024 als wohnwerterhöhendes Merkmal und wird im Zuschlag nicht noch einmal gezählt. Die ortsübliche Vergleichsmiete steht im Beitrag <a href="/blog/mietpreise-berlin-bezirk">Mietpreise Berlin</a>.</p>
<h2>Wohnung auf Zeit Berlin</h2>
<p>Wohnung auf Zeit Berlin meint eine befristete Vermietung. Möbliert und befristet fallen auseinander. Ein Mietverhältnis auf bestimmte Zeit ist nach <a href="https://www.gesetze-im-internet.de/bgb/__575.html" rel="noopener noreferrer" target="_blank">§ 575 BGB</a> nur zulässig, wenn die vermietende Seite nach dem Ende die Wohnung für sich, Familienangehörige oder Angehörige des Haushalts nutzen will, die Räume in zulässiger Weise beseitigen oder so wesentlich verändern oder instand setzen will, dass das laufende Mietverhältnis das erheblich erschweren würde, oder die Räume an eine zur Dienstleistung verpflichtete Person vermieten will. Der Grund muss bei Vertragsschluss schriftlich mitgeteilt werden. Fehlt diese Mitteilung, gilt das Mietverhältnis als auf unbestimmte Zeit abgeschlossen. Eine Vereinbarung zum Nachteil der mietenden Seite ist unwirksam.</p>
<p>Die Regeln zur Miete bei Mietbeginn in angespannten Märkten, zur Mieterhöhung und zum Schutz bei der Beendigung gelten nicht für Wohnraum, der nur zum vorübergehenden Gebrauch vermietet ist. Dieselbe Ausnahme gilt für Wohnraum, der Teil der vom Vermieter selbst bewohnten Wohnung ist, überwiegend möbliert überlassen wird und der mietenden Person nicht zum dauernden Gebrauch mit der Familie oder mit Personen eines auf Dauer angelegten Haushalts überlassen ist. Das steht in <a href="https://www.gesetze-im-internet.de/bgb/__549.html" rel="noopener noreferrer" target="_blank">§ 549 Absatz 2 BGB</a>. Eine möblierte Wohnung, die als Wohnung zum Wohnen überlassen wird, fällt nicht schon wegen der Möbel unter diese Ausnahme.</p>
<h2>Wann das Bezirksamt mitentscheidet</h2>
<p>Wiederholte Vermietung nach Tagen oder Wochen als Ferienwohnung oder Fremdenbeherbergung ist eine Nutzung zu anderen als Wohnzwecken. Das Wohnungsamt Steglitz-Zehlendorf gibt diese Fälle so wieder und nennt für einen Verstoß ein Bußgeld von bis zu 500.000 Euro: <a href="https://www.berlin.de/ba-steglitz-zehlendorf/politik-und-verwaltung/aemter/amt-fuer-buergerdienste/wohnungsamt/artikel.364239.php" rel="noopener noreferrer" target="_blank">Zweckentfremdung von Wohnraum</a>. Das <a href="https://www.berlin.de/sen/wohnen/rechtliches/zweckentfremdungsverbot/" rel="noopener noreferrer" target="_blank">Zweckentfremdungsverbot</a> gilt seit dem 1. Mai 2014 im ganzen Stadtgebiet. Wer die eigene Berliner Haupt- oder Nebenwohnung in Abwesenheitszeiten kurz vermietet, braucht in der Regel eine Genehmigung. Die Senatsverwaltung nennt zwei Fälle, in denen eine Genehmigung regelmäßig in Betracht kommt. Die Hauptwohnung bleibt der Lebensmittelpunkt, oder eine selbst genutzte Nebenwohnung wird an höchstens 90 Tagen im Jahr vermietet. Eine Genehmigung entfällt, wenn höchstens 49 Prozent der Wohnfläche der Hauptwohnung vermietet werden. Küche und Bad zählen dabei jeweils zur Hälfte. Eine Registrierungsnummer bleibt nötig, sobald die Unterkunft kurzfristig angeboten oder beworben wird. Seit dem 17. Juni 2026 gilt das Vierte Änderungsgesetz. Es setzt die EU-Verordnung 2024/1028 um, die seit dem 20. Mai 2026 gilt. Die Nummer steht im Angebot, und für jede Unterkunftseinheit gibt es eine eigene.</p>
<p>In sozialen Erhaltungsgebieten kommt eine zweite Prüfung dazu. Die <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1661965.php" rel="noopener noreferrer" target="_blank">Pressemitteilung vom 17. April 2026</a> setzt zum 18. April 2026 eine Genehmigungspflicht für die befristete Vermietung von Wohnraum in diesen Gebieten in Kraft. Zeitmietverträge nach § 575 BGB und die befristete Untervermietung des eigenen Haupt- oder Zweitwohnsitzes einer natürlichen Person sind danach grundsätzlich genehmigungsfähig. Zuständig sind die Bezirke. Dieselbe Mitteilung setzt den Anteil möblierter Inserate für Wohnen auf Zeit an allen Inseraten von 13 Prozent im Jahr 2012 auf 48 Prozent im Jahr 2025. Die Angebotsmiete dafür lag 2012 bei 14,37 Euro je Quadratmeter und 2025 bei 24,12 Euro je Quadratmeter, jeweils als Median des Gesamtpreises.</p>
<h2>Für Eigentümer</h2>
<p>Wer eine schon vermietete Wohnung kauft, übernimmt den bestehenden Vertrag. Wie Preis und laufende Miete dabei zusammenhängen, steht im Beitrag <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>. Eine möblierte Vermietung auf Zeit kann in einem Erhaltungsgebiet genehmigungspflichtig sein, und eine Vermietung nach Tagen oder Wochen kann unter das Zweckentfremdungsverbot fallen. Die Rendite einer dauerhaften Vermietung rechnet der <a href="/mietrendite-rechner">Mietrendite-Rechner</a>. Er ersetzt keine Genehmigung und keine Zusage, dass eine befristete möblierte Miete dauerhaft erzielbar bleibt.</p>
<h2>Häufige Fragen</h2>
<p><strong>Ist jede möblierte Wohnung ein Zeitvertrag?</strong><br>Die Befristung braucht einen der drei Gründe in § 575 BGB und die schriftliche Mitteilung bei Vertragsschluss. Sonst läuft der Vertrag unbefristet.</p>
<p><strong>Gilt die Mietpreisbremse auch mit Möbeln?</strong><br>Die Leitlinie beschreibt sie für Wohnraum in ganz Berlin seit Juni 2015, soweit nicht die Ausnahmen in § 549 Absatz 2 BGB eingreifen. Der Möblierungszuschlag muss sich auf Verlangen erklären lassen.</p>
<p><strong>Braucht jede möblierte Vermietung eine Zweckentfremdungsgenehmigung?</strong><br>Eine Wohnung, die zu Wohnzwecken überlassen wird, ist damit noch keine Ferienwohnung. Die wiederholte Vermietung nach Tagen oder Wochen als Ferienwohnung oder Beherbergung fällt unter das Verbot und braucht eine Genehmigung, soweit keine gesetzliche Ausnahme greift.</p>
<p><strong>Ersetzt dieser Beitrag den Antrag beim Bezirk?</strong><br>Genehmigung und Registrierungsnummer laufen über das Bezirksamt. Den einzelnen Vertrag prüft eine Rechtsberatung.</p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn eine Wohnung in der engeren Wahl steht, halten wir Miete, Laufzeit und die Frage der Genehmigung nebeneinander, bevor ein Inserat allein entscheidet.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
  content_en: `<p>A <strong>furnished apartment in Berlin</strong> is still a tenancy of a home. The furniture does not by itself make the contract short, and it does not by itself remove tenant protection. The furniture share of the rent, a fixed end date, and a permit from the district office are three separate checks. Current listings are in the <a href="/en/furnished-apartments-berlin">furnished apartments in Berlin</a>.</p>
<p>This guide summarises the official rules. It does not replace a check by the district office, and it does not replace advice on one contract.</p>
<h2>What is inside the rent</h2>
<p>Furnished letting of a home follows ordinary tenancy law. That is the starting point of the <a href="https://www.berlin.de/sen/wohnen/service/leitlinie-moeblierungszuschlaege-wohnraum/" rel="noopener noreferrer" target="_blank">Senate guideline on furniture surcharges</a>. The guideline treats a flat as furnished in the legal sense only when the landlord owes the furniture and is responsible for defects in it. Single pieces, such as a fitted cupboard, usually carry no surcharge. The guideline is not binding. A court decides a dispute.</p>
<p>A surcharge is possible when the agreed rent clearly includes it. The guideline recommends showing the surcharge and its calculation in the contract. There is no statutory duty to use that separate line. The same guideline states that the rent brake has applied across Berlin since June 2015 under the rent-cap regulation. On request, the landlord has to name the facts that decide whether the starting rent is allowed. Those facts include the amount of the surcharge and how it was calculated. The guideline points to section 556g (3) of the Civil Code (BGB).</p>
<p>The Berlin method in the guideline is 2 percent a month of the value at handover, drawn from existing case law. New furniture bought for 5,000 euros gives a surcharge of 100 euros a month. If those same pieces have a useful life of ten years and are already four years old, the value is 60 percent and the surcharge is 60 euros a month. In this reckoning that figure is the ceiling, not an automatic rate for every contract. A fitted kitchen with wall and base units, a cooker, and a sink is already a value feature in the 2024 Berlin rent index, so it is not counted again in the surcharge. The local comparative rent is in <a href="/en/blog/berlin-rents-by-district-2026">Berlin rents by district</a>.</p>
<h2>A fixed term is a separate question</h2>
<p>Temporary housing in Berlin, the search <em>Wohnung auf Zeit Berlin</em>, means a tenancy with an end date. Furnished and fixed-term come apart. Under <a href="https://www.gesetze-im-internet.de/bgb/__575.html" rel="noopener noreferrer" target="_blank">section 575 BGB</a> a fixed term is allowed only when, after the end, the landlord wants to use the home for themselves, for family, or for a member of the household, or wants to remove the rooms lawfully or alter or repair them so substantially that the continuing tenancy would make the work much harder, or wants to let the rooms to someone employed by them. The reason has to be given in writing when the contract is made. Without that notice the tenancy is treated as open-ended. A term that disadvantages the tenant is ineffective.</p>
<p>The rules on the starting rent in a tight market, on rent increases, and on protection when the tenancy ends do not apply to housing let only for temporary use. The same exception covers housing that is part of the home the landlord lives in, is let predominantly furnished, and is not given to the tenant for permanent use with their family or with people they keep a lasting household with. That is <a href="https://www.gesetze-im-internet.de/bgb/__549.html" rel="noopener noreferrer" target="_blank">section 549 (2) BGB</a>. A furnished apartment let as a home to live in does not fall under that exception merely because it has furniture.</p>
<h2>When the district office decides as well</h2>
<p>Repeated letting by the day or the week as a holiday flat or as guest lodging is a use other than housing. The Steglitz-Zehlendorf housing office states those cases and says a breach can be fined up to 500,000 euros: <a href="https://www.berlin.de/ba-steglitz-zehlendorf/politik-und-verwaltung/aemter/amt-fuer-buergerdienste/wohnungsamt/artikel.364239.php" rel="noopener noreferrer" target="_blank">misuse of housing</a>. The <a href="https://www.berlin.de/sen/wohnen/rechtliches/zweckentfremdungsverbot/" rel="noopener noreferrer" target="_blank">ban on misusing housing</a> has applied across the city since 1 May 2014. Someone who lets their own Berlin main home or second home for short periods while they are away usually needs a permit. The Senate department names two cases in which a permit is regularly available. The main home remains the centre of the person's life, or a second home they use themselves is let on no more than 90 days a year. No permit is required when at most 49 percent of the floor area of the main home is let. Kitchen and bathroom each count as half. A registration number is still required as soon as the unit is offered or advertised for a short stay. Since 17 June 2026 the fourth amending act has been in force. It implements EU Regulation 2024/1028, which has applied since 20 May 2026. The number appears in the offer, and each unit has its own.</p>
<p>Social preservation areas add a second check. The <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1661965.php" rel="noopener noreferrer" target="_blank">Senate press release of 17 April 2026</a> brought in, from 18 April 2026, a permit requirement for fixed-term letting of housing in those areas. Fixed-term contracts under section 575 BGB, and a fixed-term sublet of a natural person's own main or second home, are in principle eligible for a permit. The districts decide. The same release puts the share of furnished temporary-housing ads among all ads at 13 percent in 2012 and 48 percent in 2025. The asking rent for that segment was €14.37/m² in 2012 and €24.12/m² in 2025, each figure the median of the all-in price.</p>
<h2>For owners</h2>
<p>A buyer of an apartment that already has a tenant takes over the existing contract. How price and the rent in place fit together is in <a href="/en/blog/buying-tenanted-apartment-berlin">buying a tenanted apartment in Berlin</a>. A furnished let for a fixed term can need a permit in a preservation area, and letting by the day or the week can fall under the misuse ban. The return on a long-term let is what the <a href="/en/rental-yield-calculator-germany">rental yield calculator</a> works out. It does not replace a permit, and it does not promise that a fixed-term furnished rent will stay achievable.</p>
<h2>FAQ</h2>
<p><strong>Is every furnished apartment a fixed-term contract?</strong><br>A fixed term needs one of the three reasons in section 575 BGB and written notice of that reason when the contract is made. Otherwise the contract runs without an end date.</p>
<p><strong>Does the rent brake still apply when the flat is furnished?</strong><br>The guideline describes it for housing across Berlin since June 2015, except where section 549 (2) BGB applies. The furniture surcharge has to be explained on request.</p>
<p><strong>Does every furnished let need a misuse permit?</strong><br>A home let for someone to live in is not yet a holiday flat. Repeated letting by the day or the week as a holiday flat or as lodging falls under the ban and needs a permit, unless a statutory exception applies.</p>
<p><strong>Does this replace the application to the district?</strong><br>The permit and the registration number go through the district office. Advice on the individual contract stays with a lawyer.</p>
<h2>Next step with Sweet Home Berlin</h2>
<p>When an apartment is on the shortlist, we set the rent, the term, and the permit question side by side before one listing makes the decision.</p>
<p>[[landing:berlin_main|Buy an apartment in Berlin|inline]]</p>`
};

const BACKLINKS = [
  {
    slug: 'mietpreise-berlin-bezirk',
    deNeedle: 'Reicht der Median für die Rendite',
    deParagraph: '<p>Wie ein Möblierungszuschlag auf dieser Miete sitzt, und wann aus der Wohnung eine Wohnung auf Zeit wird, steht im Beitrag <a href="/blog/moeblierte-wohnung-berlin">Möblierte Wohnung Berlin</a>.</p>',
    enNeedle: 'Is the median sufficient for calculating the return',
    enParagraph: '<p>How a furniture surcharge sits on that rent, and when the let becomes a fixed term, is in <a href="/en/blog/furnished-apartments-berlin">furnished apartments in Berlin</a>.</p>'
  },
  {
    slug: 'vermietete-wohnung-kaufen-berlin',
    deNeedle: 'mieterbelegten Einstiegsstrategie',
    deParagraph: '<p>Wann eine möblierte Vermietung auf Zeit eine Genehmigung braucht, steht im Beitrag <a href="/blog/moeblierte-wohnung-berlin">Möblierte Wohnung Berlin</a>.</p>',
    enNeedle: 'tenant-occupied entry strategy',
    enParagraph: '<p>When a furnished let for a fixed term needs a permit is in <a href="/en/blog/furnished-apartments-berlin">furnished apartments in Berlin</a>.</p>'
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
    if (/[\u2014\u2013]/.test(html + excerpt + post[`title_${lang}`])) throw new Error(`dash in ${lang}`);
    if (lang === 'de' && !html.includes('Wohnung auf Zeit Berlin')) throw new Error('secondary term missing');
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
