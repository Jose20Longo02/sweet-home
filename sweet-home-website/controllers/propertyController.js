// controllers/propertyController.js

const { query }  = require('../config/db');
const locations   = require('../config/locations');
const locationColors = require('../config/locationColors');
const slugify     = require('slugify');
const fs          = require('fs');
const path        = require('path');
const sendMail    = require('../config/mailer');
const { generateVariants, SIZES } = require('../middleware/imageVariants');
const { ensureLocalizedFields } = require('../config/translator');

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

//
// — Public & Agent Handlers —
//

// List properties for public/agent views
exports.listPropertiesPublic = async (req, res, next) => {
  try {
    const {
      q = '', // search query
      country = '',
      city = '',
      neighborhood = '',
      type = [],
      min_price = '',
      max_price = '',
      bedrooms = [],
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
    if (country) {
      whereConditions.push(`p.country = $${paramIndex}`);
      queryParams.push(country);
      paramIndex++;
    }
    if (city) {
      whereConditions.push(`p.city = $${paramIndex}`);
      queryParams.push(city);
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

    // Bedrooms filter
    if (bedrooms) {
      // Handle both single string and array values
      const bedroomsArray = Array.isArray(bedrooms) ? bedrooms : [bedrooms];
      if (bedroomsArray.length > 0 && bedroomsArray[0] !== '') {
        const bedroomConditions = bedroomsArray.map(bed => {
          if (bed === '1') return `p.bedrooms >= 1`;
          if (bed === '2') return `p.bedrooms >= 2`;
          if (bed === '3') return `p.bedrooms >= 3`;
          if (bed === '4') return `p.bedrooms >= 4`;
          return null;
        }).filter(Boolean);
        
        if (bedroomConditions.length > 0) {
          whereConditions.push(`(${bedroomConditions.join(' OR ')})`);
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
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.bedrooms, p.bathrooms,
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

    // Get total count for pagination (handle multiline SQL safely)
    const countQuery = baseQuery
      .replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) as count FROM')
      .replace(/ORDER BY[\s\S]*$/i, '');
    const { rows: countResult } = await query(countQuery, queryParams);
    const totalProperties = parseInt(countResult[0]?.count || '0', 10);

    // Add pagination
    const itemsPerPage = 12;
    const totalPages = Math.ceil(totalProperties / itemsPerPage);
    const offset = (parseInt(page) - 1) * itemsPerPage;
    
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(itemsPerPage, offset);

    // Execute the main query
    const { rows: properties } = await query(baseQuery, queryParams);

    // Normalize photos array and agent info for each property
    const publicDir = path.join(__dirname, '../public');
    const lang = res.locals.lang || 'en';
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
      const localizedTitle = (p.title_i18n && p.title_i18n[lang]) || p.title;
      const localizedDescription = (p.description_i18n && p.description_i18n[lang]) || p.description;
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
      country,
      city,
      neighborhood,
      type: Array.isArray(type) ? type : (type ? [type] : []),
      min_price,
      max_price,
      bedrooms: Array.isArray(bedrooms) ? bedrooms : (bedrooms ? [bedrooms] : []),
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

    res.render('properties/property-list', { 
      properties: normalizedProperties,
      locations,
      locationColors,
      filters,
      query: q,
      sort,
      currentPage: parseInt(page),
      totalPages,
      totalProperties
    });
  } catch (err) {
    next(err);
  }
};

// Show single property detail by slug
exports.showProperty = async (req, res, next) => {
  try {
    const sql = `
      SELECT
        p.id, p.title, p.title_i18n, p.description_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.price, p.photos, p.type, p.bedrooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.featured, p.created_at, p.description,
        p.year_built, p.map_link,
        p.features,
        p.video_url, p.floorplan_url, p.plan_photo_url,
        p.is_in_project, p.project_id,
        pr.title AS project_title, pr.title_i18n AS project_title_i18n, pr.slug AS project_slug, pr.amenities AS project_amenities,
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
    const localizedTitle = (p.title_i18n && p.title_i18n[lang]) || p.title;
    const localizedDescription = (p.description_i18n && p.description_i18n[lang]) || p.description;
    const property = {
      ...p,
      title: localizedTitle,
      description: localizedDescription,
      photos,
      has_main_variants: hasMainVariants,
      main_variant_base: mainVariantBase,
      project: (p.is_in_project && p.project_id) ? {
        id: p.project_id,
        slug: p.project_slug || null,
        // Do NOT translate linked project title; use original
        title: p.project_title || null,
        amenities: Array.isArray(p.project_amenities) ? p.project_amenities : []
      } : null,
      agent: {
        name: p.agent_name || 'Agent',
        profile_picture: p.agent_profile_picture || null
      }
    };

    res.render('properties/property-detail', { property });
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
      SELECT p.id, p.title, p.slug, p.country, p.city, p.neighborhood, p.price, p.photos
        FROM properties p
       WHERE ${conds.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${idx}
    `;
    values.push(Number(limit));
    const { rows } = await query(sql, values);
    const normalized = rows.map(p => ({
      ...p,
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
    const description  = body.description?.trim();
    const type         = body.type?.trim();
    const country      = body.country?.trim();
    const city         = body.city?.trim();
    const neighborhood = body.neighborhood?.trim() || null;
    const price        = parseNumberField(body.price);
    const yearBuilt    = parseNumberField(body.year_built);
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
    const bedrooms      = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.bedrooms) : null;
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
      if (!(bedrooms >= 0))     errors.push('Bedrooms (Apartment) is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms (Apartment) is required');
    }
    if (type === 'House' || type === 'Villa') {
      if (!(totalSize > 0))     errors.push('Total lot size is required and must be positive');
      if (!(bedrooms >= 0))     errors.push('Bedrooms is required');
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

    // Apply removal flags for floorplan/plan_photo on edit (set to null if flagged and no replacement uploaded)
    const parseBoolFlag = (v) => {
      const s = String(v ?? '').toLowerCase();
      return s === 'true' || s === 'on' || s === '1' || s === 'yes';
    };
    const removeFloorplan = parseBoolFlag(body.remove_existing_floorplan);
    const removePlanPhoto = parseBoolFlag(body.remove_existing_plan_photo);
    if (removeFloorplan && !(req.files && Array.isArray(req.files.floorplan) && req.files.floorplan[0])) {
      floorplanUrl = null;
    }
    if (removePlanPhoto && !(req.files && Array.isArray(req.files.plan_photo) && req.files.plan_photo[0])) {
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
         country, city, neighborhood, title, slug, description,
         type, price, status_tags, photos, video_url,
         floorplan_url, agent_id, created_by,
         apartment_size, bedrooms, bathrooms,
         total_size, living_space, land_size, plan_photo_url,
         is_in_project, project_id,
         map_link,
         year_built,
         features,
         created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,$11,
         $12,$13,$14,
         $15,$16,$17,
         $18,$19,$20,$21,
         $22,$23,
         $24,
         $25,
         $26,
         NOW()
       ) RETURNING id`,
      [
        country, city, neighborhood, title, uniqueSlug, description,
        type, price, statusTags, photos, videoUrl,
        floorplanUrl, agentId, req.session.user.id,
        apartmentSize, bedrooms, bathrooms,
        totalSize, livingSpace, landSize, planPhotoUrl,
        isInProject, projectId,
        mapLink,
        yearBuilt,
        JSON.stringify(featuresList || [])
      ]
    );
    const newId = insertRes.rows[0].id;

    // Auto-translate and persist i18n JSON
    try {
      const i18n = await ensureLocalizedFields({
        fields: { title: title || '', description: description || '' },
        existing: {},
        sourceLang: 'en',
        targetLangs: ['es','de'],
        htmlFields: ['description']
      });
      await query(
        `UPDATE properties SET title_i18n = $1, description_i18n = $2 WHERE id = $3`,
        [i18n.title_i18n || { en: title || '' }, i18n.description_i18n || { en: description || '' }, newId]
      );
    } catch (_) { /* non-fatal */ }

    // Move uploaded files into a property-specific folder and update paths (local disk only)
    if (!process.env.DO_SPACES_BUCKET) {
      try {
      const propDir = path.join(__dirname, '../public/uploads/properties', String(newId));
      if (!fs.existsSync(propDir)) {
        fs.mkdirSync(propDir, { recursive: true });
      }

      // Photos with responsive variants
      if (uploadedPhotosFiles.length) {
        const movedPhotos = [];
        for (const f of uploadedPhotosFiles) {
          const src = f.path; // absolute temp path
          const dest = path.join(propDir, f.filename);
          try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
          // Generate variants
          try {
            const publicUrlBase = `/uploads/properties/${newId}`;
            await generateVariants(dest, publicUrlBase);
          } catch (e) {
            // Non-fatal
          }
          movedPhotos.push(`/uploads/properties/${newId}/${f.filename}`);
        }
        photos = [...movedPhotos, ...urlPhotos];
      }

      // Video file
      if (uploadedVideoFile) {
        const src = uploadedVideoFile.path;
        const dest = path.join(propDir, uploadedVideoFile.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        videoUrl = `/uploads/properties/${newId}/${uploadedVideoFile.filename}`;
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
      // Using Spaces: URLs already computed above, just persist
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

    res.render('properties/edit-property', {
      property,
      locations,
      projects,
      teamMembers,
      currentUser: req.session.user,
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
    const description  = body.description?.trim() || existing.description;
    const type         = body.type?.trim() || existing.type;
    const country      = body.country?.trim() || existing.country;
    const city         = body.city?.trim() || existing.city;
    const neighborhood = (body.neighborhood?.trim() || '') || null;
    const price        = parseNumberField(body.price) ?? existing.price;
    const yearBuilt    = parseNumberField(body.year_built) ?? existing.year_built;
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
    const bedrooms      = ['Apartment','House','Villa'].includes(type) ? parseNumberField(body.bedrooms) : null;
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
    const urlPhotos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : (body.photos ? [body.photos] : []);
    if (urlPhotos.length) photos = urlPhotos;
    // Custom order tokens from client combining existing URLs and new file indices
    let orderTokens = body['photos_order'] || body['photos_order[]'] || [];
    if (typeof orderTokens === 'string') orderTokens = [orderTokens];

    let videoUrl = (body.video_source === 'link' ? (body.video_url?.trim() || null) : null) || existing.video_url;
    const uploadedVideoFile = (req.files && Array.isArray(req.files.video) && req.files.video[0]) ? req.files.video[0] : null;
    if (!videoUrl && uploadedVideoFile) {
      videoUrl = uploadedVideoFile.url || '/uploads/properties/' + uploadedVideoFile.filename;
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
    const parseBool = (v) => {
      const s = String(v ?? '').toLowerCase();
      return s === 'true' || s === 'on' || s === '1' || s === 'yes';
    };
    const removeExistingVideoFlag = parseBool(body.remove_existing_video);
    if (!uploadedVideoFile && removeExistingVideoFlag) {
      // If user requested to remove existing video and did not upload a new one or set a link
      const isLinkProvided = body.video_source === 'link' && (body.video_url?.trim());
      if (!isLinkProvided) {
        videoUrl = null;
      }
    }

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
      if (!(bedrooms >= 0))     errors.push('Bedrooms (Apartment) is required');
      if (!(bathrooms >= 0))    errors.push('Bathrooms (Apartment) is required');
    }
    if (type === 'House' || type === 'Villa') {
      if (!(totalSize > 0))     errors.push('Total lot size is required and must be positive');
      if (!(bedrooms >= 0))     errors.push('Bedrooms is required');
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
    if ((!uploadedPhotosFiles || uploadedPhotosFiles.length === 0) && Array.isArray(orderTokens) && orderTokens.length) {
      const ordered = [];
      const used = new Set();
      for (const t of orderTokens) {
        if (!t || typeof t !== 'string') continue;
        if (t.startsWith('url:')) {
          const u = t.slice(4);
          if (u) { ordered.push(u); used.add(u); }
        }
      }
      // append any remaining existing photos not referenced
      for (const p of photos || []) { if (!used.has(p)) ordered.push(p); }
      photos = ordered;
    }

    // Remove any empty entries and non-existent files; normalize to absolute URLs before persisting
    try {
      const publicDir = path.join(__dirname, '../public');
      const normalizedExisting = [];
      for (const p of (photos || [])) {
        if (!p || !String(p).trim()) continue;
        const url = String(p);
        const abs = url.startsWith('/uploads/')
          ? path.join(publicDir, url.replace(/^\//, ''))
          : path.join(publicDir, 'uploads/properties', String(propId), url);
        if (fs.existsSync(abs)) {
          normalizedExisting.push(url.startsWith('/uploads/') ? url : `/uploads/properties/${propId}/${url}`);
        }
      }
      photos = normalizedExisting;
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

    // Update
    await query(
      `UPDATE properties SET
         country=$1, city=$2, neighborhood=$3,
         title=$4, slug=$5, description=$6,
         type=$7, price=$8, status_tags=$9,
         photos=$10, video_url=$11,
         apartment_size=$12, bedrooms=$13, bathrooms=$14, floorplan_url=$15,
         total_size=$16, living_space=$17,
         land_size=$18, plan_photo_url=$19,
         is_in_project=$20, project_id=$21,
         agent_id=$22,
         map_link=$23,
         features=$24::jsonb,
         year_built=$25,
         sold=$26,
         sold_at=$27,
         updated_at=NOW()
       WHERE id=$28`,
      [
        country, city, neighborhood,
        title, newSlug, description,
        type, price, statusTags,
        photos, videoUrl,
        apartmentSize, bedrooms, bathrooms, floorplanUrl,
        totalSize, livingSpace,
        landSize, planPhotoUrl,
        isInProject, projectId,
        agentId,
        mapLinkRaw,
        JSON.stringify(featuresList || []),
        yearBuilt,
        soldChecked,
        soldAt ? soldAt.toISOString() : null,
        propId
      ]
    );

    // Auto-translate updated fields and upsert i18n
    try {
      const { rows: latestRows } = await query(`SELECT title_i18n, description_i18n FROM properties WHERE id = $1`, [propId]);
      const existingI18n = latestRows[0] || {};
      const currentTitle = title || existing.title || '';
      const currentDescription = description || existing.description || '';
      const i18n = await ensureLocalizedFields({
        fields: { title: currentTitle, description: currentDescription },
        existing: existingI18n,
        sourceLang: 'en',
        targetLangs: ['es','de'],
        htmlFields: ['description']
      });
      await query(
        `UPDATE properties SET title_i18n = $1, description_i18n = $2, updated_at = NOW() WHERE id = $3`,
        [i18n.title_i18n, i18n.description_i18n, propId]
      );
    } catch (_) { /* non-fatal */ }

    // Ensure floorplan/plan removals are persisted even when there are no new uploads
    try {
      if (removeFloorplan || removePlanPhoto) {
        await query(
          `UPDATE properties
              SET floorplan_url = CASE WHEN $1 THEN NULL ELSE floorplan_url END,
                  plan_photo_url = CASE WHEN $2 THEN NULL ELSE plan_photo_url END,
                  updated_at = NOW()
            WHERE id = $3`,
          [removeFloorplan, removePlanPhoto, propId]
        );
      }
    } catch (_) { /* best-effort */ }

    // Final safeguard: ensure DB reflects removals even if earlier branches skipped
    try {
      if (removeFloorplan || removePlanPhoto) {
        await query(
          `UPDATE properties
              SET floorplan_url = CASE WHEN $1 THEN NULL ELSE floorplan_url END,
                  plan_photo_url = CASE WHEN $2 THEN NULL ELSE plan_photo_url END,
                  updated_at = NOW()
            WHERE id = $3`,
          [removeFloorplan, removePlanPhoto, propId]
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
        for (const f of uploadedPhotosFiles) {
          const src = f.path; // absolute temp path
          const dest = path.join(propDir, f.filename);
          try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
          try {
            const publicUrlBase = `/uploads/properties/${propId}`;
            await generateVariants(dest, publicUrlBase);
          } catch (e) { /* non-fatal */ }
          movedPhotos.push(`/uploads/properties/${propId}/${f.filename}`);
        }
        // Append new moved photos to any existing kept photos
        photos = [...(photos || []), ...movedPhotos];
      }

      // Video file
      if (uploadedVideoFile) {
        const src = uploadedVideoFile.path;
        const dest = path.join(propDir, uploadedVideoFile.filename);
        try { fs.renameSync(src, dest); } catch (e) { /* ignore */ }
        videoUrl = `/uploads/properties/${propId}/${uploadedVideoFile.filename}`;
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

      // Persist updated media paths if anything changed
        if ((uploadedPhotosFiles && uploadedPhotosFiles.length) || uploadedVideoFile || removeFloorplan || removePlanPhoto || (req.files && (req.files.floorplan || req.files.plan_photo))) {
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
      // Using Spaces: URLs already computed above, just persist when something changed
      if ((uploadedPhotosFiles && uploadedPhotosFiles.length) || uploadedVideoFile || removeFloorplan || removePlanPhoto || (req.files && (req.files.floorplan || req.files.plan_photo))) {
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

    // After DB changes and file moves, delete removed files from disk (best-effort)
    try {
      // Delete removed photos (original + common variants)
      if (removedPhotosList && removedPhotosList.length) {
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
      // Delete removed existing video if flagged and not replaced (local files only)
      if (removeExistingVideoFlag && existing.video_url && existing.video_url !== (videoUrl || '') && String(existing.video_url).startsWith('/uploads/')) {
        const videoPath = path.join(__dirname, '../public', String(existing.video_url).replace(/^\//, ''));
        try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (_) {}
      }
      // Delete removed floorplan/plan photo if flagged and not replaced
      if (removeFloorplan && existing.floorplan_url && existing.floorplan_url !== (floorplanUrl || '') && String(existing.floorplan_url).startsWith('/uploads/')) {
        const fp = path.join(__dirname, '../public', String(existing.floorplan_url).replace(/^\//, ''));
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
      }
      if (removePlanPhoto && existing.plan_photo_url && existing.plan_photo_url !== (planPhotoUrl || '') && String(existing.plan_photo_url).startsWith('/uploads/')) {
        const pp = path.join(__dirname, '../public', String(existing.plan_photo_url).replace(/^\//, ''));
        try { if (fs.existsSync(pp)) fs.unlinkSync(pp); } catch (_) {}
      }
    } catch (_) { /* best-effort */ }

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
    // Delete DB row first
    await query(`DELETE FROM properties WHERE id = $1`, [req.params.id]);
    // Remove media folder
    try {
      const propDir = path.join(__dirname, '../public/uploads/properties', String(req.params.id));
      if (fs.existsSync(propDir)) {
        fs.rmSync(propDir, { recursive: true, force: true });
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
    const { country, city, type, minPrice, maxPrice, status, sold } = req.query;

    // 2) Build dynamic WHERE clause
    const conditions = [];
    const values     = [];
    let idx = 1;
    if (country)  { conditions.push(`p.country = $${idx}`);      values.push(country); idx++; }
    if (city)     { conditions.push(`p.city = $${idx}`);         values.push(city);    idx++; }
    if (type)     { conditions.push(`p.type = $${idx}`);         values.push(type);    idx++; }
    if (minPrice) { conditions.push(`p.price >= $${idx}`);       values.push(minPrice);idx++; }
    if (maxPrice) { conditions.push(`p.price <= $${idx}`);       values.push(maxPrice);idx++; }
    if (status)   { conditions.push(`p.status_tags @> $${idx}`); values.push([status]);idx++; }
    if (sold)     { conditions.push(`p.sold = $${idx}`);         values.push(sold);    idx++; }
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

    // 8) Render the view
    res.render('superadmin/properties/manage-properties', {
      properties,
      allAgents,
      currentPage:  page,
      totalPages,
      filters:      { country, city, type, minPrice, maxPrice, status, sold },
      countryOptions,
      cityOptions,
      typeOptions,
      statusOptions,
      locations,
      pendingCount,
      activePage: 'properties'
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
    await query(`DELETE FROM properties WHERE id = $1`, [req.params.id]);
    try {
      const propDir = path.join(__dirname, '../public/uploads/properties', String(req.params.id));
      if (fs.existsSync(propDir)) {
        fs.rmSync(propDir, { recursive: true, force: true });
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

    const { country, city, type, minPrice, maxPrice, status } = req.query;

    // Constrain by: assigned to this user OR (unassigned AND created by this user)
    const conds = ['(p.agent_id = $1 OR (p.agent_id IS NULL AND p.created_by = $1))'];
    const vals  = [userId];
    let idx = 2;

    if (country)  { conds.push(`p.country = $${idx++}`);      vals.push(country); }
    if (city)     { conds.push(`p.city = $${idx++}`);         vals.push(city); }
    if (type)     { conds.push(`p.type = $${idx++}`);         vals.push(type); }
    if (minPrice) { conds.push(`p.price >= $${idx++}`);       vals.push(minPrice); }
    if (maxPrice) { conds.push(`p.price <= $${idx++}`);       vals.push(maxPrice); }
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
        p.bedrooms, p.bathrooms,
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

    // Render
    res.render('admin/properties/my-properties', {
      user: req.session.user,
      properties,
      currentPage: page,
      totalPages,
      filters: { country, city, type, minPrice, maxPrice, status },
      countryOptions,
      cityOptions,
      typeOptions,
      statusOptions,
      locations
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
        p.price, p.photos, p.type, p.bedrooms, p.bathrooms,
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
      title: (p.title_i18n && p.title_i18n[langFeat]) || p.title,
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