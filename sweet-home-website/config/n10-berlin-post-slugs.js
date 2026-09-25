/**
 * N10 — German (DE) and English (EN) keyword slugs for Berlin blog posts.
 * `slug` column in DB stays DE canonical; slug_i18n.en mirrors these EN slugs.
 */
const N10_BERLIN_POSTS = [
  { de: 'kaufnebenkosten-berlin', en: 'cost-of-buying-property-berlin' },
  { de: 'immobilie-als-kapitalanlage-berlin', en: 'berlin-real-estate-investment-guide-2026' },
  { de: 'auslaender-immobilien-kaufen-berlin', en: 'how-foreigners-can-buy-property-in-berlin' },
  { de: 'beste-bezirke-immobilien-berlin', en: 'best-berlin-districts-for-property-investment' },
  { de: 'wohnungskauf-berlin-checkliste', en: 'what-to-check-before-buying-an-apartment-in-berlin' },
  { de: 'mietrecht-berlin-kaeufer', en: 'berlin-rental-laws-explained-for-property-buyers' },
  { de: 'neubau-oder-altbau-berlin', en: 'new-build-vs-altbau-in-berlin-which-is-better' },
  { de: 'berlin-stadtteile-familien', en: 'best-berlin-districts-for-families' },
  { de: 'vermietete-wohnung-kaufen-berlin', en: 'buying-tenanted-apartment-berlin' },
  { de: 'immobilienpreise-berlin', en: 'berlin-property-prices-2026' },
  { de: 'grunderwerbsteuer-berlin', en: 'berlin-transfer-tax-grunderwerbsteuer' },
  { de: 'mietrendite-berechnen', en: 'how-to-calculate-rental-yield-berlin' },
  { de: 'eigenkapital-wohnungskauf', en: 'down-payment-for-buying-apartment-berlin' },
  { de: 'mietpreise-berlin-bezirk', en: 'berlin-rents-by-district-2026' },
  { de: 'wo-in-berlin-wohnung-kaufen', en: 'where-to-buy-apartment-in-berlin' },
  { de: 'immobilienfinanzierung-berlin', en: 'mortgage-financing-berlin' },
  { de: 'lohnt-sich-immobilie-kaufen-berlin', en: 'is-buying-property-in-berlin-worth-it' },
  { de: 'steuern-fuer-vermieter', en: 'german-rental-property-taxes' }
];

const DE_TO_EN_SLUG = Object.fromEntries(N10_BERLIN_POSTS.map((p) => [p.de, p.en]));
const EN_TO_DE_SLUG = Object.fromEntries(N10_BERLIN_POSTS.map((p) => [p.en, p.de]));
const N10_DE_SLUGS = new Set(N10_BERLIN_POSTS.map((p) => p.de));

function parseSlugI18n(raw, deFallback) {
  if (!raw) return { de: deFallback || '', en: '' };
  if (typeof raw === 'string') {
    try {
      return parseSlugI18n(JSON.parse(raw), deFallback);
    } catch (_) {
      return { de: deFallback || '', en: '' };
    }
  }
  return {
    de: String(raw.de || deFallback || '').trim(),
    en: String(raw.en || '').trim()
  };
}

function getBlogSlugForLang(post, lang) {
  const deSlug = String((post && post.slug) || '').trim();
  const map = parseSlugI18n(post && post.slug_i18n, deSlug);
  const normalized = String(lang || 'de').toLowerCase().slice(0, 2);
  if (normalized === 'en') return map.en || DE_TO_EN_SLUG[deSlug] || deSlug;
  return map.de || deSlug;
}

function rewriteBlogLinksForLang(html, lang) {
  let out = String(html || '');
  if (!out) return out;
  const normalized = String(lang || 'de').toLowerCase().slice(0, 2);
  N10_BERLIN_POSTS.forEach(({ de, en }) => {
    if (normalized === 'en') {
      out = out.replace(new RegExp(`href="/blog/${de}(?=["'#?\\s>]|$)`, 'g'), `href="/en/blog/${en}`);
      out = out.replace(new RegExp(`href='/blog/${de}(?=['"#?\\s>]|$)`, 'g'), `href='/en/blog/${en}`);
    } else {
      out = out.replace(new RegExp(`href="/en/blog/${en}(?=["'#?\\s>]|$)`, 'g'), `href="/blog/${de}`);
      out = out.replace(new RegExp(`href='/en/blog/${en}(?=['"#?\\s>]|$)`, 'g'), `href='/blog/${de}`);
    }
  });
  return out;
}

module.exports = {
  N10_BERLIN_POSTS,
  DE_TO_EN_SLUG,
  EN_TO_DE_SLUG,
  N10_DE_SLUGS,
  parseSlugI18n,
  getBlogSlugForLang,
  rewriteBlogLinksForLang
};
