// controllers/pdfController.js
const puppeteer = require('puppeteer');
const { query } = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Generate PDF expose for a property
 */
exports.generatePropertyPDF = async (req, res, next) => {
  let browser = null;
  try {
    console.log('[PDF] Starting property PDF generation for slug:', req.params.slug);
    const { slug } = req.params;
    
    // Get property data (similar to showProperty)
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
        p.year_built, p.map_link,
        p.occupancy_type, p.rental_status, p.rental_income, p.housegeld,
        p.features,
        p.video_url, p.floorplan_url, p.plan_photo_url,
        p.is_in_project, p.project_id,
        pr.title AS project_title, pr.slug AS project_slug,
        u.name as agent_name, u.profile_picture as agent_profile_picture
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE p.slug = $1
      LIMIT 1
    `;
    const { rows } = await query(sql, [slug]);
    if (!rows.length) return res.status(404).send('Property not found');

    const p = rows[0];
    const lang = res.locals.lang || 'en';
    const localizedTitle = (p.title_i18n && p.title_i18n[lang]) || p.title;
    const localizedDescription = (p.description_i18n && p.description_i18n[lang]) || p.description;
    const photos = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
    
    const property = {
      ...p,
      title: localizedTitle,
      description: localizedDescription,
      photos: photos.slice(0, 10), // Limit to 10 photos for PDF
      agent: {
        name: p.agent_name || 'Agent',
        profile_picture: p.agent_profile_picture || null
      }
    };

    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    console.log('[PDF] Base URL:', baseUrl);
    
    // Render HTML template
    console.log('[PDF] Rendering HTML template...');
    const html = await new Promise((resolve, reject) => {
      res.app.render('pdf/property-expose', {
        property,
        baseUrl,
        lang
      }, (err, html) => {
        if (err) {
          console.error('[PDF] Error rendering template:', err);
          reject(err);
        } else {
          console.log('[PDF] Template rendered successfully, length:', html.length);
          resolve(html);
        }
      });
    });

    // Launch browser and generate PDF
    console.log('[PDF] Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    console.log('[PDF] Browser launched successfully');
    const page = await browser.newPage();
    
    // Set a longer timeout for page operations
    page.setDefaultTimeout(30000);
    
    // Disable CSP and other security features for PDF generation
    await page.setBypassCSP(true);
    
    // Block unnecessary resources to speed up rendering
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const url = req.url();
      // Block scripts, stylesheets from external sources (we only need images)
      if (resourceType === 'script' && !url.startsWith('data:')) {
        req.abort();
      } else if (resourceType === 'stylesheet' && url.includes('unpkg.com')) {
        req.abort();
      } else if (resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Set content with full base URL for images
    // Use 'domcontentloaded' instead of 'networkidle0' to avoid hanging on slow images
    console.log('[PDF] Setting page content...');
    await page.setContent(html, {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait a bit for images to load, but don't fail if some don't
    // Use a Promise-based delay instead of waitForTimeout
    console.log('[PDF] Waiting for images to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate PDF
    console.log('[PDF] Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      timeout: 30000
    });

    await browser.close();
    browser = null;

    // Send PDF
    console.log('[PDF] PDF generated successfully, size:', pdf.length, 'bytes');
    const filename = `property-${slug}-expose.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    console.error('[PDF] Unhandled error in generatePropertyPDF:', err);
    // Send a proper error response instead of just calling next
    if (!res.headersSent) {
      return res.status(500).send(`Error generating PDF: ${err.message}`);
    } else {
      next(err);
    }
  }
};

/**
 * Generate PDF expose for a project
 */
exports.generateProjectPDF = async (req, res, next) => {
  let browser = null;
  try {
    console.log('[PDF] Starting project PDF generation for slug:', req.params.slug);
    const { slug } = req.params;
    
    // Get project data
    const { rows: projects } = await query(`
      SELECT
        p.id, p.title, p.title_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.description, p.description_i18n, p.photos, p.video_url, p.brochure_url, 
        p.created_at, p.status,
        p.total_units, p.completion_date, p.price_range, p.features,
        p.amenities, p.specifications, p.location_details
      FROM projects p
      WHERE p.slug = $1 AND p.status = 'active'
    `, [slug]);

    if (projects.length === 0) {
      return res.status(404).send('Project not found');
    }

    const project = projects[0];
    const lang = res.locals.lang || 'en';
    if (project.description_i18n && project.description_i18n[lang]) {
      project.description = project.description_i18n[lang];
    }
    
    // Normalize photos
    const arr = Array.isArray(project.photos) ? project.photos : (project.photos ? [project.photos] : []);
    project.photos = arr.slice(0, 10).map(ph => {
      if (!ph) return ph;
      const phStr = String(ph);
      if (phStr.startsWith('/uploads/') || phStr.startsWith('http')) {
        return phStr;
      }
      return `/uploads/projects/${project.id}/${phStr}`;
    });

    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    console.log('[PDF] Base URL:', baseUrl);
    
    // Render HTML template
    console.log('[PDF] Rendering HTML template...');
    let html;
    try {
      html = await new Promise((resolve, reject) => {
        res.app.render('pdf/project-expose', {
          project,
          baseUrl,
          lang
        }, (err, html) => {
          if (err) {
            console.error('[PDF] Error rendering template:', err);
            reject(err);
          } else {
            console.log('[PDF] Template rendered successfully, length:', html.length);
            resolve(html);
          }
        });
      });
    } catch (renderErr) {
      console.error('[PDF] Failed to render template:', renderErr);
      if (!res.headersSent) {
        return res.status(500).send(`Error rendering PDF template: ${renderErr.message}`);
      }
      throw renderErr;
    }

    // Launch browser and generate PDF
    console.log('[PDF] Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    console.log('[PDF] Browser launched successfully');
    const page = await browser.newPage();
    
    // Set a longer timeout for page operations
    page.setDefaultTimeout(30000);
    
    // Disable CSP and other security features for PDF generation
    await page.setBypassCSP(true);
    
    // Block unnecessary resources to speed up rendering
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const url = req.url();
      // Block scripts, stylesheets from external sources (we only need images)
      if (resourceType === 'script' && !url.startsWith('data:')) {
        req.abort();
      } else if (resourceType === 'stylesheet' && url.includes('unpkg.com')) {
        req.abort();
      } else if (resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log('[PDF] Setting page content...');
    await page.setContent(html, {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait a bit for images to load, but don't fail if some don't
    // Use a Promise-based delay instead of waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate PDF
    console.log('[PDF] Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      timeout: 30000
    });

    await browser.close();
    browser = null;

    // Send PDF
    console.log('[PDF] PDF generated successfully, size:', pdf.length, 'bytes');
    const filename = `project-${slug}-expose.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    console.error('PDF generation error:', err);
    // Send a proper error response instead of just calling next
    if (!res.headersSent) {
      res.status(500).send(`Error generating PDF: ${err.message}`);
    } else {
      next(err);
    }
  }
};
