#!/usr/bin/env node
/**
 * S7 Week 1 — three Berlin blog posts (DE + real EN adaptations).
 * Official sources only (Berlin Senate / Gutachterausschuss, BaFin, BMF / gesetze-im-internet).
 * No competitor blogs as sources.
 *
 * Default: status = draft (Adi Sep cycle: human read before live).
 * Publish: PUBLISH=1 node scripts/s7-week1-publish-posts.js
 * Dry-run: DRY_RUN=1 node scripts/s7-week1-publish-posts.js
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12; // Irem Demirci
const NOW = new Date().toISOString();
const WANT_PUBLISH = process.env.PUBLISH === '1';
const STATUS = WANT_PUBLISH ? 'published' : 'draft';

// Relative paths (same pattern as N9) — works on any host/port; do not bake APP_URL/localhost.
const COVERS = {
  finanzierung: '/images/blog/immobilienfinanzierung-berlin.jpg',
  lohntSich: '/images/blog/lohnt-sich-immobilie-kaufen-berlin.jpg',
  steuern: '/images/blog/steuern-fuer-vermieter.jpg',
};

const posts = [
  {
    slug: 'immobilienfinanzierung-berlin',
    slug_en: 'mortgage-financing-berlin',
    cover_image: COVERS.finanzierung,
    title_de: 'Immobilienfinanzierung Berlin: So planen Käufer den Kredit',
    excerpt_de:
      'Immobilienfinanzierung in Berlin startet selten bei null Eigenkapital. So planen Sie Kredit, Rate und Nebenkosten – auch als Ausländer oder Selbstständige.',
    title_en: 'Mortgage financing in Berlin: how buyers plan the loan',
    excerpt_en:
      'Mortgage financing in Berlin rarely starts with zero equity. How to plan loan size, monthly payments and purchase costs — including for foreigners and self-employed buyers.',
    content_de: `<p><strong>Immobilienfinanzierung Berlin</strong> bedeutet mehr als einen Zinssatz zu vergleichen. Zwischen Kaufpreis, Nebenkosten, Eigenkapital und monatlicher Tragfähigkeit entscheidet sich, ob ein Angebot wirklich zu Ihrem Profil passt – oder nur auf dem Papier funktioniert.</p>
<p>Bei Sweet Home Berlin klären wir die Finanzierungslogik früh: nicht als Bankersatz, sondern damit Shortlist und Budget zusammenpassen, bevor Besichtigungen Emotionen übernehmen.</p>
<p>Aktuelle Objekte zum [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Was zur Immobilienfinanzierung in Berlin gehört</h2>
<p>Eine typische Finanzierung deckt den Kaufpreis ab – plus oft einen Teil der Nebenkosten. In Berlin gehören zur Gesamtrechnung vor allem Notar und Grundbuch, die <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a> und gegebenenfalls Maklerkosten. Einen Überblick über die Gesamtbelastung finden Sie unter <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p>Die Aufsichtsbehörde <a href="https://www.bafin.de/DE/verbraucherinnen-verbraucher/themen-finanzprodukte/kredite-immobilienfinanzierung/immobilienfinanzierung/immobilienkredit/immobilienkredit.html" rel="noopener noreferrer" target="_blank">BaFin</a> empfiehlt Verbrauchern, zuerst Eigenkapital, tragbare Monatsrate und möglichen Kreditrahmen zu klären – und erst dann das konkrete Objekt festzuzurren. Genau diese Reihenfolge nutzen wir bei Sweet Home Berlin in der Praxis.</p>
<p><br></p>
<h2>Eigenkapital: warum Banken danach fragen</h2>
<p>Je weniger Eigenkapital Sie einbringen, desto höher ist das Ausfallrisiko für den Kreditgeber. Die <a href="https://www.bundesbank.de/de/publikationen/forschung/research-brief/2023-60-eigenheimfinanzierung-662714" rel="noopener noreferrer" target="_blank">Deutsche Bundesbank</a> erklärt diesen Zusammenhang klar: niedrige Eigenkapitalquoten können bei vielen gleichzeitigen Ausfällen die Finanzstabilität belasten. Für Sie als Käufer heißt das konkret: mehr Eigenkapital verbessert oft Konditionen und Puffer – und macht die Rate robuster.</p>
<p>Wie viel Eigenkapital „reicht“, hängt von Bank, Objekt und Profil ab. Eine praxisnahe Einordnung finden Sie in unserem Guide zum <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</p>
<p><br></p>
<h2>Monatsrate, Schuldendienst und Stress-Test</h2>
<p>Die Rate setzt sich aus Zins und Tilgung zusammen. Entscheidend ist nicht der schönste Effektivzins im Vergleichsrechner, sondern ob Sie die Rate auch dann tragen, wenn Mieteinnahmen schwanken, Zinsen später steigen oder eine Sonderumlage der WEG kommt.</p>
<p>Sweet Home Berlin rechnet deshalb mit einem einfachen Stress-Blick:</p>
<ul>
<li>Monatsbelastung aus dem Kredit</li>
<li>laufende Wohnkosten und Rücklagen</li>
<li>bei Vermietung: realistische Ist-Miete statt Wunschmiete</li>
</ul>
<p>Investoren verbinden das mit der <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>-Logik, bevor sie den Hebel maximieren.</p>
<p><br></p>
<h2>Immobilienfinanzierung Berlin für Ausländer</h2>
<p>Nicht-Gebietsansässige können in vielen Fällen in Berlin finanzieren – aber Banken prüfen Einkommen, Bonität, Aufenthaltsstatus und die Objektqualität besonders genau. Es gibt keinen automatischen „Ausländer-Zuschlag“ als Gesetzestext, wohl aber praxisübliche Hürden bei Unterlagen und Eigenkapital.</p>
<p>Den rechtlichen und praktischen Rahmen zum Erwerb finden Sie unter <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>. Sweet Home Berlin abgestimmt die Objektwahl früh mit realistischen Finanzierungsannahmen, statt erst nach der Besichtigung zu überraschen.</p>
<p><br></p>
<h2>Selbstständige und unregelmäßiges Einkommen</h2>
<p>Selbstständige brauchen oft mehr Nachweise: Bilanzen, Steuerbescheide, betriebswirtschaftliche Auswertungen. Das verlängert die Prüfung, ändert aber nicht die Grundlogik: tragbare Rate, ausreichend Eigenkapital, belastbares Objekt.</p>
<p>Wer vermietet kaufen will, sollte Mietvertrag und Mieterhöhungsspielraum vor der Finanzierungszusage prüfen – siehe <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>.</p>
<p><br></p>
<h2>Typische Fehler bei der Immobilienfinanzierung</h2>
<p>Viele Kaufprozesse scheitern nicht am Objekt, sondern an einer zu engen Gesamtrechnung. Häufige Punkte: Nebenkosten wurden „vergessen“, die Wunschmiete wurde als Ist-Miete angesetzt, oder die Rate lässt keinen Puffer für Instandhaltung. Sweet Home Berlin hält diese Annahmen bewusst nüchtern – damit die Finanzierung zur Strategie passt, nicht umgekehrt.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Brauche ich Eigenkapital für die Immobilienfinanzierung in Berlin?</strong><br>In der Praxis ja, jedenfalls für belastbare Konditionen. Wie viel, hängt von Bank und Profil ab. Orientierung: unser Beitrag zum <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</p>
<p><strong>Können Ausländer in Berlin finanzieren?</strong><br>Oft ja, mit strengeren Unterlagen und klarer Bonität. Details zum Kaufprozess: <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><strong>Welche Kosten kommen zur Finanzierung dazu?</strong><br>Vor allem Grunderwerbsteuer, Notar/Grundbuch und ggf. Makler – siehe <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p><strong>Ersetzt Sweet Home Berlin die Bankberatung?</strong><br>Nein. Wir helfen, Objekt und Budget zusammenzubringen und Annahmen ehrlich zu prüfen. Die Kreditentscheidung trifft die finanzierende Bank.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Sie Immobilienfinanzierung in Berlin nicht nur rechnen, sondern an konkrete Wohnungen koppeln wollen, helfen wir bei Shortlist, Preislogik und realistischer Monatsbelastung.</p>
<p>Start: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`,
    content_en: `<p><strong>Mortgage financing in Berlin</strong> is more than comparing interest rates. Purchase price, transaction costs, equity and monthly affordability decide whether a listing fits your profile — or only looks good on a spreadsheet.</p>
<p>At Sweet Home Berlin we clarify financing logic early: not as a bank substitute, but so shortlist and budget stay aligned before viewings take over.</p>
<p>Browse current homes via [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>
<p><br></p>
<h2>What mortgage financing in Berlin usually includes</h2>
<p>A typical loan covers the purchase price and sometimes part of the closing costs. In Berlin those costs mainly include notary and land register fees, <a href="/en/blog/berlin-transfer-tax-grunderwerbsteuer">Berlin transfer tax (Grunderwerbsteuer)</a>, and possibly agent fees. For the full cost stack, see <a href="/en/blog/cost-of-buying-property-berlin">the cost of buying property in Berlin</a>.</p>
<p>Germany’s financial supervisor <a href="https://www.bafin.de/DE/verbraucherinnen-verbraucher/themen-finanzprodukte/kredite-immobilienfinanzierung/immobilienfinanzierung/immobilienkredit/immobilienkredit.html" rel="noopener noreferrer" target="_blank">BaFin</a> advises consumers to clarify equity, a sustainable monthly payment and a realistic loan amount before locking onto one property. That is the order Sweet Home Berlin uses in practice.</p>
<p><br></p>
<h2>Why banks care about equity</h2>
<p>The less equity you bring, the larger the lender’s loss if you default. The <a href="https://www.bundesbank.de/de/publikationen/forschung/research-brief/2023-60-eigenheimfinanzierung-662714" rel="noopener noreferrer" target="_blank">Deutsche Bundesbank</a> explains why thin equity across many loans can become a system risk. For buyers, the practical takeaway is simpler: more equity usually means stronger terms and a healthier buffer.</p>
<p>How much equity is “enough” depends on the bank, the asset and your profile. For a buyer-facing overview, read <a href="/en/blog/down-payment-for-buying-apartment-berlin">down payment for buying an apartment in Berlin</a>.</p>
<p><br></p>
<h2>Monthly payment, debt service and a stress check</h2>
<p>The payment combines interest and principal. The prettiest APR in a comparison tool matters less than whether you can still carry the payment if rents wobble, rates reset higher later, or the owners’ association votes a special levy.</p>
<p>Sweet Home Berlin uses a simple stress view:</p>
<ul>
<li>monthly loan payment</li>
<li>ongoing housing costs and reserves</li>
<li>for rentals: actual rent under the lease, not a marketing rent</li>
</ul>
<p>Investors should also run a clean <a href="/en/blog/how-to-calculate-rental-yield-berlin">rental yield calculation</a> before maximising leverage.</p>
<p><br></p>
<h2>Mortgage financing in Berlin for foreigners</h2>
<p>Non-residents can often finance in Berlin, but banks look closely at income, creditworthiness, residence status and asset quality. There is no single statute that automatically adds a “foreigner surcharge”, yet document and equity hurdles are common in practice.</p>
<p>For the buying framework, see <a href="/en/blog/how-foreigners-can-buy-property-in-berlin">how foreigners can buy property in Berlin</a>. Sweet Home Berlin aligns property selection with realistic financing assumptions early, instead of surprising you after a viewing.</p>
<p><br></p>
<h2>Self-employed buyers and irregular income</h2>
<p>Self-employed applicants usually need more paperwork: accounts, tax assessments, management reports. That slows underwriting, but the logic stays the same: affordable payment, enough equity, a bankable property.</p>
<p>If you buy tenanted stock, check the lease and rent-increase room before the financing commitment — see <a href="/en/blog/buying-tenanted-apartment-berlin">buying a tenanted apartment in Berlin</a>.</p>
<p><br></p>
<h2>Common financing mistakes</h2>
<p>Many deals fail on the numbers, not the floor plan: closing costs ignored, wishful rent treated as current rent, or a payment with no maintenance buffer. Sweet Home Berlin keeps those assumptions deliberately sober so financing follows strategy.</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>Do I need equity for mortgage financing in Berlin?</strong><br>In practice, yes — at least for resilient terms. How much depends on the bank and your profile. Start with <a href="/en/blog/down-payment-for-buying-apartment-berlin">down payment for buying an apartment in Berlin</a>.</p>
<p><strong>Can foreigners get a mortgage in Berlin?</strong><br>Often yes, with stricter documentation. Buying context: <a href="/en/blog/how-foreigners-can-buy-property-in-berlin">how foreigners can buy property in Berlin</a>.</p>
<p><strong>What costs sit outside the loan?</strong><br>Mainly transfer tax, notary/land register and possibly an agent — see <a href="/en/blog/cost-of-buying-property-berlin">cost of buying property in Berlin</a>.</p>
<p><strong>Does Sweet Home Berlin replace bank advice?</strong><br>No. We help match property and budget. The lender makes the credit decision.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If you want mortgage financing in Berlin tied to real apartments — not only a calculator — we help with shortlist, pricing logic and a realistic monthly payment.</p>
<p>Start here: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>`
  },
  {
    slug: 'lohnt-sich-immobilie-kaufen-berlin',
    slug_en: 'is-buying-property-in-berlin-worth-it',
    cover_image: COVERS.lohntSich,
    title_de: 'Lohnt sich Immobilie kaufen in Berlin noch?',
    excerpt_de:
      'Lohnt sich Immobilie kaufen in Berlin noch? Offizielle Kaufpreise lagen 2025 bei 5.511 €/m² im Mittel – so prüfen Sie, ob Kauf für Sie noch Sinn ergibt.',
    title_en: 'Is buying property in Berlin still worth it?',
    excerpt_en:
      'Is buying property in Berlin still worth it? Official condo prices averaged €5,511/m² in 2025 — how to judge whether purchase still fits your plan.',
    content_de: `<p><strong>Lohnt sich Immobilie kaufen in Berlin noch?</strong> Die ehrliche Antwort lautet: Es kommt auf Haltedauer, Nutzung und Gesamtrechnung an – nicht auf eine Schlagzeile zum Stadt-Durchschnitt.</p>
<p>Bei Sweet Home Berlin ersetzen wir die Ja/Nein-Frage durch eine belastbare Prüfung: Preisniveau, Nebenkosten, Finanzierung und – bei Vermietung – realistische Miete. Erst dann entscheiden wir, ob ein Objekt noch „passt“.</p>
<p>Aktuelle Angebote: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Was die offiziellen Preise 2025/2026 sagen</h2>
<p>Laut dem <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1699073.php" rel="noopener noreferrer" target="_blank">Immobilienmarktbericht 2025/2026 des Gutachterausschusses für Grundstückswerte in Berlin</a> lag der mittlere Kaufpreis für Eigentumswohnungen 2025 bei <strong>5.511 €/m²</strong> (+5 % gegenüber 2024). Verkäufe in neu erstellten Wohnanlagen lagen im Mittel bei <strong>8.108 €/m²</strong>. Im 1. Quartal 2026 zeigten sich die Preise laut derselben Quelle nahezu unverändert.</p>
<p>Gleichzeitig stieg die Zahl der Kauffälle im Wohnungs- und Teileigentum 2025 auf 18.303 (+10 %). Mehr Umsatz heißt nicht automatisch „günstig“ – aber der Markt ist nicht eingefroren. Eine tiefere Einordnung finden Sie unter <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>.</p>
<p><br></p>
<h2>Warum der Durchschnitt die Kaufentscheidung nicht ersetzt</h2>
<p>5.511 €/m² ist ein Mittelwert aus beurkundeten Käufen – nicht Ihr Straßenpreis. Zwischen Toplagen in Mitte und ruhigeren Außenlagen liegen Welten. Sweet Home Berlin nutzt den Offizialwert als Orientierung, dann filtern wir nach Bezirk, Zustand, Energie und Mikrolage.</p>
<p>Für die Lagewahl helfen der Vergleich <a href="/blog/wo-in-berlin-wohnung-kaufen">wo in Berlin Wohnung kaufen</a> und die Übersicht zu den <a href="/blog/beste-bezirke-immobilien-berlin">besten Bezirken Immobilien Berlin</a>.</p>
<p><br></p>
<h2>Wann sich der Kauf noch lohnen kann</h2>
<p>Kauf lohnt sich eher, wenn mindestens eines dieser Profile klar ist:</p>
<ul>
<li><strong>Langer Horizont:</strong> Sie halten über Zins- und Marktzyklen hinweg.</li>
<li><strong>Eigennutzung:</strong> Sie tauschen Miete gegen Wohnwert und Planbarkeit.</li>
<li><strong>Vermietung mit ehrlicher Rechnung:</strong> Ist-Miete, Capex und Nebenkosten sind gesetzt – siehe <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a>.</li>
</ul>
<p>Wer nur auf kurzfristige Wertsteigerung spekuliert, stellt die falsche Frage. Berlin bleibt ein angespannter Wohnungsmarkt: Der <a href="https://www.berlin.de/sen/stadtentwicklung/planung/stadtentwicklungsplaene/step-wohnen-2040/" rel="noopener noreferrer" target="_blank">Stadtentwicklungsplan Wohnen 2040</a> des Senats beziffert den zusätzlichen Bedarf bis 2040 auf 222.000 neue Wohnungen. Angebot und Nachfrage bleiben strukturell relevant – ohne Garantie für Ihren Einzelkauf.</p>
<p><br></p>
<h2>Kauf vs. Miete: die Gesamtrechnung</h2>
<p>„Lohnt sich kaufen?“ heißt in der Praxis: Kaufpreis + Nebenkosten + Finanzierung + Instandhaltung gegen Miete + Flexibilität. In Berlin kommen oft 10 bis 12 % Kaufnebenkosten dazu. Rechnen Sie sie von Anfang an mit – sonst wirkt jedes Objekt zu günstig.</p>
<p>Für Investoren zählt zusätzlich die Netto-Logik nach Kosten, nicht nur die Bruttomiete im Exposé. Sweet Home Berlin prüft das objektbezogen, bevor Emotionen die Excel-Datei ersetzen.</p>
<p><br></p>
<h2>Wann Kauf eher nicht passt</h2>
<p>Wenn Ihr Horizont kurz ist, das Eigenkapital knapp und die Rate keinen Puffer lässt, ist Mieten oft die ehrlichere Antwort – zumindest vorübergehend. Auch stark sanierungsbedürftige Objekte ohne Capex-Reserve können eine scheinbar „günstige“ Gelegenheit teuer machen.</p>
<p>Eine nüchterne Checkliste vor dem Notar: <a href="/blog/wohnungskauf-berlin-checkliste">Wohnungskauf Berlin Checkliste</a>.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Lohnt sich Immobilie kaufen in Berlin 2026 noch?</strong><br>Für lageorientierte Käufer mit Horizont und belastbarer Gesamtrechnung oft ja. Der Offizialmittelwert lag 2025 bei 5.511 €/m²; entscheidend bleibt Ihr Objekt.</p>
<p><strong>Sind die Preise wieder stark gestiegen?</strong><br>Laut Gutachterausschuss +5 % bei Eigentumswohnungen 2025, im 1. Quartal 2026 nahezu unverändert. Das ist Stabilisierung mit leichter Aufwärtsbewegung – kein Freifahrtschein.</p>
<p><strong>Ist Vermietung die bessere Logik?</strong><br>Nur mit Ist-Miete und Kostenwahrheit. Startpunkt: <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a>.</p>
<p><strong>Wie hilft Sweet Home Berlin?</strong><br>Wir übersetzen Marktzahlen in Shortlist, Preischeck und ehrliche Tragfähigkeit – nicht in Marketingformeln.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Sie die Frage „Lohnt sich Immobilie kaufen in Berlin noch?“ an konkrete Wohnungen und Zahlen koppeln wollen, starten wir mit Budget, Strategie und Bezirk – dann mit Objekten.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>Is buying property in Berlin still worth it?</strong> The honest answer depends on hold period, use case and total cost — not on a headline about the city average.</p>
<p>At Sweet Home Berlin we replace the yes/no slogan with a bankable check: price level, closing costs, financing and — for rentals — realistic rent. Only then do we decide whether a home still fits.</p>
<p>Current listings: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>
<p><br></p>
<h2>What official 2025/2026 prices say</h2>
<p>According to the <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1699073.php" rel="noopener noreferrer" target="_blank">Berlin valuation committee’s 2025/2026 market report</a>, the average purchase price for condominiums in 2025 was <strong>€5,511/m²</strong> (+5% vs 2024). Sales in newly built complexes averaged <strong>€8,108/m²</strong>. In Q1 2026, prices were nearly unchanged on the same source.</p>
<p>Condo and part-ownership transactions also rose to 18,303 cases in 2025 (+10%). More turnover does not mean “cheap”, but the market is not frozen. For deeper context, read <a href="/en/blog/berlin-property-prices-2026">Berlin property prices</a>.</p>
<p><br></p>
<h2>Why the average cannot make your decision</h2>
<p>€5,511/m² is a mean of notarised sales — not your street price. Premium Mitte and quieter outer districts are different markets. Sweet Home Berlin uses the official figure as orientation, then filters by district, condition, energy and micro-location.</p>
<p>For area choice, use <a href="/en/blog/where-to-buy-apartment-in-berlin">where to buy an apartment in Berlin</a> and <a href="/en/blog/best-berlin-districts-for-property-investment">best Berlin districts for property investment</a>.</p>
<p><br></p>
<h2>When buying can still make sense</h2>
<p>Purchase is more convincing when at least one of these is clear:</p>
<ul>
<li><strong>Long horizon:</strong> you can hold through rate and market cycles.</li>
<li><strong>Owner-occupation:</strong> you trade rent for housing quality and planning certainty.</li>
<li><strong>Letting with honest numbers:</strong> actual rent, capex and running costs are set — see <a href="/en/blog/berlin-real-estate-investment-guide-2026">Berlin real estate as an investment</a>.</li>
</ul>
<p>If you only chase short-term appreciation, you are asking the wrong question. Berlin remains a tight housing market: the Senate’s <a href="https://www.berlin.de/sen/stadtentwicklung/planung/stadtentwicklungsplaene/step-wohnen-2040/" rel="noopener noreferrer" target="_blank">urban development plan for housing 2040</a> puts additional need through 2040 at 222,000 new homes. Supply and demand stay structurally relevant — without guaranteeing your individual deal.</p>
<p><br></p>
<h2>Buy vs rent: the full calculation</h2>
<p>“Is buying worth it?” means purchase price + closing costs + financing + maintenance versus rent + flexibility. In Berlin, closing costs often add about 10–12%. Include them from day one or every listing looks too cheap.</p>
<p>Investors also need net logic after costs, not only the brochure rent. Sweet Home Berlin checks that property by property.</p>
<p><br></p>
<h2>When buying is probably not the answer</h2>
<p>If your horizon is short, equity is thin and the payment has no buffer, renting is often the more honest path — at least for now. Heavy-capex buildings without a reserve can also turn a “bargain” expensive.</p>
<p>Before the notary, use <a href="/en/blog/what-to-check-before-buying-an-apartment-in-berlin">what to check before buying an apartment in Berlin</a>.</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>Is buying property in Berlin still worth it in 2026?</strong><br>For location-led buyers with horizon and a solid total cost plan, often yes. The official 2025 average was €5,511/m²; your asset still decides.</p>
<p><strong>Are prices rising fast again?</strong><br>The valuation committee shows +5% for condos in 2025 and nearly flat prices in Q1 2026. That is stabilisation with a mild upward tilt — not a free pass.</p>
<p><strong>Is letting the better logic?</strong><br>Only with actual rent and cost truth. Start with <a href="/en/blog/berlin-real-estate-investment-guide-2026">Berlin real estate as an investment</a>.</p>
<p><strong>How does Sweet Home Berlin help?</strong><br>We turn market figures into shortlist, price checks and affordability — not marketing slogans.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If you want “is buying property in Berlin still worth it?” answered with real homes and numbers, we start with budget, strategy and district — then with properties.</p>
<p>[[landing:berlin_main|apartments for sale in Berlin|inline]]</p>`
  },
  {
    slug: 'steuern-fuer-vermieter',
    slug_en: 'german-rental-property-taxes',
    cover_image: COVERS.steuern,
    title_de: 'Steuern für Vermieter: AfA, Zinsen und Kaufnebenkosten',
    excerpt_de:
      'Steuern für Vermieter starten oft bei der AfA: für viele Wohngebäude mit Bauantrag nach 2022 gilt 3 % linear. Was Zinsen, Grunderwerbsteuer und Co. bedeuten.',
    title_en: 'German rental property taxes: depreciation, interest and purchase costs',
    excerpt_en:
      'German rental property taxes often start with depreciation: many residential buildings with a building permit after 2022 use 3% straight-line AfA. What interest, transfer tax and costs mean.',
    content_de: `<p><strong>Steuern für Vermieter</strong> entscheiden mit, ob eine Wohnung als Kapitalanlage trägt – oder nur brutto gut aussieht. Es geht selten um einen einzelnen Trick, sondern um AfA, absetzbare Werbungskosten und die Kosten, die schon beim Kauf anfallen.</p>
<p>Sweet Home Berlin ersetzt keine Steuerberatung. Wir ordnen die steuerliche Logik so ein, dass Sie Objekte und Annahmen ehrlich vergleichen können – bevor Sie notariell unterschreiben.</p>
<p>Rahmen für Investoren: <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a>.</p>
<p><br></p>
<h2>AfA: Abschreibung auf das Gebäude</h2>
<p>Bei vermieteten Wohnimmobilien können Sie die Anschaffungs- oder Herstellungskosten des Gebäudes (nicht des Grund und Bodens) über die AfA geltend machen. Maßgeblich ist <a href="https://www.gesetze-im-internet.de/estg/__7.html" rel="noopener noreferrer" target="_blank">§ 7 Einkommensteuergesetz (EStG)</a>.</p>
<p>Für Wohngebäude gilt nach der aktuellen Fassung des § 7 Abs. 4 EStG unter anderem: Wurde der Bauantrag nach dem 31. Dezember 2022 gestellt (bzw. der Kauf nach Fertigstellung in diesem zeitlichen Regime), liegt die lineare AfA regelmäßig bei <strong>3 % jährlich</strong>. Für ältere Sachverhalte bleibt häufig der frühere 2-%-Satz relevant. Zusätzlich gibt es für bestimmte neue Mietwohnungen zeitlich begrenzte Sonder- und degressive Regeln – immer objekt- und zeitbezogen zu prüfen.</p>
<p>Praktisch heißt das: Die AfA senkt die steuerliche Bemessungsgrundlage, ersetzt aber keinen positiven Cashflow. Sweet Home Berlin rechnet deshalb zuerst mit Miete und Kosten – und ordnet die AfA als zweiten Schritt ein.</p>
<p><br></p>
<h2>Zinsen und andere Werbungskosten</h2>
<p>Schuldzinsen für die Finanzierung einer vermieteten Immobilie sind in der Regel als Werbungskosten bei den Einkünften aus Vermietung und Verpachtung berücksichtigungsfähig, soweit die Mittel tatsächlich dem Vermietungsobjekt dienen. Auch Erhaltungsaufwand, nicht umlagefähige Bewirtschaftungskosten und ähnliche Positionen können relevant sein – abhängig vom Einzelfall und der Abgrenzung zu Herstellungskosten.</p>
<p>Genau deshalb gehört die Finanzierungsstruktur zur Investmentprüfung. Orientierung: <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a> und <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</p>
<p><br></p>
<h2>Grunderwerbsteuer und Kaufnebenkosten</h2>
<p>Noch vor der ersten Mieterhöhung steht die Grunderwerbsteuer. In Berlin beträgt der Steuersatz laut Senatsverwaltung für Finanzen <strong>6 %</strong> der Gegenleistung für Rechtsvorgänge ab dem 1. Januar 2014 – siehe die <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">FAQ Grunderwerbsteuer des Landes Berlin</a>.</p>
<p>Zusammen mit Notar, Grundbuch und ggf. Makler entstehen so oft rund 10–12 % Kaufnebenkosten. Details: <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a> und <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p><br></p>
<h2>Was Steuern für Vermieter nicht ersetzen</h2>
<p>Selbst eine saubere AfA-Logik rettet kein Objekt mit zu hoher Ist-Mieten-Lücke, Sanierungsstau oder problematischer WEG. Steuern für Vermieter sind ein Baustein – neben Lage, Mietvertrag und Capex. Bei vermietetem Bestand prüfen wir deshalb zuerst den Vertrag: <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>.</p>
<p>Aktuelle Anlageobjekte finden Sie unter [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie hoch ist die AfA für Wohngebäude?</strong><br>Nach § 7 Abs. 4 EStG liegt die lineare AfA für viele Wohngebäude mit Bauantrag nach dem 31.12.2022 bei 3 % pro Jahr. Ältere Fälle folgen oft 2 %. Im Zweifel Steuerberater und Objektjahr prüfen.</p>
<p><strong>Kann ich Kreditzinsen absetzen?</strong><br>Bei Vermietung in der Regel als Werbungskosten, soweit der Kredit dem Vermietungsobjekt dient. Keine pauschale Garantie ohne Einzelfallprüfung.</p>
<p><strong>Wie hoch ist die Grunderwerbsteuer in Berlin?</strong><br>6 % laut Land Berlin (seit 01.01.2014). Quelle: Senatsverwaltung für Finanzen.</p>
<p><strong>Ist das Steuerberatung von Sweet Home Berlin?</strong><br>Nein. Wir erklären die Logik für die Kaufentscheidung. Verbindliche Gestaltung macht Ihr Steuerberater.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Sie Steuern für Vermieter mit konkreten Berliner Wohnungen zusammendenken wollen, starten wir mit Strategie, Preis und Mietvertrag – und holen die steuerliche Feinplanung über Ihre Beratung dazu.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>German rental property taxes</strong> help decide whether an apartment works as an investment — or only looks strong on gross yield. It is rarely one trick; it is depreciation (AfA), deductible expenses and the costs you pay at purchase.</p>
<p>Sweet Home Berlin is not a tax adviser. We frame the tax logic so you can compare assets honestly before you sign at the notary.</p>
<p>Investor context: <a href="/en/blog/berlin-real-estate-investment-guide-2026">Berlin real estate as an investment</a>.</p>
<p><br></p>
<h2>AfA: depreciation on the building</h2>
<p>For let residential property you can depreciate the building’s acquisition or construction costs (not the land) through AfA. The legal base is <a href="https://www.gesetze-im-internet.de/estg/__7.html" rel="noopener noreferrer" target="_blank">section 7 of the German Income Tax Act (EStG)</a>.</p>
<p>Under the current wording of section 7 (4) EStG, residential buildings with a building-permit filing after 31 December 2022 generally use <strong>3% straight-line AfA</strong> per year. Older cases often still follow the previous 2% rate. Limited special and declining-balance rules can apply to certain new rental homes — always check the object and timing.</p>
<p>In practice, AfA lowers taxable income; it does not replace positive cash flow. Sweet Home Berlin therefore models rent and costs first, then places AfA as a second layer.</p>
<p><br></p>
<h2>Interest and other deductible expenses</h2>
<p>Loan interest for a let property is usually deductible as income-related expenses for rental income, provided the funds serve that rental asset. Maintenance, non-recoverable operating costs and similar items can also matter — depending on the case and the line between maintenance and construction costs.</p>
<p>That is why financing structure belongs in the investment check. See <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a> and <a href="/en/blog/down-payment-for-buying-apartment-berlin">down payment for buying an apartment in Berlin</a>.</p>
<p><br></p>
<h2>Transfer tax and purchase costs</h2>
<p>Before the first rent review comes transfer tax. In Berlin the rate is <strong>6%</strong> of the consideration for transactions from 1 January 2014, according to the Berlin Senate Department for Finance’s <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">Grunderwerbsteuer FAQ</a>.</p>
<p>Together with notary, land register and possibly an agent, closing costs often land around 10–12%. Details: <a href="/en/blog/berlin-transfer-tax-grunderwerbsteuer">Berlin transfer tax</a> and <a href="/en/blog/cost-of-buying-property-berlin">cost of buying property in Berlin</a>.</p>
<p><br></p>
<h2>What rental taxes cannot fix</h2>
<p>Clean AfA will not rescue an asset with a weak rent position, renovation backlog or a troubled owners’ association. German rental property taxes are one building block beside location, lease and capex. For tenanted stock we therefore start with the lease: <a href="/en/blog/buying-tenanted-apartment-berlin">buying a tenanted apartment in Berlin</a>.</p>
<p>Current investment listings: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>What AfA rate applies to residential buildings?</strong><br>Under section 7 (4) EStG, many homes with a building permit after 31 December 2022 use 3% per year. Older cases often use 2%. Confirm with your tax adviser and the building’s timeline.</p>
<p><strong>Can I deduct mortgage interest?</strong><br>For letting, usually yes as income-related expenses if the loan serves that rental asset. No blanket promise without a case review.</p>
<p><strong>What is Berlin’s transfer tax?</strong><br>6% according to the Land of Berlin (since 1 January 2014).</p>
<p><strong>Is this tax advice from Sweet Home Berlin?</strong><br>No. We explain the logic for purchase decisions. Binding structuring belongs with your tax adviser.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If you want German rental property taxes connected to real Berlin apartments, we start with strategy, price and lease — and bring your tax adviser in for the fine print.</p>
<p>[[landing:berlin_main|apartments for sale in Berlin|inline]]</p>`
  }
];

function wordCount(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

function countInternalLinks(html) {
  const matches = String(html || '').match(/href="\/(?:en\/)?(?:blog|wohnung-kaufen|wohnungen-berlin|properties-for-sale)[^"]*"/g) || [];
  return matches.length;
}

function countOfficialSources(html) {
  const matches = String(html || '').match(/https?:\/\/(?:www\.)?(?:berlin\.de|bafin\.de|bundesbank\.de|gesetze-im-internet\.de|bundesfinanzministerium\.de)[^"\s]*/g) || [];
  return new Set(matches).size;
}

async function upsertPost(client, post) {
  const existing = await client.query(`SELECT id, status FROM blog_posts WHERE slug = $1`, [post.slug]);
  const titleI18n = { de: post.title_de, en: post.title_en };
  const excerptI18n = { de: post.excerpt_de, en: post.excerpt_en };
  const contentI18n = { de: post.content_de, en: post.content_en };
  const slugI18n = { de: post.slug, en: post.slug_en };

  console.log(`\n${post.slug}`);
  console.log(`  DE words=${wordCount(post.content_de)} links=${countInternalLinks(post.content_de)} official=${countOfficialSources(post.content_de)}`);
  console.log(`  EN words=${wordCount(post.content_en)} links=${countInternalLinks(post.content_en)} official=${countOfficialSources(post.content_en)}`);

  if (process.env.DRY_RUN === '1') {
    console.log('  dry-run: skip write');
    return existing.rows[0] ? existing.rows[0].id : null;
  }

  if (existing.rows.length) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE blog_posts SET
        title = $1,
        excerpt = $2,
        content = $3,
        title_i18n = $4::jsonb,
        excerpt_i18n = $5::jsonb,
        content_i18n = $6::jsonb,
        slug_i18n = $7::jsonb,
        cover_image = $8,
        status = $9,
        author_id = $10,
        published_at = CASE
          WHEN $9 = 'published' THEN COALESCE(published_at, $11::timestamptz)
          ELSE published_at
        END,
        updated_at = $11::timestamptz
      WHERE id = $12`,
      [
        post.title_de,
        post.excerpt_de,
        post.content_de,
        JSON.stringify(titleI18n),
        JSON.stringify(excerptI18n),
        JSON.stringify(contentI18n),
        JSON.stringify(slugI18n),
        post.cover_image,
        STATUS,
        AUTHOR_ID,
        NOW,
        id
      ]
    );
    console.log(`  updated id=${id} status=${STATUS}`);
    return id;
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
      AUTHOR_ID,
      post.slug,
      STATUS,
      post.cover_image,
      post.title_de,
      post.excerpt_de,
      post.content_de,
      JSON.stringify(titleI18n),
      JSON.stringify(excerptI18n),
      JSON.stringify(contentI18n),
      JSON.stringify(slugI18n),
      STATUS === 'published' ? NOW : null,
      NOW
    ]
  );
  console.log(`  inserted id=${ins.rows[0].id} status=${STATUS}`);
  return ins.rows[0].id;
}

async function patchReciprocalLinks(client) {
  if (!WANT_PUBLISH || process.env.DRY_RUN === '1') {
    console.log('\nReciprocal links: skipped (draft/dry-run). Run with PUBLISH=1 after human review.');
    return;
  }

  const patches = [
    {
      slug: 'eigenkapital-wohnungskauf',
      marker: '/blog/immobilienfinanzierung-berlin',
      insertBefore: '<h2>Nächster Schritt',
      paragraph:
        '<p>Wer Eigenkapital und Kredit zusammen denkt, findet die nächste Ebene unter <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a> – von Rate und Stress-Test bis zu typischen Bankfragen.</p>'
    },
    {
      slug: 'immobilienpreise-berlin',
      marker: '/blog/lohnt-sich-immobilie-kaufen-berlin',
      insertBefore: '<h2>Nächster Schritt mit Sweet Home Berlin</h2>',
      paragraph:
        '<p>Ob sich der Kauf bei aktuellem Preisniveau noch lohnt, ordnen wir im Beitrag <a href="/blog/lohnt-sich-immobilie-kaufen-berlin">Lohnt sich Immobilie kaufen in Berlin noch?</a> ein – mit offiziellen Kaufpreisen und einer ehrlichen Gesamtrechnung.</p>'
    },
    {
      slug: 'immobilie-als-kapitalanlage-berlin',
      marker: '/blog/steuern-fuer-vermieter',
      insertBefore: '<h2>Nächster Schritt',
      paragraph:
        '<p>Steuerliche Bausteine wie AfA und absetzbare Zinsen vertiefen wir unter <a href="/blog/steuern-fuer-vermieter">Steuern für Vermieter</a> – ohne Steuerberatung zu ersetzen.</p>'
    }
  ];

  for (const patch of patches) {
    const { rows } = await client.query(`SELECT id, content, content_i18n FROM blog_posts WHERE slug = $1`, [patch.slug]);
    if (!rows[0]) {
      console.log(`  reciprocal skip: missing ${patch.slug}`);
      continue;
    }
    let i18n = rows[0].content_i18n;
    if (typeof i18n === 'string') i18n = JSON.parse(i18n);
    i18n = { ...(i18n || {}) };
    let de = i18n.de || rows[0].content || '';
    if (de.includes(patch.marker)) {
      console.log(`  reciprocal already present: ${patch.slug}`);
      continue;
    }
    const idx = de.indexOf(patch.insertBefore);
    if (idx === -1) {
      console.log(`  reciprocal anchor missing in ${patch.slug}`);
      continue;
    }
    de = `${de.slice(0, idx)}${patch.paragraph}\n${de.slice(idx)}`;
    i18n.de = de;
    const content = rows[0].content && String(rows[0].content).includes(patch.insertBefore)
      ? `${String(rows[0].content).slice(0, String(rows[0].content).indexOf(patch.insertBefore))}${patch.paragraph}\n${String(rows[0].content).slice(String(rows[0].content).indexOf(patch.insertBefore))}`
      : rows[0].content;
    await client.query(
      `UPDATE blog_posts SET content = COALESCE($1, content), content_i18n = $2::jsonb, updated_at = NOW() WHERE id = $3`,
      [content || de, JSON.stringify(i18n), rows[0].id]
    );
    console.log(`  reciprocal linked from ${patch.slug}`);
  }
}

(async () => {
  console.log(`S7 week 1 — status=${STATUS}${process.env.DRY_RUN === '1' ? ' (dry-run)' : ''}`);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  for (const post of posts) {
    await upsertPost(client, post);
  }
  await patchReciprocalLinks(client);
  const check = await client.query(
    `SELECT id, slug, status, slug_i18n->>'en' AS en_slug, length(content_i18n->>'de') AS de_chars, length(content_i18n->>'en') AS en_chars
     FROM blog_posts WHERE slug = ANY($1::text[]) ORDER BY slug`,
    [posts.map((p) => p.slug)]
  );
  console.log('\nDB rows:');
  console.table(check.rows);
  await client.end();
  if (!WANT_PUBLISH) {
    console.log('\nDrafts ready for human read-through.');
    console.log('After review: PUBLISH=1 node scripts/s7-week1-publish-posts.js');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
