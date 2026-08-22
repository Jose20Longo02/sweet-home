#!/usr/bin/env node
/**
 * N9 Week 2 — publish three new Berlin blog posts (official sources only).
 * Idempotent. Updates cover listing map in config/blogCoverListingLinks.js separately if needed.
 *
 * Usage: node scripts/n9-week2-publish-posts.js
 */
require('dotenv').config();
const { Client } = require('pg');

const AUTHOR_ID = 12;
const NOW = new Date().toISOString();

const COVERS = {
  eigenkapital: '/images/blog/eigenkapital-wohnungskauf.jpg',
  mietpreise: '/images/blog/mietpreise-berlin-bezirk.jpg',
  woInBerlin: '/images/blog/wo-in-berlin-wohnung-kaufen.jpg'
};

const posts = [
  {
    slug: 'eigenkapital-wohnungskauf',
    cover_image: COVERS.eigenkapital,
    title_de: 'Eigenkapital Wohnungskauf: wie viel Sie wirklich brauchen',
    excerpt_de:
      'Für den Wohnungskauf empfehlen Verbraucherschützer 20 bis 30 % Eigenkapital – plus die Kaufnebenkosten. So rechnen Sie die Summe realistisch.',
    title_en: 'Down Payment for Buying an Apartment: How Much You Really Need',
    excerpt_en:
      'Consumer advisors recommend 20–30% equity for buying a home — plus closing costs. Here’s a clear Berlin buyer calculation.',
    content_de: `<p>Die Frage nach dem <strong>Eigenkapital Wohnungskauf</strong> entscheidet oft früher als der Besichtigungstermin: Wie viel Geld brauchen Sie wirklich, bevor die Bank ein Darlehen prüft? Bei Sweet Home Berlin rechnen wir das offen mit – ohne Schönrechnen.</p>
<p>Dieser Guide zeigt die Faustregeln, eine Beispielrechnung für Berlin und wo Käufer typischerweise zu knapp planen.</p>
<p>Objekte vergleichen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Wie viel Eigenkapital braucht man beim Wohnungskauf?</h2>
<p>Die <a href="https://www.verbraucherzentrale.de/wissen/geld-versicherungen/bau-und-immobilienfinanzierung/immobilienfinanzierung-diese-modelle-gibt-es-und-das-sollten-sie-beachten-5801" rel="noopener noreferrer" target="_blank">Verbraucherzentrale</a> empfiehlt grundsätzlich <strong>20 bis 30 Prozent des Kaufpreises zuzüglich der Kaufnebenkosten</strong> als Eigenkapital. Das ist keine gesetzliche Pflicht – aber die Orientierung, die Banken und unabhängige Berater seit Jahren als solide betrachten.</p>
<p>Warum so viel? Weniger Eigenkapital heißt höherer Kredit, oft schlechtere Zinsen und weniger Puffer, wenn Einkommen oder Zinsen schwanken. Mehr Eigenkapital senkt Rate und Risiko.</p>
<p><br></p>
<h2>Kaufnebenkosten: der Teil, den Sie fast immer selbst zahlen</h2>
<p>Banken finanzieren Erwerbsnebenkosten oft nur eingeschränkt oder gar nicht. In Berlin sollten Sie grob <strong>10 bis 12 %</strong> des Kaufpreises zusätzlich einplanen, wenn ein Makler beteiligt ist. Der größte Posten ist die <a href="/blog/grunderwerbsteuer-berlin">Grunderwerbsteuer Berlin</a> mit 6 % – bestätigt durch die <a href="https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.9062.php" rel="noopener noreferrer" target="_blank">Senatsverwaltung für Finanzen</a>.</p>
<p>Vollständige Übersicht: <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a>.</p>
<p><br></p>
<h2>Beispielrechnung: Eigenkapital bei 450.000 Euro Kaufpreis</h2>
<p>Angenommen, Sie kaufen eine Eigentumswohnung in Berlin für 450.000 Euro:</p>
<table>
<thead>
<tr><th>Position</th><th>Betrag (Orientierung)</th></tr>
</thead>
<tbody>
<tr><td>Kaufpreis</td><td>450.000 €</td></tr>
<tr><td>Kaufnebenkosten (~11 %)</td><td>ca. 49.500 €</td></tr>
<tr><td>Eigenkapital 20 % vom Kaufpreis</td><td>90.000 €</td></tr>
<tr><td><strong>Eigenmittel gesamt (20 % + Nebenkosten)</strong></td><td><strong>ca. 139.500 €</strong></td></tr>
<tr><td>Darlehen (Rest)</td><td>ca. 360.000 €</td></tr>
</tbody>
</table>
<p>Mit 30 % Eigenkapital vom Kaufpreis (135.000 €) plus Nebenkosten liegen Sie bei rund <strong>184.500 €</strong> eigenen Mitteln – dafür oft spürbar bessere Konditionen.</p>
<p>Wichtig: Das sind Orientierungswerte. Ihre Bank prüft Einkommen, Schufa, Objekt und Beleihungsauslauf individuell. Sweet Home Berlin ersetzt keine Finanzierungsberatung.</p>
<p><br></p>
<h2>Was zählt als Eigenkapital?</h2>
<p>Laut Verbraucherzentrale gehören dazu unter anderem:</p>
<ul>
<li>Bargeld und Guthaben auf Konten</li>
<li>Bausparguthaben (Ihr Anteil, nicht das spätere Darlehen)</li>
<li>Wertpapiere, Fonds und ähnliche Anlagen, die Sie auflösen können</li>
<li>gegebenenfalls geförderte Altersvorsorge, die Sie einsetzen dürfen</li>
</ul>
<p>Nicht Eigenkapital: Ihr laufendes Gehalt oder „späteres Erbe“. Was zählt, muss zum Notartermin verfügbar sein – oder klar vereinbart (z. B. Schenkung der Eltern mit Banknachweis).</p>
<p><br></p>
<h2>Weniger als 20 % – geht das?</h2>
<p>Ja, manchmal. Manche Banken finanzieren mit weniger Eigenkapital, besonders bei starker Bonität. Dann steigen aber oft Zins und Risiko. Absolute Untergrenze in der Praxis: die Nebenkosten selbst tragen können. Wer auch die Steuer mitfinanzieren will, rutscht schnell in teure Spezialfälle.</p>
<p>Internationale Käufer sollten Konto, Legitimation und Steuerfragen früh klären – siehe <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><br></p>
<h2>Eigenkapital und Kaufpreis: erst die Gesamtrechnung</h2>
<p>Bevor Sie das Eigenkapital festnageln, brauchen Sie einen realistischen Kaufpreisrahmen. Orientierung zu Preisen: <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a> (offizielle Gutachterausschuss-Zahlen). Für Investoren kommt die Renditelogik dazu: <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>.</p>
<p>Checkliste vor dem Notar: <a href="/blog/wohnungskauf-berlin-checkliste">Wohnungskauf Berlin Checkliste</a>.</p>
<p><br></p>
<h2>Drei typische Fehler beim Eigenkapital Wohnungskauf</h2>
<ol>
<li><strong>Nur den Kaufpreis rechnen</strong> – und die 6 % Grunderwerbsteuer vergessen.</li>
<li><strong>Keinen Liquiditätspuffer</strong> für Umzug, Kleinreparaturen oder die erste Sonderumlage der WEG.</li>
<li><strong>Alles Eigenkapital in die Immobilie stecken</strong> – ohne Reserve für den Alltag.</li>
</ol>
<p>Bei Sweet Home Berlin empfehlen wir: Nebenkosten + geplanter Eigenkapitalanteil + ein eiserner Notgroschen, der auf dem Konto bleibt.</p>
<p><br></p>
<h2>Eigenkapital und Rate: die zweite Faustregel</h2>
<p>Eigenkapital allein reicht nicht. Die monatliche Belastung aus Zins und Tilgung sollte zu Ihrem Haushalt passen. Unabhängige Berater orientieren sich oft daran, dass die Rate einen begrenzten Anteil des Nettoeinkommens nicht dauerhaft überschreitet – Details klären Sie mit Bank oder Verbraucherzentrale vor Ort.</p>
<p>Praktisch: Erst Budget und Eigenkapital, dann Bezirk und Objekt. Wer umgekehrt vorgeht, verliebt sich in eine Wohnung und dehnt die Finanzierung nachträglich.</p>
<p><br></p>
<h2>Berlin-Spezial: warum 6 % Steuer das Eigenkapital drücken</h2>
<p>In Bundesländern mit niedrigerer Grunderwerbsteuer bleibt mehr Liquidität für den Kaufpreis-Anteil. In Berlin sind 6 % fest eingeplant – bei 500.000 € Kaufpreis allein 30.000 € Steuer. Deshalb wirkt dasselbe „20 %-Ziel“ in Berlin oft teurer als in Bayern. Genau deshalb rechnen wir bei Sweet Home Berlin Steuer und Provision immer vor dem Besichtigungsmarathon.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie viel Eigenkapital braucht man beim Wohnungskauf?</strong><br>Orientierung der Verbraucherzentrale: 20–30 % des Kaufpreises zuzüglich Kaufnebenkosten. In Berlin sind die Nebenkosten oft 10–12 %.</p>
<p><strong>Kann ich ohne Eigenkapital kaufen?</strong><br>Vollfinanzierungen gibt es, sind aber teurer und riskanter. Die meisten Käufer sollten mindestens die Nebenkosten selbst tragen.</p>
<p><strong>Zählt ein Bausparvertrag?</strong><br>Das angesparte Guthaben ja – nicht automatisch die spätere Darlehenssumme.</p>
<p><strong>Gilt das auch für Kapitalanleger?</strong><br>Die Banklogik ist ähnlich. Zusätzlich rechnen Sie Leerstand, Instandhaltung und Steuern ein.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wir helfen Ihnen, Kaufpreis, Eigenkapital und Nebenkosten in eine ehrliche Gesamtrechnung zu bringen – und passende Wohnungen dazu zu finden.</p>
<p>Jetzt starten: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`
  },
  {
    slug: 'mietpreise-berlin-bezirk',
    cover_image: COVERS.mietpreise,
    title_de: 'Mietpreise Berlin 2026: Mietspiegel, Wohnlage und was Käufer wissen müssen',
    excerpt_de:
      'Der Berliner Mietspiegel 2026 liegt im Median bei 7,71 €/m² Nettokaltmiete. So lesen Sie Mietpreise Berlin richtig – nach Wohnlage, nicht nur nach Bezirk.',
    title_en: 'Berlin Rents 2026: Official Rent Index, Location Tiers, What Buyers Need',
    excerpt_en:
      'Berlin’s official 2026 rent index median is €7.71/m² cold rent. Here’s how to read rents by location tier — not just by district name.',
    content_de: `<p>Wer <strong>Mietpreise Berlin</strong> googelt, findet oft Portal-Durchschnitte nach Bezirk. Für bestehende Mietverhältnisse und die ortsübliche Vergleichsmiete gilt aber etwas anderes: der offizielle <strong>Berliner Mietspiegel</strong>.</p>
<p>Bei Sweet Home Berlin nutzen wir den Mietspiegel als Orientierung für Investoren und Käufer – und erklären klar, warum „Miete nach Bezirk“ allein zu kurz greift.</p>
<p>Wohnungen ansehen: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Berliner Mietspiegel 2026: die offizielle Zahl</h2>
<p>Die <a href="https://www.berlin.de/sen/stadt/presse/pressemeldungen/pressemitteilung.1674998.php" rel="noopener noreferrer" target="_blank">Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen</a> hat den Berliner Mietspiegel 2026 veröffentlicht. Das durchschnittliche Mietniveau liegt bei <strong>7,71 €/m²</strong> – ermittelt als Median der Nettokaltmieten aller repräsentativ erhobenen Datensätze.</p>
<p>Der Mietspiegel gilt für rund 1,6 Millionen mietspiegelrelevante Wohnungen und basiert auf ca. 17.000 Miet- und Ausstattungsdaten. Portal: <a href="https://mietspiegel.berlin.de/" rel="noopener noreferrer" target="_blank">mietspiegel.berlin.de</a>.</p>
<p><br></p>
<h2>Warum nicht einfach „Mietpreise Berlin nach Bezirk“?</h2>
<p>Der Mietspiegel arbeitet mit <strong>Wohnlage</strong> (einfach / mittel / gut), Baujahr, Wohnfläche und Ausstattung – nicht mit einem festen €/m²-Wert pro Verwaltungsbezirk. Eine Straße in Neukölln kann mittlere Lage sein, eine andere einfache. Deshalb gibt es keine offizielle Bezirkstabelle „Mitte = X, Spandau = Y“ im Mietspiegel.</p>
<p>Laut Pressemitteilung liegen 2026 etwa <strong>29,4 %</strong> der Adressen in einfacher, <strong>49,9 %</strong> in mittlerer und <strong>20,7 %</strong> in guter Wohnlage.</p>
<p><br></p>
<h2>Orientierung nach Wohnlage (Zusatzanalyse)</h2>
<p>Die wissenschaftliche <a href="https://mietspiegel.berlin.de/wp-content/uploads/2026/07/260707-Mietspiegeldokumentation-Berlin-2026.pdf" rel="noopener noreferrer" target="_blank">Dokumentation zum Berliner Mietspiegel 2026</a> weist in Zusatzanalysen Mediane der erhobenen Nettokaltmieten nach Wohnlage aus:</p>
<table>
<thead>
<tr><th>Wohnlage</th><th>Median Nettokaltmiete</th></tr>
</thead>
<tbody>
<tr><td>Einfach</td><td>7,05 €/m²</td></tr>
<tr><td>Mittel</td><td>7,79 €/m²</td></tr>
<tr><td>Gut</td><td>9,14 €/m²</td></tr>
</tbody>
</table>
<p><em>Quelle: Dokumentation zum Berliner Mietspiegel 2026, Tab. 13 (Median €/m²: insgesamt 7,71 / einfach 7,05 / mittel 7,79 / gut 9,14). Für eine konkrete Wohnung gilt immer die Mietspiegeltabelle bzw. der Online-Abfrageservice – nicht der Median allein.</em></p>
<p><br></p>
<h2>Angebotsmiete vs. Vergleichsmiete</h2>
<p>Viele Inserate zeigen Neuvertragsmieten, die über dem Mietspiegel-Median liegen. Das ist möglich – der Mietspiegel bildet vor allem mietspiegelrelevante Bestands- und Vergleichsmieten ab, nicht jedes Portal-Angebot. Für Käufer heißt das: Prüfen Sie, ob die Miete im Exposé eine Ist-Miete, eine Schätzung oder eine Wunschvorstellung ist.</p>
<p>Sweet Home Berlin trennt diese drei Fälle bewusst, bevor wir eine Rendite rechnen.</p>
<p><br></p>
<h2>So ermitteln Sie die Vergleichsmiete richtig</h2>
<ol>
<li>Adresse im <a href="https://mietspiegel.berlin.de/" rel="noopener noreferrer" target="_blank">Online-Abfrageservice</a> prüfen (Wohnlage).</li>
<li>Baujahr, Wohnfläche und Ausstattung einordnen.</li>
<li>Mittelwert und Spanne der Tabelle ablesen.</li>
<li>Angebotsmieten auf Portalen separat vergleichen – die sind oft höher als die Vergleichsmiete.</li>
</ol>
<p>Für Käufer vermieteter Wohnungen ist das entscheidend: Die Ist-Miete kann unter Marktniveau liegen. Mehr dazu: <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a> und <a href="/blog/mietrecht-berlin-kaeufer">Mietrecht Berlin für Käufer</a>.</p>
<p><br></p>
<h2>Was bedeutet das für Investoren?</h2>
<p>Wenn Sie <a href="/blog/mietrendite-berechnen">Mietrendite berechnen</a>, brauchen Sie eine realistische Jahreskaltmiete – nicht die Traummiete aus dem Exposé. Der Mietspiegel hilft bei Bestandsverträgen; bei Neuvermietung zählen Nachfrage, Ausstattung und rechtliche Grenzen.</p>
<p>Kaufpreise parallel prüfen: <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a>. Strategie-Rahmen: <a href="/blog/immobilie-als-kapitalanlage-berlin">Immobilie als Kapitalanlage Berlin</a>.</p>
<p><br></p>
<h2>Bezirke trotzdem vergleichen – aber richtig</h2>
<p>Auch ohne offizielle Bezirkstabelle lohnt der Blick auf Mikrolage und Nachfrage. Startpunkte:</p>
<ul>
<li>[[landing:berlin_charlottenburg|Wohnung kaufen Charlottenburg|inline]]</li>
<li>[[landing:berlin_neukoelln|Wohnung kaufen Neukölln|inline]]</li>
<li>[[landing:berlin_tempelhof|Wohnung kaufen Tempelhof|inline]]</li>
<li>[[landing:berlin_spandau|Wohnung kaufen Spandau|inline]]</li>
</ul>
<p>Gesamtüberblick Bezirke: <a href="/blog/beste-bezirke-immobilien-berlin">beste Bezirke Immobilien Berlin</a> und <a href="/blog/wo-in-berlin-wohnung-kaufen">wo in Berlin Wohnung kaufen</a>.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wie hoch sind die Mietpreise Berlin 2026?</strong><br>Der offizielle Median im Mietspiegel 2026 liegt bei 7,71 €/m² Nettokaltmiete. Einzelwohnungen weichen je nach Lage, Baujahr und Ausstattung stark ab.</p>
<p><strong>Gibt es Mietpreise Berlin nach Bezirk offiziell?</strong><br>Nicht als pauschale Bezirkstabelle. Der Mietspiegel nutzt Wohnlage und weitere Merkmale. Die Wohnlage prüfen Sie über mietspiegel.berlin.de.</p>
<p><strong>Sind Portal-Mieten dasselbe?</strong><br>Nein. Angebotsmieten auf Portalen sind oft höher und bilden Neuangebote ab – nicht die ortsübliche Vergleichsmiete.</p>
<p><strong>Reicht der Median für die Rendite?</strong><br>Nur als Startpunkt. Rechnen Sie mit der konkreten Ist- oder erzielbaren Miete des Objekts.</p>
<p><br></p>
<h2>Nächster Schritt mit Sweet Home Berlin</h2>
<p>Wir helfen Ihnen, Mietspiegel-Logik, Kaufpreis und Objektqualität zusammenzudenken – bevor Zahlen aus dem Exposé die Entscheidung ersetzen.</p>
<p>Jetzt starten: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`
  },
  {
    slug: 'wo-in-berlin-wohnung-kaufen',
    cover_image: COVERS.woInBerlin,
    title_de: 'Wo in Berlin Wohnung kaufen? Bezirke im Vergleich für Käufer 2026',
    excerpt_de:
      'Wo in Berlin eine Wohnung kaufen? Mit 13 Bezirksseiten und klaren Kriterien – von Mitte bis Spandau – finden Sie die Lage, die zu Budget und Strategie passt.',
    title_en: 'Where to Buy an Apartment in Berlin? Districts Compared for Buyers',
    excerpt_en:
      'Where should you buy in Berlin? Compare 13 district pages with clear criteria — from Mitte to Spandau — matched to budget and strategy.',
    content_de: `<p><strong>Wo in Berlin Wohnung kaufen?</strong> Die Antwort hängt nicht vom „Angesagtesten“ ab, sondern von Budget, Nutzung und Haltedauer. Bei Sweet Home Berlin filtern wir Bezirke zuerst nach Strategie – dann nach Mikrolage und Gebäude.</p>
<p>Dieser Vergleich verknüpft alle unsere Berliner Bezirkseiten und hilft Ihnen, die Shortlist zu bauen.</p>
<p>Stadtweite Angebote: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>
<p><br></p>
<h2>Bevor Sie den Bezirk wählen: drei Fragen</h2>
<ol>
<li><strong>Eigennutzung oder Vermietung?</strong> Familienlagen und Investoreneinstiege sind selten dieselben Straßen.</li>
<li><strong>Welches Budget inklusive Nebenkosten?</strong> Siehe <a href="/blog/kaufnebenkosten-berlin">Kaufnebenkosten Berlin</a> und <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</li>
<li><strong>Welche Preis- und Mietlogik ist realistisch?</strong> Orientierung: <a href="/blog/immobilienpreise-berlin">Immobilienpreise Berlin</a> und <a href="/blog/mietpreise-berlin-bezirk">Mietpreise Berlin</a>.</li>
</ol>
<p>Zusätzlicher Rahmen für Investoren: <a href="/blog/beste-bezirke-immobilien-berlin">beste Bezirke Immobilien Berlin</a>.</p>
<p><br></p>
<h2>Zentrale und etablierte Lagen</h2>
<p><strong><a href="/wohnung-kaufen-berlin-mitte">Wohnung kaufen Berlin Mitte</a></strong> – höchste Sichtbarkeit, starke Spreizung zwischen Toplagen und Ortsteilen wie Wedding. Gut für Käufer, die zentrale Adresse priorisieren.</p>
<p><strong>[[landing:berlin_charlottenburg|Wohnung kaufen Charlottenburg|inline]]</strong> – klassischer Westen, gemischte Nachfrage aus Eigennutzern und Investoren.</p>
<p><strong>[[landing:berlin_prenzlauer_berg|Wohnung kaufen Prenzlauer Berg|inline]]</strong> – gefragt bei Familien und Langzeitmietern; Preise oft über dem Stadt-Mittel.</p>
<p><strong>[[landing:berlin_friedrichshain_kreuzberg|Wohnung kaufen Friedrichshain-Kreuzberg|inline]]</strong> und gezielt <strong>[[landing:berlin_kreuzberg|Wohnung kaufen Kreuzberg|inline]]</strong> – urbane Lagen, starke Mikrolage-Unterschiede Straße für Straße.</p>
<p><strong>[[landing:berlin_schoeneberg|Wohnung kaufen Schöneberg|inline]]</strong> – Alltagscharme, gute Anbindung, oft ein Mittelweg zwischen Zentrum und Außenlage.</p>
<p><br></p>
<h2>Einstieg und Aufwertungspotenzial</h2>
<p><strong>[[landing:berlin_moabit|Wohnung kaufen Moabit|inline]]</strong> – zentraler als viele denken, mit Einstiegsoptionen bei sorgfältiger Gebäudeprüfung.</p>
<p><strong>[[landing:berlin_wedding|Wohnung kaufen Wedding|inline]]</strong> – Nähe zur Innenstadt zu anderen Preisen; Mikrolage entscheidet.</p>
<p><strong>[[landing:berlin_neukoelln|Wohnung kaufen Neukölln|inline]]</strong> – relativer Einstieg, aber kein einheitlicher Markt.</p>
<p><strong>[[landing:berlin_tempelhof|Wohnung kaufen Tempelhof|inline]]</strong> – oft familienfreundlich, mit guter Anbindung über den Süden.</p>
<p><br></p>
<h2>Äußere Bezirke und Ruhe</h2>
<p><strong><a href="/wohnung-kaufen-pankow">Wohnung kaufen Pankow</a></strong> – großer Bezirk mit sehr unterschiedlichen Ortsteilen; nicht mit Prenzlauer Berg gleichsetzen.</p>
<p><strong>[[landing:berlin_spandau|Wohnung kaufen Spandau|inline]]</strong> – oft günstigere Einstiege, längere Wege in die Innenstadt.</p>
<p><strong>[[landing:berlin_reinickendorf|Wohnung kaufen Reinickendorf|inline]]</strong> – ruhigere Lagen, Objektqualität und Verkehrsanbindung prüfen.</p>
<p><br></p>
<h2>Schneller Bezirksvergleich für Käufer</h2>
<table>
<thead>
<tr><th>Wenn Sie …</th><th>Schauen Sie zuerst</th></tr>
</thead>
<tbody>
<tr><td>zentrale Lage priorisieren</td><td>Mitte, Charlottenburg, Kreuzberg/Friedrichshain</td></tr>
<tr><td>Familienalltag wollen</td><td>Schöneberg, Tempelhof, Teile von Pankow – siehe auch <a href="/blog/berlin-stadtteile-familien">Berliner Stadtteile für Familien</a></td></tr>
<tr><td>Einstiegspreis brauchen</td><td>Moabit, Wedding, Neukölln, Spandau, Reinickendorf</td></tr>
<tr><td>vermietet kaufen</td><td>Ist-Miete + Mietrecht prüfen: <a href="/blog/vermietete-wohnung-kaufen-berlin">vermietete Wohnung kaufen Berlin</a></td></tr>
<tr><td>Neubau vs. Altbau abwägen</td><td><a href="/blog/neubau-oder-altbau-berlin">Neubau oder Altbau in Berlin</a></td></tr>
</tbody>
</table>
<p><br></p>
<h2>So entscheiden Sie mit Sweet Home Berlin</h2>
<p>Unser Ablauf ist bewusst nüchtern:</p>
<ol>
<li>Strategie und Budget fixieren (inkl. Eigenkapital und Nebenkosten)</li>
<li>2–4 Bezirke vorselektieren</li>
<li>Mikrolage und Gebäude prüfen</li>
<li>Gesamtrechnung und – bei Vermietung – Rendite rechnen</li>
</ol>
<p>Checkliste vor dem Notar: <a href="/blog/wohnungskauf-berlin-checkliste">Wohnungskauf Berlin Checkliste</a>.</p>
<p><br></p>
<h2>Mikrolage schlägt Bezirksmarketing</h2>
<p>Zwei Wohnungen im selben Bezirk können völlig unterschiedliche Investments sein: laute Hauptstraße vs. ruhige Seitenstraße, sanierter Altbau vs. Sanierungsstau, gute vs. einfache Wohnlage im Mietspiegel. Sweet Home Berlin priorisiert deshalb Straße, Gebäude und WEG – nicht den Instagram-Namen des Kiezes.</p>
<p>Wenn Sie unsicher sind, starten Sie mit zwei Bezirken aus unterschiedlichen Segmenten (z. B. Charlottenburg und Moabit) und vergleichen Sie konkrete Objekte Seite an Seite.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wo in Berlin sollte man 2026 eine Wohnung kaufen?</strong><br>Es gibt keinen besten Bezirk für alle. Passen Sie Lage an Nutzung, Budget und Haltedauer an – dann prüfen Sie die Straße, nicht nur den Bezirksnamen.</p>
<p><strong>Welcher Bezirk ist am günstigsten?</strong><br>Äußere Lagen wie Spandau oder Teile von Reinickendorf liegen oft unter dem Stadt-Durchschnitt – aber Objekt und Capex können den Vorteil auffressen.</p>
<p><strong>Reicht der Bezirksname?</strong><br>Nein. In Berlin entscheiden oft wenige Blocks. Nutzen Sie Bezirkseiten als Filter, dann die Mikrolage vor Ort.</p>
<p><strong>Können Ausländer in jedem Bezirk kaufen?</strong><br>Ja, grundsätzlich. Der Ablauf ist derselbe – Details: <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>.</p>
<p><br></p>
<h2>Nächster Schritt</h2>
<p>Wenn Sie wissen möchten, wo in Berlin eine Wohnung zu Ihrer Strategie passt, helfen wir bei Shortlist, Besichtigung und ehrlicher Gesamtrechnung.</p>
<p>Start: [[landing:berlin_main|Wohnung kaufen in Berlin|inline]].</p>`
  }
];

function wordCount(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(/\s+/).length : 0;
}

async function upsertPost(client, post) {
  const existing = await client.query(`SELECT id FROM blog_posts WHERE slug = $1`, [post.slug]);
  const titleI18n = { de: post.title_de, en: post.title_en };
  const excerptI18n = { de: post.excerpt_de, en: post.excerpt_en };
  const contentI18n = {
    de: post.content_de,
    en: `<p>${post.excerpt_en}</p><p><em>Full English version planned (N10). German guide:</em> <a href="/blog/${post.slug}">/blog/${post.slug}</a></p>`
  };

  console.log(`\n${post.slug}: ~${wordCount(post.content_de)} DE words`);

  if (existing.rows.length) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE blog_posts SET
        title=$1, excerpt=$2, content=$3,
        title_i18n=$4::jsonb, excerpt_i18n=$5::jsonb, content_i18n=$6::jsonb,
        cover_image=$7, status='published', author_id=$8,
        published_at=COALESCE(published_at,$9::timestamptz), updated_at=$9::timestamptz
      WHERE id=$10`,
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
    ) VALUES ($1,$2,'published',$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::timestamptz,$10::timestamptz,$10::timestamptz)
    RETURNING id`,
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

async function patchReciprocal(client, slug, tester, replacer, label) {
  const r = await client.query(`SELECT id, content_i18n FROM blog_posts WHERE slug=$1`, [slug]);
  if (!r.rows[0]) {
    console.log(`  reciprocal skip: ${slug} missing`);
    return;
  }
  let i18n = r.rows[0].content_i18n;
  if (typeof i18n === 'string') i18n = JSON.parse(i18n);
  let de = i18n.de || '';
  if (tester(de)) {
    console.log(`  reciprocal: ${label} already present`);
    return;
  }
  const next = replacer(de);
  if (next === de) {
    console.log(`  reciprocal: ${label} pattern missing`);
    return;
  }
  i18n.de = next;
  await client.query(`UPDATE blog_posts SET content_i18n=$1::jsonb, updated_at=NOW() WHERE id=$2`, [
    JSON.stringify(i18n),
    r.rows[0].id
  ]);
  console.log(`  reciprocal: ${label}`);
}

async function patchReciprocalLinks(client) {
  await patchReciprocal(
    client,
    'kaufnebenkosten-berlin',
    (de) => de.includes('/blog/eigenkapital-wohnungskauf'),
    (de) => {
      const needle = 'Am besten planen Sie Steuer, Notar, Grundbuch und Provision als Eigenmittel ein';
      if (de.includes(needle)) {
        return de.replace(
          needle,
          'Am besten planen Sie Steuer, Notar, Grundbuch und Provision als Eigenmittel ein – siehe auch <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>'
        );
      }
      if (de.includes('<h2>Häufige Fragen')) {
        return de.replace(
          '<h2>Häufige Fragen',
          '<p>Wie viel Eigenkapital Sie zusätzlich brauchen, erklärt unser Guide <a href="/blog/eigenkapital-wohnungskauf">Eigenkapital Wohnungskauf</a>.</p><h2>Häufige Fragen'
        );
      }
      return de;
    },
    'kaufnebenkosten → eigenkapital'
  );

  await patchReciprocal(
    client,
    'immobilienpreise-berlin',
    (de) => de.includes('/blog/mietpreise-berlin-bezirk'),
    (de) => {
      const needle = 'Investoren sollten zusätzlich die Renditelogik prüfen';
      if (de.includes(needle)) {
        return de.replace(
          needle,
          'Für die Mietseite siehe <a href="/blog/mietpreise-berlin-bezirk">Mietpreise Berlin</a>. Investoren sollten zusätzlich die Renditelogik prüfen'
        );
      }
      if (de.includes('<h2>Häufige Fragen')) {
        return de.replace(
          '<h2>Häufige Fragen',
          '<p>Zur Mietebene: <a href="/blog/mietpreise-berlin-bezirk">Mietpreise Berlin</a> (offizieller Mietspiegel).</p><h2>Häufige Fragen'
        );
      }
      return de;
    },
    'immobilienpreise → mietpreise'
  );

  await patchReciprocal(
    client,
    'beste-bezirke-immobilien-berlin',
    (de) => de.includes('/blog/wo-in-berlin-wohnung-kaufen'),
    (de) => {
      if (de.includes('<h2>Häufige Fragen')) {
        return de.replace(
          '<h2>Häufige Fragen',
          '<p>Käufer-Überblick aller Bezirkseiten: <a href="/blog/wo-in-berlin-wohnung-kaufen">Wo in Berlin Wohnung kaufen</a>.</p><h2>Häufige Fragen'
        );
      }
      return de;
    },
    'beste-bezirke → wo-in-berlin'
  );
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
      `SELECT id, slug, status, LEFT(title_i18n->>'de', 70) AS title_de,
              (content_i18n->>'de') LIKE '%verbraucherzentrale.de%' OR (content_i18n->>'de') LIKE '%mietspiegel.berlin.de%' OR (content_i18n->>'de') LIKE '%berlin.de%' AS has_official
       FROM blog_posts WHERE slug = ANY($1) ORDER BY id`,
      [posts.map((p) => p.slug)]
    );
    console.log('\nLive rows:');
    console.table(check.rows);

    // competitor sanity
    for (const p of posts) {
      const r = await client.query(`SELECT content_i18n->>'de' AS de FROM blog_posts WHERE slug=$1`, [p.slug]);
      const bad = (r.rows[0].de.match(/guthmann|immodo|engelvoelkers|justhome/gi) || []);
      console.log(p.slug, 'competitor hits:', bad.length ? bad : 'none');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
