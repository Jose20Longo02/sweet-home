/**
 * Grunderwerbsteuer by Bundesland, for /kaufnebenkosten-rechner.
 * Rates are the current statutory rates, not a third-party roundup.
 *
 * Berlin 6 % since 1 Jan 2014: Senatsverwaltung für Finanzen.
 * Bremen 5,5 % since 1 Jul 2025: Gesetzblatt Bremen 2025 Nr. 9.
 * Hamburg 5,5 % since 1 Jan 2023: Finanzbehörde Hamburg / Brandenburg finance-office table.
 * Sachsen 5,5 % since 1 Jan 2023: Sächsisches Grunderwerbsteuersatzgesetz (REVOSax).
 * Thüringen 5,0 % since 1 Jan 2024: Brandenburg finance-office short note, 11 Mar 2024.
 * Remaining Länder: latest rate on the Brandenburg finance-office comparison
 * (finanzamt.brandenburg.de, Grunderwerbsteuer). Bayern keeps the federal 3,5 %.
 */
const TRANSFER_TAX_RATES = [
  { code: 'BW', name: 'Baden-Württemberg', nameEn: 'Baden-Württemberg', rate: 0.05, since: '5. November 2011', sinceEn: '5 November 2011' },
  { code: 'BY', name: 'Bayern', nameEn: 'Bavaria', rate: 0.035, since: 'bundesgesetzlicher Satz', sinceEn: 'federal statutory rate' },
  { code: 'BE', name: 'Berlin', nameEn: 'Berlin', rate: 0.06, since: '1. Januar 2014', sinceEn: '1 January 2014' },
  { code: 'BB', name: 'Brandenburg', nameEn: 'Brandenburg', rate: 0.065, since: '1. Juli 2015', sinceEn: '1 July 2015' },
  { code: 'HB', name: 'Bremen', nameEn: 'Bremen', rate: 0.055, since: '1. Juli 2025', sinceEn: '1 July 2025' },
  { code: 'HH', name: 'Hamburg', nameEn: 'Hamburg', rate: 0.055, since: '1. Januar 2023', sinceEn: '1 January 2023' },
  { code: 'HE', name: 'Hessen', nameEn: 'Hesse', rate: 0.06, since: '1. August 2014', sinceEn: '1 August 2014' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern', nameEn: 'Mecklenburg-Western Pomerania', rate: 0.06, since: '1. Juli 2019', sinceEn: '1 July 2019' },
  { code: 'NI', name: 'Niedersachsen', nameEn: 'Lower Saxony', rate: 0.05, since: '1. Januar 2014', sinceEn: '1 January 2014' },
  { code: 'NW', name: 'Nordrhein-Westfalen', nameEn: 'North Rhine-Westphalia', rate: 0.065, since: '1. Januar 2015', sinceEn: '1 January 2015' },
  { code: 'RP', name: 'Rheinland-Pfalz', nameEn: 'Rhineland-Palatinate', rate: 0.05, since: '1. März 2012', sinceEn: '1 March 2012' },
  { code: 'SL', name: 'Saarland', nameEn: 'Saarland', rate: 0.065, since: '1. Januar 2015', sinceEn: '1 January 2015' },
  { code: 'SN', name: 'Sachsen', nameEn: 'Saxony', rate: 0.055, since: '1. Januar 2023', sinceEn: '1 January 2023' },
  { code: 'ST', name: 'Sachsen-Anhalt', nameEn: 'Saxony-Anhalt', rate: 0.05, since: '1. März 2012', sinceEn: '1 March 2012' },
  { code: 'SH', name: 'Schleswig-Holstein', nameEn: 'Schleswig-Holstein', rate: 0.065, since: '1. Januar 2014', sinceEn: '1 January 2014' },
  { code: 'TH', name: 'Thüringen', nameEn: 'Thuringia', rate: 0.05, since: '1. Januar 2024', sinceEn: '1 January 2024' }
];

module.exports = { TRANSFER_TAX_RATES };
