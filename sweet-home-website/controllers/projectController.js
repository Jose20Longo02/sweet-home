// controllers/projectController.js

const { query } = require('../config/db');
const locations   = require('../config/locations');
const { generateVariants } = require('../middleware/imageVariants');
const { ensureLocalizedFields } = require('../config/translator');
const { generateSEOFileName } = require('../utils/imageNaming');
const path = require('path');
const s3   = require('../config/spaces');
const fs   = require('fs');

/**
 * Admin-only: list all projects, grouped by country, with uploader avatars and pending-requests badge.
 */
exports.listProjects = async (req, res, next) => {
  try {
    // Fetch basic project info
    let { rows: projects } = await query(`
      SELECT
        id,
        title,
        title_i18n,
        country,
        city,
        neighborhood,
        photos    -- or whatever you use for cover images
      FROM projects
      ORDER BY title
    `);
    // Normalize photos field to array
    const normalizePhotos = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const str = val.trim();
        // Try JSON array first
        if (str.startsWith('[')) {
          try {
            const arr = JSON.parse(str);
            return Array.isArray(arr) ? arr : [];
          } catch (_) { /* fallthrough */ }
        }
        // Then PG text array syntax {"a","b"}
        if (str.startsWith('{') && str.endsWith('}')) {
          return str
            .slice(1, -1)
            .split(',')
            .map(s => s.replace(/^\"|\"$/g, '').trim())
            .filter(Boolean);
        }
        // Single URL string
        if (str) return [str];
      }
      return [];
    };
    const lang = res.locals.lang || 'en';
    projects = (projects || []).map(p => ({ ...p, title: (p.title_i18n && p.title_i18n[lang]) || p.title, photos: normalizePhotos(p.photos) }));

    // Group by country
    const grouped = {};
    Object.keys(locations).forEach(country => {
      grouped[country] = projects.filter(p => p.country === country);
    });
    // include any extra countries
    const allCountries = [...new Set(projects.map(p => p.country))];
    allCountries.forEach(country => {
      if (!grouped[country]) {
        grouped[country] = projects.filter(p => p.country === country);
      }
    });

    // pending-count for sidebar
    const { rows } = await query(`
      SELECT COUNT(*) AS count
        FROM users
       WHERE approved = false
         AND role IN ('Admin','SuperAdmin')
    `);
    const pendingCount = parseInt(rows[0].count, 10);

    res.render('superadmin/projects/manage-projects', {
      grouped,
      locations,
      pendingCount,
      activePage: 'projects'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Render the “New Project” form.
 */
exports.newProjectForm = async (req, res, next) => {
  try {
    const { rows: teamMembers } = await query(`
      SELECT id, name
        FROM users
       WHERE role IN ('Admin','SuperAdmin')
         AND approved = true
       ORDER BY name
    `);
    res.render('projects/new-project', {
      locations,
      error: null,
      form: {},
      currentUser: req.session.user,
      teamMembers
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle creation of a new project.
 */
exports.createProject = async (req, res, next) => {
  try {
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
    const sanitizeDecimalString = (s) => {
      if (s === undefined || s === null) return null;
      const str = String(s).replace(/[^0-9,\.]/g, '').replace(/,/g, '.');
      if (!str) return null;
      const n = Number(str);
      return Number.isNaN(n) ? null : n;
    };
    const clamp = (n, min, max) => (n === null ? null : Math.min(Math.max(n, min), max));

    const title        = body.title?.trim();
    const description  = body.description?.trim();
    const country      = body.country?.trim();
    const city         = body.city?.trim();
    const neighborhood = body.neighborhood?.trim() || null;
    // Numeric constraints: NUMERIC(8,2) => max 9,999,999.99; NUMERIC(12,2) => max 9,999,999,999.99
    const maxSize = 9999999.99;
    const maxMoney = 9999999999.99;
    const rawMinUnitSize  = clamp(sanitizeDecimalString(body.min_unit_size), 0, maxSize);
    const rawMaxUnitSize  = clamp(sanitizeDecimalString(body.max_unit_size), 0, maxSize);
    const rawMinPrice     = clamp(sanitizeDecimalString(body.min_price), 0, maxMoney);
    const rawMaxPrice     = clamp(sanitizeDecimalString(body.max_price), 0, maxMoney);
    const rawMinBedrooms  = parseNumberField(body.min_bedrooms);
    const rawMaxBedrooms  = parseNumberField(body.max_bedrooms);
    const rawMinBathrooms = parseNumberField(body.min_bathrooms);
    const rawMaxBathrooms = parseNumberField(body.max_bathrooms);

    // Final coercion for DB to avoid numeric overflow; coerce to bounded strings
    const toDbDecimal = (n, max) => (n === null ? null : Number.isFinite(n) ? Math.min(Math.max(n, 0), max).toFixed(2) : null);
    const toDbInt     = (n, max) => (n === null ? null : Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), max) : null);

    const minUnitSize  = toDbDecimal(rawMinUnitSize, maxSize);
    const maxUnitSize  = toDbDecimal(rawMaxUnitSize, maxSize);
    const minPrice     = toDbDecimal(rawMinPrice, maxMoney);
    const maxPrice     = toDbDecimal(rawMaxPrice, maxMoney);
    const minBedrooms  = toDbInt(rawMinBedrooms, 99);
    const maxBedrooms  = toDbInt(rawMaxBedrooms, 99);
    const minBathrooms = toDbInt(rawMinBathrooms, 99);
    const maxBathrooms = toDbInt(rawMaxBathrooms, 99);
    const isSoldOut    = body.is_sold_out === 'on' || body.is_sold_out === 'true' || body.is_sold_out === true;
    const brochureUrl  = null; // to be set from upload
    let amenities      = body['amenities'] || body['amenities[]'] || [];
    if (typeof amenities === 'string') {
      amenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Unit types (checkboxes): Villas, Apartments, Houses → text[]
    let unitTypes = body['unit_type'] || body['unit_type[]'] || [];
    if (typeof unitTypes === 'string') unitTypes = [unitTypes];

    // Media from uploads
    const uploadedPhotosFiles = (req.files && Array.isArray(req.files.photos)) ? req.files.photos : [];
    let photos = uploadedPhotosFiles.map(f => f.url || '/uploads/projects/' + encodeURIComponent(f.filename));
    const uploadedVideoFile = (req.files && Array.isArray(req.files.video) && req.files.video[0]) ? req.files.video[0] : null;
    let videoUrl = uploadedVideoFile ? (uploadedVideoFile.url || '/uploads/projects/' + encodeURIComponent(uploadedVideoFile.filename)) : null;
    const uploadedBrochure = (req.files && Array.isArray(req.files.brochure) && req.files.brochure[0]) ? req.files.brochure[0] : null;
    let brochure = uploadedBrochure ? (uploadedBrochure.url || '/uploads/projects/' + encodeURIComponent(uploadedBrochure.filename)) : null;

    // Assignment (agent): allow choosing any approved Admin/SuperAdmin; fallback to current user
    const agentId = body.agent_id ? Number(body.agent_id) : req.session.user.id;

    // Validation
    const errors = [];
    if (!required(title))        errors.push('Title is required');
    if (!required(description))  errors.push('Description is required');
    if (!required(country))      errors.push('Country is required');
    if (!required(city))         errors.push('City is required');

    // Title uniqueness check (slug-based)
    const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const { rows: exists } = await query('SELECT 1 FROM projects WHERE slug = $1 LIMIT 1', [slug]);
      if (exists.length) {
        errors.push('A project with this title already exists. Please choose a different title.');
      }
    } catch (_) {}

    if (errors.length) {
      return res.status(400).render('projects/new-project', {
        locations,
        error: errors.join('. '),
        form: body,
        currentUser: req.session.user
      });
    }

    const insert = await query(
      `INSERT INTO projects (
         country, city, neighborhood, title, description,
         min_unit_size, max_unit_size, min_price, max_price,
         min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms,
         is_sold_out, brochure_url, amenities, unit_types, photos, video_url,
         agent_id, slug, created_at
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,$9,
         $10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19,
         $20,$21,NOW()
       ) RETURNING id`,
      [
        country, city, neighborhood, title, description,
        minUnitSize, maxUnitSize, minPrice, maxPrice,
        minBedrooms, maxBedrooms, minBathrooms, maxBathrooms,
        isSoldOut, brochure, amenities, unitTypes, photos, videoUrl,
        agentId, slug
      ]
    );

    const newId = insert.rows[0].id;

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
        `UPDATE projects SET title_i18n = $1, description_i18n = $2 WHERE id = $3`,
        [i18n.title_i18n || { en: title || '' }, i18n.description_i18n || { en: description || '' }, newId]
      );
    } catch (_) { /* non-fatal */ }

    // Move uploaded files into a project-specific folder and update paths (local disk only)
    if (!process.env.DO_SPACES_BUCKET) {
      try {
      const path = require('path');
      const fs = require('fs');
      const projDir = path.join(__dirname, '../public/uploads/projects', String(newId));
      if (!require('fs').existsSync(projDir)) {
        fs.mkdirSync(projDir, { recursive: true });
      }
      const movedPhotos = [];
      for (let i = 0; i < uploadedPhotosFiles.length; i++) {
        const f = uploadedPhotosFiles[i];
        const src = f.path;
        
        // Generate SEO-friendly filename
        const seoFileName = generateSEOFileName(
          { title, neighborhood, city, country },
          'project',
          i + 1,
          path.extname(f.filename)
        );
        
        const dest = path.join(projDir, seoFileName);
        try { fs.renameSync(src, dest); } catch (_) {}
        try {
          await generateVariants(dest, `/uploads/projects/${newId}`);
        } catch (_) {}
        movedPhotos.push(`/uploads/projects/${newId}/${seoFileName}`);
      }
      if (movedPhotos.length) photos = movedPhotos;
      if (uploadedVideoFile) {
        const src = uploadedVideoFile.path;
        
        // Generate SEO-friendly filename for video
        const seoVideoFileName = generateSEOFileName(
          { title, neighborhood, city, country },
          'project',
          1,
          path.extname(uploadedVideoFile.filename),
          'video'
        );
        
        const dest = path.join(projDir, seoVideoFileName);
        try { fs.renameSync(src, dest); } catch (_) {}
        videoUrl = `/uploads/projects/${newId}/${seoVideoFileName}`;
      }
      if (uploadedBrochure) {
        const src = uploadedBrochure.path; const dest = path.join(projDir, uploadedBrochure.filename);
        try { fs.renameSync(src, dest); } catch (_) {}
        brochure = `/uploads/projects/${newId}/${encodeURIComponent(uploadedBrochure.filename)}`;
      }
        await query(
          `UPDATE projects SET photos=$1, video_url=$2, brochure_url=$3 WHERE id=$4`,
          [photos, videoUrl, brochure, newId]
        );
      } catch (_) { /* non-fatal */ }
    } else {
      // Using Spaces: ensure files live under projects/<id>/...
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

        const basePrefix = `projects/${slug || newId}`;
        const fixList = async (items, folder, fileType = 'project', fileNumber = 1) => {
          if (!Array.isArray(items) || !items.length) return [];
          const out = [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const key = it.key || '';
            const already = key.startsWith(`${basePrefix}/${folder}/`);
            if (already) { out.push(it.url); continue; }
            
            // Generate SEO-friendly filename
            const seoFileName = generateSEOFileName(
              { title, neighborhood, city, country },
              fileType,
              fileNumber + i,
              path.extname(key || it.filename || '')
            );
            
            const newKey = `${basePrefix}/${folder}/${seoFileName}`;
            const url = await copyOne(key, newKey);
            out.push(url);
          }
          return out;
        };

        photos = await fixList(processed.photos || [], 'photos', 'project', 1);
        if (processed.video && processed.video[0]) {
          const v = processed.video[0];
          const key = v.key || '';
          
          // Generate SEO-friendly filename for video
          const seoVideoFileName = generateSEOFileName(
            { title, neighborhood, city, country },
            'project',
            1,
            path.extname(key || v.filename || ''),
            'video'
          );
          
          const newKey = key.startsWith(`${basePrefix}/videos/`) ? key : `${basePrefix}/videos/${seoVideoFileName}`;
          videoUrl = key === newKey ? v.url : await copyOne(key, newKey);
        }
        if (processed.brochure && processed.brochure[0]) {
          const b = processed.brochure[0];
          const key = b.key || '';
          const newKey = key.startsWith(`${basePrefix}/brochure/`) ? key : `${basePrefix}/brochure/${path.basename(key || b.filename || '')}`;
          brochure = key === newKey ? b.url : await copyOne(key, newKey);
        }

        await query(
          `UPDATE projects SET photos=$1, video_url=$2, brochure_url=$3 WHERE id=$4`,
          [photos, videoUrl, brochure, newId]
        );
      } catch (_) {
        await query(
          `UPDATE projects SET photos=$1, video_url=$2, brochure_url=$3 WHERE id=$4`,
          [photos, videoUrl, brochure, newId]
        );
      }
    }

    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/projects');
    }
    return res.redirect('/admin/dashboard/projects');
  } catch (err) {
    next(err);
  }
};

/**
 * Render the “Edit Project” form for a given ID.
 */
exports.editProjectForm = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM projects WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).render('errors/404');
    const project = rows[0];
    // Normalize photos to array of non-empty strings to avoid empty previews
    try {
      const normalize = (val) => {
        if (Array.isArray(val)) return val.filter(Boolean).map(String);
        if (typeof val === 'string') {
          const str = val.trim();
          if (!str) return [];
          if (str.startsWith('[')) { try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr.filter(Boolean).map(String) : []; } catch (_) { return []; } }
          if (str.startsWith('{') && str.endsWith('}')) {
            return str.slice(1, -1).split(',').map(s => s.replace(/^\"|\"$/g, '').trim()).filter(Boolean);
          }
          return [str];
        }
        return [];
      };
      project.photos = normalize(project.photos);
      // Normalize photo URLs for previews
      if (!process.env.DO_SPACES_BUCKET) {
        try {
          const publicDir = path.join(__dirname, '../public');
          const cleaned = [];
          for (const ph of project.photos) {
            const url = String(ph);
            const abs = url.startsWith('/uploads/')
              ? path.join(publicDir, url.replace(/^\//, ''))
              : path.join(publicDir, 'uploads/projects', String(project.id), url);
            if (fs.existsSync(abs)) {
              cleaned.push(url.startsWith('/uploads/') ? url : `/uploads/projects/${project.id}/${url}`);
            }
          }
          project.photos = cleaned;
        } catch (_) {}
      } else {
        try {
          const toAbs = (u) => {
            const s = String(u || '').trim();
            if (!s) return s;
            if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s;
            return `https://${s}`;
          };
          project.photos = (Array.isArray(project.photos) ? project.photos : [project.photos])
            .filter(Boolean)
            .map(toAbs);
        } catch (_) { project.photos = []; }
      }
    } catch (_) {
      project.photos = Array.isArray(project.photos) ? project.photos.filter(Boolean) : [];
    }
    const { rows: teamMembers } = await query(`
      SELECT id, name
        FROM users
       WHERE role IN ('Admin','SuperAdmin')
         AND approved = true
       ORDER BY name
    `);
    res.render('projects/edit-project', { project, locations, error: null, currentUser: req.session.user, teamMembers });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle updating an existing project.
 */
exports.updateProject = async (req, res, next) => {
  try {
    const projId = parseInt(req.params.id, 10);
    const { rows } = await query(`SELECT * FROM projects WHERE id = $1`, [projId]);
    if (!rows.length) return res.status(404).render('errors/404');
    const existing = rows[0];

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
    const sanitizeDecimalString = (s) => {
      if (s === undefined || s === null) return null;
      const str = String(s).replace(/[^0-9,\.]/g, '').replace(/,/g, '.');
      if (!str) return null;
      const n = Number(str);
      return Number.isNaN(n) ? null : n;
    };
    const clamp = (n, min, max) => (n === null ? null : Math.min(Math.max(n, min), max));
    const maxSize = 9999999.99;
    const maxMoney = 9999999999.99;

    const title        = body.title?.trim() || existing.title;
    const description  = body.description?.trim() || existing.description;
    const country      = body.country?.trim() || existing.country;
    const city         = body.city?.trim() || existing.city;
    const neighborhood = body.neighborhood?.trim() || existing.neighborhood;
    const minUnitSize  = clamp(sanitizeDecimalString(body.min_unit_size), 0, maxSize);
    const maxUnitSize  = clamp(sanitizeDecimalString(body.max_unit_size), 0, maxSize);
    const minPrice     = clamp(sanitizeDecimalString(body.min_price), 0, maxMoney);
    const maxPrice     = clamp(sanitizeDecimalString(body.max_price), 0, maxMoney);
    const minBedrooms  = parseNumberField(body.min_bedrooms);
    const maxBedrooms  = parseNumberField(body.max_bedrooms);
    const minBathrooms = parseNumberField(body.min_bathrooms);
    const maxBathrooms = parseNumberField(body.max_bathrooms);
    const isSoldOut    = body.is_sold_out === 'on' || body.is_sold_out === 'true' || body.is_sold_out === true;
    let amenities      = body['amenities'] || body['amenities[]'] || existing.amenities || [];
    if (typeof amenities === 'string') {
      amenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Existing media defaults (normalize to array of strings)
    const normalizePhotosValue = (val) => {
      if (Array.isArray(val)) return val.filter(Boolean).map(String);
      if (typeof val === 'string') {
        const str = val.trim();
        if (!str) return [];
        if (str.startsWith('[')) {
          try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr.filter(Boolean).map(String) : []; } catch (_) { return []; }
        }
        if (str.startsWith('{') && str.endsWith('}')) {
          return str.slice(1, -1).split(',').map(s => s.replace(/^\"|\"$/g, '').trim()).filter(Boolean);
        }
        return [str];
      }
      return [];
    };
    let photos   = normalizePhotosValue(existing.photos);
    let videoUrl = existing.video_url || null;
    let brochure = existing.brochure_url || null;

    // New uploads (optional)
    const uploadedPhotosFiles = (req.files && Array.isArray(req.files.photos)) ? req.files.photos : [];
    // Apply removals for existing photos
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
        photos = photos.filter(p => !removedPhotosList.some(r => isSameUrl(p, r)));
      }
    } catch (_) {}
    const uploadedVideoFile = (req.files && Array.isArray(req.files.video) && req.files.video[0]) ? req.files.video[0] : null;
    if (uploadedVideoFile) {
      videoUrl = '/uploads/projects/' + encodeURIComponent(uploadedVideoFile.filename);
    }
    const removeExistingVideoFlag = String(body.remove_existing_video || 'false') === 'true';
    if (!uploadedVideoFile && removeExistingVideoFlag) {
      videoUrl = null;
    }
    const uploadedBrochure = (req.files && Array.isArray(req.files.brochure) && req.files.brochure[0]) ? req.files.brochure[0] : null;
    if (uploadedBrochure) {
      brochure = '/uploads/projects/' + encodeURIComponent(uploadedBrochure.filename);
    }

    

    // Apply saved order when no new uploads are present
    let photoOrderTokens = body['photos_order'] || body['photos_order[]'] || [];
    if (typeof photoOrderTokens === 'string') photoOrderTokens = [photoOrderTokens];
    if ((!uploadedPhotosFiles || uploadedPhotosFiles.length === 0) && Array.isArray(photoOrderTokens) && photoOrderTokens.length) {
      const ordered = [];
      const used = new Set();
      for (const t of photoOrderTokens) {
        if (!t || typeof t !== 'string') continue;
        if (t.startsWith('url:')) {
          const u = t.slice(4);
          if (u) { ordered.push(u); used.add(u); }
        }
      }
      for (const p of photos || []) { if (!used.has(p)) ordered.push(p); }
      photos = ordered;
    }

    // Normalize photos: for local-only ensure file exists; with Spaces, keep URLs
    if (!process.env.DO_SPACES_BUCKET) {
      try {
        const publicDir = path.join(__dirname, '../public');
        const normalizedExisting = [];
        for (const p of (photos || [])) {
          if (!p || !String(p).trim()) continue;
          const url = String(p);
          const abs = url.startsWith('/uploads/')
            ? path.join(publicDir, url.replace(/^\//, ''))
            : path.join(publicDir, 'uploads/projects', String(projId), url);
          if (fs.existsSync(abs)) {
            normalizedExisting.push(url.startsWith('/uploads/') ? url : `/uploads/projects/${projId}/${url}`);
          }
        }
        photos = normalizedExisting;
      } catch (_) {
        photos = (photos || []).filter(p => p && String(p).trim());
      }
    } else {
      photos = (photos || []).filter(p => p && String(p).trim());
    }

    // Assignment (agent): optional change
    const agentId = body.agent_id ? Number(body.agent_id) : existing.agent_id || null;

    // Validate
    const errors = [];
    if (!required(title))       errors.push('Title is required');
    if (!required(description)) errors.push('Description is required');
    if (!required(country))     errors.push('Country is required');
    if (!required(city))        errors.push('City is required');

    if (errors.length) {
      return res.status(400).render('projects/edit-project', {
        project: existing,
        locations,
        error: errors.join('. '),
        currentUser: req.session.user
      });
    }

    // Normalize unit types to a text[] regardless of single/multiple selection
    let unitTypesUpdate = body['unit_type'] || body['unit_type[]'];
    if (unitTypesUpdate === undefined || unitTypesUpdate === null || unitTypesUpdate === '') {
      unitTypesUpdate = existing.unit_types || [];
    } else if (typeof unitTypesUpdate === 'string') {
      unitTypesUpdate = [unitTypesUpdate];
    } else if (!Array.isArray(unitTypesUpdate)) {
      unitTypesUpdate = [];
    }

    // Persist basic fields first
    await query(
      `UPDATE projects SET
         country=$1, city=$2, neighborhood=$3, title=$4, description=$5,
         min_unit_size=$6, max_unit_size=$7, min_price=$8, max_price=$9,
         min_bedrooms=$10, max_bedrooms=$11, min_bathrooms=$12, max_bathrooms=$13,
         is_sold_out=$14, amenities=$15, unit_types=$16,
         agent_id=$17,
         updated_at=NOW()
       WHERE id=$18`,
      [
        country, city, neighborhood, title, description,
        minUnitSize, maxUnitSize, minPrice, maxPrice,
        minBedrooms, maxBedrooms, minBathrooms, maxBathrooms,
        isSoldOut, amenities, unitTypesUpdate,
        agentId,
        projId
      ]
    );

    // Auto-translate updated fields and upsert i18n
    try {
      const { rows: latestRows } = await query(`SELECT title_i18n, description_i18n FROM projects WHERE id = $1`, [projId]);
      const existingI18n = latestRows[0] || {};
      const i18n = await ensureLocalizedFields({
        fields: { title: title || '', description: description || '' },
        existing: existingI18n,
        sourceLang: 'en',
        targetLangs: ['es','de'],
        htmlFields: ['description']
      });
      await query(
        `UPDATE projects SET title_i18n = $1, description_i18n = $2 WHERE id = $3`,
        [i18n.title_i18n, i18n.description_i18n, projId]
      );
    } catch (_) { /* non-fatal */ }

    // If there are new uploads, update URLs; if not using Spaces, move files locally
    if (uploadedPhotosFiles.length || uploadedVideoFile || uploadedBrochure) {
      if (!process.env.DO_SPACES_BUCKET) {
        const path = require('path');
        const fs = require('fs');
        const projDir = path.join(__dirname, '../public/uploads/projects', String(projId));
        if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });

        const movedPhotos = [];
        for (let i = 0; i < uploadedPhotosFiles.length; i++) {
          const f = uploadedPhotosFiles[i];
          const src = f.path;
          
          // Generate SEO-friendly filename
          const seoFileName = generateSEOFileName(
            { title, neighborhood, city, country },
            'project',
            i + 1,
            path.extname(f.filename)
          );
          
          const dest = path.join(projDir, seoFileName);
          try { fs.renameSync(src, dest); } catch (_) {}
          try { await generateVariants(dest, `/uploads/projects/${projId}`); } catch (_) {}
          movedPhotos.push(`/uploads/projects/${projId}/${seoFileName}`);
        }
        if (movedPhotos.length) photos = [...photos, ...movedPhotos];
        if (uploadedVideoFile) {
          const src = uploadedVideoFile.path;
          
          // Generate SEO-friendly filename for video
          const seoVideoFileName = generateSEOFileName(
            { title, neighborhood, city, country },
            'project',
            1,
            path.extname(uploadedVideoFile.filename),
            'video'
          );
          
          const dest = path.join(projDir, seoVideoFileName);
          try { fs.renameSync(src, dest); } catch (_) {}
          videoUrl = `/uploads/projects/${projId}/${seoVideoFileName}`;
        }
        if (uploadedBrochure) {
          const src = uploadedBrochure.path; const dest = path.join(projDir, uploadedBrochure.filename);
          try { fs.renameSync(src, dest); } catch (_) {}
          brochure = `/uploads/projects/${projId}/${encodeURIComponent(uploadedBrochure.filename)}`;
        }
      }

      await query(
        `UPDATE projects SET photos=$1, video_url=$2, brochure_url=$3 WHERE id=$4`,
        [photos, videoUrl, brochure, projId]
      );
    }

    // Even if there were no new uploads, persist removals (photos/video) when arrays/flags changed
    if (!uploadedPhotosFiles.length && !uploadedVideoFile && !uploadedBrochure) {
      await query(
        `UPDATE projects SET photos=$1, video_url=$2 WHERE id=$3`,
        [photos, videoUrl, projId]
      );
    }

    // After DB persistence, best-effort delete removed files from disk (photos and old video)
    try {
      if (!process.env.DO_SPACES_BUCKET && removedPhotosList && removedPhotosList.length) {
        for (const url of removedPhotosList) {
          if (!url) continue;
          const normalizedUrl = String(url).replace(/^\//, '');
          const abs = path.join(__dirname, '../public', normalizedUrl);
          // 1) Try direct unlink of the exact URL
          try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (_) {}
          // 2) Remove potential responsive variants alongside the exact URL
          try {
            const ext = path.extname(abs);
            const base = abs.slice(0, -ext.length);
            const widths = [320, 480, 640, 960, 1280, 1600, 1920];
            const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
            for (const w of widths) {
              for (const e of exts) {
                const variant = `${base}-${w}${e}`;
                if (fs.existsSync(variant)) {
                  try { fs.unlinkSync(variant); } catch (_) {}
                }
              }
            }
          } catch (_) {}
          // 3) Also try deleting by basename inside the project folder (handles encoded/decoded names)
          try {
            const projDir = path.join(__dirname, '../public/uploads/projects', String(projId));
            const basename = path.basename(abs);
            const candidates = new Set([basename]);
            try { candidates.add(decodeURIComponent(basename)); } catch (_) {}
            // derive stems (without extension) for width-variant patterns
            const stems = new Set();
            for (const name of candidates) {
              const ext = path.extname(name);
              stems.add(name.slice(0, -ext.length));
            }
            if (fs.existsSync(projDir)) {
              const entries = fs.readdirSync(projDir);
              entries.forEach(entry => {
                // direct match
                if (candidates.has(entry)) {
                  const p = path.join(projDir, entry);
                  try { fs.unlinkSync(p); } catch (_) {}
                  return;
                }
                // width-variant match
                const ext = path.extname(entry);
                const stem = entry.slice(0, -ext.length);
                for (const s of stems) {
                  if (stem.startsWith(`${s}-`)) {
                    const p = path.join(projDir, entry);
                    try { fs.unlinkSync(p); } catch (_) {}
                    break;
                  }
                }
              });
            }
          } catch (_) {}
        }
      }
      if (removeExistingVideoFlag && existing.video_url && existing.video_url !== (videoUrl || '') && String(existing.video_url).startsWith('/uploads/')) {
        const absVid = path.join(__dirname, '../public', String(existing.video_url).replace(/^\//, ''));
        try { if (fs.existsSync(absVid)) fs.unlinkSync(absVid); } catch (_) {}
      }
    } catch (_) { /* best-effort */ }

    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/projects');
    }
    return res.redirect('/admin/dashboard/projects');
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a project.
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const projId = String(req.params.id);
    // Resolve slug BEFORE deleting row
    let slug = null;
    try {
      const { rows } = await query('SELECT slug FROM projects WHERE id = $1', [projId]);
      slug = rows[0]?.slug || null;
    } catch (_) {}

    // Remove DB row
    await query(`DELETE FROM projects WHERE id = $1`, [projId]);

  // Remove local folder only when not using Spaces
  if (!process.env.DO_SPACES_BUCKET) {
    const path = require('path');
    const fs = require('fs');
    const projDir = path.join(__dirname, '../public/uploads/projects', projId);
    if (fs.existsSync(projDir)) {
      try {
        fs.rmSync(projDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to remove project dir:', e);
      }
    }
  } else {
    try {
      const bucket = process.env.DO_SPACES_BUCKET;
      const prefixes = [];
      prefixes.push(`projects/${projId}/`);
      if (slug) prefixes.push(`projects/${slug}/`);
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
    } catch (e) { /* ignore */ }
  }

    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/projects');
    }
    return res.redirect('/admin/dashboard/projects');
  } catch (err) {
    next(err);
  }
};

/**
 * Public: List projects for public viewing with filters
 */
exports.listProjectsPublic = async (req, res, next) => {
  try {
    const {
      q = '', // search query
      country = '',
      city = '',
      neighborhood = '',
      unit_type = [], // array or single value (Villas, Apartments, Houses)
      min_price = '', // numeric string
      max_price = '', // numeric string
      sort = 'date_new',
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

    // Type of units filter (expects projects.unit_types text[] column)
    if (unit_type) {
      const unitTypeArray = Array.isArray(unit_type) ? unit_type.filter(Boolean) : [unit_type].filter(Boolean);
      if (unitTypeArray.length > 0) {
        whereConditions.push(`p.unit_types && $${paramIndex}::text[]`);
        queryParams.push(unitTypeArray);
        paramIndex++;
      }
    }

    // Price per unit filters using project's min_price/max_price range
    const minPriceNum = min_price ? Number(String(min_price).replace(/[^0-9.]/g, '')) : null;
    const maxPriceNum = max_price ? Number(String(max_price).replace(/[^0-9.]/g, '')) : null;
    if (minPriceNum !== null && !Number.isNaN(minPriceNum)) {
      // Overlap logic: project's max should be >= requested min
      whereConditions.push(`(p.max_price IS NOT NULL AND p.max_price >= $${paramIndex})`);
      queryParams.push(minPriceNum);
      paramIndex++;
    }
    if (maxPriceNum !== null && !Number.isNaN(maxPriceNum)) {
      // Overlap logic: project's min should be <= requested max
      whereConditions.push(`(p.min_price IS NOT NULL AND p.min_price <= $${paramIndex})`);
      queryParams.push(maxPriceNum);
      paramIndex++;
    }

    // Build the base query
    let baseQuery = `
      SELECT
        p.id, p.title, p.slug, p.country, p.city, p.neighborhood,
        p.description, p.photos, p.created_at,
        p.min_price, p.max_price, p.unit_types
      FROM projects p
      WHERE 1=1
    `;

    // Add WHERE clause if filters exist
    if (whereConditions.length > 0) {
      baseQuery += ` AND ${whereConditions.join(' AND ')}`;
    }

    // Add sorting
    let orderBy = 'p.created_at DESC';
    switch (sort) {
      case 'date_old':
        orderBy = 'p.created_at ASC';
        break;
      case 'name_asc':
        orderBy = 'p.title ASC';
        break;
      case 'name_desc':
        orderBy = 'p.title DESC';
        break;
      case 'completion_date':
        orderBy = 'p.completion_date ASC';
        break;
      case 'date_new':
      default:
        orderBy = 'p.created_at DESC';
        break;
    }

    baseQuery += ` ORDER BY ${orderBy}`;

    // Get total count for pagination (handle multiline SQL safely)
    const countQuery = baseQuery
      .replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) as count FROM')
      .replace(/ORDER BY[\s\S]*$/i, '');
    const { rows: countResult } = await query(countQuery, queryParams);
    const totalProjects = parseInt(countResult[0]?.count || '0', 10);

    // Add pagination
    const itemsPerPage = 9;
    const totalPages = Math.ceil(totalProjects / itemsPerPage);
    const offset = (parseInt(page) - 1) * itemsPerPage;
    
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(itemsPerPage, offset);

    // Execute the main query
    const { rows: projects } = await query(baseQuery, queryParams);

    // Normalize photos - handle both local paths and DigitalOcean Spaces URLs
    const langPub = res.locals.lang || 'en';
    const normalizedProjects = projects.map(p => {
      const arr = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      const normalized = arr.map(ph => {
        if (!ph) return ph;
        const phStr = String(ph);
        // If already a full path/URL (starts with /uploads/ or http), use as-is
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) {
          return phStr;
        }
        // Otherwise, assume it's a filename and prepend the project path
        return `/uploads/projects/${p.id}/${phStr}`;
      });
      return {
        ...p,
        // Do NOT translate project title on public list; show original as requested
        title: p.title,
        photos: normalized,
        slug: p.slug || `project-${p.id}`
      };
    });

    // Prepare filters object for the view
    const filters = {
      country,
      city,
      neighborhood,
      unit_type: Array.isArray(unit_type) ? unit_type : (unit_type ? [unit_type] : []),
      min_price: min_price || '',
      max_price: max_price || ''
    };

    // Detect variants presence for first image
    const publicDir = path.join(__dirname, '../public');
    const projectsWithVariants = normalizedProjects.map(p => {
      let has = false, base = null;
      const first = (p.photos && p.photos[0]) || null;
      if (first) {
        const ext = path.extname(first);
        const baseUrl = first.slice(0, -ext.length);
        const baseAbs = path.join(publicDir, baseUrl.replace(/^\//, ''));
        if (
          fs.existsSync(baseAbs + '-320.jpg') ||
          fs.existsSync(baseAbs + '-320.webp') ||
          fs.existsSync(baseAbs + '-320.avif')
        ) {
          has = true; base = baseUrl;
        }
      }
      return { ...p, has_variants: has, variant_base: base };
    });

    res.render('projects/project-list', { 
      projects: projectsWithVariants,
      locations,
      filters,
      query: q,
      sort,
      currentPage: parseInt(page),
      totalPages,
      totalProjects,
      queryParams: req.query
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: Show individual project details
 */
exports.showProject = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Get project details
    const { rows: projects } = await query(`
      SELECT
        p.id, p.title, p.title_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.description, p.photos, p.video_url, p.brochure_url, p.created_at, p.status,
        p.total_units, p.completion_date, p.price_range, p.features,
        p.amenities, p.specifications, p.location_details
      FROM projects p
      WHERE p.slug = $1 AND p.status = 'active'
    `, [slug]);

    if (projects.length === 0) {
      return res.status(404).render('error', {
        message: 'Project not found',
        error: { status: 404 }
      });
    }

    const project = projects[0];
    const langDetail = res.locals.lang || 'en';
    // Do NOT translate project title on public detail; show original
    // project.title remains as stored
    if (project.description_i18n && project.description_i18n[langDetail]) {
      project.description = project.description_i18n[langDetail];
    }
    
    // Normalize photos - handle both local paths and DigitalOcean Spaces URLs
    const arr = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
    project.photos = arr.map(ph => {
      if (!ph) return ph;
      const phStr = String(ph);
      // If already a full path/URL (starts with /uploads/ or http), use as-is
      if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) {
        return phStr;
      }
      // Otherwise, assume it's a filename and prepend the project path
      return `/uploads/projects/${project.id}/${phStr}`;
    });
    // Detect main variants
    let hasMain = false, mainBase = null;
    if (project.photos.length) {
      const first = project.photos[0];
      const ext = path.extname(first);
      const baseUrl = first.slice(0, -ext.length);
      const baseAbs = path.join(__dirname, '../public', baseUrl.replace(/^\//, ''));
      if (
        fs.existsSync(baseAbs + '-640.jpg') ||
        fs.existsSync(baseAbs + '-640.webp') ||
        fs.existsSync(baseAbs + '-640.avif')
      ) {
        hasMain = true; mainBase = baseUrl;
      }
    }
    project.has_main_variants = hasMain;
    project.main_variant_base = mainBase;
    
    // Parse features and amenities if they're JSON strings
    try {
      if (project.features && typeof project.features === 'string') {
        project.features = JSON.parse(project.features);
      }
      if (project.amenities && typeof project.amenities === 'string') {
        project.amenities = JSON.parse(project.amenities);
      }
      if (project.specifications && typeof project.specifications === 'string') {
        project.specifications = JSON.parse(project.specifications);
      }
    } catch (e) {
      console.warn('Error parsing project JSON fields:', e);
    }

    // Get related projects in the same area
    const { rows: relatedProjects } = await query(`
      SELECT id, title, slug, photos, city, country
      FROM projects
      WHERE status = 'active' 
        AND (city = $1 OR country = $2)
        AND id != $3
      ORDER BY created_at DESC
      LIMIT 3
    `, [project.city, project.country, project.id]);

    // Normalize photos for related projects - handle both local paths and DigitalOcean Spaces URLs
    const normalizedRelatedProjects = relatedProjects.map(p => {
      const arr2 = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      const photos = arr2.map(ph => {
        if (!ph) return ph;
        const phStr = String(ph);
        // If already a full path/URL (starts with /uploads/ or http), use as-is
        if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) {
          return phStr;
        }
        // Otherwise, assume it's a filename and prepend the project path
        return `/uploads/projects/${p.id}/${phStr}`;
      });
      let has=false, base=null;
      const first=photos[0];
      if (first) {
        const ext=path.extname(first); const baseUrl=first.slice(0,-ext.length);
        const baseAbs = path.join(__dirname, '../public', baseUrl.replace(/^\//, ''));
        if (fs.existsSync(baseAbs + '-320.jpg') || fs.existsSync(baseAbs + '-320.webp') || fs.existsSync(baseAbs + '-320.avif')) { has=true; base=baseUrl; }
      }
      return { ...p, photos, slug: p.slug || `project-${p.id}`, has_variants: has, variant_base: base };
    });

    // Get properties attached to this project
    const { rows: projectProperties } = await query(`
      SELECT 
        p.id, p.title, p.title_i18n, p.slug, p.price, p.type, p.bedrooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.photos, p.rental_income, p.rental_status
      FROM properties p
      WHERE p.is_in_project = true AND p.project_id = $1 AND p.slug IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 12
    `, [project.id]);

    // Normalize property data
    const normalizedProjectProperties = projectProperties.map(prop => {
      const lang = res.locals.lang || 'en';
      const localizedTitle = (prop.title_i18n && prop.title_i18n[lang]) || prop.title;
      
      // Normalize photos
      const photos = Array.isArray(prop.photos) ? prop.photos : (prop.photos ? [prop.photos] : []);
      
      return {
        ...prop,
        title: localizedTitle,
        photos: photos.length > 0 ? photos : []
      };
    });

    res.render('projects/project-detail', {
      project,
      relatedProjects: normalizedRelatedProjects,
      projectProperties: normalizedProjectProperties,
      locations
    });
  } catch (err) {
    next(err);
  }
};


//ADMIN


exports.listProjectsForAdmin = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page, 10) || 1;
    const limit  = 18;
    const offset = (page - 1) * limit;

    const { country, city } = req.query;

    // WHERE clause
    const conds = [];
    const vals  = [];
    let idx = 1;

    if (country) { conds.push(`p.country = $${idx++}`); vals.push(country); }
    if (city)    { conds.push(`p.city = $${idx++}`);    vals.push(city); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    // Count
    const countSql = `SELECT COUNT(*) AS total FROM projects p ${where}`;
    const countRes = await query(countSql, vals);
    const total = parseInt(countRes.rows[0].total || '0', 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Data
    const dataSql = `
      SELECT
        p.id, p.slug, p.title, p.country, p.city, p.neighborhood,
        p.photos
      FROM projects p
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows } = await query(dataSql, [...vals, limit, offset]);
    const normalizePhotos2 = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const str = val.trim();
        if (str.startsWith('[')) {
          try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr : []; } catch (_) {}
        }
        if (str.startsWith('{') && str.endsWith('}')) {
          return str.slice(1, -1).split(',').map(s => s.replace(/^\"|\"$/g, '').trim()).filter(Boolean);
        }
        if (str) return [str];
      }
      return [];
    };
    const projects = (rows || []).map(p => ({ ...p, photos: normalizePhotos2(p.photos) }));

    // Filters data
    const countryOptions = Object.keys(locations || {});
    const cityOptions = country && locations[country]
      ? Object.keys(locations[country] || {})
      : [];

    res.render('admin/projects/all-projects', {
      projects,                 // ← make sure this exists
      currentPage: page,
      totalPages,
      filters: { country, city },
      countryOptions,
      cityOptions,
      locations,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
};