// controllers/pdfController.js
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.error('[PDF] Puppeteer not found:', err.message);
  puppeteer = null;
}

const { query } = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Generate PDF expose for a property
 */
exports.generatePropertyPDF = async (req, res, next) => {
  let browser = null;
  let page = null;
  
  // Ensure we send a proper response even on errors
  const sendError = (message, status = 500) => {
    if (!res.headersSent) {
      console.error('[PDF] Sending error response:', message);
      res.status(status).type('text/plain').send(`PDF Generation Error: ${message}`);
    }
  };
  
  try {
    console.log('[PDF] Starting property PDF generation for slug:', req.params.slug);
    console.log('[PDF] Puppeteer available:', !!puppeteer);
    
    if (!puppeteer) {
      return sendError('PDF generation service not available. Puppeteer not installed.', 503);
    }
    
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
    
    // Get logo URL - check if it's in Digital Ocean Spaces, otherwise use server URL
    let logoUrl = `${baseUrl}/images/Sweet%20Home%20Logo.png`;
    if (process.env.DO_SPACES_CDN_ENDPOINT) {
      const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
      const cdnBase = cdn.startsWith('http') ? cdn : `https://${cdn}`;
      // Logo is in the root of the Spaces bucket
      logoUrl = `${cdnBase}/Sweet%20Home%20Logo.png`;
    }
    
    // Render HTML template
    console.log('[PDF] Rendering HTML template...');
    const html = await new Promise((resolve, reject) => {
      res.app.render('pdf/property-expose', {
        property,
        baseUrl,
        logoUrl,
        lang,
        t: res.locals.t || ((key, fallback) => fallback || '')
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
    
    // Configure Puppeteer for Render/hosting environments
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-gpu',
        '--single-process', // Important for Render
        '--no-zygote'
      ]
    };
    
    // Try to launch Puppeteer, with fallback to install Chrome if needed
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log('[PDF] Browser launched successfully');
    } catch (launchError) {
      console.error('[PDF] First launch attempt failed:', launchError.message);
      
      // On Render, Chrome needs to be installed first
      // Try to install it programmatically if possible
      if (launchError.message.includes('Could not find Chrome')) {
        try {
          const { execSync } = require('child_process');
          console.log('[PDF] Attempting to install Chrome...');
          execSync('npx puppeteer browsers install chrome', { 
            stdio: 'inherit',
            timeout: 120000 // 2 minutes timeout
          });
          browser = await puppeteer.launch(launchOptions);
          console.log('[PDF] Browser launched after Chrome installation');
        } catch (installError) {
          console.error('[PDF] Chrome installation failed:', installError.message);
          throw new Error(`Chrome not found. The build process should install Chrome. Please redeploy or check that the postinstall script runs. Original error: ${launchError.message}`);
        }
      } else {
        throw launchError;
      }
    }
    
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
        top: '35mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="position: absolute; top: 0; right: 15mm; width: auto; height: auto; padding: 12mm 0;">
          <img src="${logoUrl}" alt="Sweet Home" style="max-height: 60px; width: auto; display: block;" onerror="this.style.display='none';" />
        </div>
      `,
      footerTemplate: '<div></div>',
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
    console.error('[PDF] Error caught in generatePropertyPDF:', err);
    console.error('[PDF] Error stack:', err.stack);
    
    // Clean up browser
    if (page) {
      try {
        await page.close().catch(() => {});
      } catch (e) {}
    }
    if (browser) {
      try {
        await browser.close().catch(() => {});
      } catch (e) {}
    }
    
    // Send error response - never call next() for PDF routes to avoid HTML error pages
    if (!res.headersSent) {
      console.error('[PDF] Sending error response - headers not sent yet');
      return res.status(500).type('text/plain').send(`Error generating PDF: ${err.message || 'Unknown error'}\n\nStack: ${err.stack || 'No stack trace'}`);
    } else {
      console.error('[PDF] Headers already sent, cannot send error response');
    }
  }
};

/**
 * Generate PDF expose for a project
 */
exports.generateProjectPDF = async (req, res, next) => {
  let browser = null;
  let page = null;
  
  try {
    console.log('[PDF] Starting project PDF generation for slug:', req.params.slug);
    console.log('[PDF] Puppeteer available:', !!puppeteer);
    
    if (!puppeteer) {
      if (!res.headersSent) {
        return res.status(503).type('text/plain').send('PDF generation service not available. Puppeteer not installed.');
      }
      return;
    }
    
    const { slug } = req.params;
    
    // Get project data with all relevant information
    const { rows: projects } = await query(`
      SELECT
        p.id, p.title, p.title_i18n, p.slug, p.country, p.city, p.neighborhood,
        p.description, p.description_i18n, p.photos, p.video_url, p.brochure_url, 
        p.created_at, p.status,
        p.total_units, p.completion_date, p.price_range, p.features,
        p.amenities, p.specifications, p.location_details,
        p.unit_types, p.min_price, p.max_price,
        p.min_unit_size, p.max_unit_size,
        p.min_bedrooms, p.max_bedrooms,
        p.min_bathrooms, p.max_bathrooms
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
    
    // Get properties in this project
    const { rows: projectProperties } = await query(`
      SELECT 
        p.id, p.title, p.title_i18n, p.slug, p.price, p.type, p.rooms, p.bathrooms,
        CASE 
          WHEN p.type = 'Apartment' THEN p.apartment_size
          WHEN p.type IN ('House', 'Villa') THEN p.living_space
          WHEN p.type = 'Land' THEN p.land_size
          ELSE NULL
        END as size,
        p.photos
      FROM properties p
      WHERE p.is_in_project = true AND p.project_id = $1 AND p.slug IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 12
    `, [project.id]);
    
    // Normalize project properties
    const normalizedProjectProperties = projectProperties.map(prop => {
      const lang = res.locals.lang || 'en';
      const localizedTitle = (prop.title_i18n && prop.title_i18n[lang]) || prop.title;
      const photos = Array.isArray(prop.photos) ? prop.photos : (prop.photos ? [prop.photos] : []);
      return {
        ...prop,
        title: localizedTitle,
        photos: photos.length > 0 ? photos.slice(0, 1) : []
      };
    });
    
    project.properties = normalizedProjectProperties;

    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    console.log('[PDF] Base URL:', baseUrl);
    
    // Get logo URL - check if it's in Digital Ocean Spaces, otherwise use server URL
    let logoUrl = `${baseUrl}/images/Sweet%20Home%20Logo.png`;
    if (process.env.DO_SPACES_CDN_ENDPOINT) {
      const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
      const cdnBase = cdn.startsWith('http') ? cdn : `https://${cdn}`;
      // Logo is in the root of the Spaces bucket
      logoUrl = `${cdnBase}/Sweet%20Home%20Logo.png`;
    }
    
    // Render HTML template
    console.log('[PDF] Rendering HTML template...');
    let html;
    try {
      html = await new Promise((resolve, reject) => {
        res.app.render('pdf/project-expose', {
          project,
          baseUrl,
          logoUrl,
          lang,
          t: res.locals.t || ((key, fallback) => fallback || '')
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
    
    // Configure Puppeteer for Render/hosting environments
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-gpu',
        '--single-process', // Important for Render
        '--no-zygote'
      ]
    };
    
    // Try to launch Puppeteer, with fallback to install Chrome if needed
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log('[PDF] Browser launched successfully');
    } catch (launchError) {
      console.error('[PDF] First launch attempt failed:', launchError.message);
      
      // On Render, Chrome needs to be installed first
      // Try to install it programmatically if possible
      if (launchError.message.includes('Could not find Chrome')) {
        try {
          const { execSync } = require('child_process');
          console.log('[PDF] Attempting to install Chrome...');
          execSync('npx puppeteer browsers install chrome', { 
            stdio: 'inherit',
            timeout: 120000 // 2 minutes timeout
          });
          browser = await puppeteer.launch(launchOptions);
          console.log('[PDF] Browser launched after Chrome installation');
        } catch (installError) {
          console.error('[PDF] Chrome installation failed:', installError.message);
          throw new Error(`Chrome not found. The build process should install Chrome. Please redeploy or check that the postinstall script runs. Original error: ${launchError.message}`);
        }
      } else {
        throw launchError;
      }
    }
    
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
        top: '35mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="position: absolute; top: 0; right: 15mm; width: auto; height: auto; padding: 12mm 0;">
          <img src="${logoUrl}" alt="Sweet Home" style="max-height: 60px; width: auto; display: block;" onerror="this.style.display='none';" />
        </div>
      `,
      footerTemplate: '<div></div>',
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
    console.error('[PDF] Error caught in generateProjectPDF:', err);
    console.error('[PDF] Error stack:', err.stack);
    
    // Clean up browser
    if (page) {
      try {
        await page.close().catch(() => {});
      } catch (e) {}
    }
    if (browser) {
      try {
        await browser.close().catch(() => {});
      } catch (e) {}
    }
    
    // Send error response - never call next() for PDF routes to avoid HTML error pages
    if (!res.headersSent) {
      console.error('[PDF] Sending error response - headers not sent yet');
      return res.status(500).type('text/plain').send(`Error generating PDF: ${err.message || 'Unknown error'}\n\nStack: ${err.stack || 'No stack trace'}`);
    } else {
      console.error('[PDF] Headers already sent, cannot send error response');
    }
  }
};
