// controllers/propertyController.js

const { query }  = require('../config/db');
const locations   = require('../config/locations');
const locationColors = require('../config/locationColors');
const slugify     = require('slugify');
const fs          = require('fs');
const path        = require('path');
const s3          = require('../config/spaces');
const sendMail    = require('../config/mailer');
const { generateVariants, SIZES } = require('../middleware/imageVariants');
const { ensureLocalizedFields } = require('../config/translator');
const { detectLanguageFromFields, getTargetLanguages } = require('../utils/languageDetection');
const { ensureCompleteTranslations } = require('../utils/translationHelper');
const { generateSEOFileName } = require('../utils/imageNaming');
const { logEvent } = require('../utils/analytics');
const { getNeighborhoodCountMap } = require('../utils/neighborhoodCounts');

function normalizeSlug(value) {
  return slugify(String(value || ''), { lower: true, strict: true, locale: 'en' });
}

function nonEmptyQueryEntries(query) {
  return Object.entries(query || {}).filter(([, value]) => {
    if (Array.isArray(value)) return value.some(v => String(v || '').trim() !== '');
    return String(value || '').trim() !== '';
  });
}

function getOperationValue(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'rent' || raw === 'for-rent') return 'rent';
  if (raw === 'buy' || raw === 'sale' || raw === 'for-sale') return 'sale';
  return '';
}

function getPropertiesBasePath(req) {
  const base = String((req && req.baseUrl) || '/properties').replace(/\/$/, '');
  return base || '/properties';
}

function getCurrentListPath(req) {
  const base = getPropertiesBasePath(req);
  const subPath = String((req && req.path) || '/');
  return subPath === '/' ? base : `${base}${subPath}`;
}

function buildLocationSearchPath(req, country, city) {
  const base = getPropertiesBasePath(req);
  const countrySlug = normalizeSlug(country);
  if (!countrySlug) return base;
  const citySlug = normalizeSlug(city);
  return citySlug
    ? `${base}/for-sale/${countrySlug}/${citySlug}`
    : `${base}/for-sale/${countrySlug}`;
}

function resolveCountryBySlug(slugValue) {
  const slug = normalizeSlug(slugValue);
  const country = Object.keys(locations || {}).find((name) => normalizeSlug(name) === slug);
  return country || null;
}

function resolveCityBySlug(country, slugValue) {
  const cities = country && locations && locations[country] ? Object.keys(locations[country]) : [];
  const slug = normalizeSlug(slugValue);
  const city = cities.find((name) => normalizeSlug(name) === slug);
  return city || null;
}

function cleanQueryParams(queryObj) {
  const params = new URLSearchParams();
  Object.entries(queryObj || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = String(item || '').trim();
        if (normalized) params.append(key, normalized);
      });
      return;
    }
    const normalized = String(value || '').trim();
    if (normalized) params.set(key, normalized);
  });
  return params;
}

function buildPageUrl(pathname, queryObj, pageNumber) {
  const params = cleanQueryParams(queryObj);
  if (pageNumber > 1) params.set('page', String(pageNumber));
  else params.delete('page');
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// Extract coordinates from common map link formats or raw "lat,lng"
function extractCoordsFromLink(input) {
  if (!input || typeof input !== 'string') return { lat: null, lng: null };
  const text = input.trim();
  // Google Maps deep link: @lat,lng
  let m = text.match(/@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  // Query parameters: q=lat,lng or ll=lat,lng
  m = text.match(/[?&](?:q|ll)=\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  // Plain text "lat,lng"
  m = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  return { lat: null, lng: null };
}

// Localized title: prefer lang, then en, then main title
function getLocalizedTitle(row, lang) {
  const i18n = row && row.title_i18n && typeof row.title_i18n === 'object' ? row.title_i18n : null;
  return (i18n && (i18n[lang] || i18n.en)) || (row && row.title) || '';
}

//
// — Public & Agent Handlers —
//

// List properties for public/agent views
exports.listPropertiesPublic = async (req, res, next) => {
  try {
    const {
      q = '', // search query
      operation = '',
      country: queryCountry = '',
      city: queryCity = '',
      neighborhood = '',
      type = [],
      min_price = '',
      max_price = '',
      rooms = [],
      bathrooms = '',
      min_size = '',
      max_size = '',
      year_built_min = '',
      year_built_max = '',
      features = [],
      featured = '',
      new_listing = '',
      status = [],
      sort = 'relevance',
      page = 1
    } = req.query;

    // Fallback to clean URL params when query params are absent.
    // Example: /properties/for-sale/uae should behave as country=UAE.
    let country = queryCountry;
    let city = queryCity;
    if (!country && req.params && req.params.countrySlug) {
      country = resolveCountryBySlug(req.params.countrySlug) || '';
    }
    if (!city && req.params && req.params.citySlug && country) {
      city = resolveCityBySlug(country, req.params.citySlug) || '';
    }

    const parsedPage = Number.parseInt(page, 10);
    const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const normalizedSort = String(sort || '').trim().toLowerCase() || 'relevance';
    const operationMode = getOperationValue(operation);
    // Source country/city from clean URL params when present.
    let selectedCountry = country;
    let selectedCity = city;
    if (req.params && req.params.countrySlug) {
      const countryFromSlug = resolveCountryBySlug(req.params.countrySlug);
      if (countryFromSlug) selectedCountry = countryFromSlug;
    }
    if (req.params && req.params.citySlug) {
      const cityFromSlug = resolveCityBySlug(selectedCountry, req.params.citySlug);
      if (cityFromSlug) selectedCity = cityFromSlug;
    }

    // Redirect clean indexable location queries to stable SEO paths.
    const queryEntries = nonEmptyQueryEntries(req.query);
    const queryKeys = new Set(queryEntries.map(([key]) => key));
    const allowedRedirectKeys = new Set(['country', 'city', 'operation', 'page', 'sort']);
    const hasDisallowedRedirectKeys = Array.from(queryKeys).some((key) => !allowedRedirectKeys.has(key));
    const hasLocationInQuery = String(selectedCountry || '').trim() !== '';
    const routeIsBaseResults = String(req.path || '') === '/';
    const canRedirectToCleanPath = routeIsBaseResults
      && hasLocationInQuery
      && !hasDisallowedRedirectKeys
      && (normalizedSort === 'relevance');

    if (canRedirectToCleanPath) {
      const redirectPath = buildLocationSearchPath(req, selectedCountry, selectedCity);
      const redirectParams = new URLSearchParams();
      if (operationMode) redirectParams.set('operation', operationMode);
      if (currentPage > 1) redirectParams.set('page', String(currentPage));
      const redirectTarget = redirectParams.toString() ? `${redirectPath}?${redirectParams.toString()}` : redirectPath;
      return res.redirect(301, redirectTarget);
    }

    // Keep user-selected query params intact on results pages.
    // Canonical/noindex rules below handle SEO normalization without altering user flow.

    // Build WHERE clause for filtering
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Search query (title, description, location)
    if (q && q.trim()) {
      whereConditions.push(`(
        LOWER(p.title) LIKE LOWER($${paramIndex}) OR 
        LOWER(p.description) LIKE LOWER($${paramIndex}) OR
        LOWER(p.country) LIKE LOWER($${paramIndex}) OR
        LOWER(p.city) LIKE LOWER($${paramIndex}) OR
        LOWER(p.neighborhood) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${q.trim()}%`);
      paramIndex++;
    }

    // Location filters
    if (selectedCountry) {
      whereConditions.push(`p.country = $${paramIndex}`);
      queryParams.push(selectedCountry);
      paramIndex++;
    }
    if (selectedCity) {
      whereConditions.push(`p.city = $${paramIndex}`);
      queryParams.push(selectedCity);
      paramIndex++;
    }
    if (neighborhood) {
      whereConditions.push(`p.neighborhood = $${paramIndex}`);
      queryParams.push(neighborhood);
      paramIndex++;
    }

    // Property type filter
    if (type) {
      // Handle both single string and array values
      const typeArray = Array.isArray(type) ? type : [type];
      if (typeArray.length > 0 && typeArray[0] !== '') {
        const typePlaceholders = typeArray.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`p.type = ANY(ARRAY[${typePlaceholders}])`);
        queryParams.push(...typeArray);
      }
    }

    // Price range filter
    if (min_price && !isNaN(min_price)) {
      whereConditions.push(`p.price >= $${paramIndex}`);
      queryParams.push(parseFloat(min_price));
      paramIndex++;
    }
    if (max_price && !isNaN(max_price)) {
      whereConditions.push(`p.price <= $${paramIndex}`);
      queryParams.push(parseFloat(max_price));
      paramIndex++;
    }

    // Size range filter
    if (min_size && !isNaN(min_size)) {
      whereConditions.push(`(
        (p.type = 'Apartment' AND p.apartment_size >= $${paramIndex}) OR
        (p.type IN ('House', 'Villa') AND p.living_space >= $${paramIndex}) OR
        (p.type = 'Land' AND p.land_size >= $${paramIndex})
      )`);
      queryParams.push(parseFloat(min_size));
      paramIndex++;
    }
    if (max_size && !isNaN(max_size)) {
      whereConditions.push(`(
        (p.type = 'Apartment' AND p.apartment_size <= $${paramIndex}) OR
        (p.type IN ('House', 'Villa') AND p.living_space <= $${paramIndex}) OR
        (p.type = 'Land' AND p.land_size <= $${paramIndex})
      )`);
      queryParams.push(parseFloat(max_size));
      paramIndex++;
    }

    // Year built filter
    if (year_built_min && !isNaN(year_built_min)) {
      whereConditions.push(`p.year_built >= $${paramIndex}`);
      queryParams.push(parseInt(year_built_min));
      paramIndex++;
    }
    if (year_built_max && !isNaN(year_built_max)) {
      whereConditions.push(`p.year_built <= $${paramIndex}`);
      queryParams.push(parseInt(year_built_max));
      paramIndex++;
    }

    // Rooms filter
    if (rooms) {
      // Handle both single string and array values
      const roomsArray = Array.isArray(rooms) ? rooms : [rooms];
      if (roomsArray.length > 0 && roomsArray[0] !== '') {
        const roomConditions = roomsArray.map(room => {
          if (room === '1') return `p.rooms >= 1`;
          if (room === '2') return `p.rooms >= 2`;
          if (room === '3') return `p.rooms >= 3`;
          if (room === '4') return `p.rooms >= 4`;
          return null;
        }).filter(Boolean);
        
        if (roomConditions.length > 0) {
          whereConditions.push(`(${roomConditions.join(' OR ')})`);
        }
      }
    }

    // Bathrooms filter
    if (bathrooms && !isNaN(bathrooms)) {
      whereConditions.push(`p.bathrooms >= $${paramIndex}`);
      queryParams.push(parseInt(bathrooms));
      paramIndex++;
    }

    // Features filter (JSONB array of strings) — match ANY selected feature
    if (features) {
      const featuresArray = Array.isArray(features) ? features.filter(Boolean) : [features].filter(Boolean);
      if (featuresArray.length > 0) {
        // EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.features) f WHERE f = ANY ($idx))
        whereConditions.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.features) f WHERE f = ANY ($${paramIndex}))`);
        queryParams.push(featuresArray);
        paramIndex++;
      }
    }

    // Featured properties filter
    if (featured === 'true') {
      whereConditions.push(`p.featured = true`);
    }

    // New listings filter (last 7 days)
    if (new_listing === 'true') {
      whereConditions.push(`p.created_at >= NOW() - INTERVAL '7 days'`);
    }

    // Status tags filter (TEXT[] overlap) — match ANY selected status
    if (status) {
      const statusArray = Array.isArray(status) ? status.filter(Boolean) : [status].filter(Boolean);
      if (statusArray.length > 0) {
        whereConditions.push(`p.status_tags && $${paramIndex}`);
        queryParams.push(statusArray);
        paramIndex++;
      }
    }

    // Build the base query
    let baseQuery = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood, p.full_address,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        p.rental_status, p.rental_income,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        false as featured, p.created_at, p.description,
        p.year_built, p.map_link,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
    `;

    // Add WHERE clause if filters exist
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add sorting
    let orderBy = 'p.created_at DESC';
    switch (sort) {
      case 'price_low':
        orderBy = 'p.price ASC';
        break;
      case 'price_high':
        orderBy = 'p.price DESC';
        break;
      case 'date_new':
        orderBy = 'p.created_at DESC';
        break;
      case 'date_old':
        orderBy = 'p.created_at ASC';
        break;
      case 'size_low':
        orderBy = `CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE 0
        END ASC`;
        break;
      case 'size_high':
        orderBy = `CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE 0
        END DESC`;
        break;
      case 'relevance':
      default:
        // For relevance, prioritize featured properties and search matches
        if (q && q.trim()) {
          orderBy = `CASE WHEN p.featured = true THEN 1 ELSE 2 END, p.created_at DESC`;
        } else {
          orderBy = `CASE WHEN p.featured = true THEN 1 ELSE 2 END, p.created_at DESC`;
        }
        break;
    }

    baseQuery += ` ORDER BY ${orderBy}`;

    // Get total count for pagination (optimized: use COUNT(*) with same WHERE conditions)
    // Build simplified count query without JOINs if not needed for filtering
    let countQuery;
    const needsJoinForCount = whereConditions.some(cond => cond.includes('u.') || cond.includes('agent'));
    if (needsJoinForCount) {
      countQuery = baseQuery
        .replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(DISTINCT p.id) as count FROM')
        .replace(/ORDER BY[\s\S]*$/i, '');
    } else {
      // Simplified count query without JOIN for better performance
      countQuery = `
        SELECT COUNT(*) as count
        FROM properties p
        ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
      `;
    }
    const { rows: countResult } = await query(countQuery, queryParams);
    const totalProperties = parseInt(countResult[0]?.count || '0', 10);

    // Add pagination
    const itemsPerPage = 12;
    const totalPages = Math.ceil(totalProperties / itemsPerPage);
    const offset = (currentPage - 1) * itemsPerPage;
    
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(itemsPerPage, offset);

    // Execute the main query
    const { rows: properties } = await query(baseQuery, queryParams);

    // Normalize photos array and agent info for each property
    const publicDir = path.join(__dirname, '../public');
    const currentLang = res.locals.lang || 'en';
    const normalizedProperties = properties.map(p => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      let hasVariants = false;
      let variantBase = null;
      if (photos.length > 0) {
        const first = photos[0];
        const ext = path.extname(first);
        const baseUrl = first.slice(0, -ext.length);
        const baseAbs = path.join(publicDir, baseUrl.replace(/^\//, ''));
        if (
          fs.existsSync(baseAbs + '-320.jpg') ||
          fs.existsSync(baseAbs + '-320.webp') ||
          fs.existsSync(baseAbs + '-320.avif')
        ) {
          hasVariants = true;
          variantBase = baseUrl;
        }
      }
      // Localize
      const localizedTitle = getLocalizedTitle(p, currentLang);
      const localizedDescription = (p.description_i18n && p.description_i18n[currentLang]) || p.description;
      return {
        ...p,
        title: localizedTitle,
        description: localizedDescription,
        photos,
        has_variants: hasVariants,
        variant_base: variantBase,
        agent: {
          name: p.agent_name || 'Agent',
          profile_picture: p.agent_profile_picture || null
        }
      };
    });

    // Prepare filters object for the view
    const filters = {
      country: selectedCountry,
      city: selectedCity,
      neighborhood,
      type: Array.isArray(type) ? type : (type ? [type] : []),
      min_price,
      max_price,
      rooms: Array.isArray(rooms) ? rooms : (rooms ? [rooms] : []),
      bathrooms,
      min_size,
      max_size,
      year_built_min,
      year_built_max,
      features: Array.isArray(features) ? features : (features ? [features] : []),
      featured,
      new_listing,
      status: Array.isArray(status) ? status : (status ? [status] : [])
    };

    // SEO context for canonical/noindex and metadata on search results.
    const lang = currentLang;
    const baseUrl = res.locals.baseUrl || '';
    const translateLocation = typeof res.locals.translateLocation === 'function'
      ? res.locals.translateLocation
      : (_kind, value) => value;
    const displayCountry = selectedCountry ? translateLocation('country', selectedCountry) : '';
    const displayCity = selectedCity ? translateLocation('city', selectedCity) : '';
    const queryPath = getCurrentListPath(req);
    const locationPath = buildLocationSearchPath(req, selectedCountry, selectedCity);

    const indexableKeys = new Set(['country', 'city', 'operation', 'page', 'sort']);
    const hasDisallowedIndexKeys = Array.from(queryKeys).some((key) => !indexableKeys.has(key));
    const hasOnlyLocationAndPagination = !hasDisallowedIndexKeys && normalizedSort === 'relevance';
    const hasValidLocationHierarchy = !selectedCity || !!selectedCountry;
    const isIndexable = hasValidLocationHierarchy
      && hasOnlyLocationAndPagination
      && !q
      && totalProperties > 0;
    const robotsMeta = isIndexable ? 'index,follow' : 'noindex,follow';

    const canonicalPath = selectedCountry ? locationPath : getPropertiesBasePath(req);
    const canonicalQuery = new URLSearchParams();
    if (isIndexable && currentPage > 1) canonicalQuery.set('page', String(currentPage));
    if (isIndexable && operationMode) canonicalQuery.set('operation', operationMode);
    const canonicalUrl = canonicalQuery.toString()
      ? `${baseUrl}${canonicalPath}?${canonicalQuery.toString()}`
      : `${baseUrl}${canonicalPath}`;

    const neutralPath = canonicalPath.replace(/^\/(de|es)(?=\/)/, '');
    const enPath = neutralPath;
    const dePath = `/de${neutralPath}`;
    const esPath = `/es${neutralPath}`;
    const hreflangAlternates = {
      'en-us': canonicalQuery.toString() ? `${baseUrl}${enPath}?${canonicalQuery.toString()}` : `${baseUrl}${enPath}`,
      'de-de': canonicalQuery.toString() ? `${baseUrl}${dePath}?${canonicalQuery.toString()}` : `${baseUrl}${dePath}`,
      'es-es': canonicalQuery.toString() ? `${baseUrl}${esPath}?${canonicalQuery.toString()}` : `${baseUrl}${esPath}`
    };

    const resultsNoun = res.locals.t('properties.list.results', 'results');
    const operationLabel = operationMode === 'rent'
      ? res.locals.t('properties.list.seo.operationRent', 'for rent')
      : res.locals.t('properties.list.seo.operationSale', 'for sale');

    let seoTitle = res.locals.t('properties.list.seo.defaultTitle', 'Properties for Sale');
    let seoDescription = res.locals.t('properties.list.seo.defaultDescription', 'Browse available properties in key markets with updated prices, photos, and location details.');
    let seoH1 = res.locals.t('properties.list.h1.default', 'Properties for Sale - Find Your Dream Home');

    if (displayCity && displayCountry) {
      seoTitle = res.locals.t('properties.list.seo.cityTitle', '{count} properties {operation} in {city}, {country}', {
        count: totalProperties,
        operation: operationLabel,
        city: displayCity,
        country: displayCountry
      });
      seoDescription = res.locals.t(
        'properties.list.seo.cityDescription',
        'Explore {count} properties {operation} in {city}, {country}. Compare prices, photos, and neighborhood context.',
        { count: totalProperties, operation: operationLabel, city: displayCity, country: displayCountry }
      );
      seoH1 = res.locals.t('properties.list.h1.city', 'Properties for Sale in {city}, {country}', {
        city: displayCity,
        country: displayCountry
      });
    } else if (displayCountry) {
      seoTitle = res.locals.t('properties.list.seo.countryTitle', '{count} properties {operation} in {country}', {
        count: totalProperties,
        operation: operationLabel,
        country: displayCountry
      });
      seoDescription = res.locals.t(
        'properties.list.seo.countryDescription',
        'Discover {count} properties {operation} in {country}. Updated listings, photos, and pricing from Sweet Home.',
        { count: totalProperties, operation: operationLabel, country: displayCountry }
      );
      seoH1 = res.locals.t('properties.list.h1.country', 'Properties for Sale in {country}', { country: displayCountry });
    } else if (!q && totalProperties > 0) {
      seoTitle = res.locals.t('properties.list.seo.allTitle', '{count} properties for sale', { count: totalProperties });
      seoDescription = res.locals.t(
        'properties.list.seo.allDescription',
        'Browse {count} active property listings across Berlin, Dubai, and Cyprus.',
        { count: totalProperties }
      );
    }

    const pagePathForPagination = queryPath;
    const queryForPagination = { ...req.query };
    const prevPageUrl = currentPage > 1
      ? `${baseUrl}${buildPageUrl(pagePathForPagination, queryForPagination, currentPage - 1)}`
      : null;
    const nextPageUrl = currentPage < totalPages
      ? `${baseUrl}${buildPageUrl(pagePathForPagination, queryForPagination, currentPage + 1)}`
      : null;

    const neighborhoodCounts = await getNeighborhoodCountMap(locations);

    res.render('properties/property-list', {
      properties: normalizedProperties,
      locations,
      neighborhoodCounts,
      locationColors,
      filters,
      query: q,
      sort,
      currentPage,
      totalPages,
      totalProperties,
      queryParams: req.query,
      title: seoTitle,
      seoTitle,
      seoDescription,
      seoH1,
      canonicalUrl,
      hreflangAlternates,
      robotsMeta,
      prevPageUrl,
      nextPageUrl,
      seoItemList: normalizedProperties
    });
  } catch (err) {
    next(err);
  }
};

exports.listPropertiesByLocationSlug = async (req, res, next) => {
  try {
    const country = resolveCountryBySlug(req.params.countrySlug);
    if (!country) return res.status(404).render('errors/404');

    let city = '';
    if (req.params.citySlug) {
      city = resolveCityBySlug(country, req.params.citySlug);
      if (!city) return res.status(404).render('errors/404');
    }

    // Mutate req.query in place (Express may expose it via getter),
    // so downstream filtering reliably receives country/city.
    if (!req.query || typeof req.query !== 'object') req.query = {};
    req.query.country = country;
    if (city) req.query.city = city;
    else delete req.query.city;

    return exports.listPropertiesPublic(req, res, next);
  } catch (err) {
    next(err);
  }
};

// Show single property detail by slug
exports.showProperty = async (req, res, next) => {
  try {
    const sql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood, p.full_address,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        p.year_built, p.map_link,
        p.occupancy_type, p.rental_status, p.rental_income, p.housegeld,
        p.features,
        p.video_url, p.floorplan_url, p.plan_photo_url,
        p.is_in_project, p.project_id,
        pr.title AS project_title, pr.title_i18n AS project_title_i18n, pr.slug AS project_slug, pr.amenities AS project_amenities, pr.amenities_i18n AS project_amenities_i18n, pr.video_url AS project_video_url, pr.photos AS project_photos,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE p.slug = $1
      LIMIT 1
    `;
    const { rows } = await query(sql, [req.params.slug]);
    if (!rows.length) return res.status(404).render('errors/404');

    const p = rows[0];
    const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
    const publicDir = path.join(__dirname, '../public');
    let hasMainVariants = false;
    let mainVariantBase = null;
    if (photos.length > 0) {
      const first = photos[0];
      const ext = path.extname(first);
      const baseUrl = first.slice(0, -ext.length);
      const baseAbs = path.join(publicDir, baseUrl.replace(/^\//, ''));
      if (
        fs.existsSync(baseAbs + '-640.jpg') ||
        fs.existsSync(baseAbs + '-640.webp') ||
        fs.existsSync(baseAbs + '-640.avif')
      ) {
        hasMainVariants = true;
        mainVariantBase = baseUrl;
      }
    }
    const lang = res.locals.lang || 'en';
    const localizedTitle = getLocalizedTitle(p, lang);
    const localizedDescription = (p.description_i18n && p.description_i18n[lang]) || p.description;
    const property = {
      ...p,
      title: localizedTitle,
      description: localizedDescription,
      photos,
      has_main_variants: hasMainVariants,
      main_variant_base: mainVariantBase,
      project: (p.is_in_project && p.project_id) ? (() => {
        const rawAmenities = Array.isArray(p.project_amenities) ? p.project_amenities : [];
        const amenitiesI18n = p.project_amenities_i18n && typeof p.project_amenities_i18n === 'object' ? p.project_amenities_i18n : null;
        let amenities = rawAmenities;
        if (rawAmenities.length > 0 && amenitiesI18n) {
          const localized = amenitiesI18n[lang] || amenitiesI18n.en;
          if (Array.isArray(localized) && localized.length === rawAmenities.length) {
            amenities = localized;
          }
        }
        return {
          id: p.project_id,
          slug: p.project_slug || null,
          title: p.project_title || null,
          amenities,
          video_url: p.project_video_url || null,
          photos: Array.isArray(p.project_photos) ? p.project_photos : (p.project_photos ? [p.project_photos] : [])
        };
      })() : null,
      agent: {
        name: p.agent_name || 'Agent',
        profile_picture: p.agent_profile_picture || null
      }
    };

    res.render('properties/property-detail', { property, baseUrl: res.locals.baseUrl });
  } catch (err) {
    next(err);
  }
};

// Increment a property's view count (property_stats)
exports.incrementView = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false });
    // Upsert-like: try update; if no row, insert
    const upd = await query(`UPDATE property_stats SET views = views + 1, last_updated = NOW() WHERE property_id = $1`, [id]);
    if (upd.rowCount === 0) {
      await query(`INSERT INTO property_stats(property_id, views, last_updated) VALUES ($1, 1, NOW()) ON CONFLICT DO NOTHING`, [id]);
    }
    await logEvent({
      eventType: 'property_view',
      entityType: 'property',
      entityId: id,
      meta: { path: req.get('referer') || req.headers?.referer || null },
      req
    });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// Similar properties API (same city/country, exclude current id)
exports.getSimilarProperties = async (req, res, next) => {
  try {
    const { country, city, exclude, limit = 3 } = req.query;
    const values = [];
    let idx = 1;
    const conds = ["p.status = 'active'"];
    if (country) { conds.push(`p.country = $${idx++}`); values.push(country); }
    if (city)    { conds.push(`p.city = $${idx++}`);    values.push(city); }
    if (exclude) { conds.push(`p.id <> $${idx++}`);    values.push(Number(exclude)); }
    const sql = `
      SELECT p.id, p.title, p.title_i18n, p.slug, p.country, p.city, p.neighborhood, p.price, p.photos
        FROM properties p
       WHERE ${conds.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${idx}
    `;
    values.push(Number(limit));
    const { rows } = await query(sql, values);
    const lang = res.locals.lang || 'en';
    const normalized = rows.map(p => ({
      ...p,
      title: getLocalizedTitle(p, lang),
      photos: Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : [])
    }));
    res.json({ success: true, properties: normalized });
  } catch (err) { next(err); }
};

// Render “New Property” form
exports.newPropertyForm = async (req, res, next) => {
  try {
    const [{ rows: projects }, { rows: teamMembers }] = await Promise.all([
      query('SELECT id, title FROM projects ORDER BY title'),
      query(`
        SELECT id, name
          FROM users
         WHERE role IN ('Admin','SuperAdmin')
           AND approved = true
         ORDER BY name
      `)
    ]);
    res.render('properties/new-property', {
      locations,
      projects,
      teamMembers,
      error: null,
      form: {},
      currentUser: req.session.user
    });
  } catch (err) {
    next(err);
  }
};

// Handle creation (agent)
exports.createProperty = async (req, res, next) => {
  try {
    // Normalize inputs
    const body = req.body || {};
    const form = { ...body };

    const required = (v) => v !== undefined && v !== null && String(v).trim() !== '';

    // Coerce numbers (supports single value or array from duplicate field names)
    const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
    const parseNumberField = (value) => {
      if (Array.isArray(value)) {
        // take the last non-empty value
        for (let i = value.length - 1; i >= 0; i -= 1) {
          const candidate = toNum(value[i]);
          if (candidate !== null && !Number.isNaN(candidate)) return candidate;
        }
        return null;
      }
      const num = toNum(value);
      return Number.isNaN(num) ? null : num;
    };

    const title        = body.title?.trim();
    const description  = body.description; // Don't trim to preserve line breaks
    const type         = body.type?.trim();
    const country      = body.country?.trim();
    const city         = body.city?.trim();
    const neighborhood = body.neighborhood?.trim() || null;
    const fullAddress   = (body.full_address && String(body.full_address).trim()) || null;
    const price        = parseNumberField(body.price);
    const yearBuilt    = parseNumberField(body.year_built);
    // New occupancy/rental fields
    const allowedOccupancy = ['Empty','Short-Term Rented','Suitable for Self Use','Long-Term Rented'];
    let occupancyType = (body.occupancy_type || '').trim();
    if (!allowedOccupancy.includes(occupancyType)) occupancyType = null;
    const allowedRentalStatus = ['not_rented','not_rented_potential','rented'];
    let rentalStatus = (body.rental_status || '').trim();
    if (!allowedRentalStatus.includes(rentalStatus)) rentalStatus = null;
    let rentalIncome = parseNumberField(body.rental_income);
    if (rentalStatus === 'not_rented') rentalIncome = null;
    let housegeld = parseNumberField(body.housegeld);
    // Assignment (agent)
    let assignedAgentId = parseNumberField(body.agent_id) || req.session.user.id;
    // Validate the chosen agent belongs to staff and is approved; fallback to current user
    try {
      const { rows: validAgent } = await query(
        `SELECT id FROM users WHERE id = $1 AND role IN ('Admin','SuperAdmin') AND approved = true`,
        [assignedAgentId]
      );
      if (!validAgent.length) assignedAgentId = req.session.user.id;
    } catch (_) {
      assignedAgentId = req.session.user.id;
    }
    let statusTags     = body['status_tags'] || body['status_tags[]'] || [];
    if (typeof statusTags === 'string') statusTags = [statusTags];
    let featuresList   = body['features'] || body['features[]'] || [];
    if (typeof featuresList === 'string') featuresList = [featuresList];

    // Coordinates (optional) and map link
    let latitude     = parseNumberField(body.latitude);
    let longitude    = parseNumberField(body.longitude);
    const mapLink    = (body.map_link && String(body.map_link).trim()) || null;
    if ((latitude === null || Number.isNaN(latitude) || longitude === null || Number.isNaN(longitude)) && mapLink) {
      const { lat, lng } = extractCoordsFromLink(mapLink);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        latitude = lat;
        longitude = lng;
      }
    }

    // Project flags
    const isInProject  = body.is_in_project === 'on' || body.is_in_project === 'true' || body.is_in_project === true;
    const projectId    = isInProject ? toNum(body.project_id) : null;

    // Type specific
    const apartmentSize = type === 'Apartment' ? parseNumberField(body.apartment_size) : null;
    const rooms      = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.rooms) : null;
    const bathrooms     = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.bathrooms) : null;
    // To be set from uploaded file later
    let floorplanUrl  = null;

    const totalSize     = (type === 'House' || type === 'Villa') ? parseNumberField(body.total_size) : null;
    const livingSpace   = (type === 'House' || type === 'Villa') ? parseNumberField(body.living_space) : null;
    const landSize      = (type === 'House' || type === 'Villa' || type === 'Land') ? parseNumberField(body.land_size) : null;
    let planPhotoUrl  = null;

    // Basic validation
    const errors = [];
    if (!required(title))        errors.push('Title is required');
    if (!required(description))  errors.push('Description is required');
    if (!['Apartment','House','Villa','Land'].includes(type || '')) errors.push('Type is required');
    if (!required(country))      errors.push('Country is required');
    if (!required(city))         errors.push('City is required');
    if (!(price > 0))            errors.push('Price must be a positive number');

    // Type-based validation
    if (type === 'Apartment') {
      if (!(apartmentSize > 0)) errors.push('Apartment size is required and must be positive');
      if (!(rooms >= 0))     errors.push('Rooms (Apartment) is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms (Apartment) is required');
    }
    if (type === 'House' || type === 'Villa') {
      if (!(totalSize > 0))     errors.push('Total lot size is required and must be positive');
      if (!(rooms >= 0))     errors.push('Rooms is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms is required');
    }
    if (type === 'Land') {
      if (!(landSize > 0))      errors.push('Land size is required and must be positive');
    }
    if (isInProject && !projectId) errors.push('Project is required when "Part of a project" is checked');

    // Build photos from uploads OR provided URLs
    const uploadedPhotosFiles = (req.files && Array.isArray(req.files.photos)) ? req.files.photos : [];
    let photos = uploadedPhotosFiles.map(f => f.url || '/uploads/properties/' + f.filename);
    // Respect client-side removals for new form (remove any deleted before submit)
    try {
      const removed = (body.remove_existing_photos || '').split(/\n+/).filter(Boolean);
      if (removed.length) {
        photos = photos.filter(p => !removed.includes(p));
      }
    } catch (_) {}
    const urlPhotos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : (body.photos ? [body.photos] : []);
    photos = [...photos, ...urlPhotos];
    if (photos.length < 1) errors.push('Please upload at least one photo');

    // Video: prefer URL, else uploaded file
    // Video: support either upload or URL depending on selected source
    let videoUrl = (body.video_source === 'link' ? (body.video_url?.trim() || null) : null);
    const uploadedVideoFile = (req.files && Array.isArray(req.files.video) && req.files.video[0]) ? req.files.video[0] : null;
    if (!uploadedVideoFile && String(body.remove_existing_video || 'false') === 'true') {
      // If explicitly removed and no replacement uploaded, ensure no video is saved
      body.video_url = '';
    }
    if (!videoUrl && uploadedVideoFile) {
      videoUrl = uploadedVideoFile.url || '/uploads/properties/' + uploadedVideoFile.filename;
    }

    // Floorplan / plan photo uploads
    if (req.files) {
      if (type === 'Apartment' && Array.isArray(req.files.floorplan) && req.files.floorplan[0]) {
        const f = req.files.floorplan[0];
        floorplanUrl = f.url || '/uploads/properties/' + f.filename;
      }
      if ((type === 'House' || type === 'Villa' || type === 'Land') && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0]) {
        const p = req.files.plan_photo[0];
        planPhotoUrl = p.url || '/uploads/properties/' + p.filename;
      }
    }

    // Define removal flags within updateProperty scope
    function parseBoolFlag(v) {
      const s = String(v ?? '').toLowerCase();
      return s === 'true' || s === 'on' || s === '1' || s === 'yes';
    }
    const removeFloorplanFlag = parseBoolFlag(body.remove_existing_floorplan);
    const removePlanPhotoFlag = parseBoolFlag(body.remove_existing_plan_photo);
    if (removeFloorplanFlag && !(req.files && Array.isArray(req.files.floorplan) && req.files.floorplan[0])) {
      floorplanUrl = null;
    }
    if (removePlanPhotoFlag && !(req.files && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0])) {
      planPhotoUrl = null;
    }

    // (handled above)

    if (errors.length) {
      const [{ rows: projects }, { rows: teamMembers }] = await Promise.all([
        query('SELECT id, title FROM projects ORDER BY title'),
        query(`
          SELECT id, name
            FROM users
           WHERE role IN ('Admin','SuperAdmin')
             AND approved = true
           ORDER BY name
        `)
      ]);
      return res.status(400).render('properties/new-property', {
        locations,
        projects,
        teamMembers,
        error: errors.join('. '),
        form,
        currentUser: req.session.user
      });
    }

    // Disallow duplicate title/slug on create
    let baseSlug = slugify(title, { lower: true, strict: true });
    try {
      const { rows: existingSame } = await query('SELECT 1 FROM properties WHERE slug = $1 LIMIT 1', [baseSlug]);
      if (existingSame.length) {
        const [{ rows: projects }, { rows: teamMembers }] = await Promise.all([
          query('SELECT id, title FROM projects ORDER BY title'),
          query(`
            SELECT id, name
              FROM users
             WHERE role IN ('Admin','SuperAdmin')
               AND approved = true
             ORDER BY name
          `)
        ]);
        return res.status(400).render('properties/new-property', {
          locations,
          projects,
          teamMembers,
          error: 'A property with this title already exists. Please choose a different title.',
          form,
          currentUser: req.session.user
        });
      }
    } catch (_) { /* continue to fallback slug generation */ }
    // Generate unique slug fallback (should not normally run now, but keep safety)
    let uniqueSlug = baseSlug;
    let i = 1;
    // try up to 50 variations
    while (true) {
      const { rows } = await query('SELECT 1 FROM properties WHERE slug = $1', [uniqueSlug]);
      if (rows.length === 0) break;
      i += 1;
      uniqueSlug = `${baseSlug}-${i}`;
      if (i > 50) {
        uniqueSlug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    const agentId = assignedAgentId;

    const insertRes = await query(
      `INSERT INTO properties (
         country, city, neighborhood, full_address, title, slug, description,
         type, price, status_tags, photos, video_url,
         floorplan_url, agent_id, created_by,
         apartment_size, rooms, bathrooms,
         total_size, living_space, land_size, plan_photo_url,
         is_in_project, project_id,
         map_link,
         year_built,
         features,
         occupancy_type, rental_status, rental_income, housegeld,
         created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,
         $19,$20,$21,$22,
         $23,$24,
         $25,
         $26,
         $27,
         $28,$29,$30,$31,
         NOW()
       ) RETURNING id`,
      [
        country, city, neighborhood, fullAddress, title, uniqueSlug, description,
        type, price, statusTags, photos, videoUrl,
        floorplanUrl, agentId, req.session.user.id,
        apartmentSize, rooms, bathrooms,
        totalSize, livingSpace, landSize, planPhotoUrl,
        isInProject, projectId,
        mapLink,
        yearBuilt,
        JSON.stringify(featuresList || []),
        occupancyType, rentalStatus, rentalIncome, housegeld
      ]
    );
    const newId = insertRes.rows[0].id;

    // Log activity
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.log({
        actionType: 'property_created',
        entityType: 'property',
        entityId: newId,
        entityTitle: title,
        userId: req.session.user.id,
        userName: req.session.user.name || req.session.user.email
      });
    } catch (logErr) {
      console.error('Failed to log property creation:', logErr);
    }

    // Auto-translate and persist i18n JSON
    try {
      console.log(`[createProperty] Starting translation process for new property ${newId}`);
      console.log(`[createProperty] Title: "${title}"`);
      console.log(`[createProperty] Description: "${description?.substring(0, 50)}..."`);
      console.log(`[createProperty] Content language: "${body.content_language || 'auto'}"`);
      
      // Determine source language: use user selection or auto-detect
      let sourceLang;
      if (body.content_language && body.content_language !== 'auto') {
        sourceLang = body.content_language;
        console.log(`[createProperty] Using user-selected language: ${sourceLang}`);
      } else {
        sourceLang = detectLanguageFromFields({ title, description });
        console.log(`[createProperty] Auto-detected language: ${sourceLang}`);
      }
      
      // Use enhanced translation helper for new properties
      const fields = { title: title || '', description: description || '' };
      const existingI18n = {}; // Empty for new properties
      const completeI18n = await ensureCompleteTranslations(fields, existingI18n);
      
      console.log(`[createProperty] Complete i18n result:`, completeI18n);
      
      await query(
        `UPDATE properties SET title_i18n = $1, description_i18n = $2 WHERE id = $3`,
        [completeI18n.title_i18n, completeI18n.description_i18n, newId]
      );
      
      console.log(`[createProperty] Translation update completed successfully`);
    } catch (error) { 
      console.log(`[createProperty] Translation error:`, error.message);
      console.log(`[createProperty] Translation error stack:`, error.stack);
    }

    // Move uploaded files into a property-specific folder and update paths
    if (!process.env.DO_SPACES_BUCKET) {
      try {
      const propDir = path.join(__dirname, '../public/uploads/properties', String(newId));
      if (!fs.existsSync(propDir)) {
        fs.mkdirSync(propDir, { recursive: true });
      }

      // Photos with responsive variants
      if (uploadedPhotosFiles.length) {
        const movedPhotos = [];
        for (let i = 0; i < uploadedPhotosFiles.length; i++) {
          const f = uploadedPhotosFiles[i];
          const src = f.path; // absolute temp path
          
          // Generate SEO-friendly filename
          const seoFileName = generateSEOFileName(
            { type, title, neighborhood, city, country },
            'property',
            i + 1,
            path.extname(f.filename)
          );
          
          const dest = path.join(propDir, seoFileName);
          try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
          // Generate variants
          try {
            const publicUrlBase = `/uploads/properties/${newId}`;
            await generateVariants(dest, publicUrlBase);
          } catch (e) {
            // Non-fatal
          }
          movedPhotos.push(`/uploads/properties/${newId}/${seoFileName}`);
        }
        photos = [...movedPhotos, ...urlPhotos];
      }

      // Video file
      if (uploadedVideoFile) {
        const src = uploadedVideoFile.path;
        
        // Generate SEO-friendly filename for video
        const seoVideoFileName = generateSEOFileName(
          { type, title, neighborhood, city, country },
          'property',
          1,
          path.extname(uploadedVideoFile.filename),
          'video'
        );
        
        const dest = path.join(propDir, seoVideoFileName);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        videoUrl = `/uploads/properties/${newId}/${seoVideoFileName}`;
      }

      // Floorplan
      if (type === 'Apartment' && req.files && Array.isArray(req.files.floorplan) && req.files.floorplan[0]) {
        const f = req.files.floorplan[0];
        const src = f.path;
        const dest = path.join(propDir, f.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        floorplanUrl = `/uploads/properties/${newId}/${f.filename}`;
      }

      // Plan photo
      if ((type === 'House' || type === 'Villa' || type === 'Land') && req.files && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0]) {
        const p = req.files.plan_photo[0];
        const src = p.path;
        const dest = path.join(propDir, p.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        planPhotoUrl = `/uploads/properties/${newId}/${p.filename}`;
      }

        // Persist updated paths
        await query(
          `UPDATE properties
              SET photos = $1,
                  video_url = $2,
                  floorplan_url = $3,
                  plan_photo_url = $4,
                  updated_at = NOW()
            WHERE id = $5`,
          [photos, videoUrl, floorplanUrl, planPhotoUrl, newId]
        );
      } catch (fileErr) {
        // Non-fatal: log and continue
        console.error('File move error:', fileErr);
      }
    } else {
      // Using Spaces: if uploads were done without id prefix, copy them under properties/<id>/...
      try {
        const bucket = process.env.DO_SPACES_BUCKET;
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
        const processed = req.files || {};

        const copyOne = async (oldKey, newKey) => new Promise((resolve, reject) => {
          s3.copyObject({ Bucket: bucket, CopySource: `/${bucket}/${oldKey}`, Key: newKey, ACL: 'public-read' }, (err) => {
            if (err) return reject(err);
            s3.deleteObject({ Bucket: bucket, Key: oldKey }, () => resolve(`${cdnBase}/${newKey}`));
          });
        });

        const ensurePrefixedList = async (items, targetPrefix, fileType = 'property', fileNumber = 1) => {
          if (!Array.isArray(items) || items.length === 0) return [];
          const out = [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const key = it.key || '';
            const already = key.startsWith(`${targetPrefix}/`);
            if (already) { out.push(it.url); continue; }
            
            // Generate SEO-friendly filename
            const seoFileName = generateSEOFileName(
              { type, title, neighborhood, city, country },
              fileType,
              fileNumber + i,
              path.extname(key || it.filename || '')
            );
            
            const newKey = `${targetPrefix}/${seoFileName}`;
            const url = await copyOne(key, newKey);
            out.push(url);
          }
          return out;
        };

        const basePrefix = `properties/${uniqueSlug || newId}`;
        // photos
        photos = await ensurePrefixedList(processed.photos || [], `${basePrefix}/photos`, 'property', 1);
        // video
        if (processed.video && processed.video[0]) {
          const v = processed.video[0];
          const key = v.key || '';
          
          // Generate SEO-friendly filename for video
          const seoVideoFileName = generateSEOFileName(
            { type, title, neighborhood, city, country },
            'property',
            1,
            path.extname(key || v.filename || ''),
            'video'
          );
          
          const newKey = key.startsWith(`${basePrefix}/videos/`) ? key : `${basePrefix}/videos/${seoVideoFileName}`;
          videoUrl = key === newKey ? v.url : await copyOne(key, newKey);
        }
        // floorplan
        if (processed.floorplan && processed.floorplan[0]) {
          const f = processed.floorplan[0];
          const key = f.key || '';
          const newKey = key.startsWith(`${basePrefix}/floorplan/`) ? key : `${basePrefix}/floorplan/${path.basename(key || f.filename || '')}`;
          floorplanUrl = key === newKey ? f.url : await copyOne(key, newKey);
        }
        // plan photo
        if (processed.plan_photo && processed.plan_photo[0]) {
          const p = processed.plan_photo[0];
          const key = p.key || '';
          const newKey = key.startsWith(`${basePrefix}/plan/`) ? key : `${basePrefix}/plan/${path.basename(key || p.filename || '')}`;
          planPhotoUrl = key === newKey ? p.url : await copyOne(key, newKey);
        }

        await query(
          `UPDATE properties
              SET photos = $1,
                  video_url = $2,
                  floorplan_url = $3,
                  plan_photo_url = $4,
                  updated_at = NOW()
            WHERE id = $5`,
          [photos, videoUrl, floorplanUrl, planPhotoUrl, newId]
        );
      } catch (_) {
        // Fallback: persist whatever URLs we had
        await query(
          `UPDATE properties
              SET photos = $1,
                  video_url = $2,
                  floorplan_url = $3,
                  plan_photo_url = $4,
                  updated_at = NOW()
            WHERE id = $5`,
          [photos, videoUrl, floorplanUrl, planPhotoUrl, newId]
        );
      }
    }

    const role = req.session.user.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/properties');
    }
    return res.redirect('/admin/dashboard/my-properties');
  } catch (err) {
    next(err);
  }
};

// Render “Edit Property” form (agent)
exports.editPropertyForm = async (req, res, next) => {
  try {
    const propId = parseInt(req.params.id, 10);
    const { rows } = await query(`SELECT * FROM properties WHERE id = $1`, [propId]);
    if (!rows.length) return res.status(404).render('errors/404');
    const property = rows[0];

    // Authorization: SuperAdmin can edit any. Admin only if assigned to them.
    const user = req.session.user;
    const isSuper = user?.role === 'SuperAdmin';
    const isOwner = user?.id === property.agent_id;
    if (!isSuper && !isOwner) {
      return res.status(403).send('Forbidden – Not assigned to you');
    }

    // Ensure photos are usable for previews
    if (!process.env.DO_SPACES_BUCKET) {
      try {
        const arr = Array.isArray(property.photos) ? property.photos.filter(Boolean) : (property.photos ? [property.photos] : []);
        const publicDir = path.join(__dirname, '../public');
        const cleaned = [];
        for (const ph of arr) {
          const url = String(ph);
          const abs = url.startsWith('/uploads/')
            ? path.join(publicDir, url.replace(/^\//, ''))
            : path.join(publicDir, 'uploads/properties', String(property.id), url);
          if (fs.existsSync(abs)) {
            cleaned.push(url.startsWith('/uploads/') ? url : `/uploads/properties/${property.id}/${url}`);
          }
        }
        property.photos = cleaned;
      } catch (_) {
        property.photos = Array.isArray(property.photos) ? property.photos.filter(Boolean) : [];
      }
    } else {
      // With Spaces, ensure absolute HTTPS URLs for existing DB values
      try {
        const toAbs = (u) => {
          const s = String(u || '').trim();
          if (!s) return s;
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s;
          return `https://${s}`;
        };
        property.photos = (Array.isArray(property.photos) ? property.photos : [property.photos])
          .filter(Boolean)
          .map(toAbs);
      } catch (_) { property.photos = []; }
    }

    // Fetch options needed by the form
    const [{ rows: projects }, { rows: teamMembers }] = await Promise.all([
      query('SELECT id, title FROM projects ORDER BY title'),
      query(`
        SELECT id, name
          FROM users
         WHERE role IN ('Admin','SuperAdmin') AND approved = true
         ORDER BY name
      `)
    ]);

    // Detect source language from title and description to pre-fill content_language dropdown
    // First check if i18n exists and find which language matches the current title/description
    let detectedLang = 'auto';
    let titleI18n = property.title_i18n;
    
    // Parse JSONB if it's a string (shouldn't happen with pg, but be safe)
    if (titleI18n && typeof titleI18n === 'string') {
      try {
        titleI18n = JSON.parse(titleI18n);
      } catch (_) {
        titleI18n = null;
      }
    }
    
    if (titleI18n && typeof titleI18n === 'object') {
      // Check which language in i18n matches the current title
      const currentTitle = String(property.title || '').trim();
      const currentDesc = String(property.description || '').trim();
      
      // Try to match exact content in i18n
      for (const [lang, i18nTitle] of Object.entries(titleI18n)) {
        if (String(i18nTitle).trim() === currentTitle) {
          detectedLang = lang;
          break;
        }
      }
      
      // If no exact match found, detect from text content
      if (detectedLang === 'auto' && (currentTitle || currentDesc)) {
        detectedLang = detectLanguageFromFields({
          title: currentTitle,
          description: currentDesc
        });
      }
    } else if (property.title || property.description) {
      // No i18n exists yet, detect from current content
      detectedLang = detectLanguageFromFields({
        title: property.title || '',
        description: property.description || ''
      });
    }
    
    // Fallback to English if detection failed or is still 'auto'
    if (!detectedLang || detectedLang === 'auto') {
      detectedLang = 'en';
    }
    
    // Add detected language to property object for template
    property.content_language = detectedLang;
    
    // Capture the return URL from query parameter (preferred) or referrer (fallback)
    let backUrl = req.query.return_to || req.get('referer') || '';
    
    // Extract just the path + query if it's a full URL
    if (backUrl.includes('://')) {
      try {
        const url = new URL(backUrl);
        backUrl = url.pathname + url.search;
      } catch (_) {
        backUrl = '';
      }
    }
    
    res.render('properties/edit-property', {
      property,
      locations,
      projects,
      teamMembers,
      currentUser: req.session.user,
      backUrl,
      error: null
    });
  } catch (err) {
    next(err);
  }
};

// Handle update (agent)
exports.updateProperty = async (req, res, next) => {
  try {
    const propId = parseInt(req.params.id, 10);
    const { rows } = await query(`SELECT * FROM properties WHERE id = $1`, [propId]);
    if (!rows.length) return res.status(404).render('errors/404');
    const existing = rows[0];

    // Authorization
    const user = req.session.user;
    const isSuper = user?.role === 'SuperAdmin';
    const isOwner = user?.id === existing.agent_id;
    if (!isSuper && !isOwner) {
      return res.status(403).send('Forbidden – Not assigned to you');
    }

    const body = req.body || {};
    const required = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
    const parseNumberField = (value) => {
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i -= 1) {
          const candidate = toNum(value[i]);
          if (candidate !== null && !Number.isNaN(candidate)) return candidate;
        }
        return null;
      }
      const num = toNum(value);
      return Number.isNaN(num) ? null : num;
    };

    const title        = body.title?.trim() || existing.title;
    const description  = body.description || existing.description; // Don't trim to preserve line breaks
    const type         = body.type?.trim() || existing.type;
    const country      = body.country?.trim() || existing.country;
    const city         = body.city?.trim() || existing.city;
    const neighborhood = (body.neighborhood?.trim() || '') || null;
    const fullAddress   = (body.full_address !== undefined) ? (String(body.full_address || '').trim() || null) : existing.full_address;
    const price        = parseNumberField(body.price) ?? existing.price;
    const yearBuilt    = parseNumberField(body.year_built) ?? existing.year_built;
    // New occupancy/rental fields (update)
    const allowedOccupancy = ['Empty','Short-Term Rented','Suitable for Self Use','Long-Term Rented'];
    let occupancyType = (body.occupancy_type || '').trim();
    if (!allowedOccupancy.includes(occupancyType)) occupancyType = existing.occupancy_type || null;
    const allowedRentalStatus = ['not_rented','not_rented_potential','rented'];
    let rentalStatus = (body.rental_status || '').trim();
    if (!allowedRentalStatus.includes(rentalStatus)) rentalStatus = existing.rental_status || null;
    let rentalIncome = parseNumberField(body.rental_income);
    if (rentalStatus === 'not_rented') rentalIncome = null;
    if (rentalIncome === null || Number.isNaN(rentalIncome)) rentalIncome = existing.rental_income;
    let housegeld = parseNumberField(body.housegeld);
    if (housegeld === null || Number.isNaN(housegeld)) housegeld = existing.housegeld;
    const soldChecked  = body.sold === 'on' || body.sold === 'true' || body.sold === true;
    let soldAt         = body.sold_at ? new Date(body.sold_at) : null;
    if (soldChecked && (!soldAt || isNaN(soldAt.getTime()))) {
      soldAt = new Date();
    }
    if (!soldChecked) {
      soldAt = null; // ensure unmarking clears the timestamp
    }
    let statusTags     = body['status_tags'] || body['status_tags[]'] || existing.status_tags || [];
    if (typeof statusTags === 'string') statusTags = [statusTags];
    let featuresList   = body['features'] || body['features[]'] || existing.features || [];
    if (typeof featuresList === 'string') featuresList = [featuresList];

    // Reassignment (optional)
    let agentId = parseNumberField(body.agent_id);
    if (!agentId) agentId = existing.agent_id;

    // Project flags
    const isInProject  = body.is_in_project === 'on' || body.is_in_project === 'true' || body.is_in_project === true;
    const projectId    = isInProject ? parseNumberField(body.project_id) : null;

    // Type specific
    const apartmentSize = type === 'Apartment' ? parseNumberField(body.apartment_size) : null;
    const rooms      = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.rooms) : null;
    const bathrooms     = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.bathrooms) : null;
    let floorplanUrl    = existing.floorplan_url;

    const totalSize     = (type === 'House' || type === 'Villa') ? parseNumberField(body.total_size) : null;
    const livingSpace   = (type === 'House' || type === 'Villa') ? parseNumberField(body.living_space) : null;
    const landSize      = (type === 'House' || type === 'Villa' || type === 'Land') ? parseNumberField(body.land_size) : null;
    let planPhotoUrl    = existing.plan_photo_url;

    // Coordinates (optional) + map link parsing
    let latitude     = body.latitude !== undefined ? parseNumberField(body.latitude) : existing.latitude;
    let longitude    = body.longitude !== undefined ? parseNumberField(body.longitude) : existing.longitude;
    const mapLinkRaw = (body.map_link !== undefined) ? (String(body.map_link).trim() || null) : existing.map_link;
    if ((body.latitude === undefined || body.longitude === undefined) && mapLinkRaw) {
      const { lat, lng } = extractCoordsFromLink(mapLinkRaw);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        latitude = lat;
        longitude = lng;
      }
    }

    // Uploaded files
    const uploadedPhotosFiles = (req.files && Array.isArray(req.files.photos)) ? req.files.photos : [];
    let photos = Array.isArray(existing.photos) ? [...existing.photos] : [];
    // Only replace with URL photos if NO files are being uploaded (URL-only edit scenario)
    // If files are being uploaded, preserve existing photos and merge with uploads later
    if (!uploadedPhotosFiles || uploadedPhotosFiles.length === 0) {
      const urlPhotos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : (body.photos ? [body.photos] : []).filter(Boolean);
      if (urlPhotos.length) photos = urlPhotos;
    }
    // Custom order tokens from client combining existing URLs and new file indices
    let orderTokens = body['photos_order'] || body['photos_order[]'] || [];
    if (typeof orderTokens === 'string') orderTokens = [orderTokens];

    const uploadedVideoFile = (req.files && Array.isArray(req.files.video) && req.files.video[0]) ? req.files.video[0] : null;
    const parseBool = (v) => {
      const s = String(v ?? '').toLowerCase();
      return s === 'true' || s === 'on' || s === '1' || s === 'yes';
    };
    const removeExistingVideoFlag = parseBool(body.remove_existing_video);
    
    // Determine video URL based on priority:
    // 1. New uploaded video file (highest priority)
    // 2. New video link URL
    // 3. Explicit removal flag
    // 4. Empty link (explicitly clearing video)
    // 5. Keep existing (default)
    let videoUrl = existing.video_url;
    if (uploadedVideoFile) {
      // New video file uploaded - use it
      videoUrl = uploadedVideoFile.url || '/uploads/properties/' + uploadedVideoFile.filename;
    } else if (body.video_source === 'link') {
      // Video source is link - check if URL provided
      const linkUrl = body.video_url?.trim() || null;
      if (linkUrl) {
        // New URL provided - use it
        videoUrl = linkUrl;
      } else if (removeExistingVideoFlag || body.video_url === '') {
        // Explicitly cleared (empty string) or removal flag set
        videoUrl = null;
      }
      // If linkUrl is null but not explicitly cleared and no removal flag, keep existing (handled by default above)
    } else if (removeExistingVideoFlag) {
      // Removal flag set and no new video provided
      videoUrl = null;
    }

    // Apply removals for existing media when editing
    const removedPhotosList = (body.remove_existing_photos || '').split(/[\n,]+/).map(s => s && s.trim()).filter(Boolean);
    const isSameUrl = (a, b) => {
      if (a === b) return true;
      try { if (decodeURIComponent(a) === b) return true; } catch (_) {}
      try { if (a === decodeURIComponent(b)) return true; } catch (_) {}
      try { if (decodeURIComponent(a) === decodeURIComponent(b)) return true; } catch (_) {}
      return false;
    };
    try {
      if (removedPhotosList.length) {
        photos = (photos || []).filter(p => !removedPhotosList.some(r => isSameUrl(p, r)));
      }
    } catch (_) {}
    const removeFloorplanFlag = parseBool(body.remove_existing_floorplan);
    const removePlanPhotoFlag = parseBool(body.remove_existing_plan_photo);

    if (req.files) {
      if (type === 'Apartment' && Array.isArray(req.files.floorplan) && req.files.floorplan[0]) {
        const f = req.files.floorplan[0];
        floorplanUrl = f.url || '/uploads/properties/' + f.filename;
      }
      if ((type === 'House' || type === 'Villa' || type === 'Land') && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0]) {
        const p = req.files.plan_photo[0];
        planPhotoUrl = p.url || '/uploads/properties/' + p.filename;
      }
    }

    // Basic validation
    const errors = [];
    if (!required(title))        errors.push('Title is required');
    if (!required(description))  errors.push('Description is required');
    if (!['Apartment','House','Villa','Land'].includes(type || '')) errors.push('Type is required');
    if (!required(country))      errors.push('Country is required');
    if (!required(city))         errors.push('City is required');
    if (!(price > 0))            errors.push('Price must be a positive number');
    if (type === 'Apartment') {
      if (!(apartmentSize > 0)) errors.push('Apartment size is required and must be positive');
      if (!(rooms >= 0))     errors.push('Rooms (Apartment) is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms (Apartment) is required');
    }
    if (type === 'House' || type === 'Villa') {
      if (!(totalSize > 0))     errors.push('Total lot size is required and must be positive');
      if (!(rooms >= 0))     errors.push('Rooms is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms is required');
    }
    if (type === 'Land') {
      if (!(landSize > 0))      errors.push('Land size is required and must be positive');
    }

    if (errors.length) {
      const [{ rows: projects }, { rows: teamMembers }] = await Promise.all([
        query('SELECT id, title FROM projects ORDER BY title'),
        query(`SELECT id, name FROM users WHERE role IN ('Admin','SuperAdmin') AND approved = true ORDER BY name`)
      ]);
      return res.status(400).render('properties/edit-property', {
        property: existing,
        locations,
        projects,
        teamMembers,
        currentUser: req.session.user,
        error: errors.join('. ')
      });
    }

    // If reordering only (no uploads yet), apply order of existing URLs now
    // But first, we need to apply removals to ensure removed photos are excluded from order
    // Note: removedPhotosList is defined below, but we need it here for order processing
    const removedPhotosListForOrder = (body.remove_existing_photos || '').split(/[\n,]+/).map(s => s && s.trim()).filter(Boolean);
    const isSameUrlForOrder = (a, b) => {
      if (a === b) return true;
      try { if (decodeURIComponent(a) === b) return true; } catch (_) {}
      try { if (a === decodeURIComponent(b)) return true; } catch (_) {}
      try { if (decodeURIComponent(a) === decodeURIComponent(b)) return true; } catch (_) {}
      return false;
    };
    if ((!uploadedPhotosFiles || uploadedPhotosFiles.length === 0) && Array.isArray(orderTokens) && orderTokens.length) {
      const ordered = [];
      const used = new Set();
      for (const t of orderTokens) {
        if (!t || typeof t !== 'string') continue;
        if (t.startsWith('url:')) {
          const u = t.slice(4);
          // Only include if not in removed list
          if (u && !removedPhotosListForOrder.some(r => isSameUrlForOrder(u, r))) {
            ordered.push(u);
            used.add(u);
          }
        }
      }
      // append any remaining existing photos not referenced (and not removed)
      for (const p of photos || []) {
        if (!used.has(p) && !removedPhotosListForOrder.some(r => isSameUrlForOrder(p, r))) {
          ordered.push(p);
        }
      }
      photos = ordered;
    }

    // Merge uploaded files with existing photos BEFORE normalizing (for Spaces/CDN, URLs are already in uploadedPhotosFiles)
    if (process.env.DO_SPACES_BUCKET && uploadedPhotosFiles && uploadedPhotosFiles.length) {
      const newPhotoUrls = uploadedPhotosFiles.map(f => f.url || '/uploads/properties/' + f.filename).filter(Boolean);
      photos = [...(photos || []), ...newPhotoUrls];
    }
    
    // Normalize photos; preserve remote and absolute URLs. Skip strict existence checks on Spaces/CDN.
    try {
      const list = (photos || []).filter(p => p && String(p).trim());
      if (process.env.DO_SPACES_BUCKET) {
        photos = list;
      } else {
        const publicDir = path.join(__dirname, '../public');
        const normalizedExisting = [];
        for (const p of list) {
          const url = String(p);
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/')) {
            normalizedExisting.push(url);
            continue;
          }
          // Treat bare filenames as local files under uploads/properties/:id
          const abs = path.join(publicDir, 'uploads/properties', String(propId), url);
          if (fs.existsSync(abs)) {
            normalizedExisting.push(`/uploads/properties/${propId}/${url}`);
          }
        }
        photos = normalizedExisting;
      }
    } catch (_) {
      photos = (photos || []).filter(p => p && String(p).trim());
    }

    // Ensure unique slug (exclude current property id)
    let baseSlugUpd = slugify(title, { lower: true, strict: true });
    if (!baseSlugUpd) baseSlugUpd = existing.slug || `property-${propId}`;
    let newSlug = baseSlugUpd;
    try {
      let attempt = 1;
      // If the base is the same as existing, keep unless collision elsewhere
      // Loop until slug is unique among other records
      // Hard stop after 50 attempts
      while (true) {
        const { rows: taken } = await query(
          'SELECT id FROM properties WHERE slug = $1 AND id <> $2 LIMIT 1',
          [newSlug, propId]
        );
        if (!taken.length) break;
        attempt += 1;
        newSlug = `${baseSlugUpd}-${attempt}`;
        if (attempt > 50) { newSlug = `${baseSlugUpd}-${Date.now()}`; break; }
      }
    } catch (_) { /* fallback to computed newSlug */ }

    // Update - if files are being uploaded, photos/video_url will be updated separately after file processing
    const hasFileUploads = (uploadedPhotosFiles && uploadedPhotosFiles.length > 0) || uploadedVideoFile;
    if (hasFileUploads) {
      // Update everything except photos/video_url (those are handled after file processing)
      await query(
        `UPDATE properties SET
           country=$1, city=$2, neighborhood=$3, full_address=$4,
           title=$5, slug=$6, description=$7,
           type=$8, price=$9, status_tags=$10,
           apartment_size=$11, rooms=$12, bathrooms=$13, floorplan_url=$14,
           total_size=$15, living_space=$16,
           land_size=$17, plan_photo_url=$18,
           is_in_project=$19, project_id=$20,
           agent_id=$21,
           map_link=$22,
           features=$23::jsonb,
           year_built=$24,
           sold=$25,
           sold_at=$26,
           occupancy_type=$27, rental_status=$28, rental_income=$29, housegeld=$30,
           updated_at=NOW()
         WHERE id=$31`,
        [
          country, city, neighborhood, fullAddress,
          title, newSlug, description,
          type, price, statusTags,
          apartmentSize, rooms, bathrooms, floorplanUrl,
          totalSize, livingSpace,
          landSize, planPhotoUrl,
          isInProject, projectId,
          agentId,
          mapLinkRaw,
          JSON.stringify(featuresList || []),
          yearBuilt,
          soldChecked,
          soldAt ? soldAt.toISOString() : null,
          occupancyType, rentalStatus, rentalIncome, housegeld,
          propId
        ]
      );

      // Log activity
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.log({
          actionType: 'property_updated',
          entityType: 'property',
          entityId: propId,
          entityTitle: title || existing.title,
          userId: req.session.user.id,
          userName: req.session.user.name || req.session.user.email
        });
      } catch (logErr) {
        console.error('Failed to log property update:', logErr);
      }
    } else {
      // No file uploads, update photos/video_url normally
      await query(
        `UPDATE properties SET
           country=$1, city=$2, neighborhood=$3, full_address=$4,
           title=$5, slug=$6, description=$7,
           type=$8, price=$9, status_tags=$10,
           photos=$11, video_url=$12,
           apartment_size=$13, rooms=$14, bathrooms=$15, floorplan_url=$16,
           total_size=$17, living_space=$18,
           land_size=$19, plan_photo_url=$20,
           is_in_project=$21, project_id=$22,
           agent_id=$23,
           map_link=$24,
           features=$25::jsonb,
           year_built=$26,
           sold=$27,
           sold_at=$28,
           occupancy_type=$29, rental_status=$30, rental_income=$31, housegeld=$32,
           updated_at=NOW()
         WHERE id=$33`,
        [
          country, city, neighborhood, fullAddress,
          title, newSlug, description,
          type, price, statusTags,
          photos, videoUrl,
          apartmentSize, rooms, bathrooms, floorplanUrl,
          totalSize, livingSpace,
          landSize, planPhotoUrl,
          isInProject, projectId,
          agentId,
          mapLinkRaw,
          JSON.stringify(featuresList || []),
          yearBuilt,
          soldChecked,
          soldAt ? soldAt.toISOString() : null,
          occupancyType, rentalStatus, rentalIncome, housegeld,
          propId
        ]
      );

      // Log activity
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.log({
          actionType: 'property_updated',
          entityType: 'property',
          entityId: propId,
          entityTitle: title || existing.title,
          userId: req.session.user.id,
          userName: req.session.user.name || req.session.user.email
        });
      } catch (logErr) {
        console.error('Failed to log property update:', logErr);
      }
    }

    // Enhanced auto-translation for existing properties
    // This will detect missing translations and generate them automatically
    try {
      console.log(`[updateProperty] Starting translation process for property ${propId}`);
      const { rows: latestRows } = await query(`SELECT title_i18n, description_i18n FROM properties WHERE id = $1`, [propId]);
      const existingI18n = latestRows[0] || {};
      const currentTitle = title || existing.title || '';
      const currentDescription = description || existing.description || '';
      
      console.log(`[updateProperty] Current title: "${currentTitle}"`);
      console.log(`[updateProperty] Current description: "${currentDescription.substring(0, 50)}..."`);
      console.log(`[updateProperty] Content language: "${body.content_language || 'auto'}"`);
      console.log(`[updateProperty] Existing i18n:`, existingI18n);
      
      // Determine source language: use user selection or auto-detect
      let sourceLang;
      if (body.content_language && body.content_language !== 'auto') {
        sourceLang = body.content_language;
        console.log(`[updateProperty] Using user-selected language: ${sourceLang}`);
      } else {
        sourceLang = detectLanguageFromFields({ title: currentTitle, description: currentDescription });
        console.log(`[updateProperty] Auto-detected language: ${sourceLang}`);
      }
      
      // Use enhanced translation helper to ensure all translations exist
      const fields = { title: currentTitle, description: currentDescription };
      const completeI18n = await ensureCompleteTranslations(fields, existingI18n);
      
      console.log(`[updateProperty] Complete i18n result:`, completeI18n);
      
      await query(
        `UPDATE properties SET title_i18n = $1, description_i18n = $2, updated_at = NOW() WHERE id = $3`,
        [completeI18n.title_i18n, completeI18n.description_i18n, propId]
      );
      
      console.log(`[updateProperty] Translation update completed successfully`);
    } catch (error) { 
      console.log(`[updateProperty] Translation error:`, error.message);
      console.log(`[updateProperty] Translation error stack:`, error.stack);
    }

    // Ensure floorplan/plan removals are persisted even when there are no new uploads
    try {
      if (removeFloorplanFlag || removePlanPhotoFlag) {
        await query(
          `UPDATE properties
              SET floorplan_url = CASE WHEN $1 THEN NULL ELSE floorplan_url END,
                  plan_photo_url = CASE WHEN $2 THEN NULL ELSE plan_photo_url END,
                  updated_at = NOW()
            WHERE id = $3`,
          [removeFloorplanFlag, removePlanPhotoFlag, propId]
        );
      }
    } catch (_) { /* best-effort */ }

    // Final safeguard: ensure DB reflects removals even if earlier branches skipped
    try {
      if (removeFloorplanFlag || removePlanPhotoFlag) {
        await query(
          `UPDATE properties
              SET floorplan_url = CASE WHEN $1 THEN NULL ELSE floorplan_url END,
                  plan_photo_url = CASE WHEN $2 THEN NULL ELSE plan_photo_url END,
                  updated_at = NOW()
            WHERE id = $3`,
          [removeFloorplanFlag, removePlanPhotoFlag, propId]
        );
      }
    } catch (_) { /* best-effort */ }

    // If there are new uploads, move them into the property folder and generate variants, then persist final URLs (local disk only)
    if (!process.env.DO_SPACES_BUCKET) {
      try {
      const propDir = path.join(__dirname, '../public/uploads/properties', String(propId));
      if (!fs.existsSync(propDir)) {
        fs.mkdirSync(propDir, { recursive: true });
      }

      // Photos with responsive variants
      if (uploadedPhotosFiles && uploadedPhotosFiles.length) {
        const movedPhotos = [];
        for (let i = 0; i < uploadedPhotosFiles.length; i++) {
          const f = uploadedPhotosFiles[i];
          const src = f.path; // absolute temp path
          
          // Generate SEO-friendly filename
          const seoFileName = generateSEOFileName(
            { type, title, neighborhood, city, country },
            'property',
            i + 1,
            path.extname(f.filename)
          );
          
          const dest = path.join(propDir, seoFileName);
          try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
          try {
            const publicUrlBase = `/uploads/properties/${propId}`;
            await generateVariants(dest, publicUrlBase);
          } catch (e) { /* non-fatal */ }
          movedPhotos.push(`/uploads/properties/${propId}/${seoFileName}`);
        }
        // Append new moved photos to any existing kept photos
        photos = [...(photos || []), ...movedPhotos];
      }

      // Video file
      if (uploadedVideoFile) {
        const src = uploadedVideoFile.path;
        
        // Generate SEO-friendly filename for video
        const seoVideoFileName = generateSEOFileName(
          { type, title, neighborhood, city, country },
          'property',
          1,
          path.extname(uploadedVideoFile.filename),
          'video'
        );
        
        const dest = path.join(propDir, seoVideoFileName);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        videoUrl = `/uploads/properties/${propId}/${seoVideoFileName}`;
      }

      // Floorplan
      if (type === 'Apartment' && req.files && Array.isArray(req.files.floorplan) && req.files.floorplan[0]) {
        const f = req.files.floorplan[0];
        const src = f.path;
        const dest = path.join(propDir, f.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        floorplanUrl = `/uploads/properties/${propId}/${f.filename}`;
      }

      // Plan photo
      if ((type === 'House' || type === 'Villa' || type === 'Land') && req.files && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0]) {
        const p = req.files.plan_photo[0];
        const src = p.path;
        const dest = path.join(propDir, p.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        planPhotoUrl = `/uploads/properties/${propId}/${p.filename}`;
      }

      // Persist updated media paths if anything changed (including photo removals and video changes)
        if ((uploadedPhotosFiles && uploadedPhotosFiles.length) || uploadedVideoFile || removeExistingVideoFlag || removeFloorplanFlag || removePlanPhotoFlag || (req.files && (req.files.floorplan || req.files.plan_photo)) || (removedPhotosList && removedPhotosList.length > 0) || videoUrl !== existing.video_url) {
          await query(
            `UPDATE properties
                SET photos = $1,
                    video_url = $2,
                    floorplan_url = $3,
                    plan_photo_url = $4,
                    updated_at = NOW()
              WHERE id = $5`,
            [photos, videoUrl, floorplanUrl, planPhotoUrl, propId]
          );
        }
      } catch (fileErr) {
        // Non-fatal: log and continue
        console.error('File move/update error:', fileErr);
      }
    } else {
      // Using Spaces: URLs already computed by upload middleware
      // Note: photos array already has removals applied (line 1308) and new uploads merged (line 1367)
      // No need to merge again here - it's already done before the main UPDATE query
      // Persist when something changed (including photo removals and video changes)
      if ((uploadedPhotosFiles && uploadedPhotosFiles.length) || uploadedVideoFile || removeExistingVideoFlag || removeFloorplanFlag || removePlanPhotoFlag || (req.files && (req.files.floorplan || req.files.plan_photo)) || (removedPhotosList && removedPhotosList.length > 0) || videoUrl !== existing.video_url) {
        await query(
          `UPDATE properties
              SET photos = $1,
                  video_url = $2,
                  floorplan_url = $3,
                  plan_photo_url = $4,
                  updated_at = NOW()
            WHERE id = $5`,
          [photos, videoUrl, floorplanUrl, planPhotoUrl, propId]
        );
      }
    }

    // After DB changes and file moves, delete removed files from disk or Spaces (best-effort)
    try {
      // Delete removed photos (original + common variants)
      if (removedPhotosList && removedPhotosList.length) {
        if (process.env.DO_SPACES_BUCKET) {
          // Delete from DigitalOcean Spaces
          const bucket = process.env.DO_SPACES_BUCKET;
          const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
          const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
          const spacesBase = `https://${bucket}.${process.env.DO_SPACES_ENDPOINT?.replace(/^https?:\/\//, '') || 'nyc3.digitaloceanspaces.com'}`;
          const objectsToDelete = [];
          
          for (const url of removedPhotosList) {
            if (!url) continue;
            // Extract key from Spaces URL (could be CDN URL or direct Spaces URL)
            let key = null;
            if (cdnBase && url.startsWith(cdnBase)) {
              key = url.replace(cdnBase, '').replace(/^\//, '');
            } else if (url.startsWith(spacesBase)) {
              key = url.replace(spacesBase, '').replace(/^\//, '');
            } else if (url.startsWith('http://') || url.startsWith('https://')) {
              // Full URL - extract path after domain (fallback for any other URL format)
              try {
                const urlObj = new URL(url);
                key = urlObj.pathname.replace(/^\//, '');
              } catch (_) {}
            }
            
            if (key) {
              objectsToDelete.push({ Key: key });
              // Also try to delete responsive variants
              const ext = path.extname(key);
              const base = key.slice(0, -ext.length);
              const widths = [320, 480, 640, 960, 1280, 1600];
              const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
              for (const w of widths) {
                for (const e of exts) {
                  objectsToDelete.push({ Key: `${base}-${w}${e}` });
                }
              }
            }
          }
          
          // Delete in batches (S3 API limit is 1000 objects per request)
          if (objectsToDelete.length > 0) {
            const batchSize = 1000;
            for (let i = 0; i < objectsToDelete.length; i += batchSize) {
              const batch = objectsToDelete.slice(i, i + batchSize);
              try {
                await new Promise((resolve, reject) => {
                  s3.deleteObjects({ Bucket: bucket, Delete: { Objects: batch } }, (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              } catch (err) {
                console.error('Error deleting photos from Spaces:', err);
              }
            }
          }
        } else {
          // Delete from local disk
          for (const url of removedPhotosList) {
            if (!url) continue;
            const publicPath = path.join(__dirname, '../public', String(url).replace(/^\//, ''));
            try {
              if (fs.existsSync(publicPath)) fs.unlinkSync(publicPath);
            } catch (_) {}
            // Try deleting responsive variants if they exist (jpg/webp/avif at common widths)
            try {
              const ext = path.extname(publicPath);
              const base = publicPath.slice(0, -ext.length);
              const widths = [320, 480, 640, 960, 1280, 1600];
              const exts  = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
              for (const w of widths) {
                for (const e of exts) {
                  const variant = `${base}-${w}${e}`;
                  if (fs.existsSync(variant)) {
                    try { fs.unlinkSync(variant); } catch (_) {}
                  }
                }
              }
            } catch (_) {}
          }
        }
      }
      // Delete removed existing video if flagged and not replaced
      if (removeExistingVideoFlag && existing.video_url && existing.video_url !== (videoUrl || '')) {
        if (process.env.DO_SPACES_BUCKET) {
          // Delete from Spaces
          const bucket = process.env.DO_SPACES_BUCKET;
          const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
          const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
          const spacesBase = `https://${bucket}.${process.env.DO_SPACES_ENDPOINT?.replace(/^https?:\/\//, '') || 'nyc3.digitaloceanspaces.com'}`;
          let key = null;
          if (cdnBase && existing.video_url.startsWith(cdnBase)) {
            key = existing.video_url.replace(cdnBase, '').replace(/^\//, '');
          } else if (existing.video_url.startsWith(spacesBase)) {
            key = existing.video_url.replace(spacesBase, '').replace(/^\//, '');
          } else if (existing.video_url.startsWith('http://') || existing.video_url.startsWith('https://')) {
            try {
              const urlObj = new URL(existing.video_url);
              key = urlObj.pathname.replace(/^\//, '');
            } catch (_) {}
          }
          if (key) {
            try {
              await new Promise((resolve, reject) => {
                s3.deleteObject({ Bucket: bucket, Key: key }, (err) => err ? reject(err) : resolve());
              });
            } catch (err) {
              console.error('Error deleting video from Spaces:', err);
            }
          }
        } else if (String(existing.video_url).startsWith('/uploads/')) {
          // Delete from local disk
          const videoPath = path.join(__dirname, '../public', String(existing.video_url).replace(/^\//, ''));
          try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (_) {}
        }
      }
      // Delete removed floorplan/plan photo if flagged and not replaced
      if (removeFloorplanFlag && existing.floorplan_url && existing.floorplan_url !== (floorplanUrl || '')) {
        if (process.env.DO_SPACES_BUCKET) {
          // Delete from Spaces
          const bucket = process.env.DO_SPACES_BUCKET;
          const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
          const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
          const spacesBase = `https://${bucket}.${process.env.DO_SPACES_ENDPOINT?.replace(/^https?:\/\//, '') || 'nyc3.digitaloceanspaces.com'}`;
          let key = null;
          if (cdnBase && existing.floorplan_url.startsWith(cdnBase)) {
            key = existing.floorplan_url.replace(cdnBase, '').replace(/^\//, '');
          } else if (existing.floorplan_url.startsWith(spacesBase)) {
            key = existing.floorplan_url.replace(spacesBase, '').replace(/^\//, '');
          } else if (existing.floorplan_url.startsWith('http://') || existing.floorplan_url.startsWith('https://')) {
            try {
              const urlObj = new URL(existing.floorplan_url);
              key = urlObj.pathname.replace(/^\//, '');
            } catch (_) {}
          }
          if (key) {
            try {
              await new Promise((resolve, reject) => {
                s3.deleteObject({ Bucket: bucket, Key: key }, (err) => err ? reject(err) : resolve());
              });
            } catch (err) {
              console.error('Error deleting floorplan from Spaces:', err);
            }
          }
        } else if (String(existing.floorplan_url).startsWith('/uploads/')) {
          // Delete from local disk
          const fp = path.join(__dirname, '../public', String(existing.floorplan_url).replace(/^\//, ''));
          try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
        }
      }
      if (removePlanPhotoFlag && existing.plan_photo_url && existing.plan_photo_url !== (planPhotoUrl || '')) {
        if (process.env.DO_SPACES_BUCKET) {
          // Delete from Spaces
          const bucket = process.env.DO_SPACES_BUCKET;
          const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
          const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
          const spacesBase = `https://${bucket}.${process.env.DO_SPACES_ENDPOINT?.replace(/^https?:\/\//, '') || 'nyc3.digitaloceanspaces.com'}`;
          let key = null;
          if (cdnBase && existing.plan_photo_url.startsWith(cdnBase)) {
            key = existing.plan_photo_url.replace(cdnBase, '').replace(/^\//, '');
          } else if (existing.plan_photo_url.startsWith(spacesBase)) {
            key = existing.plan_photo_url.replace(spacesBase, '').replace(/^\//, '');
          } else if (existing.plan_photo_url.startsWith('http://') || existing.plan_photo_url.startsWith('https://')) {
            try {
              const urlObj = new URL(existing.plan_photo_url);
              key = urlObj.pathname.replace(/^\//, '');
            } catch (_) {}
          }
          if (key) {
            try {
              await new Promise((resolve, reject) => {
                s3.deleteObject({ Bucket: bucket, Key: key }, (err) => err ? reject(err) : resolve());
              });
            } catch (err) {
              console.error('Error deleting plan photo from Spaces:', err);
            }
          }
        } else if (String(existing.plan_photo_url).startsWith('/uploads/')) {
          // Delete from local disk
          const pp = path.join(__dirname, '../public', String(existing.plan_photo_url).replace(/^\//, ''));
          try { if (fs.existsSync(pp)) fs.unlinkSync(pp); } catch (_) {}
        }
      }
    } catch (_) { /* best-effort */ }

    // Redirect back to the same page with pagination and filters preserved
    let returnTo = req.body.return_to || req.get('referer') || '';
    
    // Extract just the path + query if it's a full URL
    if (returnTo.includes('://')) {
      try {
        const url = new URL(returnTo);
        returnTo = url.pathname + url.search;
      } catch (_) {
        returnTo = '';
      }
    }
    
    const superAdminDashboardRegex = /^\/superadmin\/dashboard\/properties(\?.*)?$/;
    const adminMyPropertiesRegex = /^\/admin\/dashboard\/my-properties(\?.*)?$/;

    if (returnTo && (superAdminDashboardRegex.test(returnTo) || adminMyPropertiesRegex.test(returnTo))) {
      return res.redirect(returnTo);
    }

    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/properties');
    }
    return res.redirect('/admin/dashboard/my-properties');
  } catch (err) {
    next(err);
  }
};

// Delete a property (agent)
exports.deleteProperty = async (req, res, next) => {
  try {
    // Determine prefixes BEFORE deleting the DB row
    let slug = null;
    let propertyTitle = null;
    try {
      const { rows } = await query('SELECT slug, title FROM properties WHERE id = $1', [req.params.id]);
      if (rows.length) {
        slug = rows[0]?.slug || null;
        propertyTitle = rows[0]?.title || null;
      }
    } catch (_) {}

    // Log activity BEFORE deleting
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.log({
        actionType: 'property_deleted',
        entityType: 'property',
        entityId: parseInt(req.params.id, 10),
        entityTitle: propertyTitle || 'Unknown Property',
        userId: req.session.user.id,
        userName: req.session.user.name || req.session.user.email
      });
    } catch (logErr) {
      console.error('Failed to log property deletion:', logErr);
    }

    // Delete DB row
    await query(`DELETE FROM properties WHERE id = $1`, [req.params.id]);

    // Remove media folder (local or Spaces)
    try {
      if (!process.env.DO_SPACES_BUCKET) {
        const propDir = path.join(__dirname, '../public/uploads/properties', String(req.params.id));
        if (fs.existsSync(propDir)) {
          fs.rmSync(propDir, { recursive: true, force: true });
        }
      } else {
        const bucket = process.env.DO_SPACES_BUCKET;
        const prefixes = [];
        prefixes.push(`properties/${String(req.params.id)}/`);
        if (slug) prefixes.push(`properties/${slug}/`);

        // Delete all objects under each prefix (paginated)
        for (const pfx of prefixes) {
          let token = undefined;
          do {
            const page = await new Promise((resolve, reject) => {
              s3.listObjectsV2({ Bucket: bucket, Prefix: pfx, ContinuationToken: token }, (err, data) => err ? reject(err) : resolve(data || {}));
            });
            const objs = (page.Contents || []).map(o => ({ Key: o.Key }));
            if (objs.length) {
              await new Promise((resolve, reject) => {
                s3.deleteObjects({ Bucket: bucket, Delete: { Objects: objs } }, (err) => err ? reject(err) : resolve());
              });
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
          } while (token);
        }
      }
    } catch (_) {}
    // Redirect back to Admin list when deletion initiated from Admin dashboard
    const referer = req.get('referer') || '';
    if (/\/admin\/dashboard\/my-properties/.test(referer)) {
      return res.redirect(referer);
    }
    if (req.session.user?.role === 'Admin') {
      return res.redirect('/admin/dashboard/my-properties?page=' + (req.query.page || 1));
    }
    res.redirect('/properties');
  } catch (err) {
    next(err);
  }
};















//
// — SuperAdmin Handlers —
//

// controllers/propertyController.js

exports.listPropertiesAdmin = async (req, res, next) => {
  try {
    // 1) Pagination params
    const page    = parseInt(req.query.page, 10) || 1;
    const limit   = 20;
    const offset  = (page - 1) * limit;
    const { country, city, type, minPrice, maxPrice, status, sold, agent, full_address: fullAddressParam } = req.query;
    const fullAddressSearch = (fullAddressParam && String(fullAddressParam).trim()) || '';

    // 2) Build dynamic WHERE clause
    const conditions = [];
    const values     = [];
    let idx = 1;
    if (fullAddressSearch) {
      conditions.push(`(p.full_address IS NOT NULL AND p.full_address ILIKE $${idx})`);
      values.push('%' + fullAddressSearch + '%');
      idx++;
    }
    if (country)  { conditions.push(`p.country = $${idx}`);      values.push(country); idx++; }
    if (city)     { conditions.push(`p.city = $${idx}`);         values.push(city);    idx++; }
    if (type)     { conditions.push(`p.type = $${idx}`);         values.push(type);    idx++; }
    if (minPrice) { conditions.push(`p.price >= $${idx}`);       values.push(minPrice);idx++; }
    if (maxPrice) { conditions.push(`p.price <= $${idx}`);       values.push(maxPrice);idx++; }
    if (status)   { conditions.push(`p.status_tags @> $${idx}`); values.push([status]);idx++; }
    if (sold)     { conditions.push(`p.sold = $${idx}`);         values.push(sold);    idx++; }
    if (agent) {
      if (agent === 'unassigned') {
        conditions.push(`p.agent_id IS NULL`);
      } else {
        conditions.push(`p.agent_id = $${idx}`);
        values.push(parseInt(agent, 10));
        idx++;
      }
    }
    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 3) Total count for pagination
    const countRes   = await query(
      `SELECT COUNT(*) AS total
         FROM properties p
      ${where}`,
      values
    );
    const total      = parseInt(countRes.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    // 4) Fetch paginated properties + uploader avatar
    const dataQuery = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        p.agent_id,
        p.sold,
        p.sold_at,
        u.profile_picture AS uploader_pic
      FROM properties p
      LEFT JOIN users u
        ON p.agent_id = u.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `;
    const { rows: properties } = await query(
      dataQuery,
      [...values, limit, offset]
    );

    // Normalize photos to array
    const normalizePhotos = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const str = val.trim();
        if (str.startsWith('[')) {
          try { return JSON.parse(str); } catch(_) {}
        }
        if (str.startsWith('{') && str.endsWith('}')) {
          return str.slice(1,-1).split(',').map(s => s.replace(/^\"|\"$/g,'').trim()).filter(Boolean);
        }
        if (str) return [str];
      }
      return [];
    };
    properties.forEach(p => { p.photos = normalizePhotos(p.photos); });

    // 5) Dropdown data
    const countryOptions = Object.keys(locations);
    let cityOptions = [];
    if (country && locations[country]) {
      cityOptions = Object.keys(locations[country]);
    }
    const typeOptions   = ['Apartment','House','Villa','Land'];
    const statusOptions = ['New','Reduced','Exclusive'];

    // 6) All approved agents for reassign dropdown
    const { rows: allAgents } = await query(`
      SELECT id, name
        FROM users
       WHERE role IN ('Admin','SuperAdmin')
         AND approved = true
       ORDER BY name
    `);

    // 7) Pending‐requests badge count
    const pendingRes   = await query(`
      SELECT COUNT(*) AS count
        FROM users
       WHERE approved = false
         AND role IN ('Admin','SuperAdmin')
    `);
    const pendingCount = parseInt(pendingRes.rows[0].count, 10);

    // 8) If filtering by agent, get agent name for display
    let agentName = null;
    if (agent && agent !== 'unassigned') {
      try {
        const agentId = parseInt(agent, 10);
        if (!isNaN(agentId)) {
          const { rows } = await query('SELECT name FROM users WHERE id = $1', [agentId]);
          if (rows && rows[0]) {
            agentName = rows[0].name;
          }
        }
      } catch (_) {}
    }

    // 9) Build current URL for return_to links
    const currentUrl = req.originalUrl || req.url;
    
    // 10) Render the view
    res.render('superadmin/properties/manage-properties', {
      properties,
      allAgents,
      currentPage:  page,
      totalPages,
      filters:      { country, city, type, minPrice, maxPrice, status, sold, agent, full_address: fullAddressSearch },
      countryOptions,
      cityOptions,
      typeOptions,
      statusOptions,
      locations,
      pendingCount,
      activePage: 'properties',
      currentUrl,
      agentName
    });
  } catch (err) {
    next(err);
  }
};
// controllers/propertyController.js

exports.reassignProperty = async (req, res, next) => {
  const propId = parseInt(req.params.id, 10);
  let newAgent = req.body.agent_id;
  if (newAgent === '' || newAgent === undefined || newAgent === null) {
    newAgent = null;
  } else {
    newAgent = parseInt(newAgent, 10);
    if (!Number.isFinite(newAgent)) newAgent = null;
  }

  try {
    // 1) Look up previous agent_id and property title
    const { rows: [prop] } = await query(
      'SELECT agent_id, title FROM properties WHERE id = $1',
      [propId]
    );
    const oldAgent = prop.agent_id;
    const title    = prop.title;

    // Validate target agent exists and is approved staff; else unassign
    if (newAgent) {
      const { rows: valid } = await query(
        `SELECT id FROM users WHERE id = $1 AND role IN ('Admin','SuperAdmin') AND approved = true`,
        [newAgent]
      );
      if (!valid.length) newAgent = null;
    }

    // 2) If there was a previous agent (and it's changing), notify them
    if (oldAgent && Number(oldAgent) !== Number(newAgent || 0)) {
      const { rows: [prev] } = await query(
        'SELECT name, email FROM users WHERE id = $1',
        [oldAgent]
      );
      if (prev) {
        await sendMail({
          to:      prev.email,
          subject: 'Property Unassigned',
          html: `
            <p>Hi ${prev.name},</p>
            <p>You have been unassigned from the property "<strong>${title}</strong>".</p>
            <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
          `,
          text: `Hi ${prev.name},\n\nYou have been unassigned from the property "${title}".\n\nBest regards,\nSweet Home Real Estate Investments' team`
        });
      }
    }

    // 3) Update to the new agent (or null)
    const upd = await query(
      'UPDATE properties SET agent_id = $1::integer, updated_at = NOW() WHERE id = $2::integer',
      [newAgent, propId]
    );

    // 4) If assigned, notify the new agent
    if (newAgent) {
      const { rows: [agent] } = await query(
        'SELECT name, email FROM users WHERE id = $1',
        [newAgent]
      );
      if (agent) {
        await sendMail({
          to:      agent.email,
          subject: 'New Property Assignment',
          html: `
            <p>Hi ${agent.name},</p>
            <p>You have been assigned to manage the property "<strong>${title}</strong>".</p>
            <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
          `,
          text: `Hi ${agent.name},\n\nYou have been assigned to manage the property "${title}".\n\nBest regards,\nSweet Home Real Estate Investments' team`
        });
      }
    }

    // 5) Done — redirect safely back to listing (preserve referer if present)
    // If AJAX (fetch), respond JSON; otherwise redirect back
    const accept = String(req.get('accept') || '').toLowerCase();
    if (accept.includes('application/json') || req.xhr) {
      return res.json({ ok: true, updated: upd.rowCount > 0, agent_id: newAgent });
    }
    const backUrl = req.get('referer') || '/superadmin/dashboard/properties';
    return res.redirect(backUrl);
  } catch (err) {
    next(err);
  }
};

// Delete any property (SuperAdmin)
exports.deletePropertyAdmin = async (req, res, next) => {
  try {
    // Determine slug and title before deleting row
    let slug = null;
    let propertyTitle = null;
    try {
      const { rows } = await query('SELECT slug, title FROM properties WHERE id = $1', [req.params.id]);
      if (rows.length) {
        slug = rows[0]?.slug || null;
        propertyTitle = rows[0]?.title || null;
      }
    } catch (_) {}

    // Log activity BEFORE deleting
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.log({
        actionType: 'property_deleted',
        entityType: 'property',
        entityId: parseInt(req.params.id, 10),
        entityTitle: propertyTitle || 'Unknown Property',
        userId: req.session.user.id,
        userName: req.session.user.name || req.session.user.email
      });
    } catch (logErr) {
      console.error('Failed to log property deletion:', logErr);
    }

    await query(`DELETE FROM properties WHERE id = $1`, [req.params.id]);
    try {
      if (!process.env.DO_SPACES_BUCKET) {
        const propDir = path.join(__dirname, '../public/uploads/properties', String(req.params.id));
        if (fs.existsSync(propDir)) {
          fs.rmSync(propDir, { recursive: true, force: true });
        }
      } else {
        const bucket = process.env.DO_SPACES_BUCKET;
        const prefixes = [];
        prefixes.push(`properties/${String(req.params.id)}/`);
        if (slug) prefixes.push(`properties/${slug}/`);
        for (const pfx of prefixes) {
          let token = undefined;
          do {
            const page = await new Promise((resolve, reject) => {
              s3.listObjectsV2({ Bucket: bucket, Prefix: pfx, ContinuationToken: token }, (err, data) => err ? reject(err) : resolve(data || {}));
            });
            const objs = (page.Contents || []).map(o => ({ Key: o.Key }));
            if (objs.length) {
              await new Promise((resolve, reject) => {
                s3.deleteObjects({ Bucket: bucket, Delete: { Objects: objs } }, (err) => err ? reject(err) : resolve());
              });
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
          } while (token);
        }
      }
    } catch (e) { /* ignore */ }
    res.redirect('/superadmin/dashboard/properties?page=' + (req.query.page||1));
  } catch (err) {
    next(err);
  }
};











//
// — Admin Handlers —
//

// List properties created/assigned to the current admin (with filters + stats)
exports.listMyProperties = async (req, res, next) => {
  try {
    const userId  = req.session.user.id;
    const page    = parseInt(req.query.page, 10) || 1;
    const limit   = 18;
    const offset  = (page - 1) * limit;

    const { country, city, type, minPrice, maxPrice, status, full_address: fullAddressParam } = req.query;
    const fullAddressSearch = (fullAddressParam && String(fullAddressParam).trim()) || '';

    // Constrain by: assigned to this user OR (unassigned AND created by this user)
    const conds = ['(p.agent_id = $1 OR (p.agent_id IS NULL AND p.created_by = $1))'];
    const vals  = [userId];
    let idx = 2;

    if (fullAddressSearch) {
      conds.push(`(p.full_address IS NOT NULL AND p.full_address ILIKE $${idx})`);
      vals.push('%' + fullAddressSearch + '%');
      idx++;
    }
    if (country)  { conds.push(`p.country = $${idx++}`);      vals.push(country); }
    if (city)     { conds.push(`p.city = $${idx++}`);         vals.push(city); }
    if (type)     { conds.push(`p.type = $${idx++}`);         vals.push(type); }
    
    // Parse and validate price filters
    const minPriceNum = minPrice && minPrice !== 'undefined' ? parseFloat(minPrice) : null;
    const maxPriceNum = maxPrice && maxPrice !== 'undefined' ? parseFloat(maxPrice) : null;
    if (minPriceNum !== null && !isNaN(minPriceNum)) {
      conds.push(`p.price >= $${idx++}`);
      vals.push(minPriceNum);
    }
    if (maxPriceNum !== null && !isNaN(maxPriceNum)) {
      conds.push(`p.price <= $${idx++}`);
      vals.push(maxPriceNum);
    }
    
    if (status)   { conds.push(`p.status_tags @> $${idx++}`); vals.push([status]); }

    const where = `WHERE ${conds.join(' AND ')}`;

    // Count for pagination
    const countSql = `SELECT COUNT(*) AS total FROM properties p ${where}`;
    const countRes = await query(countSql, vals);
    const total    = parseInt(countRes.rows[0].total, 10) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Data query — pull stats from property_stats and leads
    const dataSql = `
      SELECT
        p.id, p.slug, p.title, p.country, p.city, p.neighborhood,
        p.price, p.type, p.status_tags, p.photos,
        p.rooms, p.bathrooms,
        p.sold, p.sold_at,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House','Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END AS size,
        COALESCE(ps.views, 0) AS views_count,
        COALESCE((SELECT COUNT(*) FROM leads l WHERE l.property_id = p.id), 0) AS inquiry_count
      FROM properties p
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows: properties } = await query(dataSql, [...vals, limit, offset]);

    // Filter dropdown data
    const countryOptions = Object.keys(locations);
    let cityOptions = [];
    if (country && locations[country]) {
      // locations[country] is an object { cityName: [neighborhoods] }
      cityOptions = Object.keys(locations[country]);
    }
    const typeOptions   = ['Apartment', 'House', 'Villa', 'Land'];
    const statusOptions = ['New', 'Reduced', 'Exclusive'];

    // Build current URL for return_to links
    const currentUrl = req.originalUrl || req.url;
    
    // Render
    res.render('admin/properties/my-properties', {
      user: req.session.user,
      properties,
      currentPage: page,
      totalPages,
      filters: { 
        country, 
        city, 
        type, 
        minPrice: minPriceNum !== null && !isNaN(minPriceNum) ? minPriceNum : minPrice || '', 
        maxPrice: maxPriceNum !== null && !isNaN(maxPriceNum) ? maxPriceNum : maxPrice || '', 
        status,
        full_address: fullAddressSearch
      },
      countryOptions,
      cityOptions,
      typeOptions,
      statusOptions,
      locations,
      currentUrl
    });
  } catch (err) {
    next(err);
  }
};

// Get featured properties for home page
exports.getFeaturedProperties = async (req, res, next) => {
  try {
    // Return most-viewed properties for home carousel (no status dependency)
    const sql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      ORDER BY COALESCE(ps.views, 0) DESC, RANDOM()
      LIMIT 6
    `;
    
    const { rows: properties } = await query(sql);
    
    // Normalize photos array and agent info for each property
    const langFeat = res.locals.lang || 'en';
    const normalizedProperties = properties.map(p => ({
      ...p,
      title: getLocalizedTitle(p, langFeat),
      description: (p.description_i18n && p.description_i18n[langFeat]) || p.description,
      photos: Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []),
      agent: {
        name: p.agent_name || 'Agent',
        profile_picture: p.agent_profile_picture || null
      }
    }));
    
    res.json(normalizedProperties);
  } catch (err) {
    next(err);
  }
};

// Berlin landing page: Properties for Sale Berlin (most-viewed in Germany)
exports.berlinPropertiesPage = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
      ORDER BY p.created_at DESC
      LIMIT 9
    `;
    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql),
      query(projectsSql)
    ]);
    const lang = res.locals.lang || 'en';
    const recommendedProperties = (properties || []).map(p => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const berlinProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const berlinUrls = {
      de: `${baseUrl}/wohnungen-berlin-kaufen`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const canonicalUrl = berlinUrls[lang] || berlinUrls.en;
    const hreflangAlternates = {
      'en-us': berlinUrls.en,
      'de-de': berlinUrls.de,
      'es-es': berlinUrls.es
    };
    const titles = {
      en: 'Apartments for Sale in Berlin | Sweet Home',
      de: 'Wohnungen in Berlin kaufen | Sweet Home',
      es: 'Propiedades en venta en Berlín'
    };
    const metaDescriptions = {
      en: 'Find apartments for sale in Berlin. Compare neighborhoods, prices, and property types to choose the right home with Sweet Home.',
      de: 'Finden Sie Wohnungen in Berlin in gefragten Stadtteilen. Vergleichen Sie Lage, Preis und Zustand und entdecken Sie passende Angebote mit Sweet Home.',
      es: 'Encuentra propiedades en venta en Berlín, Alemania. Apartamentos, casas y villas. Asesoramiento inmobiliario de Sweet Home para compradores e inversores internacionales.'
    };
    const berlinPagePaths = {
      de: '/wohnungen-berlin-kaufen',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    };

    // Berlin page uses URL-per-language (no i18n); content by route language
    const berlinSectionContent = {
      en: {
        whyInvestTitle: 'Why Invest in Berlin Real Estate?',
        whyInvestP1: 'Berlin remains one of Europe\'s most resilient residential markets, supported by steady population growth and sustained international migration. With nearly 3.9 million residents and a structural housing shortage requiring over 220,000 new apartments by 2040, demand continues to outpace supply. Vacancy rates remain critically low at around 0.3%, reinforcing rental market pressure.',
        whyInvestP2: 'While purchase prices have slightly corrected in the past year, asking rents have continued to rise strongly, increasing by approximately 12% in 2024 and more than 50% since 2019. This combination of rental growth and limited new construction creates attractive long-term fundamentals for investors focused on stable income and capital preservation within Germany\'s capital city.',
        bestAreasTitle: 'Best Areas to Buy Property in Berlin',
        bestAreasIntro: 'Berlin offers distinct submarkets suited to different investment strategies:',
        bestAreasMitte: 'Prime central district with average prices around €6,600–8,300/m² and strong rental demand driven by professionals and international residents.',
        bestAreasCharlottenburg: 'Established West Berlin location combining prestige and stability, with solid long-term value retention.',
        bestAreasPankow: 'Popular with families and young professionals, showing rental growth momentum and ongoing development.',
        bestAreasNeukoelln: 'Dynamic district with strong rent increases and continued urban transformation.',
        bestAreasLichtenberg: 'More affordable entry points with emerging growth potential as rental spreads narrow across the city.',
        bestAreasOutro: 'These districts reflect Berlin\'s diverse residential landscape, from prime core locations to growth-oriented submarkets benefiting from citywide supply constraints.',
        neighborhoodsTitle: 'Neighborhoods',
        neighborhoodsHint: 'Click a neighborhood to expand key local context and real-estate profile.',
        neighborhoodsRealEstateLabel: 'Real estate',
        neighborhoodsSourcesLabel: 'Sources',
        neighborhoodsExploreCta: 'Explore properties in {name}'
      },
      de: {
        whyInvestTitle: 'Warum in Berliner Immobilien investieren?',
        whyInvestP1: 'Berlin zählt weiterhin zu den widerstandsfähigsten Wohnimmobilienmärkten Europas, gestützt durch kontinuierliches Bevölkerungswachstum und anhaltende internationale Zuwanderung. Mit rund 3,9 Millionen Einwohnern und einem strukturellen Wohnungsdefizit von über 220.000 benötigten Wohnungen in Berlin bis 2040 übersteigt die Nachfrage dauerhaft das Angebot. Die Leerstandsquote liegt mit etwa 0,3 % auf einem äußerst niedrigen Niveau und sorgt für anhaltenden Druck auf dem Mietmarkt.',
        whyInvestP2: 'Während sich die Kaufpreise im vergangenen Jahr leicht korrigiert haben, steigen die Angebotsmieten weiterhin deutlich – um rund 12 % im Jahr 2024 und um mehr als 50 % seit 2019. Diese Kombination aus starkem Mietwachstum und begrenzter Neubautätigkeit schafft attraktive langfristige Rahmenbedingungen für Investoren, die auf stabile Erträge und Kapitalerhalt durch Eigentumswohnungen in Berlin setzen.',
        bestAreasTitle: 'Beste Lagen zum Immobilienkauf in Berlin',
        bestAreasIntro: 'Berlin bietet unterschiedliche Teilmärkte für Wohnungen in Berlin, die verschiedenen Anlagestrategien gerecht werden:',
        bestAreasMitte: 'Zentrale Premiumlage für Wohnungen in Berlin mit durchschnittlichen Kaufpreisen von ca. 6.600–8.300 €/m² und hoher Nachfrage durch Berufstätige und internationale Käufer.',
        bestAreasCharlottenburg: 'Etablierter West-Berliner Bezirk mit Prestige, Stabilität und langfristiger Wertbeständigkeit.',
        bestAreasPankow: 'Beliebt bei Familien und jungen Berufstätigen, mit dynamischer Mietentwicklung und fortlaufender Quartiersentwicklung.',
        bestAreasNeukoelln: 'Wachstumsorientierter Bezirk mit deutlichen Mietsteigerungen und fortschreitender urbaner Transformation.',
        bestAreasLichtenberg: 'Preislich attraktivere Einstiegslagen mit zunehmendem Entwicklungspotenzial im Zuge stadtweiter Angebotsknappheit.',
        bestAreasOutro: 'Diese Bezirke spiegeln die Vielfalt des Berliner Wohnimmobilienmarktes wider – von zentralen Premiumlagen für Eigentumswohnungen in Berlin bis hin zu wachstumsstarken Teilmärkten, die von strukturellem Angebotsmangel profitieren.',
        neighborhoodsTitle: 'Stadtteile',
        neighborhoodsHint: 'Klicken Sie auf einen Stadtteil, um lokale Einordnung und Immobilienprofil zu sehen.',
        neighborhoodsRealEstateLabel: 'Immobilien',
        neighborhoodsSourcesLabel: 'Quellen',
        neighborhoodsExploreCta: 'Immobilien in {name} entdecken'
      },
      es: {
        whyInvestTitle: '¿Por qué invertir en el mercado inmobiliario de Berlín?',
        whyInvestP1: 'Berlín sigue siendo uno de los mercados residenciales más resilientes de Europa, impulsado por el crecimiento constante de la población y una migración internacional sostenida. Con cerca de 3,9 millones de habitantes y un déficit estructural de más de 220.000 viviendas necesarias antes de 2040, la demanda continúa superando claramente la oferta. La tasa de vacancia se mantiene en niveles extremadamente bajos, alrededor del 0,3 %, reforzando la presión en el mercado de alquiler.',
        whyInvestP2: 'Aunque los precios de compra han experimentado una ligera corrección en el último año, los alquileres solicitados han seguido aumentando con fuerza, con un incremento aproximado del 12 % en 2024 y superior al 50 % desde 2019. Esta combinación de crecimiento de rentas y limitada construcción nueva genera fundamentos sólidos a largo plazo para inversores que buscan ingresos estables y preservación de capital en la capital alemana.',
        bestAreasTitle: 'Mejores zonas para comprar propiedad en Berlín',
        bestAreasIntro: 'Berlín ofrece distintos submercados adaptados a diferentes estrategias de inversión:',
        bestAreasMitte: 'Distrito central prime con precios medios entre 6.600 y 8.300 €/m² y alta demanda de profesionales y residentes internacionales.',
        bestAreasCharlottenburg: 'Zona consolidada del oeste de Berlín que combina prestigio, estabilidad y retención de valor a largo plazo.',
        bestAreasPankow: 'Popular entre familias y jóvenes profesionales, con fuerte dinamismo en el mercado de alquiler y desarrollo continuo.',
        bestAreasNeukoelln: 'Distrito dinámico con importantes incrementos de renta y transformación urbana constante.',
        bestAreasLichtenberg: 'Puntos de entrada más accesibles con potencial de crecimiento a medida que se reducen las diferencias de precios dentro de la ciudad.',
        bestAreasOutro: 'Estas zonas reflejan la diversidad del mercado inmobiliario berlinés, desde áreas prime consolidadas hasta submercados con potencial de crecimiento impulsados por la escasez estructural de oferta.',
        neighborhoodsTitle: 'Barrios',
        neighborhoodsHint: 'Haz clic en un barrio para ver contexto local y su perfil inmobiliario.',
        neighborhoodsRealEstateLabel: 'Inmobiliario',
        neighborhoodsSourcesLabel: 'Fuentes',
        neighborhoodsExploreCta: 'Explorar propiedades en {name}'
      }
    };
    const berlinNeighborhoodContent = {
      en: {
        'Mitte': {
          summary: 'Berlin\'s historic and business core with institutions, culture, and premium central addresses.',
          realEstate: 'Prime mix of renovated Altbau and high-spec new condominiums; high liquidity and persistent rental demand.'
        },
        'Friedrichshain-Kreuzberg': {
          summary: 'Creative, dense inner-city district known for riverside locations, gastronomy, and strong urban lifestyle appeal.',
          realEstate: 'Mix of classic stock and modern projects; tenant demand remains strong for well-connected micro-locations.'
        },
        'Neukölln': {
          summary: 'Diverse, fast-evolving south-central area with established local neighborhoods and active retail corridors.',
          realEstate: 'Wide price range with strong absorption in rental stock; selected pockets continue to upgrade in quality.'
        },
        'Charlottenburg-Wilmersdorf': {
          summary: 'Established West Berlin district with major shopping streets, parks, and long-term residential prestige.',
          realEstate: 'Large period apartments and quality post-war buildings support stable owner-occupier and premium rental demand.'
        },
        'Prenzlauer Berg': {
          summary: 'Family-oriented central neighborhood with cafes, schools, and highly walkable streets.',
          realEstate: 'Highly sought-after renovated period buildings; low vacancy and limited available inventory.'
        },
        'Pankow': {
          summary: 'Leafier northern area combining urban access with calmer residential pockets.',
          realEstate: 'Attractive for families and long-term owners, with a balance of existing stock and new developments.'
        },
        'Tempelhof': {
          summary: 'South-central district anchored by Tempelhofer Feld and strong transit links.',
          realEstate: 'Mostly mid-market apartments with practical layouts; valued for space, connectivity, and neighborhood services.'
        },
        'Reinickendorf': {
          summary: 'Northern district with green areas, lakes, and quieter residential streets.',
          realEstate: 'Generally more accessible entry points than central districts, with solid family-oriented demand.'
        },
        'Wedding (Gesundbrunnen)': {
          summary: 'Inner-north area with excellent rail access and a broad social and cultural mix.',
          realEstate: 'Diverse stock from classic buildings to newer infill projects; investors monitor ongoing neighborhood improvements.'
        },
        'Kreuzberg': {
          summary: 'Internationally known urban quarter with strong identity, nightlife, and canal-side micro-locations.',
          realEstate: 'High demand for compact units and renovated apartments keeps central submarkets highly competitive.'
        },
        'Moabit': {
          summary: 'Central district near government and waterfront areas, with mixed-use streets and active local commerce.',
          realEstate: 'Mixed building ages and gradual upgrades make it a target for buyers seeking central value potential.'
        },
        'Reinickendorf (Am Schäfersee)': {
          summary: 'Residential pocket around Schaefersee known for local calm and everyday amenities.',
          realEstate: 'Neighborhood apartments with strong end-user appeal for buyers prioritizing quiet living and transit access.'
        },
        'Schöneberg': {
          summary: 'Classic west-central area with elegant boulevards, cafes, and strong neighborhood identity.',
          realEstate: 'Altbau streets and established rental demand create resilient long-term residential performance.'
        },
        'Spandau': {
          summary: 'Western district with historic core, Havel waterfronts, and substantial newer residential quarters.',
          realEstate: 'Family-friendly pricing and ongoing development pipeline support both owner-occupier and investment demand.'
        }
      },
      de: {
        'Mitte': {
          summary: 'Historisches und wirtschaftliches Zentrum Berlins mit Institutionen, Kultur und zentralen Premiumlagen.',
          realEstate: 'Gefragter Mix aus sanierten Altbauten und hochwertigen Neubauwohnungen; hohe Marktliquidität und stabile Mietnachfrage.'
        },
        'Friedrichshain-Kreuzberg': {
          summary: 'Kreativer, dichter Innenstadtbezirk mit Spreelagen, Gastronomie und starkem urbanem Lifestyle.',
          realEstate: 'Mischung aus klassischem Bestand und modernen Projekten; in gut angebundenen Mikrolagen bleibt die Nachfrage hoch.'
        },
        'Neukölln': {
          summary: 'Vielfältiger, dynamischer Bezirk im Süden der Innenstadt mit gewachsenen Kiezen und aktiven Einkaufsachsen.',
          realEstate: 'Breites Preisniveau mit starker Aufnahmefähigkeit im Mietmarkt; ausgewählte Teilmärkte werten sich weiter auf.'
        },
        'Charlottenburg-Wilmersdorf': {
          summary: 'Etablierter West-Berliner Bezirk mit großen Einkaufsstraßen, Parks und langfristiger Wohnqualität.',
          realEstate: 'Großzügige Altbauwohnungen und solide Nachkriegsbestände tragen eine stabile Eigennutzer- und Premium-Mietnachfrage.'
        },
        'Prenzlauer Berg': {
          summary: 'Familienorientierter Innenstadtteil mit Cafés, Schulen und hoher Aufenthaltsqualität.',
          realEstate: 'Sehr gefragte sanierte Altbauten; niedriger Leerstand und begrenztes verfügbares Angebot.'
        },
        'Pankow': {
          summary: 'Grüner Norden mit guter Innenstadtanbindung und ruhigen Wohnlagen.',
          realEstate: 'Attraktiv für Familien und langfristige Eigennutzer, mit ausgewogener Kombination aus Bestand und Neubau.'
        },
        'Tempelhof': {
          summary: 'Süd-zentraler Bezirk rund um das Tempelhofer Feld mit guter Verkehrsanbindung.',
          realEstate: 'Überwiegend mittleres Preissegment mit funktionalen Grundrissen; gefragt wegen Platz, Infrastruktur und Alltagstauglichkeit.'
        },
        'Reinickendorf': {
          summary: 'Nördlicher Bezirk mit viel Grün, Seen und ruhigeren Wohnstraßen.',
          realEstate: 'Im Vergleich zu zentralen Lagen oft günstigere Einstiege bei solider, familienorientierter Nachfrage.'
        },
        'Wedding (Gesundbrunnen)': {
          summary: 'Innerstädtischer Nordbereich mit sehr guter Bahn-Anbindung und breiter sozialer Mischung.',
          realEstate: 'Vielfältiger Bestand von Altbau bis Nachverdichtung; Investoren beobachten die fortlaufende Quartiersentwicklung.'
        },
        'Kreuzberg': {
          summary: 'International bekanntes urbanes Viertel mit starker Identität, Ausgehkultur und Kanallagen.',
          realEstate: 'Hohe Nachfrage nach kompakten Einheiten und sanierten Wohnungen hält zentrale Teillagen wettbewerbsintensiv.'
        },
        'Moabit': {
          summary: 'Zentraler Stadtteil nahe Regierungsviertel und Wasserlagen mit gemischter Nutzungsstruktur.',
          realEstate: 'Unterschiedliche Baualtersklassen und schrittweise Aufwertung machen den Teilmarkt für wertorientierte Käufer interessant.'
        },
        'Reinickendorf (Am Schäfersee)': {
          summary: 'Wohngeprägte Lage rund um den Schäfersee mit ruhigem Umfeld und guter Nahversorgung.',
          realEstate: 'Wohnungen mit starker Eigennutzer-Nachfrage bei Fokus auf ruhiges Wohnen und ÖPNV-Nähe.'
        },
        'Schöneberg': {
          summary: 'Klassischer west-zentraler Stadtteil mit eleganten Boulevards, Cafés und klarer Kiezidentität.',
          realEstate: 'Altbaustraßen und etablierte Mietnachfrage sorgen für robuste, langfristige Wohnmarktqualität.'
        },
        'Spandau': {
          summary: 'Westlicher Bezirk mit historischer Altstadt, Havel-Lagen und größeren neuen Wohnquartieren.',
          realEstate: 'Familienfreundliche Preise und laufende Projektpipeline unterstützen Eigennutzer- und Investmentnachfrage.'
        }
      },
      es: {
        'Mitte': {
          summary: 'Centro histórico y de negocios de Berlín, con instituciones, cultura y direcciones prime.',
          realEstate: 'Combinación premium de Altbau renovado y obra nueva de alta calidad; gran liquidez y demanda de alquiler constante.'
        },
        'Friedrichshain-Kreuzberg': {
          summary: 'Distrito céntrico, creativo y denso, con zonas junto al río y fuerte atractivo de estilo de vida urbano.',
          realEstate: 'Mezcla de parque residencial clásico y proyectos modernos; la demanda de inquilinos sigue siendo muy sólida.'
        },
        'Neukölln': {
          summary: 'Zona diversa y en rápida evolución al sur del centro, con barrios consolidados y ejes comerciales activos.',
          realEstate: 'Amplio rango de precios y alta absorción en alquiler; algunas microzonas continúan mejorando su calidad.'
        },
        'Charlottenburg-Wilmersdorf': {
          summary: 'Distrito consolidado del oeste con avenidas comerciales, parques y prestigio residencial sostenido.',
          realEstate: 'Apartamentos amplios de época y edificios de posguerra de calidad sostienen demanda estable de compra y alquiler premium.'
        },
        'Prenzlauer Berg': {
          summary: 'Barrio céntrico orientado a familias, con cafés, colegios y calles muy caminables.',
          realEstate: 'Edificios de época renovados muy demandados; baja vacancia y oferta disponible limitada.'
        },
        'Pankow': {
          summary: 'Área norte más verde que combina acceso urbano con zonas residenciales tranquilas.',
          realEstate: 'Atractiva para familias y compradores de largo plazo, con equilibrio entre stock existente y nuevos desarrollos.'
        },
        'Tempelhof': {
          summary: 'Distrito centro-sur articulado por Tempelhofer Feld y buenas conexiones de transporte.',
          realEstate: 'Principalmente apartamentos de segmento medio con distribuciones funcionales; valorado por espacio y conectividad.'
        },
        'Reinickendorf': {
          summary: 'Distrito del norte con zonas verdes, lagos y calles residenciales más calmadas.',
          realEstate: 'Suele ofrecer puntos de entrada más accesibles que áreas céntricas, con demanda sólida de perfil familiar.'
        },
        'Wedding (Gesundbrunnen)': {
          summary: 'Área interior del norte con excelente conexión ferroviaria y mezcla social y cultural amplia.',
          realEstate: 'Parque inmobiliario diverso, desde edificios clásicos hasta proyectos de relleno; se sigue de cerca su mejora urbana.'
        },
        'Kreuzberg': {
          summary: 'Barrio urbano de fama internacional, con identidad fuerte, vida nocturna y microzonas junto al canal.',
          realEstate: 'La alta demanda de unidades compactas y pisos renovados mantiene estos submercados muy competitivos.'
        },
        'Moabit': {
          summary: 'Distrito central cerca del gobierno y del agua, con calles de uso mixto y comercio local activo.',
          realEstate: 'Edificios de distintas épocas y mejora gradual lo vuelven atractivo para compradores que buscan valor en zona central.'
        },
        'Reinickendorf (Am Schäfersee)': {
          summary: 'Microzona residencial alrededor de Schaefersee, conocida por su ambiente tranquilo y servicios cotidianos.',
          realEstate: 'Apartamentos con fuerte atractivo para usuario final que prioriza tranquilidad y buen acceso al transporte público.'
        },
        'Schöneberg': {
          summary: 'Zona clásica del oeste-centro con bulevares elegantes, cafés y fuerte identidad de barrio.',
          realEstate: 'Calles de Altbau y demanda consolidada de alquiler ofrecen un desempeño residencial resiliente a largo plazo.'
        },
        'Spandau': {
          summary: 'Distrito occidental con casco histórico, frentes de agua en el Havel y nuevos barrios residenciales.',
          realEstate: 'Precios más familiares y pipeline de desarrollo activo respaldan demanda tanto de vivienda propia como de inversión.'
        }
      }
    };
    const berlinContent = berlinSectionContent[lang] || berlinSectionContent.en;
    const berlinNeighborhoodNamesRaw = (((locations || {}).Germany || {}).Berlin && Array.isArray(locations.Germany.Berlin))
      ? locations.Germany.Berlin
      : [];
    const berlinNeighborhoodNames = berlinNeighborhoodNamesRaw.filter((name) => {
      const normalized = String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '');
      return normalized !== 'reinickendorfamschafersee';
    });
    const selectedNeighborhoodContent = berlinNeighborhoodContent[lang] || berlinNeighborhoodContent.en;
    const fallbackNeighborhoodContent = berlinNeighborhoodContent.en;
    const berlinNeighborhoods = berlinNeighborhoodNames.map((name) => {
      const item = selectedNeighborhoodContent[name] || fallbackNeighborhoodContent[name] || {};
      return {
        name,
        summary: item.summary || '',
        realEstate: item.realEstate || ''
      };
    });

    res.render('properties-for-sale-berlin', {
      title: titles[lang] || titles.en,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/berlin-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: metaDescriptions[lang] || metaDescriptions.en,
      berlinPagePaths,
      berlinContent,
      berlinNeighborhoods,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      berlinProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// English campaign landing page: Berlin tenant-occupied investment strategy
exports.berlinInvestorStrategyPageEn = async (req, res, next) => {
  try {
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        p.occupancy_type,
        p.rental_status,
        p.rental_income,
        p.housegeld,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND p.status = 'active'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 9
    `;

    const { rows: properties } = await query(propertiesSql);
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, 'en'),
        description: (p.description_i18n && p.description_i18n.en) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const baseUrl = res.locals.baseUrl;
    const canonicalUrl = `${baseUrl}/en/berlin-tenant-occupied-entry-strategy`;
    const hreflangAlternates = {
      'de-de': `${baseUrl}/wohnungen-berlin-kaufen`,
      'en-us': canonicalUrl,
      'es-es': `${baseUrl}/es/propiedades-en-venta-berlin`
    };

    res.render('berlin-investment-strategy-en', {
      title: 'Berlin Tenant-Occupied Entry Strategy | Sweet Home',
      useMainContainer: false,
      useHomeHeader: false,
      headPartial: '../partials/seo/berlin-investment-strategy-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: 'Berlin Tenant-Occupied Entry Strategy by Sweet Home: structured access to tenant-occupied apartments with immediate income potential and long-term fundamentals.',
      recommendedProperties,
      baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// Dubai landing page: Properties for Sale Dubai (9 most-viewed in UAE)
exports.dubaiPropertiesPage = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'UAE'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'UAE'
        AND p.city = 'Dubai'
      ORDER BY p.created_at DESC
      LIMIT 15
    `;
    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql),
      query(projectsSql)
    ]);
    const lang = res.locals.lang || 'en';
    const recommendedProperties = (properties || []).map(p => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const dubaiProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const dubaiUrls = {
      de: `${baseUrl}/immobilien-dubai-kaufen`,
      en: `${baseUrl}/en/properties-for-sale-dubai`,
      es: `${baseUrl}/es/propiedades-en-venta-dubai`
    };
    const canonicalUrl = dubaiUrls[lang] || dubaiUrls.en;
    const hreflangAlternates = {
      'en-us': dubaiUrls.en,
      'de-de': dubaiUrls.de,
      'es-es': dubaiUrls.es
    };
    const titles = {
      en: 'Apartments and Property Investment in Dubai | Sweet Home',
      de: 'Dubai Wohnung kaufen | Sweet Home',
      es: 'Propiedades en venta en Dubái'
    };
    const metaDescriptions = {
      en: 'Looking for Dubai property? Compare flats for sale, investment properties listings, and key areas with Sweet Home support.',
      de: 'Dubai Immobilien kaufen: Wohnungen und Häuser in gefragten Lagen vergleichen und mit Sweet Home die passende Immobilie finden.',
      es: 'Encuentra propiedades en venta en Dubái, EAU. Apartamentos, villas y plan futuro. Asesoramiento de Sweet Home.'
    };
    const dubaiPagePaths = {
      de: '/immobilien-dubai-kaufen',
      en: '/en/properties-for-sale-dubai',
      es: '/es/propiedades-en-venta-dubai'
    };

    // Dubai page uses URL-per-language; content by route language
    const dubaiSectionContent = {
      en: {
        whyInvestTitle: 'Why Buy or Invest in Dubai Property?',
        whyInvestP1: 'Dubai remains one of the most active real estate markets globally, with strong population growth and sustained transaction activity. Buyers searching for flats for sale Dubai or apartments in Dubai can access a wide range of stock, from central towers to master-community homes.',
        whyInvestP2: 'For investors, Dubai combines liquidity, rental demand, and multiple entry points by budget and location. Whether your goal is to invest in Dubai property for yield or long-term appreciation, area selection and asset quality remain the key drivers of performance.',
        bestAreasTitle: 'Best Areas for Flats and Apartments in Dubai',
        bestAreasIntro: 'If you are comparing properties on sale in Dubai, each district offers a different balance of price, demand, and investment profile:',
        bestAreasPalmJumeirah: 'A prime waterfront location where villa and apartment prices remain among the highest in the city, supported by strong luxury demand and international buyers.',
        bestAreasDowntown: 'Core central district benefiting from sustained demand and premium pricing near the Burj Khalifa and DIFC corridor.',
        bestAreasMarina: 'Established waterfront community with high transaction volumes and consistent rental demand.',
        bestAreasBusinessBay: 'Mixed-use district with strong price growth and proximity to Downtown.',
        bestAreasHillsJVC: 'Growth-oriented communities attracting off-plan activity and mid-market investors.',
        bestAreasOutro: 'These submarkets cover both end-user and investment intent, from apartments in Dubai to broader Dubai property investment opportunities.',
        neighborhoodsTitle: 'Dubai Neighborhoods Guide',
        neighborhoodsHint: 'Click a neighborhood to expand local context and real-estate profile.',
        neighborhoodsRealEstateLabel: 'Real estate',
        neighborhoodsSourcesLabel: 'Sources'
      },
      de: {
        whyInvestTitle: 'Dubai Immobilien kaufen: Warum Dubai?',
        whyInvestP1: 'Wer Immobilien in Dubai kaufen möchte, profitiert von einem international gefragten Markt mit hoher Liquidität, starkem Bevölkerungswachstum und laufender Stadtentwicklung. Für Käufer, die eine Wohnung in Dubai kaufen oder gezielt ein Haus kaufen in Dubai wollen, bietet der Markt eine breite Auswahl von zentralen City-Lagen bis zu Master-Communities.',
        whyInvestP2: 'Die Kombination aus aktiver Transaktionsdynamik, stabiler internationaler Nachfrage und differenzierten Teilmärkten macht Dubai für Eigennutzer und Investoren attraktiv. Ob Wohnungen kaufen Dubai oder Häuser in Dubai kaufen: Standortqualität, Bauqualität und Nutzungskonzept bleiben die zentralen Hebel für langfristigen Erfolg.',
        bestAreasTitle: 'Beste Lagen, um in Dubai Immobilien zu kaufen',
        bestAreasIntro: 'Wenn Sie in Dubai eine Wohnung kaufen oder ein Haus kaufen möchten, unterscheiden sich die wichtigsten Teilmärkte deutlich bei Preisniveau, Zielgruppe und Potenzial:',
        bestAreasPalmJumeirah: 'Premium-Wasserlage mit hoher internationaler Nachfrage und starkem Luxussegment.',
        bestAreasDowntown: 'Zentrale Top-Lage rund um den Burj Khalifa mit stabiler Nachfrage und Premiumpreisen.',
        bestAreasMarina: 'Etablierte Waterfront-Community mit konstant hoher Transaktionsaktivität und Mietnachfrage.',
        bestAreasBusinessBay: 'Wachstumsstarker Mixed-Use-Distrikt in unmittelbarer Nähe zu Downtown.',
        bestAreasHillsJVC: 'Beliebte Wohnquartiere mit hohem Off-Plan-Anteil und attraktiven Einstiegsmöglichkeiten für Investoren.',
        bestAreasOutro: 'Diese Lagen decken die wichtigsten Suchintentionen ab: von Wohnung in Dubai kaufen bis Haus kaufen Dubai und Dubai Villa kaufen.',
        neighborhoodsTitle: 'Dubai Stadtteile Guide',
        neighborhoodsHint: 'Klicken Sie auf einen Stadtteil, um lokalen Kontext und Immobilienprofil zu sehen.',
        neighborhoodsRealEstateLabel: 'Immobilien',
        neighborhoodsSourcesLabel: 'Quellen'
      },
      es: {
        whyInvestTitle: '¿Por qué invertir en el mercado inmobiliario de Dubái?',
        whyInvestP1: 'El mercado inmobiliario de Dubái continúa mostrando un fuerte dinamismo, impulsado por el crecimiento sostenido de la población y un sólido desempeño económico. En 2024 la población superó los 3,8 millones de habitantes y el PIB creció un 3,2 % en el primer semestre.',
        whyInvestP2: 'Los precios de las propiedades residenciales aumentaron aproximadamente un 20 % en 2024, mientras que los alquileres crecieron alrededor de un 19 %. En el primer trimestre de 2025, el precio medio alcanzó los 1.749 AED por pie cuadrado, superando claramente el ciclo anterior. Con 43.000 transacciones registradas en el primer trimestre y un 87 % de compras realizadas en efectivo, el mercado demuestra altos niveles de liquidez y confianza inversora. La combinación de crecimiento de precios, aumento de rentas y fuerte participación de capital internacional posiciona a Dubái como uno de los mercados inmobiliarios más atractivos a nivel global para estrategias de rentabilidad y apreciación de capital.',
        bestAreasTitle: 'Mejores zonas para comprar propiedad en Dubái',
        bestAreasIntro: 'Dubái ofrece distintos submercados adaptados a diferentes perfiles de inversión:',
        bestAreasPalmJumeirah: 'Zona prime frente al mar con fuerte demanda internacional y elevado segmento de lujo.',
        bestAreasDowntown: 'Distrito central junto al Burj Khalifa, con precios premium y demanda constante.',
        bestAreasMarina: 'Comunidad consolidada junto al mar con alta actividad transaccional y demanda de alquiler estable.',
        bestAreasBusinessBay: 'Área mixta en expansión cercana al centro financiero y comercial.',
        bestAreasHillsJVC: 'Comunidades residenciales con alta actividad off-plan y oportunidades atractivas para inversores.',
        bestAreasOutro: 'Estas zonas reflejan la diversidad del mercado inmobiliario de Dubái, desde activos prime de lujo hasta comunidades residenciales con fuerte potencial de crecimiento.',
        neighborhoodsTitle: 'Guía de Barrios de Dubái',
        neighborhoodsHint: 'Haz clic en un barrio para ver contexto local y su perfil inmobiliario.',
        neighborhoodsRealEstateLabel: 'Inmobiliario',
        neighborhoodsSourcesLabel: 'Fuentes'
      }
    };
    const dubaiContent = dubaiSectionContent[lang] || dubaiSectionContent.en;
    const dubaiNeighborhoodNames = (((locations || {}).UAE || {}).Dubai && Array.isArray(locations.UAE.Dubai))
      ? locations.UAE.Dubai
      : [];
    const normalizeNeighborhoodKey = (value) => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
    const dubaiNeighborhoodContent = {
      en: {
        'Dubai Marina': { summary: 'High-density waterfront district with strong lifestyle appeal, walkability and year-round rental demand.', realEstate: 'Dominated by apartments; one of Dubai\'s most liquid resale and leasing submarkets with broad investor participation.' },
        'Downtown Dubai': { summary: 'Prime central district around Burj Khalifa and Dubai Mall, combining residential, office and hospitality uses.', realEstate: 'Premium pricing and deep end-user/investor demand support resilient values and high visibility inventory.' },
        'Business Bay': { summary: 'Mixed-use extension of Downtown with rapid residential delivery and strong connectivity to key employment hubs.', realEstate: 'Active apartment market with high transaction turnover and sustained interest from both owner-occupiers and landlords.' },
        'Palm Jumeirah': { summary: 'Iconic coastal enclave with beach access and branded developments attracting international high-net-worth buyers.', realEstate: 'Ultra-prime villas and premium apartments command top pricing and limited waterfront supply dynamics.' },
        'Jumeirah Village Circle': { summary: 'Large master-planned residential area with family-oriented amenities and improving transport accessibility.', realEstate: 'Mid-market apartment focus with strong off-plan and rental activity, popular for yield-driven strategies.' },
        'JVC': { summary: 'Large master-planned residential area with family-oriented amenities and improving transport accessibility.', realEstate: 'Mid-market apartment focus with strong off-plan and rental activity, popular for yield-driven strategies.' },
        'Jumeirah Lake Towers': { summary: 'Clustered towers around lakes opposite Marina, offering mixed residential and office demand.', realEstate: 'Broad stock of apartments with competitive price points relative to nearby prime waterfront districts.' },
        'JLT': { summary: 'Clustered towers around lakes opposite Marina, offering mixed residential and office demand.', realEstate: 'Broad stock of apartments with competitive price points relative to nearby prime waterfront districts.' },
        'Dubai Hills Estate': { summary: 'Master community centered on parks and golf, positioned between Downtown and Marina corridors.', realEstate: 'Growing supply of villas and apartments with strong end-user appeal and steady mid-to-upper segment demand.' },
        'Dubai Creek Harbour': { summary: 'Large-scale waterfront regeneration area with modern towers and long-term infrastructure pipeline.', realEstate: 'Primarily apartment-led market with ongoing launches and strong interest in newer stock.' },
        'Arabian Ranches': { summary: 'Established suburban villa community known for schools, parks and family-oriented living.', realEstate: 'Villa-focused submarket with stable end-user demand and lower stock turnover than apartment zones.' },
        'Damac Hills': { summary: 'Master-planned golf community offering villas, townhouses and apartment clusters.', realEstate: 'Balanced end-user and investor demand across mid-to-upper segments, supported by phased development.' },
        'DAMAC Hills': { summary: 'Master-planned golf community offering villas, townhouses and apartment clusters.', realEstate: 'Balanced end-user and investor demand across mid-to-upper segments, supported by phased development.' }
      },
      de: {
        'Dubai Marina': { summary: 'Dichter Waterfront-Stadtteil mit hoher Lebensqualität, guter Fußläufigkeit und ganzjähriger Mietnachfrage.', realEstate: 'Vor allem Apartmentbestand; einer der liquidesten Teilmärkte Dubais für Wiederverkauf und Vermietung.' },
        'Downtown Dubai': { summary: 'Prime-Citylage rund um Burj Khalifa und Dubai Mall mit gemischter Wohn-, Büro- und Hotelnutzung.', realEstate: 'Premiumpreise und tiefe Nachfrage von Eigennutzern und Investoren stützen langfristig die Werte.' },
        'Business Bay': { summary: 'Mixed-Use-Erweiterung von Downtown mit dynamischer Wohnentwicklung und starker Anbindung.', realEstate: 'Aktiver Apartmentmarkt mit hohem Transaktionsvolumen und stabiler Nachfrage auf Miet- und Kaufseite.' },
        'Palm Jumeirah': { summary: 'Ikonische Küstenlage mit Strandzugang und internationalen Luxusprojekten.', realEstate: 'Ultra-Prime-Villen und hochwertige Apartments erzielen Spitzenpreise bei begrenztem Waterfront-Angebot.' },
        'Jumeirah Village Circle': { summary: 'Große Master-Community mit familienorientierter Infrastruktur und wachsender Erreichbarkeit.', realEstate: 'Mid-Market-Apartments mit hoher Off-Plan- und Vermietungsaktivität, beliebt bei renditeorientierten Investoren.' },
        'JVC': { summary: 'Große Master-Community mit familienorientierter Infrastruktur und wachsender Erreichbarkeit.', realEstate: 'Mid-Market-Apartments mit hoher Off-Plan- und Vermietungsaktivität, beliebt bei renditeorientierten Investoren.' },
        'Jumeirah Lake Towers': { summary: 'Turmcluster rund um Seen gegenüber der Marina mit gemischter Wohn- und Arbeitsnachfrage.', realEstate: 'Breiter Apartmentbestand mit wettbewerbsfähigen Preisen gegenüber benachbarten Prime-Lagen.' },
        'JLT': { summary: 'Turmcluster rund um Seen gegenüber der Marina mit gemischter Wohn- und Arbeitsnachfrage.', realEstate: 'Breiter Apartmentbestand mit wettbewerbsfähigen Preisen gegenüber benachbarten Prime-Lagen.' },
        'Dubai Hills Estate': { summary: 'Master-Community mit Parks und Golf, strategisch zwischen Downtown und Marina gelegen.', realEstate: 'Wachsende Angebotsbasis bei Villen und Apartments mit starker Endnutzer-Nachfrage.' },
        'Dubai Creek Harbour': { summary: 'Großes Waterfront-Entwicklungsgebiet mit modernen Hochhäusern und langfristigem Infrastrukturpotenzial.', realEstate: 'Vorwiegend apartmentgetriebener Markt mit laufenden Launches und starker Nachfrage nach Neubauten.' },
        'Arabian Ranches': { summary: 'Etablierte suburbane Villenlage mit Schulen, Grünflächen und familienfreundlichem Umfeld.', realEstate: 'Villenfokus mit stabiler Endnutzer-Nachfrage und geringerer Umschlagshäufigkeit als Apartmentmärkte.' },
        'Damac Hills': { summary: 'Master-geplante Golf-Community mit Villen, Townhouses und Apartment-Clustern.', realEstate: 'Ausgewogene Nachfrage von Eigennutzern und Investoren im mittleren bis oberen Segment.' },
        'DAMAC Hills': { summary: 'Master-geplante Golf-Community mit Villen, Townhouses und Apartment-Clustern.', realEstate: 'Ausgewogene Nachfrage von Eigennutzern und Investoren im mittleren bis oberen Segment.' }
      },
      es: {
        'Dubai Marina': { summary: 'Distrito frente al mar con alta densidad, estilo de vida urbano y fuerte demanda de alquiler todo el año.', realEstate: 'Predominan los apartamentos; es uno de los submercados más líquidos de Dubái en compraventa y renta.' },
        'Downtown Dubai': { summary: 'Zona prime central alrededor del Burj Khalifa y Dubai Mall, con uso residencial, comercial y hotelero.', realEstate: 'Precios premium y demanda profunda de compradores finales e inversores sostienen el valor del área.' },
        'Business Bay': { summary: 'Extensión mixta de Downtown con crecimiento residencial acelerado y excelente conectividad.', realEstate: 'Mercado de apartamentos muy activo, con alta rotación transaccional y demanda constante.' },
        'Palm Jumeirah': { summary: 'Enclave costero icónico con acceso a playa y proyectos de lujo de perfil internacional.', realEstate: 'Villas ultra-prime y apartamentos premium con precios de referencia y oferta waterfront limitada.' },
        'Jumeirah Village Circle': { summary: 'Gran comunidad planificada, orientada a familias, con servicios consolidados y mejor accesibilidad.', realEstate: 'Foco mid-market en apartamentos, con fuerte actividad off-plan y demanda de renta por rendimiento.' },
        'JVC': { summary: 'Gran comunidad planificada, orientada a familias, con servicios consolidados y mejor accesibilidad.', realEstate: 'Foco mid-market en apartamentos, con fuerte actividad off-plan y demanda de renta por rendimiento.' },
        'Jumeirah Lake Towers': { summary: 'Conjunto de torres alrededor de lagos frente a Marina, con demanda mixta residencial y de oficinas.', realEstate: 'Amplio stock de apartamentos con precios competitivos frente a zonas waterfront más prime.' },
        'JLT': { summary: 'Conjunto de torres alrededor de lagos frente a Marina, con demanda mixta residencial y de oficinas.', realEstate: 'Amplio stock de apartamentos con precios competitivos frente a zonas waterfront más prime.' },
        'Dubai Hills Estate': { summary: 'Comunidad maestra con parques y golf, ubicada entre los corredores de Downtown y Marina.', realEstate: 'Oferta creciente de villas y apartamentos con alta preferencia de usuario final.' },
        'Dubai Creek Harbour': { summary: 'Gran desarrollo waterfront con torres modernas y pipeline de infraestructura a largo plazo.', realEstate: 'Submercado liderado por apartamentos, con lanzamientos continuos y alta demanda por producto nuevo.' },
        'Arabian Ranches': { summary: 'Comunidad suburbana consolidada de villas, conocida por su perfil familiar y servicios.', realEstate: 'Mercado centrado en villas con demanda estable de vivienda propia y menor rotación que zonas de apartamentos.' },
        'Damac Hills': { summary: 'Comunidad planificada alrededor de campo de golf con villas, townhouses y apartamentos.', realEstate: 'Demanda equilibrada de usuarios finales e inversores en segmentos medio y medio-alto.' },
        'DAMAC Hills': { summary: 'Comunidad planificada alrededor de campo de golf con villas, townhouses y apartamentos.', realEstate: 'Demanda equilibrada de usuarios finales e inversores en segmentos medio y medio-alto.' }
      }
    };
    const selectedDubaiNeighborhoodContent = dubaiNeighborhoodContent[lang] || dubaiNeighborhoodContent.en;
    const fallbackDubaiNeighborhoodContent = dubaiNeighborhoodContent.en;
    const selectedDubaiByNormalized = Object.entries(selectedDubaiNeighborhoodContent).reduce((acc, [key, val]) => {
      acc[normalizeNeighborhoodKey(key)] = val;
      return acc;
    }, {});
    const fallbackDubaiByNormalized = Object.entries(fallbackDubaiNeighborhoodContent).reduce((acc, [key, val]) => {
      acc[normalizeNeighborhoodKey(key)] = val;
      return acc;
    }, {});
    const dubaiNeighborhoods = dubaiNeighborhoodNames.map((name) => {
      const normalized = normalizeNeighborhoodKey(name);
      const item = selectedDubaiNeighborhoodContent[name]
        || selectedDubaiByNormalized[normalized]
        || fallbackDubaiNeighborhoodContent[name]
        || fallbackDubaiByNormalized[normalized]
        || {
          summary: lang === 'de'
            ? 'Wohnquartier in Dubai mit lokaler Infrastruktur und guter Anbindung an wichtige Stadtachsen.'
            : lang === 'es'
              ? 'Zona residencial de Dubái con servicios locales y buena conexión con los principales ejes urbanos.'
              : 'Residential district in Dubai with local amenities and solid connectivity to key city corridors.',
          realEstate: lang === 'de'
            ? 'Überwiegend apartmentgeprägter Teilmarkt mit aktiver Nachfrage von Eigennutzern und Investoren.'
            : lang === 'es'
              ? 'Submercado mayoritariamente de apartamentos, con demanda activa de usuarios finales e inversores.'
              : 'Predominantly apartment-led submarket with active demand from both owner-occupiers and investors.'
        };
      return { name, summary: item.summary || '', realEstate: item.realEstate || '' };
    });

    res.render('properties-for-sale-dubai', {
      title: titles[lang] || titles.en,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/dubai-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: metaDescriptions[lang] || metaDescriptions.en,
      dubaiPagePaths,
      dubaiContent,
      dubaiNeighborhoods,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      dubaiProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German dedicated landing page: Villas in Dubai
exports.villaKaufenDubaiPageDe = async (req, res, next) => {
  try {
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'UAE'
        AND p.city = 'Dubai'
        AND LOWER(COALESCE(p.type, '')) = 'villa'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const { rows: properties } = await query(propertiesSql);
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, 'de'),
        description: (p.description_i18n && p.description_i18n.de) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const baseUrl = res.locals.baseUrl;
    const canonicalUrl = `${baseUrl}/villa-kaufen-dubai`;
    const hreflangAlternates = {
      'en-us': `${baseUrl}/en/properties-for-sale-dubai`,
      'de-de': canonicalUrl,
      'es-es': `${baseUrl}/es/propiedades-en-venta-dubai`
    };

    res.render('villa-kaufen-dubai-de', {
      title: 'Dubai Villa kaufen: Häuser und Villen in Dubai',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/dubai-villas-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: 'Dubai Villa kaufen: Entdecken Sie ausgewählte Villen und Häuser in Dubai. Vergleichen Sie Lagen, Preise und Objektprofile mit Beratung von Sweet Home.',
      recommendedProperties,
      baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// Cyprus landing page: Properties for Sale Cyprus (9 most-viewed in Cyprus)
exports.cyprusPropertiesPage = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Cyprus'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Cyprus'
      ORDER BY p.created_at DESC
      LIMIT 15
    `;
    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql),
      query(projectsSql)
    ]);
    const lang = res.locals.lang || 'en';
    const recommendedProperties = (properties || []).map(p => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const cyprusProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const cyprusUrls = {
      de: `${baseUrl}/immobilien-zypern-kaufen`,
      en: `${baseUrl}/en/properties-for-sale-cyprus`,
      es: `${baseUrl}/es/propiedades-en-venta-chipre`
    };
    const canonicalUrl = cyprusUrls[lang] || cyprusUrls.en;
    const hreflangAlternates = {
      'en-us': cyprusUrls.en,
      'de-de': cyprusUrls.de,
      'es-es': cyprusUrls.es
    };
    const titles = {
      en: 'Homes for Sale in Cyprus | Sweet Home',
      de: 'Haus kaufen Zypern | Sweet Home',
      es: 'Propiedades en venta en Chipre'
    };
    const metaDescriptions = {
      en: 'Looking for Cyprus property for sale? Compare homes by city, price, and lifestyle with local guidance from Sweet Home.',
      de: 'Haus kaufen Zypern: Entdecken Sie Immobilien und Wohnungen in Paphos. Vergleichen Sie Angebote mit persönlicher Beratung von Sweet Home.',
      es: 'Encuentra propiedades en venta en Chipre. Apartamentos, villas y viviendas costeras. Asesoramiento de Sweet Home.'
    };
    const cyprusPagePaths = {
      de: '/immobilien-zypern-kaufen',
      en: '/en/properties-for-sale-cyprus',
      es: '/es/propiedades-en-venta-chipre'
    };

    // Cyprus page uses URL-per-language; content by route language
    const cyprusSectionContent = {
      en: {
        whyInvestTitle: 'Cyprus Property for Sale: Why Buyers Focus on Cyprus',
        whyInvestP1: 'The Cyprus market combines EU legal stability, strong lifestyle demand, and diverse stock ranging from city apartments to coastal homes. For buyers searching property for sale in Cyprus, the market offers broad regional choice and active transaction flow across key cities.',
        whyInvestP2: 'Demand is supported by international relocation, tourism-linked housing activity, and ongoing development. This creates a practical environment for end-users and investors comparing homes for sale in Cyprus by budget, location, and long-term value potential.',
        bestAreasTitle: 'Best Areas for Property for Sale in Cyprus',
        bestAreasIntro: 'If you are evaluating Cyprus property for sale, each region serves a different buyer profile and price segment.',
        bestAreasPaphos: 'Popular with international buyers seeking coastal homes, retirement lifestyle, and balanced entry pricing.',
        bestAreasLimassol: 'The island\'s primary business and investment hub, known for higher-end developments and strong international activity.',
        bestAreasLarnaca: 'A growing coastal market with expanding infrastructure and competitive entry pricing.',
        bestAreasNicosia: 'The administrative capital, offering stable domestic demand and long-term residential security.',
        bestAreasOutro: 'For broad market intent keywords like homes for sale Cyprus, Cyprus property for sale, and property for sale in Cyprus, this page helps compare the island\'s core locations in one place.',
        neighborhoodsTitle: 'Paphos Neighborhoods Guide',
        neighborhoodsHint: 'Click a neighborhood to expand local context and real-estate profile.',
        neighborhoodsRealEstateLabel: 'Real estate',
        neighborhoodsSourcesLabel: 'Sources'
      },
      de: {
        whyInvestTitle: 'Immobilien auf Zypern kaufen: Warum Zypern?',
        whyInvestP1: 'Wer Immobilien auf Zypern kaufen möchte, profitiert von einem stabilen EU-Rechtsrahmen, wachsender internationaler Nachfrage und einem breit aufgestellten Markt aus Wohnungen, Häusern und Neubauprojekten. 2024 lag der Gesamttransaktionswert mit rund 5,7 Milliarden Euro weiterhin auf sehr hohem Niveau, wobei Wohnimmobilien den größten Anteil der Marktaktivität stellten.',
        whyInvestP2: 'Für Käufer mit Fokus auf Haus kaufen Zypern oder Wohnung Zypern kaufen sprechen die solide Tourismusbasis, die laufende Infrastrukturentwicklung und die breite regionale Auswahl. Die Kombination aus Eigennutzung, Zweitwohnsitz und Vermietungspotenzial macht den Markt langfristig attraktiv.',
        bestAreasTitle: 'Haus oder Wohnung in Zypern kaufen: Beste Regionen',
        bestAreasIntro: 'Ob Sie ein Haus kaufen in Zypern oder gezielt nach Zypern Immobilien in Küstenlage suchen: Die wichtigsten Regionen unterscheiden sich bei Preisniveau, Renditechancen und Lebensstil deutlich.',
        bestAreasPaphos: 'Starker Küstenmarkt mit hoher internationaler Nachfrage. Besonders attraktiv für Käufer, die eine Wohnung in Zypern oder ein Haus am Meer suchen.',
        bestAreasLimassol: 'Führendes Wirtschafts- und Investmentzentrum mit höherpreisigen Projekten und internationaler Ausrichtung.',
        bestAreasLarnaca: 'Wachsende Küstenregion mit zunehmender Infrastrukturentwicklung und wettbewerbsfähigen Einstiegspreisen.',
        bestAreasNicosia: 'Verwaltungs- und Geschäftszentrum mit stabiler Inlandsnachfrage.',
        bestAreasOutro: 'Für viele Käufer bleibt Paphos der ausgewogene Einstieg, wenn das Ziel lautet: Immobilien Zypern kaufen mit guter Balance aus Preis, Lage und Nachfrage.',
        neighborhoodsTitle: 'Paphos Stadtteile Guide',
        neighborhoodsHint: 'Klicken Sie auf ein Gebiet, um lokalen Kontext und Immobilienprofil zu sehen.',
        neighborhoodsRealEstateLabel: 'Immobilien',
        neighborhoodsSourcesLabel: 'Quellen'
      },
      es: {
        whyInvestTitle: '¿Por qué invertir en el mercado inmobiliario de Chipre?',
        whyInvestP1: 'Chipre ofrece un mercado inmobiliario resiliente y en crecimiento, respaldado por sólidos fundamentos económicos y su condición de miembro de la Unión Europea. En 2024, el valor total de las transacciones inmobiliarias se mantuvo cerca de niveles récord, alcanzando aproximadamente €5.700 millones, con el segmento residencial representando la mayor parte de la actividad. El crecimiento económico continúa superando la media de la eurozona, mientras la inflación se ha moderado y las agencias de calificación han reafirmado el grado de inversión del país.',
        whyInvestP2: 'La demanda residencial se mantiene impulsada por compradores internacionales, la recuperación del turismo y una actividad doméstica estable. El valor de los permisos de construcción aumentó significativamente en 2024, señalando una nueva fase de desarrollo. Estos factores generan un entorno atractivo a largo plazo para inversores que buscan estabilidad, ingresos sostenibles y preservación de capital dentro de un mercado regulado de la UE.',
        bestAreasTitle: 'Mejores zonas para comprar propiedad en Chipre',
        bestAreasIntro: 'Chipre cuenta con distintos mercados regionales, destacando Pafos como una de las zonas más atractivas para compradores e inversores internacionales.',
        bestAreasPaphos: 'Mercado costero consolidado que combina calidad de vida, demanda internacional y desarrollo residencial moderno. Muy popular entre compradores europeos y residentes extranjeros, ofrece precios competitivos en comparación con otros destinos mediterráneos y un sólido potencial de valorización a largo plazo.',
        bestAreasLimassol: 'Principal centro empresarial e inversor de la isla, con proyectos de mayor nivel y fuerte presencia internacional.',
        bestAreasLarnaca: 'Zona costera en crecimiento con mejoras de infraestructura y precios de entrada más accesibles.',
        bestAreasNicosia: 'Capital administrativa con demanda residencial estable y enfoque más doméstico.',
        bestAreasOutro: 'Pafos continúa posicionándose como una opción equilibrada entre inversión, estilo de vida y estabilidad dentro del mercado de la Unión Europea.',
        neighborhoodsTitle: 'Guía de Barrios de Pafos',
        neighborhoodsHint: 'Haz clic en un barrio para ver contexto local y su perfil inmobiliario.',
        neighborhoodsRealEstateLabel: 'Inmobiliario',
        neighborhoodsSourcesLabel: 'Fuentes'
      }
    };
    const cyprusContent = cyprusSectionContent[lang] || cyprusSectionContent.en;
    const paphosNeighborhoodNames = (((locations || {}).Cyprus || {}).Paphos && Array.isArray(locations.Cyprus.Paphos))
      ? locations.Cyprus.Paphos
      : [];
    const normalizePaphosKey = (value) => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
    const paphosNeighborhoodContent = {
      en: {
        'Kato Paphos': { summary: 'Coastal core of Paphos with promenade access, hospitality infrastructure and year-round international footfall.', realEstate: 'Strong concentration of apartments and holiday-oriented units; robust short- and medium-term rental demand profile.' },
        'Tombs of the Kings': { summary: 'Popular west-coast zone near beach corridors and major services, favored by international residents.', realEstate: 'Apartment-heavy stock with active resale market and broad buyer base seeking coastal accessibility.' },
        'Universal': { summary: 'Established residential quarter close to central Paphos and seafront areas, with practical everyday amenities.', realEstate: 'Mix of apartments and townhouse-style communities, often targeted by buyers seeking balanced value and location.' },
        'Chloraka': { summary: 'Suburban coastal belt between central Paphos and Coral Bay, combining village feel with city access.', realEstate: 'Diverse inventory from low-rise apartments to villas, with steady owner-occupier and second-home demand.' },
        'Geroskipou': { summary: 'Municipality east of central Paphos with growing residential footprint and local service base.', realEstate: 'Balanced market of apartments and detached homes, popular with long-term residents and relocation buyers.' },
        'Yeroskipou': { summary: 'Municipality east of central Paphos with growing residential footprint and local service base.', realEstate: 'Balanced market of apartments and detached homes, popular with long-term residents and relocation buyers.' },
        'Peyia': { summary: 'Hillside municipality north-west of Paphos with sea views and proximity to Coral Bay.', realEstate: 'Villa-led segment with strong second-home appeal and resilient demand in view-oriented micro-locations.' },
        'Coral Bay': { summary: 'Prime beachfront leisure area with strong tourism profile and established hospitality ecosystem.', realEstate: 'Coastal villas and holiday apartments command premium seasonality and sustained international interest.' },
        'Tala': { summary: 'Elevated residential village above Paphos known for cooler climate and panoramic outlook.', realEstate: 'Predominantly detached housing with demand from buyers prioritizing space, views and long-term residency.' },
        'Konia': { summary: 'Residential village on the eastern approach to Paphos, with direct road access toward city and highway links.', realEstate: 'Mostly houses and low-density projects, attractive for families and owner-occupiers.' },
        'Emba': { summary: 'Traditional village area near central Paphos with convenient access to schools and daily services.', realEstate: 'Blend of local housing stock and newer residential projects at generally mid-market pricing.' }
      },
      de: {
        'Kato Paphos': { summary: 'Küstennaher Kernbereich von Paphos mit Promenade, touristischer Infrastruktur und internationaler Nachfrage.', realEstate: 'Hoher Apartmentanteil mit starker Nachfrage im Ferien- und Langzeitvermietungssegment.' },
        'Tombs of the Kings': { summary: 'Beliebte Westküstenlage nahe Strand und Versorgungseinrichtungen, besonders bei internationalen Käufern.', realEstate: 'Apartmentlastiger Bestand mit aktivem Wiederverkaufsmarkt und breiter Käuferbasis.' },
        'Universal': { summary: 'Etabliertes Wohnquartier nahe Zentrum und Küste mit guter Alltagsinfrastruktur.', realEstate: 'Mischung aus Apartments und Townhouse-Anlagen, häufig mit attraktivem Preis-Lage-Verhältnis.' },
        'Chloraka': { summary: 'Küstennahe Vorstadt zwischen Paphos Zentrum und Coral Bay mit guter Erreichbarkeit.', realEstate: 'Diverses Angebot von Apartments bis Villen; stabile Nachfrage von Eigennutzern und Zweitwohnsitzkäufern.' },
        'Geroskipou': { summary: 'Gemeinde östlich von Paphos mit wachsender Wohnstruktur und lokalem Dienstleistungsangebot.', realEstate: 'Ausgewogener Markt aus Apartments und Einfamilienhäusern, gefragt bei Langzeitnutzern.' },
        'Yeroskipou': { summary: 'Gemeinde östlich von Paphos mit wachsender Wohnstruktur und lokalem Dienstleistungsangebot.', realEstate: 'Ausgewogener Markt aus Apartments und Einfamilienhäusern, gefragt bei Langzeitnutzern.' },
        'Peyia': { summary: 'Hügellage nordwestlich von Paphos mit Meerblick und Nähe zu Coral Bay.', realEstate: 'Villenorientierter Teilmarkt mit starker Nachfrage im Zweitwohnsitzsegment.' },
        'Coral Bay': { summary: 'Strandnahe Prime-Lage mit ausgeprägtem Tourismus- und Freizeitprofil.', realEstate: 'Küstenvillen und Ferienapartments erzielen überdurchschnittliche Nachfrage in internationalen Zielgruppen.' },
        'Tala': { summary: 'Erhöht gelegenes Wohngebiet oberhalb von Paphos mit Panorama und ruhigerem Wohnumfeld.', realEstate: 'Vor allem freistehende Häuser, beliebt bei Käufern mit Fokus auf Raum und Ausblick.' },
        'Konia': { summary: 'Wohnort am östlichen Stadtrand von Paphos mit direkter Anbindung an Stadt und Fernstraßen.', realEstate: 'Überwiegend Häuser und niedrig verdichtete Projekte, attraktiv für Familien.' },
        'Emba': { summary: 'Traditionell geprägtes Gebiet nahe Paphos Zentrum mit guter Nähe zu Schulen und Nahversorgung.', realEstate: 'Kombination aus Bestandsobjekten und neueren Wohnprojekten im mittleren Preissegment.' }
      },
      es: {
        'Kato Paphos': { summary: 'Núcleo costero de Pafos con paseo marítimo, infraestructura turística y demanda internacional estable.', realEstate: 'Alta concentración de apartamentos y vivienda vacacional; mercado de alquiler muy activo.' },
        'Tombs of the Kings': { summary: 'Zona costera popular cerca de playa y servicios, muy demandada por compradores internacionales.', realEstate: 'Stock mayoritario de apartamentos con mercado de reventa dinámico y base compradora amplia.' },
        'Universal': { summary: 'Barrio residencial consolidado cerca del centro de Pafos y de la franja costera.', realEstate: 'Mezcla de apartamentos y complejos tipo townhouse, valorado por equilibrio entre precio y ubicación.' },
        'Chloraka': { summary: 'Franja suburbana costera entre el centro de Pafos y Coral Bay, con buena conectividad.', realEstate: 'Oferta diversa de apartamentos y villas, con demanda estable de residencia habitual y segunda vivienda.' },
        'Geroskipou': { summary: 'Municipio al este de Pafos con crecimiento residencial y servicios locales consolidados.', realEstate: 'Mercado equilibrado de apartamentos y viviendas unifamiliares, atractivo para compradores de largo plazo.' },
        'Yeroskipou': { summary: 'Municipio al este de Pafos con crecimiento residencial y servicios locales consolidados.', realEstate: 'Mercado equilibrado de apartamentos y viviendas unifamiliares, atractivo para compradores de largo plazo.' },
        'Peyia': { summary: 'Municipio en ladera al noroeste de Pafos, con vistas al mar y cercanía a Coral Bay.', realEstate: 'Segmento más orientado a villas, con alta tracción en segunda residencia internacional.' },
        'Coral Bay': { summary: 'Zona prime de playa con fuerte componente turístico y de ocio.', realEstate: 'Villas costeras y apartamentos vacacionales con demanda internacional sostenida.' },
        'Tala': { summary: 'Área residencial elevada sobre Pafos, conocida por su entorno tranquilo y vistas panorámicas.', realEstate: 'Predominio de vivienda unifamiliar, demandada por compradores que priorizan espacio y calidad de vida.' },
        'Konia': { summary: 'Zona residencial en el acceso este de Pafos, bien conectada con ciudad y vías principales.', realEstate: 'Principalmente casas y desarrollos de baja densidad, con perfil familiar.' },
        'Emba': { summary: 'Área tradicional próxima al centro de Pafos, con acceso cómodo a colegios y servicios diarios.', realEstate: 'Combinación de stock local y proyectos residenciales recientes en rangos de precio medios.' }
      }
    };
    const selectedPaphosNeighborhoodContent = paphosNeighborhoodContent[lang] || paphosNeighborhoodContent.en;
    const fallbackPaphosNeighborhoodContent = paphosNeighborhoodContent.en;
    const selectedPaphosByNormalized = Object.entries(selectedPaphosNeighborhoodContent).reduce((acc, [key, val]) => {
      acc[normalizePaphosKey(key)] = val;
      return acc;
    }, {});
    const fallbackPaphosByNormalized = Object.entries(fallbackPaphosNeighborhoodContent).reduce((acc, [key, val]) => {
      acc[normalizePaphosKey(key)] = val;
      return acc;
    }, {});
    const paphosNeighborhoods = paphosNeighborhoodNames.map((name) => {
      const normalized = normalizePaphosKey(name);
      const item = selectedPaphosNeighborhoodContent[name]
        || selectedPaphosByNormalized[normalized]
        || fallbackPaphosNeighborhoodContent[name]
        || fallbackPaphosByNormalized[normalized]
        || {
          summary: lang === 'de'
            ? 'Wohngebiet im Großraum Paphos mit lokaler Infrastruktur und guter Erreichbarkeit zur Küste.'
            : lang === 'es'
              ? 'Zona residencial del área de Pafos con servicios locales y buen acceso a la costa.'
              : 'Residential area in greater Paphos with local amenities and convenient access to coastal zones.',
          realEstate: lang === 'de'
            ? 'Gemischter Wohnungs- und Hausbestand mit stabiler Nachfrage von Eigennutzern und Zweitwohnsitzkäufern.'
            : lang === 'es'
              ? 'Stock mixto de apartamentos y viviendas, con demanda estable de usuarios finales y segunda residencia.'
              : 'Mixed stock of apartments and houses with stable demand from owner-occupiers and second-home buyers.'
        };
      return { name, summary: item.summary || '', realEstate: item.realEstate || '' };
    });

    res.render('properties-for-sale-cyprus', {
      title: titles[lang] || titles.en,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/cyprus-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: metaDescriptions[lang] || metaDescriptions.en,
      cyprusPagePaths,
      cyprusContent,
      paphosNeighborhoods,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      cyprusProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// Cyprus EN dedicated landing page: Villas for Sale in Cyprus
exports.villasForSaleCyprusPage = async (req, res, next) => {
  try {
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at, p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Cyprus'
        AND LOWER(COALESCE(p.type, '')) = 'villa'
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const { rows: properties } = await query(propertiesSql);
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, 'en'),
        description: (p.description_i18n && p.description_i18n.en) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const baseUrl = res.locals.baseUrl;
    const canonicalUrl = `${baseUrl}/en/villas-for-sale-cyprus`;
    const hreflangAlternates = {
      'de-de': `${baseUrl}/immobilien-zypern-kaufen`,
      'en-us': canonicalUrl,
      'es-es': `${baseUrl}/es/propiedades-en-venta-chipre`
    };

    res.render('villas-for-sale-cyprus', {
      title: 'Cyprus Villas for Sale | Sweet Home',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/cyprus-villas-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription: 'Discover Cyprus villas for sale in Paphos. Compare prices, locations, and features with local guidance from Sweet Home.',
      recommendedProperties,
      baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Charlottenburg (Berlin)
exports.charlottenburgPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const districtPattern = '%charlottenburg%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT 9
    `;
    const statsSql = `
      SELECT
        COUNT(*)::int AS total_properties,
        ROUND(AVG(p.price))::int AS avg_price,
        ROUND(AVG(
          CASE
            WHEN p.type = 'Apartment' THEN p.apartment_size
            WHEN p.type IN ('House', 'Villa') THEN p.living_space
            WHEN p.type = 'Land' THEN p.land_size
            ELSE NULL
          END
        ))::int AS avg_size
      FROM properties p
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
    `;

    const [{ rows: properties }, { rows: projects }, { rows: statsRows }] = await Promise.all([
      query(propertiesSql, [districtPattern]),
      query(projectsSql, [districtPattern]),
      query(statsSql, [districtPattern])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const charlottenburgProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const stats = statsRows && statsRows[0] ? statsRows[0] : {};
    const districtStats = {
      totalProperties: Number(stats.total_properties) || 0,
      avgPrice: Number(stats.avg_price) || 0,
      avgSize: Number(stats.avg_size) || 0
    };

    const baseUrl = res.locals.baseUrl;
    const charlottenburgUrls = {
      de: `${baseUrl}/wohnung-kaufen-charlottenburg`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const canonicalUrl = charlottenburgUrls.de;
    const hreflangAlternates = {
      'en-us': charlottenburgUrls.en,
      'de-de': charlottenburgUrls.de,
      'es-es': charlottenburgUrls.es
    };
    const pageMetaDescription = 'Wohnung kaufen Charlottenburg: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.';
    const pageTitle = 'Wohnung kaufen Charlottenburg | Sweet Home';
    const districtContent = {
      heroTitle: 'Wohnung kaufen Charlottenburg',
      heroDescription: 'Charlottenburg gehört zu den gefragtesten Wohnlagen Berlins. Hier treffen klassische Altbauten, hochwertige Modernisierungen und starke Mikrolagen auf eine stabile Nachfrage von Eigennutzern und Kapitalanlegern.',
      sectionTitleProperties: 'Eigentumswohnungen in Charlottenburg',
      sectionTitleProjects: 'Neubauprojekte in und um Charlottenburg',
      sectionTitleWhy: 'Warum Charlottenburg für Immobilienkäufer so attraktiv ist',
      whyP1: 'Charlottenburg überzeugt mit urbaner Lebensqualität, exzellenter Infrastruktur und hoher Standortstabilität. Die Kombination aus repräsentativen Straßenzügen, Naherholung und starker Anbindung macht den Bezirk für unterschiedliche Käuferprofile attraktiv.',
      whyP2: 'Für Investoren bietet der Teilmarkt eine solide Vermietbarkeit, während Eigennutzer von etablierten Kiezen, kurzen Wegen und einer konstant hohen Nachfrage profitieren. Besonders zentrale Mikrolagen zeigen langfristig robuste Wertentwicklung.',
      sectionTitleMicro: 'Beliebte Mikrolagen in Charlottenburg',
      microAreas: [
        'Savignyplatz & Umgebung – urban, lebendig und architektonisch stark gefragt.',
        'Lietzensee – ruhiges, hochwertiges Wohnumfeld mit hoher Aufenthaltsqualität.',
        'Kurfürstendamm-Nähe – repräsentative Lage mit internationaler Nachfrage.',
        'Schloss Charlottenburg – charmante Bestandsquartiere mit stabilem Käuferinteresse.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Charlottenburg',
      faq: [
        {
          q: 'Ist Charlottenburg eher für Eigennutzer oder Kapitalanleger geeignet?',
          a: 'Beides. Eigennutzer schätzen Lagequalität und Infrastruktur, Kapitalanleger die stabile Nachfrage, gute Vermietbarkeit und die hohe Standortresilienz.'
        },
        {
          q: 'Welche Wohnungsarten sind in Charlottenburg besonders gefragt?',
          a: 'Sehr gefragt sind modernisierte Altbauwohnungen, gut geschnittene 2- bis 4-Zimmer-Einheiten und hochwertige Neubauwohnungen in zentralen Mikrolagen.'
        },
        {
          q: 'Wie unterscheidet sich Charlottenburg von anderen Berliner Bezirken?',
          a: 'Charlottenburg bietet eine seltene Kombination aus Prestige, gewachsener Nachbarschaft, starker Infrastruktur und langfristig stabiler Nachfrage im Kaufsegment.'
        },
        {
          q: 'Wie unterstützt Sweet Home beim Wohnungskauf in Charlottenburg?',
          a: 'Wir begleiten den gesamten Kaufprozess: Objektselektion, Markt-Einordnung, Besichtigungskoordination, Verhandlung und Support bis zum Abschluss.'
        }
      ]
    };

    res.render('properties-charlottenburg-de', {
      title: pageTitle,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/charlottenburg-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription,
      districtContent,
      districtStats,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      charlottenburgProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Moabit (Berlin)
exports.moabitPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const districtPattern = '%moabit%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT 9
    `;

    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [districtPattern]),
      query(projectsSql, [districtPattern])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const moabitProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-moabit`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const canonicalUrl = districtUrls.de;
    const hreflangAlternates = {
      'en-us': districtUrls.en,
      'de-de': districtUrls.de,
      'es-es': districtUrls.es
    };
    const pageMetaDescription = 'Wohnung kaufen Moabit: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.';
    const pageTitle = 'Wohnung kaufen Moabit | Sweet Home';
    const districtContent = {
      heroTitle: 'Wohnung kaufen Moabit',
      heroDescription: 'Moabit entwickelt sich dynamisch und verbindet zentrale Lage, urbane Vielfalt und attraktive Wohnquartiere. Der Teilmarkt ist besonders interessant für Käufer, die Berlin-Mitte-Nähe mit Preis-Leistungs-Potenzial suchen.',
      sectionTitleProperties: 'Eigentumswohnungen in Moabit',
      sectionTitleProjects: 'Neubauprojekte in Moabit',
      sectionTitleWhy: 'Warum Moabit als Wohn- und Investmentstandort überzeugt',
      whyP1: 'Moabit profitiert von seiner Lage zwischen Mitte, Tiergarten und Hauptbahnhof. Die Mischung aus gewachsenen Kiezen, Wasserlagen und laufender Quartiersentwicklung sorgt für hohe Nachfrage bei Eigennutzern und Kapitalanlegern.',
      whyP2: 'Durch die zentrale Anbindung und die zunehmende Aufwertung einzelner Mikrolagen bietet Moabit Chancen auf stabile Vermietbarkeit und langfristige Wertentwicklung. Besonders gefragte Segmente sind gut geschnittene Altbau- und modernisierte Bestandswohnungen.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Moabit',
      microAreas: [
        'Arminiusmarkthalle & Stephankiez – urbanes Kiezleben mit hoher Wohnnachfrage.',
        'Spree- und Kanalnähe – attraktive Wohnlagen mit guter Aufenthaltsqualität.',
        'Umfeld Hauptbahnhof – stark angebunden, beliebt bei Berufspendlern und internationalen Käufern.',
        'Beusselkiez – gewachsener Bestand mit Entwicklungspotenzial.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Moabit',
      faq: [
        {
          q: 'Ist Moabit eher ein aufstrebender oder bereits etablierter Teilmarkt?',
          a: 'Moabit gilt als etablierter, aber weiterhin dynamischer Teilmarkt. In vielen Mikrolagen ist die Nachfrage konstant hoch, während einzelne Quartiere noch zusätzliches Aufwertungspotenzial bieten.'
        },
        {
          q: 'Für welche Käuferprofile ist Moabit besonders geeignet?',
          a: 'Moabit ist attraktiv für Eigennutzer mit Wunsch nach zentraler Lage sowie für Kapitalanleger, die auf stabile Vermietbarkeit und gute Verkehrsanbindung setzen.'
        },
        {
          q: 'Wie ist die Mikrolagen-Struktur in Moabit zu bewerten?',
          a: 'Es gibt deutliche Unterschiede zwischen ruhigen Wohnstraßen, wassergeprägten Lagen und stärker frequentierten Achsen. Eine differenzierte Objekt- und Lagenprüfung ist deshalb entscheidend.'
        },
        {
          q: 'Wie unterstützt Sweet Home beim Kauf in Moabit?',
          a: 'Wir begleiten die Auswahl passender Objekte, ordnen Preisniveaus und Mikrolagen ein, verhandeln mit Verkäufern und begleiten den Prozess bis zum Abschluss.'
        }
      ]
    };

    res.render('properties-moabit-de', {
      title: pageTitle,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/moabit-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription,
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      moabitProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Friedrichshain-Kreuzberg (Berlin)
exports.friedrichshainKreuzbergPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const districtPattern = '%friedrichshain-kreuzberg%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.title_i18n,
        p.description,
        p.description_i18n,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        p.min_price,
        p.max_price,
        p.total_units,
        p.completion_date,
        p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT 9
    `;

    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [districtPattern]),
      query(projectsSql, [districtPattern])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const friedrichshainKreuzbergProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-friedrichshain-kreuzberg`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const canonicalUrl = districtUrls.de;
    const hreflangAlternates = {
      'en-us': districtUrls.en,
      'de-de': districtUrls.de,
      'es-es': districtUrls.es
    };
    const pageMetaDescription = 'Wohnung kaufen Friedrichshain-Kreuzberg: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.';
    const pageTitle = 'Wohnung kaufen Friedrichshain-Kreuzberg | Sweet Home';
    const districtContent = {
      heroTitle: 'Wohnung kaufen Friedrichshain-Kreuzberg',
      heroDescription: 'Friedrichshain-Kreuzberg zählt zu den nachfragestärksten Wohnmärkten Berlins. Der Bezirk verbindet urbanen Lifestyle, kreative Quartiere und starke Mikrostandorte mit hoher Kauf- und Mietdynamik.',
      sectionTitleProperties: 'Eigentumswohnungen in Friedrichshain-Kreuzberg',
      sectionTitleProjects: 'Neubauprojekte in Friedrichshain-Kreuzberg',
      sectionTitleWhy: 'Warum Friedrichshain-Kreuzberg für Käufer besonders attraktiv ist',
      whyP1: 'Der Bezirk profitiert von seiner zentralen Lage, starken Kiezidentität und anhaltenden Nachfrage bei nationalen und internationalen Käufern. Viele Teilmärkte zeigen eine stabile Preisbereitschaft trotz begrenztem Angebot.',
      whyP2: 'Für Eigennutzer bietet Friedrichshain-Kreuzberg hohe Lebensqualität und kurze Wege. Für Investoren sind die langfristige Vermietbarkeit, die urbane Anziehungskraft und die hohe Liquidität zentrale Pluspunkte.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Friedrichshain-Kreuzberg',
      microAreas: [
        'Bergmannkiez – etablierte Wohnlage mit hoher Nachfrage und starker Kiezstruktur.',
        'Wrangelkiez & Spreeumfeld – urbane Lage mit internationaler Strahlkraft.',
        'Samariterkiez – beliebter Friedrichshainer Wohnbereich mit guter Infrastruktur.',
        'Ostkreuz-Umfeld – dynamische Entwicklung und sehr gute Anbindung.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Friedrichshain-Kreuzberg',
      faq: [
        {
          q: 'Ist Friedrichshain-Kreuzberg für Eigennutzer geeignet?',
          a: 'Ja. Der Bezirk bietet ein urbanes Wohnumfeld, starke Nahversorgung und sehr gute Verkehrsanbindung. Besonders gefragt sind gut geschnittene Wohnungen in etablierten Kiezen.'
        },
        {
          q: 'Wie attraktiv ist der Bezirk für Kapitalanleger?',
          a: 'Friedrichshain-Kreuzberg gilt als sehr liquider Teilmarkt mit stabiler Nachfrage. Für Kapitalanleger sind Vermietbarkeit, Standortimage und langfristige Werthaltigkeit besonders relevant.'
        },
        {
          q: 'Gibt es große Preisunterschiede innerhalb des Bezirks?',
          a: 'Ja, deutlich. Zwischen einzelnen Mikrolagen bestehen teils erhebliche Unterschiede bei Preisniveau, Nachfrage und Käuferstruktur. Eine genaue Lageanalyse ist essenziell.'
        },
        {
          q: 'Wie unterstützt Sweet Home beim Kauf im Bezirk?',
          a: 'Wir unterstützen bei Objektselektion, Preis- und Lagenbewertung, Besichtigungskoordination, Verhandlung und begleiten Sie bis zum erfolgreichen Abschluss.'
        }
      ]
    };

    res.render('properties-friedrichshain-kreuzberg-de', {
      title: pageTitle,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/friedrichshain-kreuzberg-properties-head',
      canonicalUrl,
      hreflangAlternates,
      pageMetaDescription,
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      friedrichshainKreuzbergProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Schoeneberg (Berlin)
exports.schoenebergPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const patternWithUmlaut = '%schöneberg%';
    const patternWithoutUmlaut = '%schoneberg%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND (
          LOWER(COALESCE(p.neighborhood, '')) LIKE $1
          OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2
        )
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id, p.slug, p.title, p.title_i18n, p.description, p.description_i18n,
        p.country, p.city, p.neighborhood, p.photos, p.min_price, p.max_price,
        p.total_units, p.completion_date, p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND (
          LOWER(COALESCE(p.neighborhood, '')) LIKE $1
          OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2
        )
      ORDER BY p.created_at DESC
      LIMIT 9
    `;

    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [patternWithUmlaut, patternWithoutUmlaut]),
      query(projectsSql, [patternWithUmlaut, patternWithoutUmlaut])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const schoenebergProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-schoeneberg`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const districtContent = {
      heroTitle: 'Wohnung kaufen Schöneberg',
      heroDescription: 'Schöneberg vereint Berliner Altbaucharme, zentrale Lage und starke Kiezqualität. Der Bezirk bleibt für Eigennutzer und Kapitalanleger ein gefragter Teilmarkt mit hoher Wohnnachfrage.',
      sectionTitleProperties: 'Eigentumswohnungen in Schöneberg',
      sectionTitleProjects: 'Neubauprojekte in Schöneberg',
      sectionTitleWhy: 'Warum Schöneberg als Wohnlage überzeugt',
      whyP1: 'Schöneberg bietet eine ausgewogene Mischung aus urbanem Leben, ruhigen Wohnstraßen und sehr guter Infrastruktur. Die Nähe zu City-West, Mitte und wichtigen Verkehrsknoten stützt die Nachfrage nachhaltig.',
      whyP2: 'Für Käufer ist Schöneberg attraktiv durch seine vielseitige Mikrolagenstruktur und stabile Marktliquidität. Besonders gefragt sind modernisierte Altbauwohnungen sowie gut angebundene Familiengrundrisse.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Schöneberg',
      microAreas: [
        'Akazienkiez – beliebtes Quartier mit starker Nahversorgung.',
        'Bayerisches Viertel – ruhige Wohnlage mit hochwertigem Bestand.',
        'Nollendorfplatz-Umfeld – zentral, lebendig und international nachgefragt.',
        'Rote Insel – gewachsener Kiez mit stabiler Wohnnachfrage.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Schöneberg',
      faq: [
        { q: 'Ist Schöneberg für Eigennutzer geeignet?', a: 'Ja, insbesondere durch die gute Infrastruktur, zentrale Lage und die hohe Lebensqualität in den gewachsenen Kiezen.' },
        { q: 'Wie attraktiv ist Schöneberg für Kapitalanleger?', a: 'Schöneberg ist ein liquider Teilmarkt mit konstantem Nachfrageprofil. Gut positionierte Objekte weisen in der Regel eine solide Vermietbarkeit auf.' },
        { q: 'Welche Wohnungstypen sind besonders gefragt?', a: 'Gefragt sind vor allem modernisierte Altbauten, 2- bis 4-Zimmer-Wohnungen sowie familiengerechte Grundrisse in ruhigen Seitenlagen.' },
        { q: 'Wie begleitet Sweet Home den Kauf in Schöneberg?', a: 'Wir übernehmen die strukturierte Objektselektion, Lage- und Preisbewertung, Verhandlung sowie den Support bis zum Abschluss.' }
      ]
    };

    res.render('properties-schoeneberg-de', {
      title: 'Wohnung kaufen Schöneberg | Sweet Home',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/schoeneberg-properties-head',
      canonicalUrl: districtUrls.de,
      hreflangAlternates: { 'en-us': districtUrls.en, 'de-de': districtUrls.de, 'es-es': districtUrls.es },
      pageMetaDescription: 'Wohnung kaufen Schöneberg: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      schoenebergProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Prenzlauer Berg (Berlin)
exports.prenzlauerBergPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const districtPattern = '%prenzlauer berg%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id, p.slug, p.title, p.title_i18n, p.description, p.description_i18n,
        p.country, p.city, p.neighborhood, p.photos, p.min_price, p.max_price,
        p.total_units, p.completion_date, p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT 9
    `;

    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [districtPattern]),
      query(projectsSql, [districtPattern])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const prenzlauerBergProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-prenzlauer-berg`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const districtContent = {
      heroTitle: 'Wohnung kaufen Prenzlauer Berg',
      heroDescription: 'Prenzlauer Berg ist einer der begehrtesten Berliner Wohnstandorte. Der Bezirk verbindet historische Altbausubstanz, familienfreundliche Kieze und hohe Nachfrage in zentraler Lage.',
      sectionTitleProperties: 'Eigentumswohnungen in Prenzlauer Berg',
      sectionTitleProjects: 'Neubauprojekte in Prenzlauer Berg',
      sectionTitleWhy: 'Warum Prenzlauer Berg für Immobilienkäufer attraktiv ist',
      whyP1: 'Prenzlauer Berg bietet starke Kiezstrukturen, hohe Lebensqualität und eine stabile Käufernachfrage. Die Kombination aus Altbaucharme, Infrastruktur und urbanem Umfeld macht den Teilmarkt besonders resilient.',
      whyP2: 'Für Eigennutzer sind die familienfreundlichen Strukturen, Schulen und Nahversorgung zentral. Kapitalanleger profitieren von der dauerhaft hohen Nachfrage und der Markttiefe in gut positionierten Lagen.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Prenzlauer Berg',
      microAreas: [
        'Kollwitzkiez – hochwertige Wohnlagen mit starkem Nachfrageprofil.',
        'Helmholtzkiez – familienorientiert und urban zugleich.',
        'Winsviertel – beliebte Altbaustruktur mit gewachsenem Kiezcharakter.',
        'Bötzowviertel – ruhiger, etablierter Wohnstandort mit hoher Standortqualität.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Prenzlauer Berg',
      faq: [
        { q: 'Ist Prenzlauer Berg eher ein Premium-Teilmarkt?', a: 'Ja, viele Mikrolagen gelten als premiumorientiert und weisen eine konstant hohe Nachfrage bei Eigennutzern und Kapitalanlegern auf.' },
        { q: 'Für welche Käufer ist Prenzlauer Berg besonders geeignet?', a: 'Der Bezirk ist besonders attraktiv für Familien, Berufstätige und internationale Käufer, die zentrale Lage mit hoher Lebensqualität verbinden möchten.' },
        { q: 'Welche Objekttypen sind in Prenzlauer Berg gefragt?', a: 'Vor allem modernisierte Altbauwohnungen, großzügige Familiengrundrisse und hochwertige sanierte Bestandsobjekte.' },
        { q: 'Wie unterstützt Sweet Home beim Kauf in Prenzlauer Berg?', a: 'Wir unterstützen bei der Selektion passender Objekte, der Einordnung von Mikrolagen, der Verhandlung und der vollständigen Kaufabwicklung.' }
      ]
    };

    res.render('properties-prenzlauer-berg-de', {
      title: 'Wohnung kaufen Prenzlauer Berg | Sweet Home',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/prenzlauer-berg-properties-head',
      canonicalUrl: districtUrls.de,
      hreflangAlternates: { 'en-us': districtUrls.en, 'de-de': districtUrls.de, 'es-es': districtUrls.es },
      pageMetaDescription: 'Wohnung kaufen Prenzlauer Berg: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      prenzlauerBergProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Wedding (Berlin)
exports.weddingPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const patternWedding = '%wedding%';
    const patternGesundbrunnen = '%gesundbrunnen%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND (
          LOWER(COALESCE(p.neighborhood, '')) LIKE $1
          OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2
        )
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id, p.slug, p.title, p.title_i18n, p.description, p.description_i18n,
        p.country, p.city, p.neighborhood, p.photos, p.min_price, p.max_price,
        p.total_units, p.completion_date, p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND (
          LOWER(COALESCE(p.neighborhood, '')) LIKE $1
          OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2
        )
      ORDER BY p.created_at DESC
      LIMIT 9
    `;
    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [patternWedding, patternGesundbrunnen]),
      query(projectsSql, [patternWedding, patternGesundbrunnen])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const weddingProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-wedding`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const districtContent = {
      heroTitle: 'Wohnung kaufen Wedding',
      heroDescription: 'Wedding bietet zentrale Lage, gewachsene Kiezstrukturen und dynamische Entwicklung. Der Bezirk ist besonders interessant für Käufer, die Potenzial, Urbanität und solide Nachfrage kombinieren wollen.',
      sectionTitleProperties: 'Eigentumswohnungen in Wedding',
      sectionTitleProjects: 'Neubauprojekte in Wedding',
      sectionTitleWhy: 'Warum Wedding als Wohn- und Investmentstandort attraktiv ist',
      whyP1: 'Wedding profitiert von seiner Nähe zu Mitte, einer starken Verkehrsanbindung und einem vielfältigen Wohnungsbestand. Viele Teilbereiche zeigen weiterhin Aufwertungspotenzial.',
      whyP2: 'Für Eigennutzer bietet Wedding urbane Alltagstauglichkeit, für Kapitalanleger eine breite Nachfragebasis. Besonders gefragt sind sanierte Bestandswohnungen und gut angebundene Mikrolagen.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Wedding',
      microAreas: [
        'Sprengelkiez – stark nachgefragte Wohnlage mit urbanem Kiezcharakter.',
        'Leopoldplatz-Umfeld – zentral, belebt und infrastrukturell gut erschlossen.',
        'Gesundbrunnen-Nähe – sehr gut angebunden mit laufender Entwicklung.',
        'Wedding Nord – gewachsene Wohnquartiere mit Potenzial.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Wedding',
      faq: [
        { q: 'Ist Wedding eher ein Entwicklungs- oder Kernmarkt?', a: 'Wedding ist ein etablierter Berliner Teilmarkt mit aktiver Entwicklung. Je nach Mikrolage unterscheiden sich Preisniveau und Dynamik deutlich.' },
        { q: 'Für wen ist Wedding besonders geeignet?', a: 'Der Bezirk ist attraktiv für Eigennutzer mit urbanem Lebensstil sowie für Kapitalanleger, die auf Nachfrage, Lagevorteile und Entwicklungspotenzial setzen.' },
        { q: 'Welche Wohnungssegmente sind in Wedding gefragt?', a: 'Vor allem gut geschnittene 2- bis 4-Zimmer-Wohnungen, sanierte Altbauten und modernisierte Bestandsobjekte in gut angebundenen Lagen.' },
        { q: 'Wie unterstützt Sweet Home beim Kauf in Wedding?', a: 'Wir begleiten Sie von der Objektauswahl bis zum Abschluss mit Lageanalyse, Preisbewertung, Verhandlung und Transaktionssupport.' }
      ]
    };

    res.render('properties-wedding-de', {
      title: 'Wohnung kaufen Wedding | Sweet Home',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/wedding-properties-head',
      canonicalUrl: districtUrls.de,
      hreflangAlternates: { 'en-us': districtUrls.en, 'de-de': districtUrls.de, 'es-es': districtUrls.es },
      pageMetaDescription: 'Wohnung kaufen Wedding: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      weddingProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

// German district landing page: Tempelhof (Berlin)
exports.tempelhofPropertiesPageDe = async (req, res, next) => {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const districtPattern = '%tempelhof%';
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id, p.slug, p.title, p.title_i18n, p.description, p.description_i18n,
        p.country, p.city, p.neighborhood, p.photos, p.min_price, p.max_price,
        p.total_units, p.completion_date, p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND LOWER(COALESCE(p.neighborhood, '')) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT 9
    `;
    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, [districtPattern]),
      query(projectsSql, [districtPattern])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });
    const tempelhofProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      de: `${baseUrl}/wohnung-kaufen-tempelhof`,
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };
    const districtContent = {
      heroTitle: 'Wohnung kaufen Tempelhof',
      heroDescription: 'Tempelhof kombiniert ruhige Wohnlagen, sehr gute Anbindung und gewachsene Nachbarschaften. Der Bezirk ist für Eigennutzer und Kapitalanleger ein stabiler Teilmarkt mit solider Nachfrage.',
      sectionTitleProperties: 'Eigentumswohnungen in Tempelhof',
      sectionTitleProjects: 'Neubauprojekte in Tempelhof',
      sectionTitleWhy: 'Warum Tempelhof für Immobilienkäufer interessant ist',
      whyP1: 'Tempelhof bietet eine ausgewogene Wohnstruktur mit guten Schulen, Nahversorgung und Parkflächen. Die Verkehrsanbindung in Richtung Innenstadt und Süd-Berlin ist ein klarer Standortvorteil.',
      whyP2: 'Käufer profitieren von einem stabilen Nachfrageprofil und vielseitigen Wohnungsangeboten. Besonders beliebt sind gut geschnittene Familienwohnungen und modernisierte Bestandsobjekte.',
      sectionTitleMicro: 'Gefragte Mikrolagen in Tempelhof',
      microAreas: [
        'Tempelhofer Damm-Umfeld – zentral und infrastrukturell stark.',
        'Tempelhofer Feld-Nähe – hohe Freizeitqualität und Wohnattraktivität.',
        'Alt-Tempelhof – gewachsene Nachbarschaften mit stabiler Nachfrage.',
        'Übergang zu Neukölln/Schöneberg – sehr gut angebundene Mikrolagen.'
      ],
      sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Tempelhof',
      faq: [
        { q: 'Ist Tempelhof eher für Familien oder Singles geeignet?', a: 'Tempelhof ist für beide Zielgruppen geeignet. Familien schätzen die ruhigen Wohnlagen, Singles die gute Anbindung und Nahversorgung.' },
        { q: 'Wie ist die Nachfrage im Tempelhofer Wohnungsmarkt?', a: 'Die Nachfrage gilt als stabil, insbesondere bei gut angebundenen Objekten mit funktionalen Grundrissen und solider Gebäudequalität.' },
        { q: 'Welche Lagen sind in Tempelhof besonders gefragt?', a: 'Gefragt sind insbesondere Lagen rund um das Tempelhofer Feld, Alt-Tempelhof und gut erschlossene Bereiche entlang wichtiger Verkehrsachsen.' },
        { q: 'Wie hilft Sweet Home beim Kauf in Tempelhof?', a: 'Wir unterstützen mit datenbasierter Lage- und Preisanalyse, passender Objektselektion und vollständiger Begleitung bis zum Kaufabschluss.' }
      ]
    };

    res.render('properties-tempelhof-de', {
      title: 'Wohnung kaufen Tempelhof | Sweet Home',
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/tempelhof-properties-head',
      canonicalUrl: districtUrls.de,
      hreflangAlternates: { 'en-us': districtUrls.en, 'de-de': districtUrls.de, 'es-es': districtUrls.es },
      pageMetaDescription: 'Wohnung kaufen Tempelhof: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
      districtContent,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      tempelhofProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
};

async function renderBerlinDistrictPageDe(req, res, next, config) {
  try {
    const neighborhoodCounts = await getNeighborhoodCountMap(locations);
    const propertiesSql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.rooms, p.bathrooms,
        CASE
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.created_at,
        p.description,
        COALESCE(ps.views, 0) AS views,
        u.name as agent_name,
        u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN property_stats ps ON ps.property_id = p.id
      WHERE p.country = 'Germany'
        AND p.city = 'Berlin'
        AND ${config.propertiesWhere}
      ORDER BY COALESCE(ps.views, 0) DESC, p.created_at DESC
      LIMIT 30
    `;
    const projectsSql = `
      SELECT
        p.id, p.slug, p.title, p.title_i18n, p.description, p.description_i18n,
        p.country, p.city, p.neighborhood, p.photos, p.min_price, p.max_price,
        p.total_units, p.completion_date, p.created_at
      FROM projects p
      WHERE p.status = 'active'
        AND p.country = 'Germany'
        AND p.city = 'Berlin'
        AND ${config.projectsWhere}
      ORDER BY p.created_at DESC
      LIMIT 9
    `;

    const [{ rows: properties }, { rows: projects }] = await Promise.all([
      query(propertiesSql, config.propertiesParams || []),
      query(projectsSql, config.projectsParams || [])
    ]);

    const lang = 'de';
    const recommendedProperties = (properties || []).map((p) => {
      const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      return {
        ...p,
        title: getLocalizedTitle(p, lang),
        description: (p.description_i18n && p.description_i18n[lang]) || p.description,
        photos,
        agent: { name: p.agent_name || 'Agent', profile_picture: p.agent_profile_picture || null }
      };
    });

    const districtProjects = (projects || []).map((project) => {
      const photos = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
      const normalizedPhotos = photos.map((ph) => {
        if (!ph) return ph;
        const phStr = String(ph);
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) return phStr;
        return `/uploads/projects/${project.id}/${phStr}`;
      });
      const titleI18n = project.title_i18n && typeof project.title_i18n === 'object' ? project.title_i18n : null;
      const descriptionI18n = project.description_i18n && typeof project.description_i18n === 'object' ? project.description_i18n : null;
      return {
        ...project,
        title: (titleI18n && (titleI18n[lang] || titleI18n.en)) || project.title,
        description: (descriptionI18n && (descriptionI18n[lang] || descriptionI18n.en)) || project.description,
        photos: normalizedPhotos,
        slug: project.slug || `project-${project.id}`
      };
    });

    const baseUrl = res.locals.baseUrl;
    const districtUrls = {
      en: `${baseUrl}/en/properties-for-sale-berlin`,
      de: `${baseUrl}${config.path}`,
      es: `${baseUrl}/es/propiedades-en-venta-berlin`
    };

    res.render('properties-berlin-district-de', {
      title: config.title,
      useMainContainer: false,
      useHomeHeader: true,
      headPartial: '../partials/seo/berlin-district-properties-head',
      canonicalUrl: districtUrls.de,
      hreflangAlternates: { 'en-us': districtUrls.en, 'de-de': districtUrls.de, 'es-es': districtUrls.es },
      pageMetaDescription: config.metaDescription,
      districtContent: config.content,
      districtDisplayName: config.displayName,
      districtHeroImage: config.heroImage,
      defaultNeighborhood: config.defaultNeighborhood || config.displayName,
      locations,
      neighborhoodCounts,
      recommendedProperties,
      districtProjects,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) {
    next(err);
  }
}

// German district landing page: Neukölln (Berlin)
exports.neukoellnPropertiesPageDe = async (req, res, next) => renderBerlinDistrictPageDe(req, res, next, {
  path: '/wohnung-kaufen-neukoelln',
  displayName: 'Neukölln',
  defaultNeighborhood: 'Neukölln',
  heroImage: '/images/Neukölln.jpg',
  title: 'Wohnung kaufen Neukölln | Sweet Home',
  metaDescription: 'Wohnung kaufen Neukölln: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
  propertiesWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
  propertiesParams: ['%neukölln%', '%neukolln%'],
  projectsWhere: "(LOWER(COALESCE(p.neighborhood, '')) LIKE $1 OR LOWER(COALESCE(p.neighborhood, '')) LIKE $2)",
  projectsParams: ['%neukölln%', '%neukolln%'],
  content: {
    heroTitle: 'Wohnung kaufen Neukölln',
    heroDescription: 'Neukölln verbindet urbanes Leben, hohe Dynamik und vielfältige Mikrolagen. Der Bezirk ist für Eigennutzer und Investoren interessant, die Entwicklungspotenzial und Nachfrage suchen.',
    sectionTitleProperties: 'Eigentumswohnungen in Neukölln',
    sectionTitleProjects: 'Neubauprojekte in Neukölln',
    sectionTitleWhy: 'Warum Neukölln für Immobilienkäufer interessant ist',
    whyP1: 'Neukölln bietet eine starke urbane Nachfrage, gute ÖPNV-Anbindung und ein breites Angebot von Altbau bis modernisiertem Bestand. Viele Kieze haben in den letzten Jahren deutlich an Attraktivität gewonnen.',
    whyP2: 'Käufer profitieren von lebendigen Quartieren, internationalem Umfeld und einer stabilen Vermietbarkeit. Je nach Mikrolage sind unterschiedliche Preisniveaus und Renditechancen möglich.',
    sectionTitleMicro: 'Gefragte Mikrolagen in Neukölln',
    microAreas: [
      'Reuterkiez – urban, nachgefragt und sehr lebendig.',
      'Schillerkiez – nahe Tempelhofer Feld mit hoher Lebensqualität.',
      'Rixdorf / Böhmisches Dorf – charaktervolle Altbau-Lagen.',
      'Britz-Nord – ruhigeres Umfeld mit guter Infrastruktur.'
    ],
    sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Neukölln',
    faq: [
      { q: 'Ist Neukölln für Kapitalanlage geeignet?', a: 'Ja, in vielen Mikrolagen besteht eine stabile Mietnachfrage. Eine saubere Lage- und Objektprüfung bleibt dennoch entscheidend.' },
      { q: 'Welche Lagen in Neukölln sind besonders gefragt?', a: 'Besonders gefragt sind zentrumsnahe Kieze wie Reuterkiez und Schillerkiez sowie gut angebundene Wohnstraßen mit gewachsener Infrastruktur.' },
      { q: 'Wie entwickelt sich der Markt in Neukölln?', a: 'Neukölln zeigt seit Jahren eine robuste Nachfrage. Unterschiede zwischen den Mikrolagen sind groß, daher lohnt eine datenbasierte Auswahl.' },
      { q: 'Wie unterstützt Sweet Home beim Kauf in Neukölln?', a: 'Wir begleiten Sie mit Preisanalyse, passender Objektselektion und der gesamten Kaufabwicklung bis zum Abschluss.' }
    ]
  }
});

// German district landing page: Reinickendorf (Berlin)
exports.reinickendorfPropertiesPageDe = async (req, res, next) => renderBerlinDistrictPageDe(req, res, next, {
  path: '/wohnung-kaufen-reinickendorf',
  displayName: 'Reinickendorf',
  defaultNeighborhood: 'Reinickendorf',
  heroImage: '/images/reinickendorf.webp',
  title: 'Wohnung kaufen Reinickendorf | Sweet Home',
  metaDescription: 'Wohnung kaufen Reinickendorf: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
  propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
  propertiesParams: ['%reinickendorf%'],
  projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
  projectsParams: ['%reinickendorf%'],
  content: {
    heroTitle: 'Wohnung kaufen Reinickendorf',
    heroDescription: 'Reinickendorf steht für ruhigeres Wohnen, viel Grün und gute Erreichbarkeit. Der Bezirk ist vor allem bei Familien und Käufern mit langfristigem Anlagehorizont gefragt.',
    sectionTitleProperties: 'Eigentumswohnungen in Reinickendorf',
    sectionTitleProjects: 'Neubauprojekte in Reinickendorf',
    sectionTitleWhy: 'Warum Reinickendorf für Immobilienkäufer interessant ist',
    whyP1: 'Der Bezirk bietet zahlreiche Wohnquartiere mit solider Infrastruktur, Schulen und Freizeitflächen. Im Vergleich zu zentralen Innenstadtlagen sind die Preise oft ausgewogener.',
    whyP2: 'Für Käufer interessant sind stabile Nachfragesegmente und ein breites Angebot aus Bestandswohnungen und punktuellen Neubauprojekten.',
    sectionTitleMicro: 'Gefragte Mikrolagen in Reinickendorf',
    microAreas: [
      'Alt-Tegel – wassernahe Lagen und gewachsenes Umfeld.',
      'Waidmannslust – ruhige Wohnstraßen mit Familienfokus.',
      'Hermsdorf – grün, etabliert und hochwertig nachgefragt.',
      'Reinickendorf-Ost – gute Anbindung und urbane Infrastruktur.'
    ],
    sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Reinickendorf',
    faq: [
      { q: 'Für wen eignet sich Reinickendorf besonders?', a: 'Reinickendorf eignet sich besonders für Familien, Eigennutzer mit Platzbedarf und Anleger, die auf stabile Wohnlagen setzen.' },
      { q: 'Wie ist das Preisniveau in Reinickendorf?', a: 'Das Preisniveau variiert nach Mikrolage, liegt aber oft unter sehr zentralen Innenstadtbezirken bei gleichzeitig guter Wohnqualität.' },
      { q: 'Welche Teile von Reinickendorf sind besonders gefragt?', a: 'Tegel, Hermsdorf und gut angebundene Teile von Reinickendorf-Ost zählen zu den gefragteren Bereichen.' },
      { q: 'Wie hilft Sweet Home beim Immobilienkauf?', a: 'Wir analysieren Lage und Preis, kuratieren passende Objekte und begleiten Sie bis zur notariellen Beurkundung.' }
    ]
  }
});

// German district landing page: Kreuzberg (Berlin)
exports.kreuzbergPropertiesPageDe = async (req, res, next) => renderBerlinDistrictPageDe(req, res, next, {
  path: '/wohnung-kaufen-kreuzberg',
  displayName: 'Kreuzberg',
  defaultNeighborhood: 'Kreuzberg',
  heroImage: '/images/kreuzberg.jpg',
  title: 'Wohnung kaufen Kreuzberg | Sweet Home',
  metaDescription: 'Wohnung kaufen Kreuzberg: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
  propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) = $1",
  propertiesParams: ['kreuzberg'],
  projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) = $1",
  projectsParams: ['kreuzberg'],
  content: {
    heroTitle: 'Wohnung kaufen Kreuzberg',
    heroDescription: 'Kreuzberg zählt zu den bekanntesten Berliner Bezirken mit starker urbaner Nachfrage. Die Mischung aus Kultur, Kiezleben und zentraler Lage macht den Teilmarkt besonders attraktiv.',
    sectionTitleProperties: 'Eigentumswohnungen in Kreuzberg',
    sectionTitleProjects: 'Neubauprojekte in Kreuzberg',
    sectionTitleWhy: 'Warum Kreuzberg für Immobilienkäufer interessant ist',
    whyP1: 'Kreuzberg bietet eine hohe Standortqualität mit Restaurants, Kultur, Parks und sehr guter Mobilität. Wohnungen in gefragten Mikrolagen sind dauerhaft stark nachgefragt.',
    whyP2: 'Für Anleger ist die kontinuierliche Vermietungsnachfrage ein Plus, während Eigennutzer vor allem die urbane Lebensqualität schätzen.',
    sectionTitleMicro: 'Gefragte Mikrolagen in Kreuzberg',
    microAreas: [
      'Bergmannkiez – klassischer Altbau, hohe Wohnattraktivität.',
      'Wrangelkiez – lebendig, urban und stark nachgefragt.',
      'Viktoriapark-Umfeld – grün und zugleich zentral.',
      'Südstern-Umfeld – sehr gute Verkehrsanbindung.'
    ],
    sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Kreuzberg',
    faq: [
      { q: 'Ist Kreuzberg als Investmentlage geeignet?', a: 'Ja, Kreuzberg gilt als stabil nachgefragter Teilmarkt. Entscheidend bleiben Lagequalität, Zustand und realistische Mietannahmen.' },
      { q: 'Welche Mikrolagen in Kreuzberg sind besonders gefragt?', a: 'Bergmannkiez, Wrangelkiez und Lagen rund um Viktoriapark gehören zu den bekanntesten und gefragtesten Bereichen.' },
      { q: 'Wie hoch ist die Konkurrenz beim Kauf?', a: 'In beliebten Lagen ist die Konkurrenz oft hoch. Eine schnelle, gut vorbereitete Finanzierung verbessert die Chancen deutlich.' },
      { q: 'Wie unterstützt Sweet Home beim Kauf in Kreuzberg?', a: 'Wir helfen bei der Bewertung, verhandeln strukturiert und begleiten den Prozess bis zum Notartermin.' }
    ]
  }
});

// German district landing page: Spandau (Berlin)
exports.spandauPropertiesPageDe = async (req, res, next) => renderBerlinDistrictPageDe(req, res, next, {
  path: '/wohnung-kaufen-spandau',
  displayName: 'Spandau',
  defaultNeighborhood: 'Spandau',
  heroImage: '/images/spandau.jpeg',
  title: 'Wohnung kaufen Spandau | Sweet Home',
  metaDescription: 'Wohnung kaufen Spandau: Ausgewählte Eigentumswohnungen vergleichen und mit Sweet Home die passende Immobilie finden.',
  propertiesWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
  propertiesParams: ['%spandau%'],
  projectsWhere: "LOWER(COALESCE(p.neighborhood, '')) LIKE $1",
  projectsParams: ['%spandau%'],
  content: {
    heroTitle: 'Wohnung kaufen Spandau',
    heroDescription: 'Spandau bietet viel Wohnraum, grünere Lagen und ein attraktives Preis-Leistungs-Verhältnis innerhalb Berlins. Der Bezirk ist für Eigennutzer und langfristig orientierte Anleger relevant.',
    sectionTitleProperties: 'Eigentumswohnungen in Spandau',
    sectionTitleProjects: 'Neubauprojekte in Spandau',
    sectionTitleWhy: 'Warum Spandau für Immobilienkäufer interessant ist',
    whyP1: 'In Spandau finden Käufer häufig größere Wohnflächen und familienfreundliche Quartiere. Der Bezirk kombiniert gewachsene Kieze mit neuen Entwicklungsflächen.',
    whyP2: 'Für Investoren sind stabile Nachfrage in vielen Segmenten und teils attraktivere Einstiegspreise im Berliner Vergleich wichtige Argumente.',
    sectionTitleMicro: 'Gefragte Mikrolagen in Spandau',
    microAreas: [
      'Altstadt Spandau – zentrale Versorgung und S/U-Bahn-Nähe.',
      'Kladow – grün, wassernahe Wohnlagen mit hoher Qualität.',
      'Wilhelmstadt – familienfreundliche Quartiere mit Potenzial.',
      'Haselhorst – gute Anbindung und Neubauentwicklung.'
    ],
    sectionTitleFaq: 'Häufige Fragen zu Wohnungen in Spandau',
    faq: [
      { q: 'Ist Spandau für Familien geeignet?', a: 'Ja, Spandau ist wegen größerer Wohnflächen, grüner Umgebung und guter Nahversorgung bei Familien sehr beliebt.' },
      { q: 'Wie unterscheidet sich Spandau von zentralen Berliner Lagen?', a: 'Spandau bietet oft mehr Fläche pro Budget und ruhigere Wohnumfelder, bei weiterhin guter Erreichbarkeit wichtiger Stadtbereiche.' },
      { q: 'Welche Lagen in Spandau sind besonders gefragt?', a: 'Gefragt sind insbesondere gut angebundene Bereiche rund um Altstadt Spandau, Wilhelmstadt und ausgewählte wassernahe Lagen.' },
      { q: 'Wie hilft Sweet Home beim Wohnungskauf in Spandau?', a: 'Wir unterstützen mit Lagevergleich, Objektprüfung, Verhandlung und vollständiger Transaktionsbegleitung.' }
    ]
  }
});