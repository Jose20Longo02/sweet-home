#!/usr/bin/env node
/**
 * S7 Week 2 — three Berlin blog posts (DE + real EN adaptations).
 * Official sources only: gesetze-im-internet § 23 EStG, Bezirksamt Mitte (Moabit),
 * Bezirksamt Neukölln (Ortsteile). No competitor blogs. No invented €/m².
 *
 * Default: status = draft (human read before live).
 * Publish: PUBLISH=1 node scripts/s7-week2-publish-posts.js
 * Dry-run: DRY_RUN=1 node scripts/s7-week2-publish-posts.js
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12; // Irem Demirci
const NOW = new Date().toISOString();
const WANT_PUBLISH = process.env.PUBLISH === '1';
const STATUS = WANT_PUBLISH ? 'published' : 'draft';

const COVERS = {
  spekulation: '/images/blog/spekulationssteuer-immobilie.jpg',
  moabit: '/images/blog/wohnung-kaufen-moabit-ratgeber.jpg',
  neukoelln: '/images/blog/wohnung-kaufen-neukoelln-ratgeber.jpg',
};

const posts = [
  {
    slug: 'spekulationssteuer-immobilie',
    slug_en: 'capital-gains-tax-property-germany',
    cover_image: COVERS.spekulation,
    title_de: 'Spekulationssteuer Immobilie: die 10-Jahres-Frist',
    excerpt_de:
      'Spekulationssteuer auf eine Immobilie ist keine eigene Steuer. Wann die 10-Jahres-Frist gilt, wann Eigennutzung ausnimmt und was Vermieter zusätzlich prüfen.',
    title_en: 'Capital gains tax on German property: the 10-year rule',
    excerpt_en:
      'Capital gains tax on German property is not a separate tax. When the 10-year rule applies, when owner-occupation is exempt, and what landlords still have to check.',
    content_de: `<p><strong>Spekulationssteuer Immobilie</strong> ist im Einkommensteuergesetz keine eigene Steuerart. Der Verkauf einer privat gehaltenen Wohnung kann ein privates Veräußerungsgeschäft sein. Ob der Gewinn dann in die Einkommensteuer fällt, hängt vor allem an der Frist zwischen Anschaffung und Verkauf und daran, ob Sie die Wohnung selbst bewohnt haben.</p>
<p>Bei Sweet Home Berlin ordnen wir diese Frist in die Kaufstrategie ein, bevor ein Objekt nur nach Rendite aussieht. Die verbindliche Beurteilung bleibt beim Steuerberater. Wir ersetzen keine Kanzlei.</p>
<p>Aktuelle Objekte: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Was die 10-Jahres-Frist bedeutet</h2>
<p>Maßgeblich ist <a href="https://www.gesetze-im-internet.de/estg/__23.html" rel="noopener noreferrer" target="_blank">§ 23 Einkommensteuergesetz</a>. Private Veräußerungsgeschäfte bei Grundstücken – und damit auch bei Eigentumswohnungen – sind Verkäufe, bei denen der Zeitraum zwischen Anschaffung und Veräußerung nicht mehr als zehn Jahre beträgt. Liegen mehr als zehn Jahre dazwischen, ist der Verkauf nach dieser Vorschrift kein privates Veräußerungsgeschäft.</p>
<p>Der Gesetzestext zählt den Zeitraum, nicht ein gerundetes „ungefähr zehn Jahre“. Welcher Kalendertag in Ihrem Fall der letzte innerhalb der Frist ist, klärt die Steuerberatung anhand der Daten von Kauf und Verkauf.</p>
<p>Das ist etwas anderes als die Steuer beim Kauf. Die <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a> fällt beim Erwerb an. Die Frage der Spekulationssteuer stellt sich erst beim späteren Verkauf.</p>
<p><br></p>
<h2>Wann Eigennutzung den Gewinn ausnimmt</h2>
<p>§ 23 nimmt Wirtschaftsgüter aus, die im Zeitraum zwischen Anschaffung oder Fertigstellung und Veräußerung ausschließlich zu eigenen Wohnzwecken genutzt wurden. Dieselbe Ausnahme gilt, wenn die Wohnung im Jahr der Veräußerung und in den beiden vorangegangenen Jahren zu eigenen Wohnzwecken genutzt wurde.</p>
<p>Eine durchgehende Vermietung fällt nicht unter diesen Wortlaut. Eine kurze Eigennutzung am Ende ersetzt nicht automatisch jede frühere Vermietung; der zweite Weg im Gesetz ist die Nutzung im Verkaufsjahr und in den zwei Jahren davor. Ob eine Unterbrechung, ein Angehöriger oder ein Arbeitszimmer den Tatbestand noch erfüllt, ist ein Einzelfall. Den entscheidet nicht der Exposé-Text, sondern Ihre Steuerberatung anhand der tatsächlichen Nutzung.</p>
<p><br></p>
<h2>Wie der Gewinn gerechnet wird</h2>
<p>Gewinn oder Verlust ist nach § 23 der Unterschied zwischen dem Veräußerungspreis und den Anschaffungs- oder Herstellungskosten sowie den Werbungskosten. Wer die Wohnung vermietet hat und Absetzungen für Abnutzung bei den Einkünften abgezogen hat, muss wissen: Diese Abschreibungen mindern die Anschaffungs- oder Herstellungskosten, soweit sie abgezogen wurden. Die Haltedauer und die AfA gehören deshalb zusammen. Den Rahmen für Vermieter erklären wir unter <a href="/blog/steuern-fuer-vermieter">Steuern für Vermieter</a>.</p>
<p>Gewinne bleiben steuerfrei, wenn der Gesamtgewinn aus privaten Veräußerungsgeschäften im Kalenderjahr weniger als 1.000 Euro betragen hat. Das ist die Grenze im Gesetzestext. Erreicht der Gesamtgewinn diesen Betrag, trägt dieser Satz die Steuerfreiheit nicht mehr. Es wird nicht nur ein Überschuss über 1.000 Euro besteuert.</p>
<p>Verluste aus solchen Geschäften dürfen nur mit Gewinnen aus privaten Veräußerungsgeschäften ausgeglichen werden. Sie sind kein allgemeiner Verlusttopf für anderes Einkommen.</p>
<p><br></p>
<h2>Erbschaft, Schenkung und die laufende Frist</h2>
<p>Bei unentgeltlichem Erwerb rechnet § 23 dem Einzelrechtsnachfolger die Anschaffung des Rechtsvorgängers zu. Die Frist beginnt bei Erbschaft oder Schenkung nicht neu. Gezählt wird weiter ab dem Zeitpunkt, zu dem der Erblasser oder Schenker angeschafft hat. Wer eine geerbte Wohnung verkaufen will, braucht dieses Datum, nicht nur das Datum des Erbscheins.</p>
<p><br></p>
<h2>Warum die Frist zur Kapitalanlage gehört</h2>
<p>Eine <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage in Berlin</a> wird oft nach Miete und Kaufpreis beurteilt. Der Verkauf innerhalb von zehn Jahren kann den Gewinn in die Einkommensteuer holen, wenn keine Ausnahme greift. Wer die Wohnung vermietet hält, sollte die Frist in den Horizont legen, bevor die <a href="/blog/mietrendite-berechnen">Mietrendite</a> allein die Entscheidung trägt.</p>
<p>Ist die Wohnung schon vermietet, gehört der bestehende Vertrag in dieselbe Prüfung wie die Steuerfrist. Dazu der Beitrag <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>.</p>
<p><br></p>
<h2>Was dieser Text nicht ersetzt</h2>
<p>Sweet Home Berlin erklärt die Kaufrelevanz der Frist. Wir setzen keinen Steuersatz fest, wir prüfen keine gewerbliche Tätigkeit, und wir sagen nicht, ob ein konkreter Verkauf steuerfrei ist. Wiederholte An- und Verkäufe können außerhalb von § 23 liegen. Das ist ein anderer Fall und gehört in die Kanzlei, die Ihre Zahlen kennt.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Ab wann ist der Verkauf einer Immobilie nach § 23 nicht mehr erfasst?</strong><br>Wenn zwischen Anschaffung und Veräußerung mehr als zehn Jahre liegen. Innerhalb dieser Frist kann der Gewinn ein privates Veräußerungsgeschäft sein, sofern keine Ausnahme greift.</p>
<p><strong>Reicht es, vor dem Verkauf selbst einzuziehen?</strong><br>Das Gesetz nennt zwei Wege: ausschließliche Eigennutzung im gesamten Zeitraum zwischen Anschaffung oder Fertigstellung und Verkauf, oder Eigennutzung im Verkaufsjahr und in den beiden Jahren davor. Ob Ihr Verlauf darunter fällt, prüft die Steuerberatung.</p>
<p><strong>Läuft die Frist nach einer Erbschaft neu?</strong><br>Nein. Bei unentgeltlichem Erwerb wird die Anschaffung des Rechtsvorgängers zugerechnet.</p>
<p><strong>Ist das eine Steuerberatung von Sweet Home Berlin?</strong><br>Nein. Wir ordnen die Frist in die Objekt- und Strategieentscheidung ein. Die Veranlagung bleibt beim Steuerberater.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Sie die 10-Jahres-Frist mit einem konkreten Berliner Objekt zusammenbringen wollen, starten wir bei Lage, Preis und Nutzung – und lassen die steuerliche Feinarbeit bei Ihrer Beratung.</p>
<p>[[landing:berlin_main|Wohnung kaufen in Berlin|inline]]</p>`,
    content_en: `<p><strong>Capital gains tax on German property</strong> is not a tax of its own in the Income Tax Act. A sale of a privately held apartment can be a private disposal. Whether the gain then falls into income tax depends mainly on the time between purchase and sale, and on whether you lived in the home yourself.</p>
<p>At Sweet Home Berlin we place that holding period inside the buying strategy, before a listing is judged on yield alone. The binding view stays with your tax adviser. We do not replace a law firm.</p>
<p>Current homes: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>
<p><br></p>
<h2>What the 10-year rule actually says</h2>
<p>The rule is <a href="https://www.gesetze-im-internet.de/estg/__23.html" rel="noopener noreferrer" target="_blank">section 23 of the German Income Tax Act (EStG)</a>. Private disposals of land — and of condominiums — are sales where the period between acquisition and disposal is not more than ten years. If more than ten years lie between those dates, the sale is not a private disposal under that provision.</p>
<p>The statute counts the period. It does not say “about ten years”. Which calendar day is the last day inside the window in your file is a question for tax advice, using the contract dates.</p>
<p>That is separate from the tax you pay on the way in. <a href="/en/blog/berlin-transfer-tax-grunderwerbsteuer">Berlin transfer tax (Grunderwerbsteuer)</a> is charged on the purchase. The holding-period question appears when you sell later.</p>
<p><br></p>
<h2>When living in the home takes the gain out</h2>
<p>Section 23 excludes assets used exclusively as your own home for the whole period between acquisition or completion and sale. The same exclusion applies if the home was used as your own residence in the year of sale and in the two preceding years.</p>
<p>A continuous let does not match that wording. Moving in briefly at the end does not automatically erase an earlier tenancy. The second path in the statute is use in the year of sale and the two years before it. A break in occupation, use by a relative, or a room used for work can change the result. The exposé does not decide that. Your tax adviser does, from the actual use.</p>
<p><br></p>
<h2>How the gain is calculated</h2>
<p>Under section 23, gain or loss is the difference between the sale price and the acquisition or production costs, together with income-related expenses. If you let the apartment and deducted depreciation against that rental income, those deductions reduce the acquisition or production cost to the extent they were claimed. Holding period and depreciation belong in one conversation. The landlord-side map is in <a href="/en/blog/german-rental-property-taxes">taxes for landlords in Germany</a>.</p>
<p>Gains stay tax-free if the total gain from private disposals in the calendar year was less than €1,000. That is the line in the statute. Once the year’s total reaches that amount, this sentence no longer keeps the gain tax-free. The law does not tax only the slice above €1,000.</p>
<p>Losses from these transactions may be set off only against gains from private disposals. They are not a general loss pot for other income.</p>
<p><br></p>
<h2>Inheritance, gifts and the clock that keeps running</h2>
<p>On an acquisition without payment, section 23 attributes the predecessor’s acquisition to the successor. A gift or inheritance does not restart the ten years. The clock continues from the date the deceased or the donor acquired the property. Anyone selling an inherited apartment needs that earlier date, not only the date on the certificate of inheritance.</p>
<p><br></p>
<h2>Why the holding period belongs in an investment plan</h2>
<p>A <a href="/en/blog/berlin-real-estate-investment-guide-2026">Berlin property investment</a> is often judged on rent and purchase price. A sale inside ten years can pull the gain into income tax if no exclusion applies. If you hold to let, put the period into the plan before <a href="/en/blog/how-to-calculate-rental-yield-berlin">rental yield</a> is the only number on the page.</p>
<p>If the apartment is already tenanted, the lease sits in the same review as the tax clock. See <a href="/en/blog/buying-tenanted-apartment-berlin">buying a tenanted apartment in Berlin</a>.</p>
<p><br></p>
<h2>What this article does not decide</h2>
<p>Sweet Home Berlin explains why the holding period matters at purchase. We do not set your tax rate, we do not test whether repeated buying and selling is a trade, and we do not tell you that a specific sale is tax-free. Repeated deals can fall outside section 23. That is a different case, and it belongs with the adviser who has your figures.</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>When does section 23 stop covering a property sale?</strong><br>When more than ten years lie between acquisition and disposal. Inside that period the gain can be a private disposal, unless an exclusion applies.</p>
<p><strong>Is it enough to move in before I sell?</strong><br>The statute names two paths: exclusive use as your own home for the whole period between acquisition or completion and sale, or use as your own home in the year of sale and the two years before it. Whether your timeline fits is for your tax adviser.</p>
<p><strong>Does an inheritance restart the ten years?</strong><br>No. On a transfer without payment, the predecessor’s acquisition date is the one that counts.</p>
<p><strong>Is this tax advice from Sweet Home Berlin?</strong><br>No. We connect the holding period to the property decision. The assessment stays with your tax adviser.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If you want the 10-year rule read against a real Berlin apartment, we start with location, price and how you will use the home. The tax detail stays with your adviser.</p>
<p>[[landing:berlin_main|apartments for sale in Berlin|inline]]</p>`
  },
  {
    slug: 'wohnung-kaufen-moabit-ratgeber',
    slug_en: 'buying-apartment-moabit-guide',
    cover_image: COVERS.moabit,
    title_de: 'Wohnung kaufen Moabit: Lagen und für wen es passt',
    excerpt_de:
      'Wohnung kaufen in Moabit heißt Ortsteil im Bezirk Mitte, nicht ein eigener Markt. Welche Lagen sich unterscheiden und woran Käufer die Straße prüfen.',
    title_en: 'Buying an apartment in Moabit: locations and who it suits',
    excerpt_en:
      'Buying an apartment in Moabit means an Ortsteil inside Mitte, not a market of its own. How the locations differ, and what buyers should check on the street.',
    content_de: `<p><strong>Wohnung kaufen Moabit</strong> startet mit einer Verwaltungsgrenze, die Inserate oft weglassen. Moabit ist ein Ortsteil im Bezirk Mitte, kein eigener Bezirk. Wer nur den Namen vergleicht, legt Straßen in einen Topf, die sich in Lärm, Wasserlage und Weg zum Hauptbahnhof deutlich unterscheiden.</p>
<p>Dieser Text beantwortet die Kauffrage. Die aktuellen Wohnungen stehen auf der Seite <a href="/wohnung-kaufen-moabit">Wohnung kaufen Moabit</a>. Dort vergleichen Sie Angebote. Hier sortieren Sie, welche Lage zu Ihrer Nutzung passt.</p>
<p><a href="/wohnung-kaufen-moabit"><img src="/images/blog/wo-in-berlin-moabit.jpg" alt="Moabit, Ortsteil im Bezirk Mitte, am Wasser" width="1200" height="800" loading="lazy" /></a></p>
<p><br></p>
<h2>Was Moabit geografisch ist</h2>
<p>Das <a href="https://www.berlin.de/ba-mitte/ueber-den-bezirk/ortsteile/moabit/" rel="noopener noreferrer" target="_blank">Bezirksamt Mitte</a> beschreibt Moabit als dicht besiedelten Ortsteil nördlich des Tiergartens. Umschlossen wird er von Spree, Berlin-Spandauer Schifffahrtskanal, Westhafenkanal und Charlottenburger Verbindungskanal und ist über 26 Straßen-, Bahn- und Fußgängerbrücken mit der Nachbarschaft verbunden. Der frühere Industrie- und Arbeiterortsteil wurde 1861 nach Berlin eingemeindet.</p>
<p>Für den Kauf zählt diese Lage praktisch: Sie sind nah an Mitte und am Hauptbahnhof, und Sie kaufen in einem Gebiet, das Wasser und Brücken gliedern. Eine ruhige Wohnstraße und eine Achse mit Durchgangsverkehr können wenige Blocks auseinanderliegen. Der Ortsteilname allein sagt das nicht.</p>
<p><br></p>
<h2>Vier Lagen, die Käufer leicht zusammenwerfen</h2>
<p>Sweet Home Berlin sortiert Moabit-Shortlists entlang von vier Bildern, die auf der Angebotsseite wiederkehren. Das sind Orientierungspunkte, keine amtliche Rangliste und kein Preisindex.</p>
<ul>
<li><strong>Stephankiez und Arminiusmarkthalle.</strong> Urbanes Kiezleben, kurze Wege, höhere Alltagsdichte. Für Eigennutzer, die Straße und Wochenmarkt wollen, und für Anleger, die Vermietbarkeit an der Nachfrage im Kiez festmachen.</li>
<li><strong>Spree- und Kanalnähe.</strong> Die Wasserlage trägt den Wohnwert. Sie trägt nicht automatisch einen stillen Hinterhof. Prüfen Sie die konkrete Seite des Kanals, nicht das Wort „Wasser“ im Titel.</li>
<li><strong>Umfeld Hauptbahnhof.</strong> Stark angebunden, gefragt bei Menschen, die oft fahren. Dieselbe Nähe kann Lärm und ein anderes Straßenbild bedeuten als eine Wohnstraße weiter westlich.</li>
<li><strong>Beusselkiez.</strong> Gewachsener Bestand. Hier entscheidet der Zustand des Hauses und der Straße, nicht die Erzählung eines „neuen“ Viertels.</li>
</ul>
<p>Wie sich Moabit zu anderen Berliner Lagen verhält, steht im Vergleich <a href="/blog/wo-in-berlin-wohnung-kaufen">Wo in Berlin Wohnung kaufen</a>. Der Ratgeber ersetzt die Besichtigung nicht.</p>
<p><br></p>
<h2>Für wen eine Wohnung in Moabit passt</h2>
<p>Moabit passt zu Eigennutzern, die die Nähe zu Mitte und zum Hauptbahnhof wollen und dafür ein dichtes, gemischtes Wohnumfeld akzeptieren. Es passt zu Anlegern, die Vermietbarkeit und Anbindung prüfen und die Miete aus dem Vertrag nehmen, nicht aus einem Bezirksmittel.</p>
<p>Weniger passend ist Moabit, wenn Sie vor allem Ruhe, ein eigenes Hausumfeld oder eine repräsentative Westlage suchen. Dann ist der Vergleich mit anderen Bezirken ehrlicher als ein Kompromiss auf der falschen Straße. Die Renditerechnung, falls Sie vermieten, führen Sie mit der <a href="/blog/mietrendite-berechnen">Mietrendite</a> auf diesem Objekt, nicht mit einem Moabit-Durchschnitt.</p>
<p><br></p>
<h2>Preis: die Straße schlägt den Ortsteil</h2>
<p>Einen amtlichen Moabit-Quadratmeterpreis setzen wir hier nicht an. Stadtweite Orientierung kommt aus dem Gutachterausschuss und ist im Beitrag <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a> eingeordnet. Innerhalb Moabits verschiebt Zustand, Zuschnitt, Hausgeld und die Frage, ob die Wohnung leer oder vermietet ist, den Preis stärker als der Ortsteilname.</p>
<p>Die Finanzierung hängt an derselben Rechnung. Nebenkosten, Eigenkapital und eine tragbare Rate klären Sie, bevor die Lage emotional wird. Dazu <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>
<p><br></p>
<h2>Was vor dem Angebot zu prüfen ist</h2>
<p>Drei Punkte trennen eine brauchbare Shortlist von einer Sammlung schöner Fotos. Erstens die Straße: Wasser, Bahn und eine laute Achse sind in Moabit nah beieinander. Zweitens das Haus: Teilungserklärung, Rücklage, Protokolle und anstehende Maßnahmen. Drittens die Nutzung: Eigennutz, leer zur Vermietung oder ein laufender Mietvertrag mit einer Miete, die Sie nachrechnen können.</p>
<p>Sweet Home Berlin grenzt diese Punkte ein, bevor wir Wohnungen aus der Angebotsseite in die engere Wahl nehmen.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Ist Moabit ein eigener Bezirk?</strong><br>Nein. Moabit ist ein Ortsteil des Bezirks Mitte. Das beschreibt das Bezirksamt Mitte so.</p>
<p><strong>Für wen lohnt sich der Kauf in Moabit?</strong><br>Für Eigennutzer mit Wunsch nach zentraler Anbindung und für Anleger, die Straße, Zustand und reale Miete prüfen. Nicht als pauschale „günstige Mitte“.</p>
<p><strong>Unterscheiden sich die Lagen stark?</strong><br>Ja. Stephankiez, Wasserlagen, Hauptbahnhof-Umfeld und Beusselkiez sind unterschiedliche Kaufentscheidungen, auch wenn alle „Moabit“ heißen.</p>
<p><strong>Wo sehe ich aktuelle Wohnungen?</strong><br>Auf <a href="/wohnung-kaufen-moabit">Wohnung kaufen Moabit</a>. Dieser Text erklärt die Lage, die Seite zeigt die Objekte.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Moabit auf Ihrer Liste steht, grenzen wir Ortsteil-Lage, Budget und Nutzung ein und legen passende Wohnungen daneben.</p>
<p>Stadtweit vergleichen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`,
    content_en: `<p><strong>Buying an apartment in Moabit</strong> starts with an administrative line that listings often skip. Moabit is an Ortsteil inside the borough of Mitte, not a borough of its own. Comparing only the name puts streets in one basket that differ in noise, waterfront and the walk to Hauptbahnhof.</p>
<p>This guide answers the buying question. Current apartments are on <a href="/en/properties-for-sale-moabit">apartments for sale in Moabit</a>. Use that page to compare listings. Use this one to decide which location fits how you will live or let.</p>
<p><a href="/en/properties-for-sale-moabit"><img src="/images/blog/wo-in-berlin-moabit.jpg" alt="Moabit, an Ortsteil in Berlin-Mitte, beside the water" width="1200" height="800" loading="lazy" /></a></p>
<p><br></p>
<h2>What Moabit is on the map</h2>
<p>The <a href="https://www.berlin.de/ba-mitte/ueber-den-bezirk/ortsteile/moabit/" rel="noopener noreferrer" target="_blank">Mitte district office</a> describes Moabit as a densely populated Ortsteil north of Tiergarten. The Spree, the Berlin-Spandau shipping canal, the Westhafen canal and the Charlottenburg link canal enclose it, and 26 road, rail and foot bridges tie it to the surrounding city. The former industrial and working quarter was incorporated into Berlin in 1861.</p>
<p>For a purchase that geography is practical. You are close to Mitte and to Hauptbahnhof, and you are buying in an area that water and bridges break into pieces. A quiet residential street and a through-road can sit a few blocks apart. The Ortsteil name does not say which one you are on.</p>
<p><br></p>
<h2>Four locations buyers tend to merge</h2>
<p>Sweet Home Berlin sorts Moabit shortlists along four pictures that also appear on the listings page. They are orientation, not an official ranking and not a price index.</p>
<ul>
<li><strong>Stephankiez and the Arminius market hall.</strong> Urban neighbourhood life, short errands, a denser day. For owner-occupiers who want the street, and for investors who tie lettability to demand in that pocket.</li>
<li><strong>Spree and canal.</strong> The water carries the living value. It does not automatically mean a quiet courtyard. Check the actual bank of the canal, not the word “water” in the title.</li>
<li><strong>Around Hauptbahnhof.</strong> Strong connections, useful if you travel often. The same proximity can mean noise and a different street than a residential block further west.</li>
<li><strong>Beusselkiez.</strong> Established stock. The building and the street decide, not a story about a “new” quarter.</li>
</ul>
<p>How Moabit sits against other Berlin areas is in <a href="/en/blog/where-to-buy-apartment-in-berlin">where to buy an apartment in Berlin</a>. The comparison does not replace a viewing.</p>
<p><br></p>
<h2>Who an apartment in Moabit suits</h2>
<p>Moabit suits owner-occupiers who want Mitte and Hauptbahnhof nearby and will accept a dense, mixed neighbourhood. It suits investors who check lettability and transport, and who take the rent from the lease, not from a district average.</p>
<p>It is a weaker fit if you mainly want quiet, a house-like setting, or a representative west-end address. Then comparing other districts is clearer than compromising on the wrong street. If you plan to let, run <a href="/en/blog/how-to-calculate-rental-yield-berlin">rental yield</a> on this apartment, not on a Moabit average.</p>
<p><br></p>
<h2>Price follows the street</h2>
<p>We do not quote an official Moabit price per square metre here. Citywide orientation comes from Berlin’s valuation committee and is set out in <a href="/en/blog/berlin-property-prices-2026">Berlin property prices</a>. Inside Moabit, condition, layout, service charges and whether the home is vacant or tenanted move the price more than the Ortsteil label.</p>
<p>Financing sits on the same sum. Closing costs, equity and a payment you can carry belong in the file before the location becomes emotional. See <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>
<p><br></p>
<h2>What to check before the shortlist</h2>
<p>Three points separate a usable shortlist from a folder of attractive photos. First the street: water, rail and a loud axis sit close together in Moabit. Second the building: declaration of division, reserves, minutes and works that are already coming. Third the use: owner-occupation, vacant to let, or a running lease with a rent you can recalculate.</p>
<p>Sweet Home Berlin narrows those points before apartments from the listings page enter the closer choice.</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>Is Moabit its own borough?</strong><br>No. Moabit is an Ortsteil of the borough of Mitte. That is how the Mitte district office describes it.</p>
<p><strong>Who is a purchase in Moabit for?</strong><br>Owner-occupiers who want central connections, and investors who check the street, the building and the actual rent. Not as a blanket “cheaper Mitte”.</p>
<p><strong>Do the locations differ much?</strong><br>Yes. Stephankiez, the water, the Hauptbahnhof area and Beusselkiez are different purchases, even when each listing says Moabit.</p>
<p><strong>Where are the current apartments?</strong><br>On <a href="/en/properties-for-sale-moabit">apartments for sale in Moabit</a>. This article explains the area. That page shows the homes.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If Moabit is on your list, we narrow location, budget and use, and put suitable apartments next to that.</p>
<p>Compare across the city: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>`
  },
  {
    slug: 'wohnung-kaufen-neukoelln-ratgeber',
    slug_en: 'buying-apartment-neukoelln-guide',
    cover_image: COVERS.neukoelln,
    title_de: 'Wohnung kaufen Neukölln: Lagen und für wen es passt',
    excerpt_de:
      'Wohnung kaufen in Neukölln trifft auf fünf Ortsteile. Nord-Neukölln, Britz, Buckow, Rudow und Gropiusstadt sind nicht derselbe Kauf.',
    title_en: 'Buying an apartment in Neukölln: locations and who it suits',
    excerpt_en:
      'Buying an apartment in Neukölln meets five localities. Northern Neukölln, Britz, Buckow, Rudow and Gropiusstadt are not the same purchase.',
    content_de: `<p><strong>Wohnung kaufen Neukölln</strong> klingt nach einem Markt. Amtlich ist Neukölln ein Bezirk mit fünf Ortsteilen. Wer ein Inserat aus dem Reuterkiez mit einem aus Rudow in dieselbe Rechnung legt, vergleicht zwei Wohnorte, die nur den Bezirksnamen teilen.</p>
<p>Die Angebote selbst stehen auf <a href="/wohnung-kaufen-neukoelln">Wohnung kaufen Neukölln</a>. Dieser Text hilft bei der Frage davor: welcher Ortsteil, welche Straße, welche Nutzung. Die Seite verkauft nicht den Ratgeber, und der Ratgeber ersetzt nicht die Objektliste.</p>
<p><a href="/wohnung-kaufen-neukoelln"><img src="/images/blog/wo-in-berlin-neukoelln.jpg" alt="Neukölln, Bezirk mit mehreren Ortsteilen" width="886" height="480" loading="lazy" /></a></p>
<p><br></p>
<h2>Fünf Ortsteile, ein Bezirk</h2>
<p>Das <a href="https://www.berlin.de/ba-neukoelln/ueber-den-bezirk/ortsteile/" rel="noopener noreferrer" target="_blank">Bezirksamt Neukölln</a> hält fest: Der Bezirk besteht aus den Ortsteilen Neukölln (Nord-Neukölln), Britz, Buckow, Rudow und der Gropiusstadt.</p>
<p>In der Suche meint „Wohnung kaufen Neukölln“ meist den nördlichen Ortsteil: dichter, städtischer, näher an Kreuzberg und am Tempelhofer Feld. Britz, Buckow, Rudow und die Gropiusstadt liegen im selben Bezirk und sind andere Käufe. Mehr Bestand aus unterschiedlichen Jahrzehnten, andere Wege in die Innenstadt, ein anderes Alltagsbild. Der erste Schritt ist, den Ortsteil im Exposé zu benennen, nicht nur den Bezirk.</p>
<p><br></p>
<h2>Nord-Neukölln ist nicht Britz</h2>
<p>Im nördlichen Ortsteil arbeiten wir mit vier Orientierungen. Sie stehen auch auf der Angebotsseite. Sie sind eine Shortlist-Logik von Sweet Home Berlin, keine amtliche Preisrangliste.</p>
<ul>
<li><strong>Reuterkiez.</strong> Dicht und lebendig. Die Straße entscheidet, ob der Alltag zu Ihnen passt oder nur das Bild des Kiezes.</li>
<li><strong>Schillerkiez.</strong> Am Tempelhofer Feld. Die Nähe zum Feld ist ein konkreter Vorteil. Sie ersetzt nicht den Blick auf Hausgeld, Zustand und die konkrete Seite der Straße.</li>
<li><strong>Rixdorf und das Böhmische Dorf.</strong> Charaktervoller Bestand. Hier zählt der Altbau, den Sie kaufen, nicht der Name des Dorfs allein.</li>
<li><strong>Britz-Nord.</strong> Ruhiger als der Norden, mit eigener Infrastruktur. Wer Britz sucht, sollte nicht den Reuterkiez als Vergleichsmaßstab für Preis oder Ruhe nehmen.</li>
</ul>
<p>Buckow, Rudow und die Gropiusstadt gehören in eine eigene Prüfung, sobald das Inserat dort liegt. Sie mit Nord-Neukölln über einen Bezirksdurchschnitt zu glätten, führt in die falsche Shortlist.</p>
<p>Den Rahmen gegenüber anderen Berliner Lagen gibt <a href="/blog/wo-in-berlin-wohnung-kaufen">Wo in Berlin Wohnung kaufen</a>.</p>
<p><br></p>
<h2>Für wen welche Lage passt</h2>
<p>Der nördliche Ortsteil passt zu Eigennutzern, die ein städtisches Wohnumfeld wollen und Straße für Straße prüfen, ob Dichte und Lärm zum Alltag passen. Er passt zu Anlegern, die die Vermietbarkeit an der konkreten Lage festmachen und die Miete aus dem Vertrag lesen.</p>
<p>Britz und die südlicheren Ortsteile passen eher, wenn Ruhe, andere Bausubstanz oder ein längerer Weg in die Innenstadt bewusst Teil des Kaufs sind. Sie sind kein automatischer „günstigerer Norden“.</p>
<p>Ist die Wohnung vermietet, ändert sich die Rechnung noch einmal. Preisvorteil und Mietvertrag gehören zusammen, nicht nacheinander. Dazu <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>. Die Rendite rechnen Sie auf diesem Objekt mit der <a href="/blog/mietrendite-berechnen">Mietrendite</a>, nicht auf den Bezirk Neukölln.</p>
<p><br></p>
<h2>Preis ohne erfundene Bezirkszahl</h2>
<p>Einen €/m²-Satz für „Neukölln“ nennen wir hier nicht. Die Spanne zwischen dem nördlichen Ortsteil und Rudow ist zu groß für eine Zahl, die eine Kaufentscheidung tragen könnte. Stadtweite Orientierung aus dem Gutachterausschuss steht unter <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>. Danach zählt die Straße, der Zustand und ob Sie selbst einziehen oder einen laufenden Vertrag übernehmen.</p>
<p><br></p>
<h2>Was die Suche auf Seite zwei oft vermischt</h2>
<p>Viele Anfragen behandeln Neukölln als ein Ziel. Die Unterlagen tun das nicht. Prüfen Sie den Ortsteil, die ÖPNV-Minuten von dieser Adresse und das Haus: Teilungserklärung, Rücklage, Protokolle. Sweet Home Berlin filtert die Objektliste auf der Neukölln-Seite nach genau dieser Unterscheidung, statt einen Bezirksnamen als Strategie zu verkaufen.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Ist Neukölln ein einziger Wohnungsmarkt?</strong><br>Nein. Der Bezirk hat fünf Ortsteile: Neukölln (Nord-Neukölln), Britz, Buckow, Rudow und Gropiusstadt. Das steht so beim Bezirksamt.</p>
<p><strong>Was meinen die meisten mit Wohnung kaufen Neukölln?</strong><br>Oft den nördlichen Ortsteil. Britz und der Süden sind eigene Entscheidungen und gehören benannt.</p>
<p><strong>Eigennutzer oder Kapitalanlage?</strong><br>Beides kommt vor. Die Lage muss zur Nutzung passen, und eine vermietete Wohnung wird mit dem bestehenden Vertrag gerechnet.</p>
<p><strong>Wo liegen die aktuellen Angebote?</strong><br>Auf <a href="/wohnung-kaufen-neukoelln">Wohnung kaufen Neukölln</a>. Dieser Ratgeber sortiert die Lagen und schickt Sie dorthin.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Neukölln auf der Liste steht, legen wir zuerst den Ortsteil fest und danach die Wohnungen, die zu Budget und Nutzung passen.</p>
<p>Stadtweit vergleichen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`,
    content_en: `<p><strong>Buying an apartment in Neukölln</strong> sounds like one market. Officially, Neukölln is a borough with five localities. Putting a Reuterkiez listing and a Rudow listing in the same sum compares two places that share a borough name.</p>
<p>The listings themselves are on <a href="/en/properties-for-sale-neukoelln">apartments for sale in Neukölln</a>. This article answers the question before that: which locality, which street, which use. The page is where you compare homes. The guide does not try to be the catalogue.</p>
<p><a href="/en/properties-for-sale-neukoelln"><img src="/images/blog/wo-in-berlin-neukoelln.jpg" alt="Neukölln, a Berlin borough of several localities" width="886" height="480" loading="lazy" /></a></p>
<p><br></p>
<h2>Five localities, one borough</h2>
<p>The <a href="https://www.berlin.de/ba-neukoelln/ueber-den-bezirk/ortsteile/" rel="noopener noreferrer" target="_blank">Neukölln district office</a> states that the borough consists of the localities Neukölln (northern Neukölln), Britz, Buckow, Rudow and Gropiusstadt.</p>
<p>In search, “buying an apartment in Neukölln” usually means the northern locality: denser, more urban, closer to Kreuzberg and to Tempelhofer Feld. Britz, Buckow, Rudow and Gropiusstadt are in the same borough and are different purchases. Different decades of building stock, different journeys into the inner city, a different day. The first step is to name the locality in the exposé, not only the borough.</p>
<p><br></p>
<h2>Northern Neukölln is not Britz</h2>
<p>Inside the northern locality we work with four orientations. They also appear on the listings page. They are a Sweet Home Berlin shortlist logic, not an official price ranking.</p>
<ul>
<li><strong>Reuterkiez.</strong> Dense and lively. The street decides whether the day fits you, or only the picture of the neighbourhood.</li>
<li><strong>Schillerkiez.</strong> Beside Tempelhofer Feld. Being next to the field is a concrete advantage. It does not replace a look at service charges, condition and which side of the street you are on.</li>
<li><strong>Rixdorf and the Bohemian village.</strong> Characterful stock. What matters is the Altbau you are buying, not the village name on its own.</li>
<li><strong>Britz-Nord.</strong> Quieter than the north, with its own infrastructure. If you want Britz, do not use Reuterkiez as the benchmark for price or calm.</li>
</ul>
<p>Buckow, Rudow and Gropiusstadt need their own review as soon as the listing sits there. Smoothing them into northern Neukölln with one borough average builds the wrong shortlist.</p>
<p>The frame against other Berlin areas is <a href="/en/blog/where-to-buy-apartment-in-berlin">where to buy an apartment in Berlin</a>.</p>
<p><br></p>
<h2>Who each location suits</h2>
<p>The northern locality suits owner-occupiers who want an urban neighbourhood and will check, street by street, whether density and noise fit the day. It suits investors who tie lettability to the actual location and read the rent from the lease.</p>
<p>Britz and the localities further south suit buyers for whom quiet, a different building stock, or a longer journey into the inner city is a deliberate part of the purchase. They are not an automatic “cheaper north”.</p>
<p>If the apartment is tenanted, the sum changes again. Any price gap and the lease belong together. See <a href="/en/blog/buying-tenanted-apartment-berlin">buying a tenanted apartment in Berlin</a>. Run <a href="/en/blog/how-to-calculate-rental-yield-berlin">rental yield</a> on this apartment, not on the borough of Neukölln.</p>
<p><br></p>
<h2>Price without an invented borough figure</h2>
<p>We do not quote a euro-per-square-metre figure for “Neukölln” here. The span between the northern locality and Rudow is too wide for one number to carry a purchase. Citywide orientation from Berlin’s valuation committee is in <a href="/en/blog/berlin-property-prices-2026">Berlin property prices</a>. After that, the street, the condition, and whether you move in or take over a running lease do the work.</p>
<p><br></p>
<h2>What a broad search tends to mix</h2>
<p>Many queries treat Neukölln as one destination. The paperwork does not. Check the locality, the transit minutes from this address, and the building: declaration of division, reserves, minutes. Sweet Home Berlin filters the list on the Neukölln page by that distinction, instead of selling a borough name as a strategy.</p>
<p><br></p>
<h2>FAQ</h2>
<p><strong>Is Neukölln a single apartment market?</strong><br>No. The borough has five localities: Neukölln (northern Neukölln), Britz, Buckow, Rudow and Gropiusstadt. That is the district office’s wording.</p>
<p><strong>What do most people mean by buying in Neukölln?</strong><br>Often the northern locality. Britz and the south are separate decisions and should be named.</p>
<p><strong>Owner-occupier or investment?</strong><br>Both happen. The location has to match the use, and a tenanted apartment is calculated with the lease that is already in place.</p>
<p><strong>Where are the current listings?</strong><br>On <a href="/en/properties-for-sale-neukoelln">apartments for sale in Neukölln</a>. This guide sorts the areas and sends you there.</p>
<p><br></p>
<h2>Next step with Sweet Home Berlin</h2>
<p>If Neukölln is on the list, we fix the locality first and then the apartments that match budget and use.</p>
<p>Compare across the city: [[landing:berlin_main|apartments for sale in Berlin|inline]].</p>`
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
  const matches = String(html || '').match(/https?:\/\/(?:www\.)?(?:berlin\.de|gesetze-im-internet\.de)[^"\s]*/g) || [];
  return new Set(matches).size;
}

async function upsertPost(client, post) {
  const existing = await client.query(`SELECT id, status FROM blog_posts WHERE slug = $1`, [post.slug]);
  const titleI18n = { de: post.title_de, en: post.title_en };
  const excerptI18n = { de: post.excerpt_de, en: post.excerpt_en };
  const contentI18n = { de: post.content_de, en: post.content_en };
  const slugI18n = { de: post.slug, en: post.slug_en };

  console.log(`\n${post.slug}`);
  console.log(`  title DE ${post.title_de.length} chars | EN ${post.title_en.length} chars`);
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
      slug: 'steuern-fuer-vermieter',
      lang: 'de',
      marker: '/blog/spekulationssteuer-immobilie',
      insertBefore: '<h2>Nächster Schritt mit Sweet Home Berlin</h2>',
      paragraph:
        '<p>Wann ein späterer Verkauf innerhalb von zehn Jahren in die Einkommensteuer fällt, steht im Beitrag <a href="/blog/spekulationssteuer-immobilie">Spekulationssteuer Immobilie</a> – inklusive Eigennutzung und der Frist bei Erbschaft oder Schenkung.</p>'
    },
    {
      slug: 'steuern-fuer-vermieter',
      lang: 'en',
      marker: '/en/blog/capital-gains-tax-property-germany',
      insertBefore: '<h2>Next Step with Sweet Home Berlin</h2>',
      paragraph:
        '<p>When a later sale inside ten years falls into income tax, see <a href="/en/blog/capital-gains-tax-property-germany">capital gains tax on German property</a>, including owner-occupation and the clock after a gift or inheritance.</p>'
    },
    {
      slug: 'immobilie-als-kapitalanlage-berlin',
      lang: 'de',
      marker: '/blog/spekulationssteuer-immobilie',
      insertBefore: '<h2>Nächster Schritt mit Sweet Home</h2>',
      paragraph:
        '<p>Zur Haltedauer beim Verkauf: <a href="/blog/spekulationssteuer-immobilie">Spekulationssteuer Immobilie</a> erklärt die Zehnjahresfrist aus § 23 EStG. Das ersetzt keine Steuerberatung.</p>'
    },
    {
      slug: 'immobilie-als-kapitalanlage-berlin',
      lang: 'en',
      marker: '/en/blog/capital-gains-tax-property-germany',
      insertBefore: '<p><br></p><p>[[landing:berlin_main|Talk to a Berlin property specialist at Sweet Home|button]]</p>',
      paragraph:
        '<p>On the holding period when you sell, <a href="/en/blog/capital-gains-tax-property-germany">capital gains tax on German property</a> explains the ten-year rule in section 23 of the Income Tax Act. It does not replace tax advice.</p>'
    },
    {
      slug: 'wo-in-berlin-wohnung-kaufen',
      lang: 'de',
      marker: '/blog/wohnung-kaufen-moabit-ratgeber',
      insertBefore: '<h2>Nächster Schritt</h2>',
      paragraph:
        '<p>Zwei Lagen, die in der Suche oft wie ein Bezirk wirken, haben eigene Kaufratgeber: <a href="/blog/wohnung-kaufen-moabit-ratgeber">Wohnung kaufen Moabit</a> und <a href="/blog/wohnung-kaufen-neukoelln-ratgeber">Wohnung kaufen Neukölln</a>. Die Angebotsseiten bleiben der Ort für aktuelle Wohnungen.</p>'
    },
    {
      slug: 'wo-in-berlin-wohnung-kaufen',
      lang: 'en',
      marker: '/en/blog/buying-apartment-moabit-guide',
      insertBefore: '<h2>Next Step</h2>',
      paragraph:
        '<p>Two areas that search often treats as one district have their own buying guides: <a href="/en/blog/buying-apartment-moabit-guide">buying an apartment in Moabit</a> and <a href="/en/blog/buying-apartment-neukoelln-guide">buying an apartment in Neukölln</a>. The district pages stay the place for current listings.</p>'
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
    let html = i18n[patch.lang] || (patch.lang === 'de' ? rows[0].content || '' : '');
    if (!html) {
      console.log(`  reciprocal empty ${patch.lang}: ${patch.slug}`);
      continue;
    }
    if (html.includes(patch.marker)) {
      console.log(`  reciprocal already present: ${patch.slug} ${patch.lang}`);
      continue;
    }
    const idx = html.indexOf(patch.insertBefore);
    if (idx === -1) {
      console.log(`  reciprocal anchor missing in ${patch.slug} ${patch.lang}`);
      continue;
    }
    html = `${html.slice(0, idx)}${patch.paragraph}\n${html.slice(idx)}`;
    i18n[patch.lang] = html;

    let content = rows[0].content;
    if (patch.lang === 'de' && content && String(content).includes(patch.insertBefore) && !String(content).includes(patch.marker)) {
      const cidx = String(content).indexOf(patch.insertBefore);
      content = `${String(content).slice(0, cidx)}${patch.paragraph}\n${String(content).slice(cidx)}`;
    }

    await client.query(
      `UPDATE blog_posts SET content = $1, content_i18n = $2::jsonb, updated_at = NOW() WHERE id = $3`,
      [content, JSON.stringify(i18n), rows[0].id]
    );
    console.log(`  reciprocal linked: ${patch.slug} ${patch.lang}`);
  }
}

(async () => {
  console.log(`S7 week 2 — status=${STATUS}${process.env.DRY_RUN === '1' ? ' (dry-run)' : ''}`);
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
    `SELECT id, slug, status, slug_i18n->>'en' AS en_slug,
            length(content_i18n->>'de') AS de_chars, length(content_i18n->>'en') AS en_chars
     FROM blog_posts WHERE slug = ANY($1::text[]) ORDER BY slug`,
    [posts.map((p) => p.slug)]
  );
  console.log('\nDB rows:');
  console.table(check.rows);
  await client.end();
  if (!WANT_PUBLISH) {
    console.log('\nDrafts ready for human read-through.');
    console.log('After review: PUBLISH=1 node scripts/s7-week2-publish-posts.js');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
