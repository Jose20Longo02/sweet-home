#!/usr/bin/env node
/**
 * N9 Week 1 — publish three new Berlin blog posts directly (German keyword slugs).
 * Idempotent: skips insert if slug already exists; still applies reciprocal link patches.
 *
 * Usage: node scripts/n9-week1-publish-posts.js
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12; // Irem Demirci
const NOW = new Date().toISOString();

const COVERS = {
  immobilienpreise:
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/3-room-apartment-for-sale-suitable-for-owner-occupation-or-as-an-investment/photos/apartment-charlottenburg-wilmersdorf-1.jpg',
  grunderwerbsteuer:
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/grosszugige-4-zimmer-wohnung-in-berlin-spandau-ideal-zur-eigennutzung/photos/apartment-berlin-1.jpg',
  mietrendite:
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/top-kapitalanlage-in-weissensee/photos/apartment-pankow-1.jpg'
};

const posts = [
  {
    slug: 'immobilienpreise-berlin',
    cover_image: COVERS.immobilienpreise,
    title_de: 'Immobilienpreise Berlin 2026: Was Wohnungen nach Bezirk wirklich kosten',
    excerpt_de:
      'Eigentumswohnungen in Berlin lagen 2025 im Mittel bei 5.511 €/m². Hier die Immobilienpreise Berlin laut Gutachterausschuss – mit offiziellen Kaufpreisen und Tipps für Käufer.',
    title_en: 'Berlin Property Prices 2026: What Apartments Really Cost by District',
    excerpt_en:
      'Berlin apartments averaged €5,511/m² in 2025 (official Gutachterausschuss data). Price overview and buyer tips from Sweet Home Berlin.',
    content_de: `<p>Wenn Sie die Immobilienpreise Berlin verstehen wollen, reicht der Stadt-Durchschnitt oft nicht. Zwischen Mitte und Spandau liegen Tausende Euro pro Quadratmeter – und selbst innerhalb eines Bezirks entscheiden oft wenige Straßenblöcke über den Preis.</p>
<p>Bei Sweet Home Berlin nutzen wir Durchschnittswerte als Orientierung, nicht als Kaufentscheidung. Dieser Überblick zeigt, wo Bestandswohnungen 2026 liegen, wie Sie Angebots- und Kaufpreise lesen und welche nächsten Schritte sinnvoll sind.</p>
<p>Aktuelle Objekte finden Sie unter [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Immobilienpreise Berlin 2026: der Stadt-Durchschnitt</h2>
<p>Laut dem <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1699073.php" rel="noopener noreferrer" target="_blank">Immobilienmarktbericht 2025/2026 des Gutachterausschusses für Grundstückswerte in Berlin</a> lag der mittlere Kaufpreis für Eigentumswohnungen 2025 bei <strong>5.511 €/m²</strong> Wohnfläche – ein Anstieg von 5 % gegenüber 2024. Verkäufe in neu erstellten Wohnanlagen lagen im Mittel bei <strong>8.108 €/m²</strong> (+2 %). Im 1. Quartal 2026 zeigten sich die Preise laut derselben Quelle nahezu unverändert, bei rückläufigen Kauffällen.</p>
<p>Wichtig für die Einordnung:</p>
<ul>
<li><strong>Bestand ≠ Neubau:</strong> Neubau liegt klar über dem Bestandsniveau.</li>
<li><strong>Angebot ≠ Abschluss:</strong> Online-Angebotspreise liegen oft über dem späteren Kaufpreis.</li>
<li><strong>Lage schlägt Durchschnitt:</strong> Bezirk, Zustand, Energie und Mikrolage bewegen den Preis stärker als der Stadt-Mittelwert.</li>
</ul>
<p>Wer parallel die Gesamtbelastung plant, sollte auch die <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a> einrechnen – in der Praxis oft 10 bis 12 % zusätzlich zum Kaufpreis.</p>
<p><br></p>
<h2>Immobilienpreise Berlin: offizielle Kennzahlen</h2>
<p>Die folgende Übersicht basiert auf beurkundeten Kaufpreisen – nicht auf Inseraten. Quelle: Gutachterausschuss für Grundstückswerte in Berlin, Immobilienmarktbericht 2025/2026 (Pressemitteilung vom 31.07.2026).</p>
<table>
<thead>
<tr><th>Kennzahl</th><th>Wert</th></tr>
</thead>
<tbody>
<tr><td>Mittlerer Kaufpreis Eigentumswohnungen 2025</td><td>5.511 €/m²</td></tr>
<tr><td>Veränderung gegenüber 2024</td><td>+5 %</td></tr>
<tr><td>Neu erstellte Wohnanlagen 2025</td><td>8.108 €/m² (+2 %)</td></tr>
<tr><td>Preistendenz 1. Quartal 2026</td><td>nahezu unverändert</td></tr>
<tr><td>Höchster Einzelkaufpreis 2025</td><td>rd. 22.350 €/m² (Ortsteil Mitte)</td></tr>
</tbody>
</table>
<p><em>Stand / Quelle: <a href="https://www.berlin.de/gutachterausschuss/marktinformationen/marktanalyse/artikel.175633.php" rel="noopener noreferrer" target="_blank">Gutachterausschuss für Grundstückswerte in Berlin</a>. Preise ändern sich laufend – prüfen Sie aktuelle Vergleichswerte vor einem Gebot.</em></p>
<p><br></p>
<h2>Was die Spreizung für Käufer bedeutet</h2>
<p>Die teuersten Bezirke sind nicht automatisch „besser“ – und die günstigeren nicht automatisch die bessere Kapitalanlage. In Mitte etwa liegen Ortsteile wie das Zentrum und Wedding im selben Verwaltungsbezirk, aber auf völlig anderen Preisniveaus. Ähnliche Spreizungen gibt es in Charlottenburg-Wilmersdorf und Steglitz-Zehlendorf.</p>
<p>Deshalb empfehlen wir bei Sweet Home Berlin immer denselben Ablauf:</p>
<ol>
<li>Strategie klären (Eigennutzung, Vermietung, Mix)</li>
<li>Bezirke und Mikrolagen filtern</li>
<li>Objektklasse und Capex prüfen</li>
<li>Gesamtkosten und Finanzierung rechnen</li>
</ol>
<p>Für die Bezirksauswahl hilft unser Guide zu den <a href="/blog/beste-bezirke-immobilien-berlin">besten Bezirken für Immobilien in Berlin</a>. Familienorientierte Lagen finden Sie unter <a href="/blog/berlin-stadtteile-familien">Berliner Stadtteile für Familien</a>.</p>
<p>Konkrete Einstiege in gefragte Lagen:</p>
<ul>
<li>[[landing:berlin_charlottenburg|Wohnung kaufen Charlottenburg|inline]]</li>
<li>[[landing:berlin_schoeneberg|Wohnung kaufen Schöneberg|inline]]</li>
<li>[[landing:berlin_neukoelln|Wohnung kaufen Neukölln|inline]]</li>
<li>[[landing:berlin_spandau|Wohnung kaufen Spandau|inline]]</li>
</ul>
<p><br></p>
<h2>Angebotspreis vs. Kaufpreis: warum die Lücke zählt</h2>
<p>Online-Angebotspreise liegen in Berlin regelmäßig über den später beurkundeten Kaufpreisen. Der Gutachterausschuss arbeitet mit tatsächlich gezahlten Preisen – deshalb sind seine Mittelwerte die bessere Orientierung als Portal-Inserate. Das heißt nicht, dass jedes Inserat „fair“ bepreist ist.</p>
<p>Praktisch heißt das:</p>
<ul>
<li>Vergleichen Sie ähnliche Wohnungen (Baujahr, Zustand, Etage, Energieausweis), nicht nur den €/m²-Wert.</li>
<li>Fragen Sie nach dem letzten Vergleichspreis in der Straße – nicht nur nach dem Wunschpreis.</li>
<li>Rechnen Sie Kaufnebenkosten und mögliche Sanierung von Anfang an mit.</li>
</ul>
<p>Investoren sollten zusätzlich die Renditelogik prüfen: siehe <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a> und die Anleitung <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>.</p>
<p><br></p>
<h2>Neubau, Altbau und vermietete Wohnungen</h2>
<p>Drei Segmente verschieben den Preis oft stärker als der Bezirksname:</p>
<ul>
<li><strong>Neubau</strong> kostet meist deutlich mehr als Bestand – dafür oft bessere Energieeffizienz und weniger Sofort-Capex.</li>
<li><strong>Altbau</strong> kann Charme und zentrale Lagen bieten, braucht aber ehrliche Sanierungs- und WEG-Prüfung.</li>
<li><strong>Vermietete Wohnungen</strong> liegen oft unter vergleichbaren Leerwohnungen – mit Mietvertrags- und Mieterhöhungsrisiken.</li>
</ul>
<p>Vertiefung: <a href="/blog/neubau-oder-altbau-berlin">Neubau oder Altbau in Berlin</a> und <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>.</p>
<p><br></p>
<h2>So nutzen Sie Preisdaten richtig</h2>
<p>Eine gute Preisübersicht ersetzt keine Objektprüfung. Nutzen Sie die Zahlen so:</p>
<ol>
<li><strong>Filter:</strong> Passt der Bezirk zu Budget und Strategie?</li>
<li><strong>Benchmark:</strong> Liegt das Angebot klar über oder unter dem Bezirksmittel – und warum?</li>
<li><strong>Cashflow:</strong> Welche Nettokaltmiete ist realistisch, nicht nur „Marketinglevel“?</li>
<li><strong>Gesamtrechnung:</strong> Kaufpreis + Nebenkosten + Capex + laufende Kosten.</li>
</ol>
<p>Internationale Käufer finden den rechtlichen und praktischen Rahmen unter <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie hoch sind die Immobilienpreise Berlin 2026?</strong><br>Laut Gutachterausschuss lag der mittlere Kaufpreis für Eigentumswohnungen 2025 bei 5.511 €/m². Im 1. Quartal 2026 waren die Preise nahezu unverändert. Die Spanne nach Lage ist groß: vom äußeren Bezirk bis zu Spitzenwerten im Ortsteil Mitte.</p>
<p><strong>Welcher Bezirk ist am teuersten?</strong><br>Toplagen in Mitte gehören zu den teuersten. Innerhalb der Bezirke gibt es große Unterschiede – etwa zwischen zentralen Ortsteilen und Wedding im selben Bezirk Mitte.</p>
<p><strong>Sind Angebotspreise verlässlich?</strong><br>Nur als Startpunkt. Verlässlicher sind beurkundete Kaufpreise, wie sie der Gutachterausschuss ausweist. Objektbezogen kann die Lücke zum Inserat größer oder kleiner sein.</p>
<p><strong>Reicht der €/m²-Wert für die Kaufentscheidung?</strong><br>Nein. Zustand, Energie, WEG, Miete und Mikrolage entscheiden mit. Sweet Home Berlin prüft diese Faktoren vor einer Shortlist.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wenn Sie Immobilienpreise Berlin nicht nur lesen, sondern in eine konkrete Shortlist übersetzen möchten, helfen wir bei Bezirkswahl, Objektvergleich und ehrlicher Gesamtrechnung – bevor Emotionen die Excel-Datei ersetzen.</p>
<p>Starten Sie mit aktuellen Angeboten zum [[landing:berlin_main|Wohnung kaufen in Berlin|inline]] oder sprechen Sie uns direkt an.</p>`
  },
  {
    slug: 'grunderwerbsteuer-berlin',
    cover_image: COVERS.grunderwerbsteuer,
    title_de: 'Grunderwerbsteuer Berlin: 6 % erklärt – mit Beispielen und Zahlungszeitpunkt',
    excerpt_de:
      'Die Grunderwerbsteuer Berlin beträgt 6 % des Kaufpreises – bei 450.000 € sind das 27.000 €. Was zählt, wann Sie zahlen und wie Sie planen.',
    title_en: 'Berlin Transfer Tax (Grunderwerbsteuer): 6% Explained with Examples',
    excerpt_en:
      'Berlin’s real estate transfer tax is 6% of the purchase price — €27,000 on a €450,000 home. What counts, when you pay, and how to plan.',
    content_de: `<p>Die <strong>Grunderwerbsteuer Berlin</strong> ist der größte einzelne Posten der Kaufnebenkosten. Wer sie früh einplant, vermeidet Stress zwischen Beurkundung und Grundbucheintrag – egal ob Sie selbst einziehen oder vermieten.</p>
<p>Bei Sweet Home Berlin rechnen wir die Steuer immer fest in die Gesamtkalkulation ein. Hier erfahren Sie Satz, Bemessungsgrundlage, Beispiele und den typischen Ablauf.</p>
<p>Objekte vergleichen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Wie hoch ist die Grunderwerbsteuer in Berlin?</h2>
<p>Für Grundstücke und Eigentumswohnungen im Land Berlin beträgt der Steuersatz <strong>6 Prozent der Gegenleistung</strong> (in der Praxis meist der Kaufpreis). Das bestätigt die <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">FAQ Grunderwerbsteuer der Senatsverwaltung für Finanzen</a>. Der Satz gilt für Vorgänge ab dem 1. Januar 2014 und ist auch 2026 unverändert.</p>
<p>Zum Vergleich: Bundesweit liegt der Satz zwischen 3,5 % (z. B. Bayern) und 6,5 % in einzelnen Ländern. Berlin liegt mit 6 % im oberen Bereich – das spüren Sie bei jedem Kauf spürbar im Eigenkapitalbedarf.</p>
<p><br></p>
<h2>Worauf wird die Steuer berechnet?</h2>
<p>Bemessungsgrundlage ist die „Gegenleistung“. Dazu gehören typischerweise:</p>
<ul>
<li>der vereinbarte Kaufpreis</li>
<li>übernommene Belastungen, soweit sie zur Gegenleistung zählen</li>
<li>gegebenenfalls eingeräumte Wohn- oder Nutzungsrechte</li>
</ul>
<p>Was <em>nicht</em> die Grunderwerbsteuer ersetzt: Notar, Grundbuch, Maklerprovision, Finanzierungskosten. Diese Posten kommen zusätzlich – siehe unser Guide zu den <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p><br></p>
<h2>Beispielrechnung: so viel kostet die Grunderwerbsteuer Berlin</h2>
<table>
<thead>
<tr><th>Kaufpreis</th><th>Grunderwerbsteuer (6 %)</th></tr>
</thead>
<tbody>
<tr><td>300.000 €</td><td>18.000 €</td></tr>
<tr><td>450.000 €</td><td>27.000 €</td></tr>
<tr><td>600.000 €</td><td>36.000 €</td></tr>
<tr><td>800.000 €</td><td>48.000 €</td></tr>
</tbody>
</table>
<p>Beispiel Gesamtrechnung (vereinfacht) bei 450.000 € Kaufpreis und Maklerbeteiligung:</p>
<ul>
<li>Grunderwerbsteuer: 27.000 €</li>
<li>Notar &amp; Grundbuch (Orientierung ~1,5–2 %): ca. 6.750–9.000 €</li>
<li>Makleranteil Käufer (marktüblich oft ~3,57 % inkl. MwSt., falls Makler): ca. 16.065 €</li>
</ul>
<p>Schon ohne Finanzierungskosten liegen Sie dann schnell bei rund <strong>50.000 € und mehr</strong> Nebenkosten. Banken finanzieren diese Positionen oft nur eingeschränkt – planen Sie sie als Eigenmittel.</p>
<p><br></p>
<h2>Wann entsteht die Steuer – und wann zahlen Sie?</h2>
<p>Mit der notariellen Beurkundung entsteht die Steuerschuld. Der Notar zeigt den Vorgang dem Finanzamt an. Zuständig für Berliner Grundstücke ist zentral das <strong>Finanzamt Spandau</strong> (Grunderwerbsteuerstelle).</p>
<p>Typischer Ablauf:</p>
<ol>
<li>Kaufvertrag wird beurkundet</li>
<li>Finanzamt setzt die Grunderwerbsteuer fest</li>
<li>Sie zahlen die Steuer (in der Praxis meist der Käufer laut Vertrag)</li>
<li>Unbedenklichkeitsbescheinigung wird ausgestellt</li>
<li>Eigentumsumschreibung im Grundbuch kann fortgesetzt werden</li>
</ol>
<p>Planen Sie die Zahlung also früh – nicht „irgendwann nach dem Einzug“. Ohne Unbedenklichkeit stockt der Weg ins Grundbuch.</p>
<p>Den Gesamtablauf und die Checkliste finden Sie unter <a href="/blog/wohnungskauf-berlin-checkliste">Wohnungskauf Berlin Checkliste</a>.</p>
<p><br></p>
<h2>Wer zahlt – und gilt das auch für Ausländer?</h2>
<p>Rechtlich können Käufer und Verkäufer Steuerschuldner sein; im Kaufvertrag wird üblicherweise vereinbart, dass der <strong>Käufer</strong> zahlt. Das ist in Berlin marktüblich.</p>
<p>Für internationale Käufer gilt dasselbe: Die Grunderwerbsteuer Berlin fällt an, auch wenn Sie im Ausland wohnen oder über eine ausländische Bank finanzieren. Stimmen Sie den Zahlungszeitpunkt früh mit Notariat und Bank ab. Mehr Kontext: <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><br></p>
<h2>Was die Steuer für Investoren bedeutet</h2>
<p>Als Kapitalanleger ist die Grunderwerbsteuer Teil Ihrer Einstiegskosten – und senkt die Anfangsrendite, weil sie den Kapitaleinsatz erhöht. Deshalb gehört sie in jede Nettorechnung, nicht nur in die Bruttomietrendite.</p>
<p>Vertiefung:</p>
<ul>
<li><a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a></li>
<li><a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a></li>
<li><a href="/blog/vermietete-wohnung-kaufen-berlin">Vermietete Wohnung kaufen Berlin</a></li>
</ul>
<p>Sweet Home Berlin rechnet Steuer, Notar, Provision und Capex offen mit – bevor Sie ein Gebot abgeben.</p>
<p><br></p>
<h2>Häufige Missverständnisse</h2>
<ul>
<li><strong>„Die Bank zahlt die Steuer mit.“</strong> Oft nicht oder nur teilweise. Klären Sie das vor der Beurkundung.</li>
<li><strong>„6 % sind alles.“</strong> Nein – Notar, Grundbuch und ggf. Makler kommen dazu.</li>
<li><strong>„Ich zahle später, wenn ich eingezogen bin.“</strong> Riskant: Die Unbedenklichkeit braucht die Zahlung.</li>
<li><strong>„Als Ausländer gilt ein anderer Satz.“</strong> Nein – der Berliner Satz gilt für Berliner Grundstücke.</li>
</ul>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie hoch ist die Grunderwerbsteuer Berlin 2026?</strong><br>6 % der Gegenleistung (meist Kaufpreis), unverändert seit 1. Januar 2014 laut Senatsverwaltung für Finanzen.</p>
<p><strong>Welches Finanzamt ist zuständig?</strong><br>Für Berliner Grundstücke zentral das Finanzamt Spandau – Grunderwerbsteuerstelle.</p>
<p><strong>Kann ich die Steuer von der Einkommensteuer absetzen?</strong><br>Als Anschaffungsnebenkosten fließt sie in der Regel in die Bemessungsgrundlage der Immobilie ein; eine pauschale „sofortige Absetzbarkeit“ gibt es nicht. Klären Sie Details mit einem Steuerberater – Sweet Home Berlin ersetzt keine Steuerberatung.</p>
<p><strong>Zählt die Maklerprovision zur Bemessungsgrundlage?</strong><br>Die Provision ist ein eigener Nebenkostenposten und ersetzt die Grunderwerbsteuer nicht. Die genaue steuerliche Einordnung einzelner Vertragsbestandteile sollte der Notar bzw. Steuerberater prüfen.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wir helfen Ihnen, Kaufpreis, Grunderwerbsteuer Berlin und übrige Nebenkosten in einer realistischen Gesamtrechnung zu sehen – und passende Objekte dazu zu finden.</p>
<p>Jetzt starten: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`
  },
  {
    slug: 'mietrendite-berechnen',
    cover_image: COVERS.mietrendite,
    title_de: 'Mietrendite berechnen: Formel, Beispiele und was Investoren wirklich prüfen',
    excerpt_de:
      'Mietrendite berechnen in 2 Minuten: Bei 400.000 € Kaufpreis und 16.000 € Jahreskaltmiete liegen Sie bei 4 % brutto – so rechnen Sie netto weiter.',
    title_en: 'How to Calculate Rental Yield: Formula, Examples, What Investors Check',
    excerpt_en:
      'Calculate rental yield fast: €400,000 price and €16,000 annual cold rent = 4% gross. Here’s the net formula and Berlin buyer pitfalls.',
    content_de: `<p><strong>Mietrendite berechnen</strong> ist der schnellste Realitätstest für eine Kapitalanlage – und gleichzeitig die Kennzahl, die am häufigsten geschönt wird. Bei Sweet Home Berlin nutzen wir Brutto nur als Filter und Netto als Entscheidungsgrundlage.</p>
<p>In diesem Guide finden Sie Formeln, zwei durchgerechnete Beispiele und die typischen Berlin-Fallen (Nebenkosten, Mietrecht, Capex).</p>
<p>Objekte prüfen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]]. Strategie-Rahmen: <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a>.</p>
<p><br></p>
<h2>Bruttomietrendite: die einfache Formel</h2>
<p>Die Bruttomietrendite setzt die Jahreskaltmiete ins Verhältnis zum Kaufpreis – ohne Erwerbsnebenkosten und ohne laufende Eigentümerkosten. Die Logik entspricht gängigen Ratgebern wie <a href="https://www.finanztip.de/baufinanzierung/mietrendite-berechnen/" rel="noopener noreferrer" target="_blank">Finanztip zur Mietrendite</a>.</p>
<p><strong>Formel:</strong><br>Bruttomietrendite (%) = (Jahreskaltmiete ÷ Kaufpreis) × 100</p>
<p>Jahreskaltmiete = monatliche Nettokaltmiete × 12 (ohne Betriebskosten, die Sie nur durchreichen).</p>
<p>Alternative über Quadratmeter:<br>Brutto (%) ≈ (Kaltmiete €/m² ÷ Kaufpreis €/m²) × 100</p>
<p><br></p>
<h2>Beispiel 1: Bruttomietrendite</h2>
<p>Angenommen:</p>
<ul>
<li>Kaufpreis: 400.000 €</li>
<li>Monatliche Nettokaltmiete: 1.333 €</li>
<li>Jahreskaltmiete: 16.000 €</li>
</ul>
<p><strong>Rechnung:</strong> (16.000 ÷ 400.000) × 100 = <strong>4,0 % Bruttomietrendite</strong></p>
<p>Das ist ein brauchbarer erster Filter – aber noch keine Kaufentscheidung. Fehlende Kosten können die reale Rendite schnell um 1–2 Prozentpunkte drücken.</p>
<p><br></p>
<h2>Nettomietrendite: die ehrlichere Rechnung</h2>
<p>Die Nettomietrendite berücksichtigt Erwerbsnebenkosten und nicht umlagefähige laufende Kosten.</p>
<p><strong>Formel (praxisnah):</strong><br>Nettomietrendite (%) = (Jahreskaltmiete − nicht umlagefähige Kosten) ÷ (Kaufpreis + Kaufnebenkosten) × 100</p>
<p>Zu den Kaufnebenkosten in Berlin gehören insbesondere Grunderwerbsteuer (6 %), Notar/Grundbuch und ggf. Makler – Überblick unter <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a> und Detail zur Steuer unter <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a>.</p>
<p><br></p>
<h2>Beispiel 2: vom Brutto zum Netto</h2>
<p>Wir erweitern Beispiel 1:</p>
<ul>
<li>Kaufpreis: 400.000 €</li>
<li>Kaufnebenkosten (Annahme 11 %): 44.000 €</li>
<li>Gesamtinvestition: 444.000 €</li>
<li>Jahreskaltmiete: 16.000 €</li>
<li>Nicht umlagefähige Kosten p. a. (Verwaltung, Instandhaltung, Leerstandspuffer): 3.200 €</li>
</ul>
<p><strong>Nettojahresertrag:</strong> 16.000 − 3.200 = 12.800 €</p>
<p><strong>Nettomietrendite:</strong> (12.800 ÷ 444.000) × 100 ≈ <strong>2,9 %</strong></p>
<p>Aus 4,0 % brutto werden also rund 2,9 % netto – bevor Finanzierung und Steuern überhaupt starten. Genau deshalb reicht „4 % im Exposé“ selten.</p>
<p><br></p>
<h2>Mietpreismultiplikator: der Kehrwert</h2>
<p>Viele Investoren denken in Vielfachen der Jahresmiete:</p>
<p><strong>Multiplikator</strong> = Kaufpreis ÷ Jahreskaltmiete</p>
<p>Im Beispiel: 400.000 ÷ 16.000 = <strong>25×</strong> (entspricht 4 % brutto).</p>
<p>Faustformel: Je höher der Multiplikator, desto niedriger die Bruttomietrendite. Ob 22× „teuer“ oder 28× „okay“ ist, hängt von Lage, Zustand und Mieterschutz ab – nicht von der Zahl allein.</p>
<p><br></p>
<h2>Was in Berlin die Rendite besonders beeinflusst</h2>
<ol>
<li><strong>Ist-Miete vs. Marktmiete:</strong> Bei vermieteten Wohnungen zählt der Vertrag, nicht die Traummiete. Siehe <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a>.</li>
<li><strong>Mietrecht:</strong> Mieterhöhungen und Kündigungsregeln beeinflussen den Cashflow. Überblick: <a href="/blog/mietrecht-berlin-kaeufer">Mietrecht Berlin für Käufer</a>.</li>
<li><strong>Preisniveau nach Lage:</strong> Hohe €/m²-Preise drücken die Bruttorendite, wenn Mieten nicht proportional steigen. Kontext: <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>.</li>
<li><strong>Capex:</strong> Dach, Fassade, Aufzug, Energie – beschlossene Maßnahmen gehören in die Rechnung vor dem Notar.</li>
</ol>
<p>Bezirksrahmen: <a href="/blog/beste-bezirke-immobilien-berlin">Beste Bezirke Immobilien Berlin</a>. Einstiege z. B. [[landing:berlin_wedding|Wohnung kaufen Wedding|inline]] oder [[landing:berlin_moabit|Wohnung kaufen Moabit|inline]].</p>
<p><br></p>
<h2>Cashflow nach Finanzierung (Kurzcheck)</h2>
<p>Selbst eine solide Nettomietrendite sagt wenig, wenn der Kredit den Monatsüberschuss auffrisst. Prüfen Sie grob:</p>
<ul>
<li>Monatsmiete (kalt) − nicht umlagefähige Kosten / 12 − Zins und Tilgung</li>
<li>Puffer für Leerstand (z. B. 1 Monat alle paar Jahre)</li>
<li>Sonderumlagen der WEG</li>
</ul>
<p>Ziel ist nicht „maximale Hebelwirkung“, sondern ein Szenario, das Sie auch bei Zins- oder Leerstandsstress tragen können. Sweet Home Berlin rechnet das mit Ihnen durch, bevor die Emotionen die Excel-Datei übernehmen.</p>
<p><br></p>
<h2>Häufige Fehler beim Mietrendite berechnen</h2>
<ul>
<li>Warmmiete statt Kaltmiete verwenden</li>
<li>Kaufnebenkosten weglassen</li>
<li>Instandhaltung mit 0 € ansetzen</li>
<li>Marktmiete statt Ist-Miete bei vermieteten Objekten</li>
<li>Nur Brutto vergleichen und Netto ignorieren</li>
</ul>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie berechnet man die Mietrendite?</strong><br>Brutto: Jahreskaltmiete ÷ Kaufpreis × 100. Netto: (Jahreskaltmiete − nicht umlagefähige Kosten) ÷ (Kaufpreis + Nebenkosten) × 100.</p>
<p><strong>Welche Mietrendite ist gut?</strong><br>Es gibt keinen festen Stadt-Wert. In teuren Innenstadtlagen sind niedrigere Bruttorenditen üblich; entscheidend sind Netto, Risiko und Haltedauer.</p>
<p><strong>Reicht die Bruttomietrendite?</strong><br>Nur als Filter. Für die Kaufentscheidung brauchen Sie Netto, Capex und Finanzierung.</p>
<p><strong>Unterscheidet sich die Rechnung für Ausländer?</strong><br>Die Formeln sind gleich. Zusätzlich planen Sie Steuern, Konto und Abwicklung – siehe <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wir helfen Ihnen, Mietrendite ehrlich zu berechnen – mit realistischen Mieten, Nebenkosten und Objektcheck – und passende Wohnungen dazu zu finden.</p>
<p>Jetzt starten: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`
  }
];

function wordCount(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(' ').length : 0;
}

async function upsertPost(client, post) {
  const existing = await client.query(`SELECT id, status FROM blog_posts WHERE slug = $1`, [post.slug]);
  const titleI18n = { de: post.title_de, en: post.title_en };
  const excerptI18n = { de: post.excerpt_de, en: post.excerpt_en };
  const contentI18n = { de: post.content_de, en: `<p>${post.excerpt_en}</p><p><em>Full English version planned (N10). German guide:</em> <a href="/blog/${post.slug}">/blog/${post.slug}</a></p>` };

  const wc = wordCount(post.content_de);
  console.log(`\n${post.slug}: ~${wc} DE words`);

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
        cover_image = $7,
        status = 'published',
        author_id = $8,
        published_at = COALESCE(published_at, $9::timestamptz),
        updated_at = $9::timestamptz
      WHERE id = $10`,
      [
        post.title_de,
        post.excerpt_de,
        post.content_de,
        JSON.stringify(titleI18n),
        JSON.stringify(excerptI18n),
        JSON.stringify(contentI18n),
        post.cover_image,
        AUTHOR_ID,
        NOW,
        id
      ]
    );
    console.log(`  updated id=${id}`);
    return id;
  }

  const ins = await client.query(
    `INSERT INTO blog_posts (
      author_id, slug, status, cover_image,
      title, excerpt, content,
      title_i18n, excerpt_i18n, content_i18n,
      published_at, created_at, updated_at
    ) VALUES (
      $1, $2, 'published', $3,
      $4, $5, $6,
      $7::jsonb, $8::jsonb, $9::jsonb,
      $10::timestamptz, $10::timestamptz, $10::timestamptz
    ) RETURNING id`,
    [
      AUTHOR_ID,
      post.slug,
      post.cover_image,
      post.title_de,
      post.excerpt_de,
      post.content_de,
      JSON.stringify(titleI18n),
      JSON.stringify(excerptI18n),
      JSON.stringify(contentI18n),
      NOW
    ]
  );
  console.log(`  inserted id=${ins.rows[0].id}`);
  return ins.rows[0].id;
}

async function patchReciprocalLinks(client) {
  // 1) kapitalanlage → immobilienpreise + mietrendite
  const kap = await client.query(`SELECT id, content_i18n FROM blog_posts WHERE slug = 'immobilie-als-kapitalanlage-berlin'`);
  if (kap.rows[0]) {
    let i18n = kap.rows[0].content_i18n;
    if (typeof i18n === 'string') i18n = JSON.parse(i18n);
    let de = i18n.de || '';
    const before = de;
    de = de.replace(
      /Ein eigener Beitrag zu Immobilienpreisen Berlin ist in Planung; bis dahin gilt: Bezirk und Objektklasse schlagen den Stadt-Durchschnitt\./,
      'Aktuelle Orientierung: unser Überblick zu den <a href="/blog/immobilienpreise-berlin">Immobilienpreisen Berlin</a> – Bezirk und Objektklasse schlagen den Stadt-Durchschnitt.'
    );
    de = de.replace(
      /Die <strong>Mietrendite berechnen<\/strong> gehört zu jeder seriösen Prüfung\./,
      'Die <a href="/blog/mietrendite-berechnen"><strong>Mietrendite berechnen</strong></a> gehört zu jeder seriösen Prüfung.'
    );
    if (de !== before) {
      i18n.de = de;
      await client.query(`UPDATE blog_posts SET content_i18n = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(i18n),
        kap.rows[0].id
      ]);
      console.log('  reciprocal: kapitalanlage → immobilienpreise + mietrendite');
    } else {
      console.log('  reciprocal: kapitalanlage already patched or pattern missing');
    }
  }

  // 2) kaufnebenkosten → grunderwerbsteuer
  const kn = await client.query(`SELECT id, content_i18n FROM blog_posts WHERE slug = 'kaufnebenkosten-berlin'`);
  if (kn.rows[0]) {
    let i18n = kn.rows[0].content_i18n;
    if (typeof i18n === 'string') i18n = JSON.parse(i18n);
    let de = i18n.de || '';
    if (!de.includes('/blog/grunderwerbsteuer-berlin')) {
      const needle =
        '<strong>Wie viel:</strong> in Berlin 6% des Kaufpreises. Der Satz gilt seit dem 1. Januar 2014 und liegt auch 2026 unverändert bei 6%.';
      const repl =
        '<strong>Wie viel:</strong> in Berlin 6% des Kaufpreises. Der Satz gilt seit dem 1. Januar 2014 und liegt auch 2026 unverändert bei 6%. Vertiefung: <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a>.';
      if (de.includes(needle)) {
        de = de.replace(needle, repl);
        i18n.de = de;
        await client.query(`UPDATE blog_posts SET content_i18n = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
          JSON.stringify(i18n),
          kn.rows[0].id
        ]);
        console.log('  reciprocal: kaufnebenkosten → grunderwerbsteuer');
      } else {
        console.log('  reciprocal: kaufnebenkosten pattern missing');
      }
    } else {
      console.log('  reciprocal: kaufnebenkosten already has grunderwerbsteuer link');
    }
  }

  // 3) beste-bezirke → immobilienpreise (one sentence)
  const bb = await client.query(`SELECT id, content_i18n FROM blog_posts WHERE slug = 'beste-bezirke-immobilien-berlin'`);
  if (bb.rows[0]) {
    let i18n = bb.rows[0].content_i18n;
    if (typeof i18n === 'string') i18n = JSON.parse(i18n);
    let de = i18n.de || '';
    if (!de.includes('/blog/immobilienpreise-berlin')) {
      const needle =
        'Vergleichen Sie nicht nur den Quadratmeterpreis. Schauen Sie auf Leerstandsraten';
      const repl =
        'Vergleichen Sie nicht nur den Quadratmeterpreis (Orientierung: <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>). Schauen Sie auf Leerstandsraten';
      if (de.includes(needle)) {
        de = de.replace(needle, repl);
        i18n.de = de;
        await client.query(`UPDATE blog_posts SET content_i18n = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
          JSON.stringify(i18n),
          bb.rows[0].id
        ]);
        console.log('  reciprocal: beste-bezirke → immobilienpreise');
      } else {
        // softer fallback insert before FAQ if present
        if (de.includes('<h2>Häufige Fragen') && !de.includes('/blog/immobilienpreise-berlin')) {
          de = de.replace(
            '<h2>Häufige Fragen',
            '<p>Für aktuelle €/m²-Orientierung nach Bezirk siehe <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>.</p><h2>Häufige Fragen'
          );
          i18n.de = de;
          await client.query(`UPDATE blog_posts SET content_i18n = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
            JSON.stringify(i18n),
            bb.rows[0].id
          ]);
          console.log('  reciprocal: beste-bezirke → immobilienpreise (FAQ insert)');
        } else {
          console.log('  reciprocal: beste-bezirke pattern missing');
        }
      }
    } else {
      console.log('  reciprocal: beste-bezirke already has immobilienpreise link');
    }
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    for (const post of posts) {
      await upsertPost(client, post);
    }
    console.log('\nReciprocal links:');
    await patchReciprocalLinks(client);

    const check = await client.query(
      `SELECT id, slug, status, published_at::date AS pub,
              LENGTH(content_i18n->>'de') AS de_len,
              LEFT(title_i18n->>'de', 70) AS title_de
       FROM blog_posts
       WHERE slug = ANY($1)
       ORDER BY id`,
      [posts.map((p) => p.slug)]
    );
    console.log('\nLive rows:');
    console.table(check.rows);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
