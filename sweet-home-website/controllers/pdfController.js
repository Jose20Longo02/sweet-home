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
    
    // Render HTML template
    const html = await new Promise((resolve, reject) => {
      res.app.render('pdf/property-expose', {
        property,
        baseUrl,
        lang
      }, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    // Launch browser and generate PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set content with full base URL for images
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      baseURL: baseUrl
    });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    browser = null;

    // Send PDF
    const filename = `property-${slug}-expose.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (browser) await browser.close();
    next(err);
  }
};

/**
 * Generate PDF expose for a project
 */
exports.generateProjectPDF = async (req, res, next) => {
  let browser = null;
  try {
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
    
    // Render HTML template
    const html = await new Promise((resolve, reject) => {
      res.app.render('pdf/project-expose', {
        project,
        baseUrl,
        lang
      }, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    // Launch browser and generate PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      baseURL: baseUrl
    });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    browser = null;

    // Send PDF
    const filename = `project-${slug}-expose.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (browser) await browser.close();
    next(err);
  }
};
