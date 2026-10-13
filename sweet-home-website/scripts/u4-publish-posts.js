#!/usr/bin/env node
/**
 * U4: Hausgeld, Prenzlauer Berg, Kreuzberg. DE + EN.
 *
 * Default status is draft, so the live site keeps returning 410.
 * Local preview needs ALLOW_DRAFT_PREVIEW=1 and NODE_ENV other than production.
 *
 *   node scripts/u4-publish-posts.js
 *   DRY_RUN=1 node scripts/u4-publish-posts.js
 *   PUBLISH=1 node scripts/u4-publish-posts.js
 *
 * PUBLISH=1 also adds the Checkliste backlink. Do not run that until the
 * posts are published, or the live Checkliste would point at a 410.
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12;
const DRY_RUN = process.env.DRY_RUN === '1';
const STATUS = process.env.PUBLISH === '1' ? 'published' : 'draft';
const NOW = new Date().toISOString();

const POSTS = [
  {
    slug: 'hausgeld-eigentumswohnung',
    slug_en: 'hausgeld-service-charges-germany',
    cover_image: '/images/blog/hausgeld-eigentumswohnung.jpg',
    title_de: 'Hausgeld Eigentumswohnung: Vorschuss, Rücklage und Umlage',
    title_en: 'Hausgeld for a German apartment: advances, reserve, and what a tenant can pay',
    excerpt_de: 'Hausgeld ist der beschlossene Vorschuss auf Kosten und Rücklage. Nur der Betriebskostenanteil kann auf den Mieter fallen.',
    excerpt_en: 'Hausgeld is the owners’ voted advance for costs and the reserve. Only the operating-cost share can be agreed with a tenant.',
    content_de: `<p><strong>Hausgeld Eigentumswohnung</strong> ist der Vorschuss, den die Wohnungseigentümer für ein Kalenderjahr beschließen. Es ist nicht die Miete und nicht eine einzelne Handwerkerrechnung. Der Verwalter stellt einen Wirtschaftsplan auf. Die Eigentümer beschließen darüber die Vorschüsse auf die Kosten der Gemeinschaft und auf die Rücklagen.</p>
<p>Was in diesem Vorschuss steckt, entscheidet später, welchen Teil ein Mieter tragen kann. Die rechtliche Einordnung bleibt bei Anwalt und Steuerberater. Sweet Home Berlin ordnet den Posten in die Kaufprüfung ein, bevor das Exposé nur die monatliche Rate zeigt.</p>
<h2>Was am Hausgeld umlagefähig ist</h2>
<p>Das monatliche Hausgeld mischt zwei Töpfe, die das Gesetz getrennt hält. Die Kosten der Gemeinschaft tragen die Wohnungseigentümer nach dem Verhältnis ihrer Miteigentumsanteile, soweit kein abweichender Beschluss gilt. Das steht in <a href="https://www.gesetze-im-internet.de/woeigg/__16.html" rel="noopener noreferrer" target="_blank">§ 16 des Wohnungseigentumsgesetzes</a>.</p>
<p>Gegenüber dem Mieter gilt ein anderes Gesetz. Betriebskosten kann der Mietvertrag auf den Mieter legen. <a href="https://www.gesetze-im-internet.de/bgb/__556.html" rel="noopener noreferrer" target="_blank">§ 556 BGB</a> verweist dafür auf die Betriebskostenverordnung. Nicht zu den Betriebskosten gehören nach <a href="https://www.gesetze-im-internet.de/betrkv/__1.html" rel="noopener noreferrer" target="_blank">§ 1 Abs. 2 BetrKV</a> die Verwaltungskosten und die Instandhaltungs- und Instandsetzungskosten.</p>
<p>Die Rücklage, auf die der Wirtschaftsplan Vorschüsse vorsieht, dient der Erhaltung des Gebäudes. Diesen Teil des Hausgelds zahlt der Eigentümer an die Gemeinschaft. Er ist keine Betriebskostenposition, die der Mieter über die Nebenkostenabrechnung trägt. Umlagefähig kann nur der Teil sein, den der Mietvertrag als Betriebskosten im Sinne der Verordnung vereinbart.</p>
<h2>Wirtschaftsplan und Jahresabrechnung</h2>
<p><a href="https://www.gesetze-im-internet.de/woeigg/__28.html" rel="noopener noreferrer" target="_blank">§ 28 WEG</a> regelt den Ablauf. Der Verwalter stellt für das Kalenderjahr einen Wirtschaftsplan auf, mit den voraussichtlichen Einnahmen und Ausgaben. Die Eigentümer beschließen die Vorschüsse. Nach dem Jahr beschließen sie über Nachschüsse oder eine Anpassung der Vorschüsse, auf der Grundlage der Jahresabrechnung. Der Verwalter erstellt außerdem einen Vermögensbericht über den Stand der Rücklagen.</p>
<p>Für den Kauf zählt deshalb nicht eine einzelne Monatszahl aus dem Inserat. Zählen Wirtschaftsplan, letzte Jahresabrechnung, Höhe der Rücklage und die Protokolle, in denen Sanierungen schon beschlossen sind. Dieselbe Prüfung steht in der <a href="/blog/wohnungskauf-berlin-checkliste">Wohnungskauf Berlin Checkliste</a>.</p>
<h2>Hausgeld in der Kaufrechnung</h2>
<p>Das Hausgeld läuft weiter, auch wenn die Wohnung leer steht. Es gehört in die monatliche Belastung neben der Finanzierungsrate, nicht erst in die Nebenkosten des Mieters. Die einmaligen Kosten des Erwerbs selbst, Grunderwerbsteuer, Notar und Grundbuch, sind ein anderer Posten. Die stehen im Beitrag <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p>Wer vermieten will, rechnet die Rendite nach der Kaltmiete und den Kosten, die beim Eigentümer bleiben. Die Rücklage und der nicht umlagefähige Teil des Hausgelds bleiben beim Eigentümer. Die Formel dazu steht unter <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>. Eine Durchschnittszahl für das Hausgeld in Berlin setzen wir hier nicht an. Die Spanne hängt am Haus, an der Rücklage und an den beschlossenen Maßnahmen.</p>
<h2>Häufige Fragen</h2>
<p><strong>Was ist Hausgeld bei einer Eigentumswohnung?</strong><br>Der Vorschuss, den die Eigentümer für das Kalenderjahr beschließen. Er deckt erwartete Kosten der Gemeinschaft und die Zuführung zur Rücklage. Die genaue Fälligkeit folgt dem Beschluss.</p>
<p><strong>Ist das Hausgeld umlagefähig?</strong><br>Nur der Anteil, den der Mietvertrag als Betriebskosten vereinbart und den die Betriebskostenverordnung zulässt. Verwaltungskosten, Instandhaltung und die Rücklage gehören nicht dazu. Der Eigentümer zahlt das volle Hausgeld weiter an die Gemeinschaft.</p>
<p><strong>Zahlt der Eigentümer Hausgeld, wenn die Wohnung leer steht?</strong><br>Ja. Die Pflicht gegenüber der Gemeinschaft hängt am Wohnungseigentum, nicht daran, ob ein Mieter in der Wohnung wohnt.</p>
<p><strong>Ersetzt dieser Beitrag eine Rechts- oder Steuerberatung?</strong><br>Nein. Mietvertrag, Wirtschaftsplan und die Beschlüsse der Gemeinschaft entscheiden den einzelnen Fall.</p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn eine Wohnung in der engeren Wahl steht, lesen wir Wirtschaftsplan, Rücklage und Protokolle gegen Preis und Nutzung, bevor die Rate allein entscheidet.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>Hausgeld</strong> on a German apartment is the advance the owners vote for one calendar year. It is not the rent, and it is not a single contractor invoice. The manager prepares an annual budget. The owners vote the advances for the community’s costs and for the reserves.</p>
<p>What sits inside that advance decides later which share a tenant can be asked to pay. The legal reading of a file stays with a lawyer and a tax adviser. Sweet Home Berlin puts the line into the purchase check before a listing shows only the monthly mortgage.</p>
<h2>Which part of Hausgeld a tenant can be charged</h2>
<p>The monthly Hausgeld mixes two pots the statute keeps apart. Owners bear the community’s costs in proportion to their ownership shares, unless a resolution sets a different split. That rule is <a href="https://www.gesetze-im-internet.de/woeigg/__16.html" rel="noopener noreferrer" target="_blank">section 16 of the German Condominium Act (WEG)</a>.</p>
<p>The tenant relationship follows a different statute. A lease can agree that the tenant bears operating costs. <a href="https://www.gesetze-im-internet.de/bgb/__556.html" rel="noopener noreferrer" target="_blank">Section 556 of the Civil Code (BGB)</a> points to the Operating Costs Ordinance for that list. Under <a href="https://www.gesetze-im-internet.de/betrkv/__1.html" rel="noopener noreferrer" target="_blank">section 1(2) of the Operating Costs Ordinance (BetrKV)</a>, management costs and maintenance and repair costs are not operating costs.</p>
<p>The reserve, which the budget funds with advances, exists to keep the building. The owner pays that part of the Hausgeld to the community. It is not an operating-cost item the tenant pays through the service-charge statement. Only the share the lease agrees as operating costs, within the ordinance, can be passed on.</p>
<h2>Annual budget and the year-end account</h2>
<p><a href="https://www.gesetze-im-internet.de/woeigg/__28.html" rel="noopener noreferrer" target="_blank">Section 28 WEG</a> sets the sequence. The manager draws up a budget for the calendar year, with expected income and expenses. The owners vote the advances. After the year they vote extra contributions or an adjustment of the advances, on the basis of the annual account. The manager also prepares a statement of assets that includes the reserve balance.</p>
<p>A purchase therefore does not turn on one monthly figure in an advert. It turns on the budget, the latest annual account, the reserve balance, and the minutes in which works are already decided. The same check sits in the <a href="/en/blog/what-to-check-before-buying-an-apartment-in-berlin">Berlin apartment purchase checklist</a>.</p>
<h2>Hausgeld in the purchase maths</h2>
<p>Hausgeld continues when the apartment is empty. It belongs in the monthly carrying cost beside the mortgage, not only in the tenant’s service charges. The one-off costs of the purchase itself, transfer tax, notary, and land register, are a different item. Those are covered in <a href="/en/blog/cost-of-buying-property-berlin">the cost of buying property in Berlin</a>.</p>
<p>A letting plan uses cold rent and the costs that stay with the owner. The reserve and the non-recoverable share of Hausgeld stay with the owner. The formula is in <a href="/en/blog/how-to-calculate-rental-yield-berlin">how to calculate rental yield in Berlin</a>. This guide does not quote an average Hausgeld for Berlin. The range depends on the building, the reserve, and the works already voted.</p>
<h2>FAQ</h2>
<p><strong>What is Hausgeld on an apartment?</strong><br>The advance the owners vote for the calendar year. It covers expected community costs and the payment into the reserve. When it falls due follows the resolution.</p>
<p><strong>Can the whole Hausgeld be charged to a tenant?</strong><br>No. Only the share the lease agrees as operating costs, and that the Operating Costs Ordinance allows. Management costs, maintenance, and the reserve are not in that list. The owner still pays the full Hausgeld to the community.</p>
<p><strong>Does the owner pay Hausgeld if the apartment is vacant?</strong><br>Yes. The duty to the community follows ownership, not whether a tenant lives there.</p>
<p><strong>Does this replace legal or tax advice?</strong><br>No. The lease, the budget, and the owners’ resolutions decide the individual file.</p>
<h2>Next step with Sweet Home Berlin</h2>
<p>When an apartment is on the shortlist, we read the budget, the reserve, and the minutes against price and use, before the mortgage payment is the only number in the room.</p>
<p>[[landing:berlin_main|Buy an apartment in Berlin|inline]]</p>`
  },
  {
    slug: 'wohnung-kaufen-prenzlauer-berg-ratgeber',
    slug_en: 'buying-apartment-prenzlauer-berg-guide',
    cover_image: '/images/blog/wohnung-kaufen-prenzlauer-berg-ratgeber.jpg',
    title_de: 'Wohnung kaufen Prenzlauer Berg: Kieze, Häuser, Prüfung',
    title_en: 'Buying an apartment in Prenzlauer Berg: streets, buildings, and the check',
    excerpt_de: 'Prenzlauer Berg ist ein Ortsteil von Pankow, kein eigener Bezirk. Der Preis folgt der Straße, nicht einem Durchschnitt für den Namen.',
    excerpt_en: 'Prenzlauer Berg is a locality inside Pankow, not a borough of its own. Price follows the street, not an average for the name.',
    content_de: `<p><strong>Wohnung kaufen in Prenzlauer Berg</strong> heißt, einen Ortsteil von Pankow zu prüfen, nicht einen eigenen Bezirk. Aktuelle Angebote stehen auf der Seite <a href="/wohnung-kaufen-prenzlauer-berg">Wohnung kaufen Prenzlauer Berg</a>.</p>
<h2>Was Prenzlauer Berg verwaltungstechnisch ist</h2>
<p>Das Bezirksamt Pankow führt Prenzlauer Berg als einen Ortsteil unter dreizehn. Der Ortsteil ist von den Mietskasernen des späten 19. Jahrhunderts geprägt, die nach dem Hobrecht-Plan entstanden. Rund zwei Drittel der Einwohner des Bezirks leben in Prenzlauer Berg, Alt-Pankow und Alt-Weißensee zusammen. Die Zahlen stehen auf der Seite <a href="https://www.berlin.de/ba-pankow/ueber-den-bezirk/zahlen-und-fakten/" rel="noopener noreferrer" target="_blank">Zahlen und Fakten des Bezirksamts Pankow</a>.</p>
<p>Kollwitzplatz, Helmholtzplatz, das Winsviertel und das Bötzowviertel sind Namen, mit denen Käufer Straßen bündeln. Sie sind keine amtliche Rangliste und kein Preisindex.</p>
<h2>Vier Lagen, die Käufer oft in einen Topf werfen</h2>
<ul>
<li>Kollwitzplatz und die angrenzenden Altbaustraßen: dichte Gründerzeit, viel Nachfrage, wenig ruhige Rückseiten.</li>
<li>Helmholtzplatz: ähnlich im Hausbestand, oft lauter zum Platz hin als in den Seitenstraßen.</li>
<li>Winsviertel: etwas weiter nach Norden, dieselbe Altbaufrage, andere Läden und andere Wege zur Bahn.</li>
<li>Bötzowviertel: Richtung Greifswalder Straße, mit größeren Unterschieden zwischen Hauptstraße und Hof.</li>
</ul>
<p>Wie sich Pankow gegen andere Bezirke einordnet, steht im Vergleich <a href="/blog/beste-bezirke-immobilien-berlin">beste Bezirke für Immobilien in Berlin</a>. Dieser Beitrag bleibt beim Ortsteil.</p>
<h2>Für wen die Lage passt</h2>
<p>Prenzlauer Berg passt, wenn Altbau, kurze Wege und eine stabile Nachfrage zum Plan gehören. Wer vor allem Fläche und eine niedrigere Einstiegssumme sucht, vergleicht oft andere Ortsteile im selben Bezirk oder weiter draußen. Ob sich eine einzelne Wohnung als Anlage rechnet, hängt an Kaltmiete, Kaufpreis und den Kosten, die beim Eigentümer bleiben. Die Rechnung steht unter <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>, nicht als Durchschnitt für den Ortsteil.</p>
<h2>Der Preis folgt der Straße</h2>
<p>Ein Durchschnitt für ganz Prenzlauer Berg verdeckt den Abstand zwischen einer ruhigen Seitenstraße und einer lauten Ecke am Platz. Vergleichbare Verkäufe und das aktuelle Angebot lesen Sie im Beitrag <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>. Wie Rate und Eigenkapital zur Wohnung passen, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>
<h2>Was vor der engeren Wahl zu prüfen ist</h2>
<ul>
<li>Wirtschaftsplan, Rücklage und Protokolle, nicht nur das Hausgeld aus dem Exposé.</li>
<li>Schall und Hof: dieselbe Hausnummer kann vorn und hinten anders wohnen.</li>
<li>Energie und anstehende Beschlüsse zu Dach, Fassade oder Heizung.</li>
<li>Ob die Wohnung leer, vermietet oder erst später nutzbar ist.</li>
</ul>
<h2>Häufige Fragen</h2>
<p><strong>Ist Prenzlauer Berg ein eigener Bezirk?</strong><br>Nein. Es ist ein Ortsteil des Bezirks Pankow. Die Angebotsseite filtert diesen Ortsteil.</p>
<p><strong>Sind Kollwitzplatz und Helmholtzplatz amtliche Ortsteile?</strong><br>Nein. Es sind Kieze, mit denen Käufer Straßen vergleichen. Das Bezirksamt zählt Ortsteile, nicht diese Namen.</p>
<p><strong>Gibt es hier einen Preis pro Quadratmeter für den ganzen Ortsteil?</strong><br>Nein. Der Abstand zwischen Straßen ist zu groß für eine Zahl, die für die einzelne Wohnung gilt.</p>
<p><strong>Wie hilft Sweet Home Berlin?</strong><br>Wir lesen Straße, Haus und Unterlagen gegen den Plan, bevor eine Wohnung auf die kurze Liste kommt.</p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Prenzlauer Berg in der Suche bleibt, starten Sie bei den aktuellen Wohnungen und bei den Unterlagen des Hauses, nicht bei einem Namen allein.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>Buying an apartment in Prenzlauer Berg</strong> means checking a locality inside the borough of Pankow, not a borough of its own. Current listings are on <a href="/en/properties-for-sale-prenzlauer-berg">apartments for sale in Prenzlauer Berg</a>.</p>
<h2>What Prenzlauer Berg is in the borough</h2>
<p>The Pankow borough office lists Prenzlauer Berg as one locality among thirteen. The locality is shaped by late-19th-century tenement blocks built after the Hobrecht plan. About two thirds of the borough’s residents live in Prenzlauer Berg, Alt-Pankow, and Alt-Weißensee together. The figures are on the <a href="https://www.berlin.de/ba-pankow/ueber-den-bezirk/zahlen-und-fakten/" rel="noopener noreferrer" target="_blank">Pankow borough facts page</a>.</p>
<p>Kollwitzplatz, Helmholtzplatz, the Winsviertel, and the Bötzowviertel are names buyers use to group streets. They are not an official ranking and not a price index.</p>
<h2>Four areas buyers often treat as one</h2>
<ul>
<li>Kollwitzplatz and the adjoining period streets: dense late-19th-century stock, strong demand, few quiet rear sides.</li>
<li>Helmholtzplatz: a similar building stock, often louder toward the square than on the side streets.</li>
<li>Winsviertel: a little further north, the same period-building question, different shops and a different walk to the train.</li>
<li>Bötzowviertel: toward Greifswalder Straße, with a larger gap between the main road and the courtyard.</li>
</ul>
<p>How Pankow sits against other boroughs is in <a href="/en/blog/best-berlin-districts-for-property-investment">the best Berlin districts for property</a>. This guide stays with the locality.</p>
<h2>Who it suits</h2>
<p>Prenzlauer Berg suits a plan that wants period buildings, short walks, and steady demand. Buyers who want more space and a lower entry price often compare other localities in the same borough, or further out. Whether one apartment works as an investment depends on cold rent, price, and the costs that stay with the owner. That calculation is in <a href="/en/blog/how-to-calculate-rental-yield-berlin">how to calculate rental yield in Berlin</a>, not as an average for the locality.</p>
<h2>Price follows the street</h2>
<p>An average for the whole of Prenzlauer Berg hides the gap between a quiet side street and a loud corner on the square. Comparable sales and the current offer are in <a href="/en/blog/berlin-property-prices-2026">Berlin property prices</a>. How the monthly payment and the down payment fit the apartment is in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>
<h2>What to check before the shortlist</h2>
<ul>
<li>The budget, the reserve, and the minutes, not only the Hausgeld figure in the brochure.</li>
<li>Noise and the courtyard: the same house number can live differently at the front and the back.</li>
<li>Energy status and resolutions already taken on the roof, the facade, or the heating.</li>
<li>Whether the apartment is vacant, let, or usable only later.</li>
</ul>
<h2>FAQ</h2>
<p><strong>Is Prenzlauer Berg its own borough?</strong><br>No. It is a locality in the borough of Pankow. The listings page filters that locality.</p>
<p><strong>Are Kollwitzplatz and Helmholtzplatz official localities?</strong><br>No. They are neighbourhood names buyers use to compare streets. The borough office counts localities, not these names.</p>
<p><strong>Is there one price per square metre for the whole locality?</strong><br>No. The gap between streets is too wide for one figure that would hold for a single apartment.</p>
<p><strong>How does Sweet Home Berlin help?</strong><br>We read the street, the building, and the documents against the plan before an apartment reaches the shortlist.</p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If Prenzlauer Berg stays in the search, start with the current apartments and the building documents, not with the name alone.</p>
<p>[[landing:berlin_main|Buy an apartment in Berlin|inline]]</p>`
  },
  {
    slug: 'wohnung-kaufen-kreuzberg-ratgeber',
    slug_en: 'buying-apartment-kreuzberg-guide',
    cover_image: '/images/blog/wohnung-kaufen-kreuzberg-ratgeber.jpg',
    title_de: 'Wohnung kaufen Kreuzberg: Kieze, Lärm, Prüfung',
    title_en: 'Buying an apartment in Kreuzberg: neighbourhoods, noise, and the check',
    excerpt_de: 'Kreuzberg ist ein Ortsteil von Friedrichshain-Kreuzberg. Der Unterschied zur Nachbarlage sitzt oft in derselben Straße.',
    excerpt_en: 'Kreuzberg is a locality in Friedrichshain-Kreuzberg. The difference from the next pocket often sits on the same street.',
    content_de: `<p><strong>Wohnung kaufen in Kreuzberg</strong> heißt, den Ortsteil Kreuzberg zu prüfen, nicht den ganzen Bezirk Friedrichshain-Kreuzberg. Aktuelle Angebote stehen auf der Seite <a href="/wohnung-kaufen-kreuzberg">Wohnung kaufen Kreuzberg</a>.</p>
<h2>Was Kreuzberg verwaltungstechnisch ist</h2>
<p>Das Bezirksamt führt zwei Ortsteile: Friedrichshain und Kreuzberg. Jeder ist in vier Bezirksregionen geteilt. Ein Planungsraum wird umgangssprachlich oft Kiez genannt. Die Einordnung steht auf der Seite <a href="https://www.berlin.de/ba-friedrichshain-kreuzberg/ueber-den-bezirk/zahlen-und-fakten/" rel="noopener noreferrer" target="_blank">Zahlen und Fakten des Bezirksamts Friedrichshain-Kreuzberg</a>.</p>
<p>Wer den Bezirk als Ganzes sucht, nutzt die Seite <a href="/wohnung-kaufen-friedrichshain-kreuzberg">Wohnung kaufen Friedrichshain-Kreuzberg</a>. Dieser Beitrag bleibt bei Kreuzberg.</p>
<h2>Vier Lagen, die Käufer oft in einen Topf werfen</h2>
<ul>
<li>Bergmannkiez: dichte Wohnstraßen südlich des Landwehrkanals, stark nachgefragt, mit Unterschieden zwischen Bergmannstraße und den ruhigeren Seiten.</li>
<li>Rund um den Görlitzer Park: urban und abends laut, die Seitenstraßen wohnen anders als die Kante am Park.</li>
<li>Am Landwehrkanal: mehr Grün im Alltag, die Hauptwege bleiben belebt.</li>
<li>Seitenstraßen abseits der großen Achsen: derselbe Ortsteil, oft der bessere Kompromiss aus Lage und Ruhe.</li>
</ul>
<p>Das sind Orientierung für Käufer, keine amtliche Rangliste und kein Preisindex. Wie sich der Bezirk gegen andere einordnet, steht im Vergleich <a href="/blog/beste-bezirke-immobilien-berlin">beste Bezirke für Immobilien in Berlin</a>.</p>
<h2>Für wen die Lage passt</h2>
<p>Kreuzberg passt, wenn zentrale Lage und ein starkes eigenes Gepräge zum Plan gehören und Lärm sowie Zustand des Hauses Straße für Straße geprüft werden. Ob sich eine einzelne Wohnung als Anlage rechnet, hängt an Kaltmiete, Kaufpreis und den Kosten, die beim Eigentümer bleiben. Die Rechnung steht unter <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>, nicht als Durchschnitt für den Ortsteil.</p>
<h2>Der Preis folgt der Straße</h2>
<p>Ein Durchschnitt für ganz Kreuzberg verdeckt den Abstand zwischen einer Seitenstraße im Bergmannkiez und einer lauten Kante am Park. Vergleichbare Verkäufe und das aktuelle Angebot lesen Sie im Beitrag <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>. Wie Rate und Eigenkapital zur Wohnung passen, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>
<h2>Was vor der engeren Wahl zu prüfen ist</h2>
<ul>
<li>Lärm zu unterschiedlichen Tageszeiten, nicht nur bei der Besichtigung am Vormittag.</li>
<li>Wirtschaftsplan, Rücklage und Protokolle.</li>
<li>Ob die Wohnung im Ortsteil Kreuzberg liegt oder die Suche eigentlich Friedrichshain meint.</li>
<li>Ob die Wohnung leer, vermietet oder erst später nutzbar ist.</li>
</ul>
<h2>Häufige Fragen</h2>
<p><strong>Ist Kreuzberg dasselbe wie Friedrichshain-Kreuzberg?</strong><br>Nein. Friedrichshain-Kreuzberg ist der Bezirk. Kreuzberg ist einer von zwei Ortsteilen. Die Angebotsseite für den Ortsteil filtert Kreuzberg.</p>
<p><strong>Sind Bergmannkiez und Görlitzer Park amtliche Ortsteile?</strong><br>Nein. Es sind Kieze. Das Bezirksamt zählt Ortsteile und Bezirksregionen, nicht diese Namen als eigene Bezirke.</p>
<p><strong>Gibt es hier einen Preis pro Quadratmeter für den ganzen Ortsteil?</strong><br>Nein. Der Abstand zwischen Straßen ist zu groß für eine Zahl, die für die einzelne Wohnung gilt.</p>
<p><strong>Wie hilft Sweet Home Berlin?</strong><br>Wir lesen Straße, Haus und Unterlagen gegen den Plan, bevor eine Wohnung auf die kurze Liste kommt.</p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Kreuzberg in der Suche bleibt, starten Sie bei den aktuellen Wohnungen des Ortsteils und bei den Unterlagen des Hauses.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>Buying an apartment in Kreuzberg</strong> means checking the locality of Kreuzberg, not the whole borough of Friedrichshain-Kreuzberg. Current listings are on <a href="/en/properties-for-sale-kreuzberg">apartments for sale in Kreuzberg</a>.</p>
<h2>What Kreuzberg is in the borough</h2>
<p>The borough office lists two localities: Friedrichshain and Kreuzberg. Each is split into four borough regions. A planning area is often called a Kiez in everyday speech. The breakdown is on the <a href="https://www.berlin.de/ba-friedrichshain-kreuzberg/ueber-den-bezirk/zahlen-und-fakten/" rel="noopener noreferrer" target="_blank">Friedrichshain-Kreuzberg borough facts page</a>.</p>
<p>A search for the borough as a whole uses <a href="/en/properties-for-sale-friedrichshain-kreuzberg">apartments for sale in Friedrichshain-Kreuzberg</a>. This guide stays with Kreuzberg.</p>
<h2>Four areas buyers often treat as one</h2>
<ul>
<li>Bergmannkiez: dense residential streets south of the Landwehrkanal, in strong demand, with a gap between Bergmannstraße and the quieter sides.</li>
<li>Around Görlitzer Park: urban and loud in the evening. The side streets live differently from the edge of the park.</li>
<li>Along the Landwehrkanal: more green in daily life. The main paths stay busy.</li>
<li>Side streets off the main axes: the same locality, often the better balance of location and quiet.</li>
</ul>
<p>These names orient a buyer. They are not an official ranking and not a price index. How the borough sits against others is in <a href="/en/blog/best-berlin-districts-for-property-investment">the best Berlin districts for property</a>.</p>
<h2>Who it suits</h2>
<p>Kreuzberg suits a plan that wants a central location and a strong local character, and that checks noise and building condition street by street. Whether one apartment works as an investment depends on cold rent, price, and the costs that stay with the owner. That calculation is in <a href="/en/blog/how-to-calculate-rental-yield-berlin">how to calculate rental yield in Berlin</a>, not as an average for the locality.</p>
<h2>Price follows the street</h2>
<p>An average for the whole of Kreuzberg hides the gap between a side street in Bergmannkiez and a loud edge by the park. Comparable sales and the current offer are in <a href="/en/blog/berlin-property-prices-2026">Berlin property prices</a>. How the monthly payment and the down payment fit the apartment is in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>
<h2>What to check before the shortlist</h2>
<ul>
<li>Noise at different times of day, not only on a morning viewing.</li>
<li>The budget, the reserve, and the minutes.</li>
<li>Whether the apartment is in the locality of Kreuzberg, or the search actually means Friedrichshain.</li>
<li>Whether the apartment is vacant, let, or usable only later.</li>
</ul>
<h2>FAQ</h2>
<p><strong>Is Kreuzberg the same as Friedrichshain-Kreuzberg?</strong><br>No. Friedrichshain-Kreuzberg is the borough. Kreuzberg is one of two localities. The listings page for the locality filters Kreuzberg.</p>
<p><strong>Are Bergmannkiez and Görlitzer Park official localities?</strong><br>No. They are neighbourhood names. The borough office counts localities and borough regions, not these names as boroughs of their own.</p>
<p><strong>Is there one price per square metre for the whole locality?</strong><br>No. The gap between streets is too wide for one figure that would hold for a single apartment.</p>
<p><strong>How does Sweet Home Berlin help?</strong><br>We read the street, the building, and the documents against the plan before an apartment reaches the shortlist.</p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If Kreuzberg stays in the search, start with the current apartments in the locality and with the building documents.</p>
<p>[[landing:berlin_main|Buy an apartment in Berlin|inline]]</p>`
  }
];

function words(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function assertCopy(post) {
  for (const lang of ['de', 'en']) {
    const html = post[`content_${lang}`];
    if (/[\u2014]/.test(html)) throw new Error(`em dash in ${post.slug} ${lang}`);
    const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
    const counts = {};
    for (const href of hrefs) counts[href] = (counts[href] || 0) + 1;
    const dup = Object.entries(counts).filter(([, n]) => n > 1);
    if (dup.length) throw new Error(`duplicate href in ${post.slug} ${lang}: ${dup.map(([h]) => h).join(', ')}`);
    if (lang === 'en') {
      const bad = hrefs.filter((h) => h.startsWith('/') && !h.startsWith('/en/') && !h.startsWith('/images/'));
      if (bad.length) throw new Error(`English internal link off /en in ${post.slug}: ${bad.join(', ')}`);
    }
  }
}

async function upsert(client, post) {
  const titleI18n = { de: post.title_de, en: post.title_en };
  const excerptI18n = { de: post.excerpt_de, en: post.excerpt_en };
  const contentI18n = { de: post.content_de, en: post.content_en };
  const slugI18n = { de: post.slug, en: post.slug_en };
  const found = await client.query(
    `SELECT id FROM blog_posts WHERE slug = $1 OR slug_i18n->>'en' = $2 LIMIT 1`,
    [post.slug, post.slug_en]
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
        AUTHOR_ID, STATUS, post.cover_image,
        post.title_de, post.excerpt_de, post.content_de,
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
      AUTHOR_ID, post.slug, STATUS, post.cover_image,
      post.title_de, post.excerpt_de, post.content_de,
      JSON.stringify(titleI18n), JSON.stringify(excerptI18n), JSON.stringify(contentI18n), JSON.stringify(slugI18n),
      STATUS === 'published' ? NOW : null, NOW
    ]
  );
  console.log(`  inserted id=${ins.rows[0].id} status=${STATUS}`);
  return ins.rows[0].id;
}

async function linkCheckliste(client) {
  if (STATUS !== 'published' || DRY_RUN) {
    console.log('Checkliste backlink skipped until PUBLISH=1.');
    return;
  }
  const patches = [
    {
      lang: 'de',
      marker: '/blog/hausgeld-eigentumswohnung',
      insertBefore: 'In den Protokollen steht oft die Wahrheit hinter dem Exposé',
      paragraph: '<p>Wie sich Hausgeld, Rücklage und der umlagefähige Teil unterscheiden, steht im Beitrag <a href="/blog/hausgeld-eigentumswohnung">Hausgeld Eigentumswohnung</a>.</p>'
    },
    {
      lang: 'en',
      marker: '/en/blog/hausgeld-service-charges-germany',
      insertBefore: 'Meeting records often reveal upcoming expenses',
      paragraph: '<p>How Hausgeld, the reserve, and the share a tenant can be charged differ is in <a href="/en/blog/hausgeld-service-charges-germany">Hausgeld for a German apartment</a>.</p>'
    }
  ];
  const { rows } = await client.query(
    `SELECT id, content, content_i18n FROM blog_posts WHERE slug = 'wohnungskauf-berlin-checkliste'`
  );
  if (!rows[0]) throw new Error('checkliste missing');
  let i18n = rows[0].content_i18n;
  if (typeof i18n === 'string') i18n = JSON.parse(i18n);
  i18n = { ...(i18n || {}) };
  let changed = false;
  for (const patch of patches) {
    let html = i18n[patch.lang] || (patch.lang === 'de' ? rows[0].content || '' : '');
    if (html.includes(patch.marker)) {
      console.log(`  checkliste already links ${patch.lang}`);
      continue;
    }
    const idx = html.indexOf(patch.insertBefore);
    if (idx === -1) throw new Error(`checkliste anchor missing: ${patch.lang}`);
    const pStart = html.lastIndexOf('<p', idx);
    i18n[patch.lang] = `${html.slice(0, pStart)}${patch.paragraph}\n${html.slice(pStart)}`;
    changed = true;
    console.log(`  checkliste linked ${patch.lang}`);
  }
  if (!changed || DRY_RUN) return;
  await client.query(
    `UPDATE blog_posts SET content_i18n = $1::jsonb WHERE id = $2`,
    [JSON.stringify(i18n), rows[0].id]
  );
}

async function main() {
  for (const post of POSTS) {
    assertCopy(post);
    const internals = (post.content_de.match(/<a href="\//g) || []).length;
    const officials = (post.content_de.match(/gesetze-im-internet|berlin\.de/g) || []).length;
    console.log(`${post.slug}: de ${words(post.content_de)} words, en ${words(post.content_en)} words, internal ${internals}, official ${officials}`);
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    for (const post of POSTS) {
      console.log(post.slug);
      await upsert(client, post);
    }
    await linkCheckliste(client);
  } finally {
    await client.end();
  }
  console.log(DRY_RUN ? 'dry run' : `saved as ${STATUS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
