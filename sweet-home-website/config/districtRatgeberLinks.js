/**
 * N11 — district-specific blog guide links (keyword anchors).
 * Keys match districtDisplayName in district landing templates.
 */
const { DE_TO_EN_SLUG } = require('./n10-berlin-post-slugs');

const BLOG_ANCHORS = {
  'kaufnebenkosten-berlin': 'Kaufnebenkosten Berlin',
  'immobilie-als-kapitalanlage-berlin': 'Immobilie als Kapitalanlage Berlin',
  'auslaender-immobilien-kaufen-berlin': 'Ausländer Immobilien kaufen Berlin',
  'beste-bezirke-immobilien-berlin': 'beste Bezirke Immobilien Berlin',
  'wohnungskauf-berlin-checkliste': 'Wohnungskauf Berlin Checkliste',
  'mietrecht-berlin-kaeufer': 'Mietrecht Berlin für Käufer',
  'neubau-oder-altbau-berlin': 'Neubau oder Altbau in Berlin',
  'berlin-stadtteile-familien': 'Berliner Stadtteile für Familien',
  'vermietete-wohnung-kaufen-berlin': 'vermietete Wohnung kaufen Berlin',
  'immobilienpreise-berlin': 'Immobilienpreise Berlin',
  'grunderwerbsteuer-berlin': 'Grunderwerbsteuer Berlin',
  'mietrendite-berechnen': 'Mietrendite berechnen',
  'eigenkapital-wohnungskauf': 'Eigenkapital Wohnungskauf',
  'mietpreise-berlin-bezirk': 'Mietpreise Berlin',
  'wo-in-berlin-wohnung-kaufen': 'wo in Berlin Wohnung kaufen'
};

const BLOG_ANCHORS_EN = {
  'kaufnebenkosten-berlin': 'Cost of buying property in Berlin',
  'immobilie-als-kapitalanlage-berlin': 'Berlin real estate as an investment',
  'auslaender-immobilien-kaufen-berlin': 'How foreigners can buy property in Berlin',
  'beste-bezirke-immobilien-berlin': 'Best Berlin districts for property investment',
  'wohnungskauf-berlin-checkliste': 'What to check before buying an apartment in Berlin',
  'mietrecht-berlin-kaeufer': 'Berlin rental laws for property buyers',
  'neubau-oder-altbau-berlin': 'New build vs Altbau in Berlin',
  'berlin-stadtteile-familien': 'Best Berlin districts for families',
  'vermietete-wohnung-kaufen-berlin': 'Buying a tenanted apartment in Berlin',
  'immobilienpreise-berlin': 'Berlin property prices',
  'grunderwerbsteuer-berlin': 'Berlin transfer tax (Grunderwerbsteuer)',
  'mietrendite-berechnen': 'How to calculate rental yield in Berlin',
  'eigenkapital-wohnungskauf': 'Down payment for buying an apartment in Berlin',
  'mietpreise-berlin-bezirk': 'Berlin rents by district',
  'wo-in-berlin-wohnung-kaufen': 'Where to buy an apartment in Berlin'
};

/** Cover images for Ratgeber cards (synced from published blog_posts.cover_image). */
const BLOG_COVERS = {
  'kaufnebenkosten-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/hidden-costs-of-buying-property-in-berlin/cover/1780341245533-real-estate-transaction-image.jpg',
  'immobilie-als-kapitalanlage-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/berlin-real-estate-investment-guide-2026/cover/1776877242773-berlin-aerial-view.jpg',
  'auslaender-immobilien-kaufen-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/how-foreigners-can-buy-property-in-berlin/cover/1779465478392-berlin-image.jpg',
  'beste-bezirke-immobilien-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/best-berlin-districts-for-property-investment/cover/1779760759345-berlin-photo.jpg',
  'wohnungskauf-berlin-checkliste':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/grosszugiges-2-zimmer-loft-mit-88-m-in-neukolln-mobliert-bezugsfrei/photos/apartment-berlin-1.jpg',
  'mietrecht-berlin-kaeufer':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/berlin-rental-laws-explained-for-property-buyers/cover/1780412499447-berlin-photo.jpg',
  'neubau-oder-altbau-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/new-build-vs-altbau-in-berlin-which-is-better/cover/1780582628703-new-build-vs-altbau-cover-image.png',
  'berlin-stadtteile-familien':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/best-berlin-districts-for-families/cover/1781099381043-family-in-berlin.png',
  'vermietete-wohnung-kaufen-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/blog/how-smart-investors-buy-berlin-at-a-40-discount/cover/1777421512977-berlin-buildings.jpg',
  'immobilienpreise-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/3-room-apartment-for-sale-suitable-for-owner-occupation-or-as-an-investment/photos/apartment-charlottenburg-wilmersdorf-1.jpg',
  'grunderwerbsteuer-berlin':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/grosszugige-4-zimmer-wohnung-in-berlin-spandau-ideal-zur-eigennutzung/photos/apartment-berlin-1.jpg',
  'mietrendite-berechnen':
    'https://sweet-home-spaces.fra1.cdn.digitaloceanspaces.com/properties/top-kapitalanlage-in-weissensee/photos/apartment-pankow-1.jpg',
  'eigenkapital-wohnungskauf': '/images/blog/eigenkapital-wohnungskauf.jpg',
  'mietpreise-berlin-bezirk': '/images/blog/mietpreise-berlin-bezirk.jpg',
  'wo-in-berlin-wohnung-kaufen': '/images/blog/wo-in-berlin-wohnung-kaufen.jpg'
};

/** @type {Record<string, string[]>} district → ordered blog slugs (2–4) */
const DISTRICT_RATGEBER_SLUGS = {
  Charlottenburg: [
    'immobilienpreise-berlin',
    'eigenkapital-wohnungskauf',
    'neubau-oder-altbau-berlin',
    'wo-in-berlin-wohnung-kaufen'
  ],
  Moabit: [
    'kaufnebenkosten-berlin',
    'immobilienpreise-berlin',
    'immobilie-als-kapitalanlage-berlin',
    'wohnungskauf-berlin-checkliste'
  ],
  'Friedrichshain-Kreuzberg': [
    'immobilienpreise-berlin',
    'mietpreise-berlin-bezirk',
    'vermietete-wohnung-kaufen-berlin',
    'beste-bezirke-immobilien-berlin'
  ],
  Schöneberg: [
    'berlin-stadtteile-familien',
    'wohnungskauf-berlin-checkliste',
    'immobilienpreise-berlin',
    'neubau-oder-altbau-berlin'
  ],
  'Prenzlauer Berg': [
    'berlin-stadtteile-familien',
    'immobilienpreise-berlin',
    'eigenkapital-wohnungskauf',
    'wo-in-berlin-wohnung-kaufen'
  ],
  Wedding: [
    'mietpreise-berlin-bezirk',
    'kaufnebenkosten-berlin',
    'immobilie-als-kapitalanlage-berlin',
    'eigenkapital-wohnungskauf'
  ],
  Tempelhof: [
    'berlin-stadtteile-familien',
    'mietpreise-berlin-bezirk',
    'wohnungskauf-berlin-checkliste',
    'neubau-oder-altbau-berlin'
  ],
  Neukölln: [
    'mietrendite-berechnen',
    'vermietete-wohnung-kaufen-berlin',
    'mietpreise-berlin-bezirk',
    'immobilie-als-kapitalanlage-berlin'
  ],
  Reinickendorf: [
    'eigenkapital-wohnungskauf',
    'kaufnebenkosten-berlin',
    'mietpreise-berlin-bezirk',
    'berlin-stadtteile-familien'
  ],
  Kreuzberg: [
    'mietrecht-berlin-kaeufer',
    'vermietete-wohnung-kaufen-berlin',
    'immobilienpreise-berlin',
    'beste-bezirke-immobilien-berlin'
  ],
  Spandau: [
    'eigenkapital-wohnungskauf',
    'grunderwerbsteuer-berlin',
    'immobilienpreise-berlin',
    'wo-in-berlin-wohnung-kaufen'
  ],
  Mitte: [
    'immobilienpreise-berlin',
    'auslaender-immobilien-kaufen-berlin',
    'kaufnebenkosten-berlin',
    'wo-in-berlin-wohnung-kaufen'
  ],
  Pankow: [
    'berlin-stadtteile-familien',
    'immobilienpreise-berlin',
    'neubau-oder-altbau-berlin',
    'beste-bezirke-immobilien-berlin'
  ]
};

const DEFAULT_SLUGS = [
  'kaufnebenkosten-berlin',
  'wohnungskauf-berlin-checkliste',
  'immobilienpreise-berlin',
  'wo-in-berlin-wohnung-kaufen'
];

function getDistrictRatgeberLinks(districtName, lang = 'de') {
  const slugs = DISTRICT_RATGEBER_SLUGS[String(districtName || '').trim()] || DEFAULT_SLUGS;
  const isEn = String(lang || 'de').toLowerCase().slice(0, 2) === 'en';
  return slugs.slice(0, 4).map((slug) => {
    const enSlug = DE_TO_EN_SLUG[slug] || slug;
    return {
      slug,
      href: isEn ? `/en/blog/${enSlug}` : `/blog/${slug}`,
      anchor: isEn ? (BLOG_ANCHORS_EN[slug] || BLOG_ANCHORS[slug] || slug) : (BLOG_ANCHORS[slug] || slug),
      cover: BLOG_COVERS[slug] || '/images/berlin-hero.jpg'
    };
  });
}

module.exports = {
  BLOG_ANCHORS,
  BLOG_ANCHORS_EN,
  BLOG_COVERS,
  DISTRICT_RATGEBER_SLUGS,
  getDistrictRatgeberLinks
};
