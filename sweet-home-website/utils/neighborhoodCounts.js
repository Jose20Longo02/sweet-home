const { query } = require('../config/db');

const CACHE_TTL_MS = 60 * 1000;
let countsCache = { expiresAt: 0, rows: null };

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function getRawNeighborhoodCounts() {
  const now = Date.now();
  if (countsCache.rows && now < countsCache.expiresAt) {
    return countsCache.rows;
  }

  const sql = `
    SELECT
      country,
      city,
      neighborhood,
      COUNT(*)::int AS property_count
    FROM properties
    WHERE country IS NOT NULL
      AND city IS NOT NULL
      AND neighborhood IS NOT NULL
      AND BTRIM(neighborhood) <> ''
    GROUP BY country, city, neighborhood
  `;

  const { rows } = await query(sql);
  countsCache = { rows: Array.isArray(rows) ? rows : [], expiresAt: now + CACHE_TTL_MS };
  return countsCache.rows;
}

function indexCounts(rows) {
  const byLocation = {};
  (rows || []).forEach((row) => {
    const countryKey = normalizeKey(row.country);
    const cityKey = normalizeKey(row.city);
    const neighborhoodKey = normalizeKey(row.neighborhood);
    if (!countryKey || !cityKey || !neighborhoodKey) return;
    if (!byLocation[countryKey]) byLocation[countryKey] = {};
    if (!byLocation[countryKey][cityKey]) byLocation[countryKey][cityKey] = {};
    byLocation[countryKey][cityKey][neighborhoodKey] = Number(row.property_count) || 0;
  });
  return byLocation;
}

async function getNeighborhoodCountMap(locationsConfig) {
  const rows = await getRawNeighborhoodCounts();
  const indexed = indexCounts(rows);
  const output = {};

  Object.entries(locationsConfig || {}).forEach(([country, cities]) => {
    output[country] = {};
    Object.entries(cities || {}).forEach(([city, neighborhoods]) => {
      output[country][city] = {};
      const countryKey = normalizeKey(country);
      const cityKey = normalizeKey(city);
      const source = (((indexed[countryKey] || {})[cityKey]) || {});

      (Array.isArray(neighborhoods) ? neighborhoods : []).forEach((neighborhood) => {
        const neighborhoodKey = normalizeKey(neighborhood);
        output[country][city][neighborhood] = Number(source[neighborhoodKey]) || 0;
      });
    });
  });

  return output;
}

module.exports = { getNeighborhoodCountMap };
