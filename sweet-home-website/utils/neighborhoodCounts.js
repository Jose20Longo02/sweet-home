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
      GROUPING(city)::int AS city_grouped,
      GROUPING(neighborhood)::int AS neighborhood_grouped,
      COUNT(*)::int AS property_count
    FROM properties p
    WHERE country IS NOT NULL
      AND p.status = 'active'
      AND p.sold IS NOT TRUE
      AND p.slug IS NOT NULL
      AND BTRIM(p.slug) <> ''
    GROUP BY GROUPING SETS (
      (country),
      (country, city),
      (country, city, neighborhood)
    )
  `;

  const { rows } = await query(sql);
  countsCache = { rows: Array.isArray(rows) ? rows : [], expiresAt: now + CACHE_TTL_MS };
  return countsCache.rows;
}

function indexCounts(rows) {
  const byLocation = {};
  (rows || []).forEach((row) => {
    const countryKey = normalizeKey(row.country);
    if (!countryKey) return;
    if (!byLocation[countryKey]) byLocation[countryKey] = { total: 0, cities: {} };

    const count = Number(row.property_count) || 0;
    if (Number(row.city_grouped) === 1) {
      byLocation[countryKey].total = count;
      return;
    }

    const cityKey = normalizeKey(row.city);
    if (!cityKey) return;
    if (!byLocation[countryKey].cities[cityKey]) {
      byLocation[countryKey].cities[cityKey] = { total: 0, neighborhoods: {} };
    }
    if (Number(row.neighborhood_grouped) === 1) {
      byLocation[countryKey].cities[cityKey].total = count;
      return;
    }

    const neighborhoodKey = normalizeKey(row.neighborhood);
    if (!neighborhoodKey) return;
    byLocation[countryKey].cities[cityKey].neighborhoods[neighborhoodKey] = count;
  });
  return byLocation;
}

async function getNeighborhoodCountMap(locationsConfig) {
  const rows = await getRawNeighborhoodCounts();
  const indexed = indexCounts(rows);
  const output = {};

  Object.entries(locationsConfig || {}).forEach(([country, cities]) => {
    const countryKey = normalizeKey(country);
    const countrySource = indexed[countryKey] || { total: 0, cities: {} };
    output[country] = { __total: Number(countrySource.total) || 0 };
    Object.entries(cities || {}).forEach(([city, neighborhoods]) => {
      const cityKey = normalizeKey(city);
      const citySource = (countrySource.cities || {})[cityKey] || { total: 0, neighborhoods: {} };
      output[country][city] = { __total: Number(citySource.total) || 0 };

      (Array.isArray(neighborhoods) ? neighborhoods : []).forEach((neighborhood) => {
        const neighborhoodKey = normalizeKey(neighborhood);
        output[country][city][neighborhood] = Number((citySource.neighborhoods || {})[neighborhoodKey]) || 0;
      });
    });
  });

  return output;
}

module.exports = { getNeighborhoodCountMap };
