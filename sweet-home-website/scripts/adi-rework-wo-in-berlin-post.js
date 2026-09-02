/**
 * Adi Bezirke post rework — updates DE body only for slug wo-in-berlin-wohnung-kaufen.
 * Does NOT Admin-Save (avoids DeepL overwrite). Leaves EN content_i18n.en untouched.
 *
 * Usage: node scripts/adi-rework-wo-in-berlin-post.js
 * Dry-run: DRY_RUN=1 node scripts/adi-rework-wo-in-berlin-post.js
 */
require('dotenv').config();
const { Client } = require('pg');

const SLUG = 'wo-in-berlin-wohnung-kaufen';

/** Reworked DE HTML per Adi's revision notes (DOCX). */
const CONTENT_DE = `<p><strong>Wo in Berlin Wohnung kaufen?</strong> Die Antwort hängt nicht vom „Angesagtesten“ ab, sondern von Budget, Nutzung und Haltedauer. Bei Sweet Home Berlin filtern wir Bezirke zuerst nach Strategie – dann nach Mikrolage und Gebäude.</p>
<p>Dieser Vergleich hilft Ihnen, eine Shortlist zu bauen und die passenden Bezirkseiten gezielt zu öffnen – nicht als Verzeichnis, sondern als Entscheidungshilfe.</p>
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
<h3>Mitte</h3>
<p>Mitte ist das geschäftige Herz der Stadt: Museumsinsel, Hackescher Markt, Einkaufsstraßen und eine Mischung aus Altbau und neuen Projekten. Die Preise gehören zu den höchsten Berlins, mit großen Unterschieden zwischen Toplagen und einfacheren Ortsteilen. Für Käufer mit langem Horizont, die eine zentrale Adresse suchen, lohnt ein Blick auf die aktuellen <a href="/wohnung-kaufen-berlin-mitte">Wohnungen in Mitte</a>.</p>
<h3>Charlottenburg</h3>
<p>Charlottenburg steht für den klassischen Berliner Westen: Kurfürstendamm, gepflegte Altbauten, etablierte Nachbarschaften und gute Schulen. Der Bezirk zieht Eigennutzer und Investoren an, denen Wertstabilität wichtiger ist als Hype. Wer hier ankommen möchte, findet eine Auswahl an <a href="/wohnung-kaufen-charlottenburg">Eigentumswohnungen in Charlottenburg</a>.</p>
<h3>Prenzlauer Berg</h3>
<p>Wer Familienalltag und lange Mietverhältnisse sucht, landet oft zuerst in <a href="/wohnung-kaufen-prenzlauer-berg">Prenzlauer Berg</a>. Parks, Schulen und Cafés prägen viele Kieze – und die Preise liegen häufig über dem Stadt-Mittel. Hier zählt die Straße: ruhige Seitenlage und laute Magistrale können im selben Ortsteil liegen.</p>
<h3>Friedrichshain-Kreuzberg</h3>
<p>Urbane Energie, starke Mikrolage-Unterschiede und viel Nachfrage prägen diesen Doppelbezirk. Zwischen Boxhagener Platz, Warschauer Straße und den ruhigeren Seitenstraßen entscheiden wenige Blocks über Alltag und Vermietbarkeit. Einen Überblick über Angebote und Lagebilder finden Sie unter <a href="/wohnung-kaufen-friedrichshain-kreuzberg">Friedrichshain-Kreuzberg im Überblick</a>.</p>
<h3>Kreuzberg</h3>
<p>Kreuzberg verdient oft einen eigenen Blick – dichter, lokaler und manchmal ganz anders als der Friedrichshainer Teil. Hier lohnt es sich, Lärm, Szene und Gebäudezustand besonders genau zu prüfen. Wer gezielt diesen Kiez meint, startet bei den <a href="/wohnung-kaufen-kreuzberg">Angeboten in Kreuzberg</a>.</p>
<h3>Schöneberg</h3>
<p>Zwischen Zentrum und Außenlage vermittelt Schöneberg oft den Alltag: gute Anbindung, gemischte Nachbarschaften und weniger Hype als die In-Kieze. Viele Käufer schätzen genau diesen Mittelweg. Passende Objekte und Lagehinweise finden Sie auf der Seite zu <a href="/wohnung-kaufen-schoeneberg">Wohnen und Kaufen in Schöneberg</a>.</p>
<p><br></p>
<h2>Einstieg und Aufwertungspotenzial</h2>
<h3>Moabit</h3>
<p>Moabit liegt zentraler, als viele auswärtige Käufer erwarten – mit Einstiegsoptionen, wenn Gebäude und WEG stimmen. Die Spreizung zwischen einfachen und gepflegten Lagen ist groß. Wer Budget und Zentrum verbinden will, sollte die <a href="/wohnung-kaufen-moabit">Lage Moabit</a> früh in die Shortlist nehmen.</p>
<h3>Wedding</h3>
<p>Nähe zur Innenstadt zu anderen Preisen: das ist die typische Wedding-Logik. Gleichzeitig entscheidet die Mikrolage stärker als der Bezirksname. Ein realistischer Einstieg beginnt oft mit einem Blick auf <a href="/wohnung-kaufen-wedding">Wohnungen rund um Wedding</a> und einem strikten Capex-Check.</p>
<h3>Neukölln</h3>
<p>Relativ günstige Einstiege gibt es hier – aber keinen einheitlichen Markt. Nordkieze und ruhigere Südteile leben unterschiedlich; Vermietbarkeit hängt stark von Straße und Zustand ab. Orientierung und aktuelle Objekte: <a href="/wohnung-kaufen-neukoelln">Neukölln für Käufer</a>.</p>
<h3>Tempelhof</h3>
<p>Viele Familien und ruhigere Alltagsprofile landen im Süden bei Tempelhof: Parks, Anbindung und oft ein klarerer Wohnwert als in den lautesten Innenstadtlagen. Wer diesen Schnitt sucht, findet Einstiegspunkte unter <a href="/wohnung-kaufen-tempelhof">Immobilien in Tempelhof</a>.</p>
<p><br></p>
<h2>Äußere Bezirke und Ruhe</h2>
<h3>Pankow</h3>
<p>Pankow ist groß und uneinheitlich – und darf nicht mit Prenzlauer Berg gleichgesetzt werden. Ortsteile unterscheiden sich stark in Preis, Alltag und Anbindung. Wer den Norden systematisch prüft, startet bei der Übersicht <a href="/wohnung-kaufen-pankow">Wohnung kaufen Pankow</a>.</p>
<h3>Spandau</h3>
<p>Oft günstigere Einstiege, längere Wege in die Innenstadt: Spandau eignet sich, wenn Alltag und Budget das hergeben. Objektqualität und Verkehr müssen zur Strategie passen. Einen ersten Filter setzen die Angebote in <a href="/wohnung-kaufen-spandau">Spandau</a>.</p>
<h3>Reinickendorf</h3>
<p>Ruhigere Lagen und ein anderer Takt als in der Innenstadt – dafür Objektqualität und Anbindung besonders genau prüfen. Für Käufer mit Fokus auf Wohnwert statt Szene lohnt der Blick auf <a href="/wohnung-kaufen-reinickendorf">Reinickendorf als Kaufoption</a>.</p>
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
<h2>Budget-Rahmen und Bezirkswahl zusammendenken</h2>
<p>Ein niedrigerer Einstiegspreis in äußeren Lagen hilft nur, wenn Nebenkosten, Sanierung und Alltag dazu passen. Umgekehrt kann eine teurere zentrale Lage sinnvoll sein, wenn Vermietbarkeit und Wiederverkauf klarer sind. Sweet Home Berlin rechnet deshalb immer:</p>
<ul>
<li>Kaufpreis + Nebenkosten + Eigenkapital</li>
<li>realistische Miete oder Wohnwert</li>
<li>Capex und WEG-Risiko</li>
</ul>
<p>Preisniveau und Mietebene gehören in dieselbe Rechnung – nicht als Ersatz für die Objektprüfung, sondern als Rahmen davor.</p>
<p><br></p>
<h2>Typische Fehlentscheidungen bei der Bezirkswahl</h2>
<ol>
<li><strong>Nur den Bezirksnamen kaufen</strong> – ohne Straße, Lärm und Gebäude zu prüfen.</li>
<li><strong>Nur den günstigsten Quadratmeterpreis</strong> – und Sanierungskosten vergessen.</li>
<li><strong>Nur die angesagteste Lage</strong> – obwohl Budget und Eigenkapital nicht reichen.</li>
<li><strong>Nur Portal-Mieten</strong> – ohne Mietspiegel und Ist-Miete zu trennen.</li>
</ol>
<p>Sweet Home Berlin arbeitet gegen diese vier Fehler mit einer kurzen Strategie-Session, bevor die Besichtigungsliste wächst. Danach kommen Bezirk, Mikrolage und Objektprüfung in dieser Reihenfolge.</p>
<p><br></p>
<h2>Für internationale Käufer</h2>
<p>Die Bezirkslogik ist dieselbe – der Prozess braucht oft mehr Vorlauf bei Konto, Legitimation und Finanzierung. Orientierung: <a href="/blog/auslaender-immobilien-kaufen-berlin">Ausländer Immobilien kaufen Berlin</a>. Sweet Home Berlin begleitet auch hier von der Shortlist bis zur Notarvorbereitung.</p>
<p><br></p>
<h2>So bauen Sie Ihre Shortlist in einer Woche</h2>
<p>Tag 1–2: Budget, Eigenkapital und Nutzung fixieren. Tag 3: zwei bis vier Bezirke aus den Abschnitten oben wählen. Tag 4–5: konkrete Objekte ansehen und Mikrolage prüfen. Tag 6–7: Gesamtrechnung, bei Vermietung Rendite und Mietvertrag. Sweet Home Berlin kann diese Woche mit Ihnen straffen – besonders wenn Sie von außerhalb Berlins kaufen.</p>
<p>Wer mehr Zeit hat, vertieft Gebäude und WEG. Wer wenig Zeit hat, sollte nicht mehr Bezirke parallellaufen lassen, sondern die Shortlist enger machen.</p>
<p><br></p>
<h2>Fazit: wo in Berlin Wohnung kaufen?</h2>
<p>Es gibt keinen Siegerbezirk für 2026. Es gibt passende Kombinationen aus Budget, Nutzung und Mikrolage. Nutzen Sie die Bezirkseiten als Filter, die Preis- und Mietguides als Zahlenrahmen und Sweet Home Berlin für die Objektentscheidung.</p>
<p><br></p>
<h2>Häufige Fragen</h2>
<p><strong>Wo in Berlin sollte man 2026 eine Wohnung kaufen?</strong><br>Es gibt keinen besten Bezirk für alle. Passen Sie Lage an Nutzung, Budget und Haltedauer an – dann prüfen Sie die Straße, nicht nur den Bezirksnamen.</p>
<p><strong>Welcher Bezirk ist am günstigsten?</strong><br>Äußere Lagen wie Spandau oder Teile von Reinickendorf liegen oft unter dem Stadt-Durchschnitt – aber Objekt und Capex können den Vorteil auffressen.</p>
<p><strong>Reicht der Bezirksname?</strong><br>Nein. In Berlin entscheiden oft wenige Blocks. Nutzen Sie Bezirkseiten als Filter, dann die Mikrolage vor Ort.</p>
<p><strong>Können Ausländer in jedem Bezirk kaufen?</strong><br>Ja, grundsätzlich. Der Ablauf ist derselbe – Details im Guide für ausländische Käufer oben.</p>
<p><br></p>
<h2>Nächster Schritt</h2>
<p>Wenn Sie wissen möchten, wo in Berlin eine Wohnung zu Ihrer Strategie passt, helfen wir bei Shortlist, Besichtigung und ehrlicher Gesamtrechnung.</p>
<p>Start: [[landing:berlin_main|Berliner Wohnungsangebote ansehen|inline]].</p>`;

function wordCount(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(/\s+/).length : 0;
}

function linkAudit(html) {
  const links = [...String(html).matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1],
    text: m[2].replace(/<[^>]+>/g, '').trim()
  }));
  const byHref = {};
  links.forEach((l) => {
    byHref[l.href] = (byHref[l.href] || 0) + 1;
  });
  const dups = Object.entries(byHref).filter(([, n]) => n > 1);
  return { links, dups };
}

async function main() {
  const dry = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
  const audit = linkAudit(CONTENT_DE);
  console.log(`New DE ~${wordCount(CONTENT_DE)} words, ${audit.links.length} <a> links`);
  if (audit.dups.length) {
    console.warn('Duplicate hrefs in new body:');
    audit.dups.forEach(([href, n]) => console.warn(`  ${n}× ${href}`));
    process.exitCode = 1;
    return;
  }
  if (/Alle Bezirkseiten|keyword-tauglich|Zur Navigation/i.test(CONTENT_DE)) {
    console.error('Forbidden SEO-list copy still present');
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();

  const existing = await client.query(
    `SELECT id, content_i18n, content FROM blog_posts WHERE slug = $1`,
    [SLUG]
  );
  if (!existing.rows.length) {
    console.error('Post not found:', SLUG);
    await client.end();
    process.exitCode = 1;
    return;
  }

  const row = existing.rows[0];
  const contentI18n =
    typeof row.content_i18n === 'string' ? JSON.parse(row.content_i18n) : { ...(row.content_i18n || {}) };
  contentI18n.de = CONTENT_DE;

  console.log(`Updating post id=${row.id} slug=${SLUG}${dry ? ' (DRY RUN)' : ''}`);

  if (!dry) {
    await client.query(
      `UPDATE blog_posts
       SET content = $1,
           content_i18n = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [CONTENT_DE, JSON.stringify(contentI18n), row.id]
    );
    console.log('DE content_i18n.de + content updated (EN left intact).');
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
