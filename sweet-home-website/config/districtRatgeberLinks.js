/**
 * N11 — district-specific blog guide links (keyword anchors).
 * Keys match districtDisplayName in district landing templates.
 */
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

function getDistrictRatgeberLinks(districtName) {
  const slugs = DISTRICT_RATGEBER_SLUGS[String(districtName || '').trim()] || DEFAULT_SLUGS;
  return slugs.slice(0, 4).map((slug) => ({
    slug,
    href: `/blog/${slug}`,
    anchor: BLOG_ANCHORS[slug] || slug
  }));
}

module.exports = {
  BLOG_ANCHORS,
  DISTRICT_RATGEBER_SLUGS,
  getDistrictRatgeberLinks
};
