/**
 * U2 — older guides link back to the newer posts and the German calculators.
 * One new link per target, inside a sentence. English calculator anchor is
 * "calculator (German)". Does not change updated_at.
 *
 *   DRY_RUN=1 node scripts/u2-add-guide-links.js
 *   node scripts/u2-add-guide-links.js
 */
require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const DRY_RUN = process.env.DRY_RUN === '1';

const EDITS = [
  {
    slug: 'kaufnebenkosten-berlin',
    de: {
      needle: 'klären das früh mit Ihrer Bank.',
      hrefs: ['/blog/immobilienfinanzierung-berlin', '/kaufnebenkosten-rechner'],
      html: '<p>Wie die Rate zum Kaufpreis passt, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>. Die einzelnen Posten lassen sich im <a href="/kaufnebenkosten-rechner">Kaufnebenkosten-Rechner</a> mit dem eigenen Kaufpreis nachrechnen.</p>'
    },
    en: {
      needle: 'If you are using a mortgage, financing expenses can add another layer of costs.',
      hrefs: ['/en/blog/mortgage-financing-berlin', '/kaufnebenkosten-rechner'],
      html: '<p>How the monthly payment sits next to those costs is covered in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>. The line items can be checked in the <a href="/kaufnebenkosten-rechner">calculator (German)</a>.</p>'
    }
  },
  {
    slug: 'eigenkapital-wohnungskauf',
    de: {
      needle: 'dehnt die Finanzierung nachträglich.',
      hrefs: ['/blog/immobilienfinanzierung-berlin', '/blog/lohnt-sich-immobilie-kaufen-berlin'],
      html: '<p>Die monatliche Rate aus Kaufpreis, Eigenkapital und Zinssatz steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>. Ob der Kauf zum Budget passt, steht unter <a href="/blog/lohnt-sich-immobilie-kaufen-berlin">Lohnt sich der Immobilienkauf</a>.</p>'
    },
    en: {
      needle: 'stretching the financing to fit it.',
      hrefs: ['/en/blog/mortgage-financing-berlin', '/en/blog/is-buying-property-in-berlin-worth-it'],
      html: '<p>The monthly payment from price, down payment, and interest rate is covered in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>. Whether the purchase fits the budget is covered in <a href="/en/blog/is-buying-property-in-berlin-worth-it">is buying property in Berlin worth it</a>.</p>'
    }
  },
  {
    slug: 'immobilie-als-kapitalanlage-berlin',
    de: {
      needle: 'im Einzelfall mit Steuerberatung klären.',
      hrefs: ['/blog/steuern-fuer-vermieter', '/blog/lohnt-sich-immobilie-kaufen-berlin'],
      html: '<p>Welche Posten Vermieter absetzen können, steht unter <a href="/blog/steuern-fuer-vermieter">Steuern für Vermieter</a>. Ob der Kauf 2026 zum Ziel passt, steht unter <a href="/blog/lohnt-sich-immobilie-kaufen-berlin">Lohnt sich der Immobilienkauf</a>.</p>'
    },
    en: {
      needle: 'Deductible expenses include mortgage interest, maintenance, management fees, and building depreciation (AfA).',
      hrefs: ['/en/blog/german-rental-property-taxes', '/en/blog/is-buying-property-in-berlin-worth-it'],
      html: '<p>Which costs a landlord can deduct is covered in <a href="/en/blog/german-rental-property-taxes">German rental property taxes</a>. Whether a purchase fits the goal in 2026 is covered in <a href="/en/blog/is-buying-property-in-berlin-worth-it">is buying property in Berlin worth it</a>.</p>'
    }
  },
  {
    slug: 'mietrendite-berechnen',
    de: {
      needle: 'Genau deshalb reicht',
      hrefs: ['/blog/steuern-fuer-vermieter', '/mietrendite-rechner'],
      html: '<p>Die laufenden Steuern des Vermieters stehen unter <a href="/blog/steuern-fuer-vermieter">Steuern für Vermieter</a>. Dieselbe Brutto- und Nettorechnung lässt sich im <a href="/mietrendite-rechner">Mietrendite-Rechner</a> mit den eigenen Zahlen nachvollziehen.</p>'
    },
    en: {
      needle: 'rarely enough.',
      hrefs: ['/en/blog/german-rental-property-taxes', '/mietrendite-rechner'],
      html: '<p>The ongoing taxes for a landlord are covered in <a href="/en/blog/german-rental-property-taxes">German rental property taxes</a>. The same gross and net figures can be checked in the <a href="/mietrendite-rechner">calculator (German)</a>.</p>'
    }
  },
  {
    slug: 'immobilienpreise-berlin',
    de: {
      needle: 'nicht als Kaufentscheidung.',
      hrefs: ['/blog/lohnt-sich-immobilie-kaufen-berlin', '/blog/wohnung-kaufen-moabit-ratgeber', '/blog/wohnung-kaufen-neukoelln-ratgeber'],
      html: '<p>Ob ein Kauf zum eigenen Ziel passt, steht unter <a href="/blog/lohnt-sich-immobilie-kaufen-berlin">Lohnt sich der Immobilienkauf</a>. Zwei Lagen mit eigenem Kaufratgeber sind <a href="/blog/wohnung-kaufen-moabit-ratgeber">Wohnung kaufen Moabit</a> und <a href="/blog/wohnung-kaufen-neukoelln-ratgeber">Wohnung kaufen Neukölln</a>.</p>'
    },
    en: {
      needle: 'the citywide average is often not enough.',
      hrefs: ['/en/blog/is-buying-property-in-berlin-worth-it', '/en/blog/buying-apartment-moabit-guide', '/en/blog/buying-apartment-neukoelln-guide'],
      html: '<p>Whether a purchase fits the goal is covered in <a href="/en/blog/is-buying-property-in-berlin-worth-it">is buying property in Berlin worth it</a>. Two areas with their own buying guide are <a href="/en/blog/buying-apartment-moabit-guide">buying an apartment in Moabit</a> and <a href="/en/blog/buying-apartment-neukoelln-guide">buying an apartment in Neukölln</a>.</p>'
    }
  },
  {
    slug: 'auslaender-immobilien-kaufen-berlin',
    de: {
      needle: '2. Finanzierung vorbereiten.',
      hrefs: ['/blog/immobilienfinanzierung-berlin'],
      html: '<p>Wie Rate, Eigenkapital und Zinsbindung zusammenhängen, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>'
    },
    en: {
      needle: 'arrange financing discussions early in the process.',
      hrefs: ['/en/blog/mortgage-financing-berlin'],
      html: '<p>How the payment, down payment, and fixed-rate period fit together is covered in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>'
    }
  },
  {
    slug: 'wohnungskauf-berlin-checkliste',
    de: {
      needle: 'wenn ein Makler beteiligt ist.',
      hrefs: ['/blog/immobilienfinanzierung-berlin'],
      html: '<p>Wie die monatliche Rate zum Eigenkapital passt, steht in der <a href="/blog/immobilienfinanzierung-berlin">Immobilienfinanzierung Berlin</a>.</p>'
    },
    en: {
      needle: 'Transaction costs can add a meaningful percentage to the overall investment and should be included in any financial analysis.',
      hrefs: ['/en/blog/mortgage-financing-berlin'],
      html: '<p>How the monthly payment fits the down payment is covered in <a href="/en/blog/mortgage-financing-berlin">mortgage financing in Berlin</a>.</p>'
    }
  }
];

function insertAfterParagraph(html, needle, addition) {
  const at = html.indexOf(needle);
  if (at < 0) throw new Error('anchor missing: ' + needle);
  if (html.indexOf(needle, at + needle.length) !== -1) throw new Error('anchor twice: ' + needle);
  const close = html.indexOf('</p>', at);
  if (close < 0) throw new Error('no paragraph end: ' + needle);
  return html.slice(0, close + 4) + addition + html.slice(close + 4);
}

function applyEdit(html, edit) {
  const missing = edit.hrefs.filter((href) => !html.includes(`href="${href}"`));
  if (!missing.length) return { html, status: 'already' };
  if (missing.length !== edit.hrefs.length) {
    throw new Error('partial links already present: ' + missing.join(', '));
  }
  if (html.includes(edit.html)) return { html, status: 'already' };
  if (/\u2014/.test(edit.html)) throw new Error('em dash in new copy');
  return { html: insertAfterParagraph(html, edit.needle, edit.html), status: 'insert' };
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const slugs = EDITS.map((edit) => edit.slug);
  const { rows } = await client.query(
    'SELECT id, slug, content_i18n FROM blog_posts WHERE slug = ANY($1::text[])',
    [slugs]
  );
  const bySlug = Object.fromEntries(rows.map((row) => [row.slug, row]));
  const backup = rows.map((row) => ({ id: row.id, slug: row.slug, content_i18n: row.content_i18n }));
  const backupPath = `/tmp/u2-blog-backup-${Date.now()}.json`;
  if (!DRY_RUN) fs.writeFileSync(backupPath, JSON.stringify(backup));

  for (const edit of EDITS) {
    const row = bySlug[edit.slug];
    if (!row) throw new Error('missing post ' + edit.slug);
    const i18n = Object.assign({}, row.content_i18n);
    for (const lang of ['de', 'en']) {
      const result = applyEdit(String(i18n[lang] || ''), edit[lang]);
      i18n[lang] = result.html;
      console.log(edit.slug, lang, result.status);
      if (result.status === 'insert' && !DRY_RUN) {
        // written below
      }
    }
    if (!DRY_RUN) {
      await client.query(
        'UPDATE blog_posts SET content_i18n = $1::jsonb WHERE id = $2',
        [JSON.stringify(i18n), row.id]
      );
    }
  }
  if (!DRY_RUN) console.log('backup', backupPath);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
