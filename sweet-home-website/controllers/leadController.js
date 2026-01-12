// controllers/leadController.js
const { query } = require('../config/db');
const Lead = require('../models/Lead');
const sendMail = require('../config/mailer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { logEvent } = require('../utils/analytics');
const XLSX = require('xlsx');
const XLSX = require('xlsx');

const { validationResult } = require('express-validator');

const EXTRA_LEAD_NOTIFY_EMAIL = String(process.env.LEAD_EXTRA_NOTIFY_EMAIL || 'Israel@sweet-home.co.il').trim();
const JOSE_EMAIL = 'JoseLongo@Medialy.Agency';
const DEFAULT_SITE_ORIGIN = 'https://sweet-home.co.il';

function buildEventMeta(data = {}) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

async function recordFormSubmission({ entityType, entityId = null, meta = {}, req }) {
  try {
    await logEvent({
      eventType: 'contact_form_submit',
      entityType,
      entityId,
      meta: buildEventMeta(meta),
      req
    });
  } catch (_) {}
}

function resolveOriginBase() {
  const raw = String(process.env.PUBLIC_BASE_URL || process.env.SITE_URL || process.env.APP_ORIGIN || '').trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return DEFAULT_SITE_ORIGIN;
}

function equalsIgnoreCase(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

// Webhook utility function
const sendToZapier = async (leadData) => {
  try {
    const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('Zapier webhook URL not configured');
      return;
    }

    // Enrich payload with property/project title, slug and URL if available
    let property_title = null, property_slug = null, project_title = null, project_slug = null;
    try {
      if (leadData.property_id) {
        const { rows } = await query('SELECT title, slug FROM properties WHERE id = $1 LIMIT 1', [leadData.property_id]);
        if (rows && rows[0]) { property_title = rows[0].title || null; property_slug = rows[0].slug || null; }
      }
      if (leadData.project_id) {
        const { rows } = await query('SELECT title, slug FROM projects WHERE id = $1 LIMIT 1', [leadData.project_id]);
        if (rows && rows[0]) { project_title = rows[0].title || null; project_slug = rows[0].slug || null; }
      }
    } catch (_) {}
    const originBase = String(process.env.PUBLIC_BASE_URL || process.env.SITE_URL || process.env.APP_ORIGIN || '').replace(/\/$/, '');
    const property_url = property_slug ? `${originBase}/properties/${property_slug}` : null;
    const project_url  = project_slug  ? `${originBase}/projects/${project_slug}`   : null;

    // Fetch agent details if agent_id is present
    let agent_name = null, agent_email = null, agent_bmby_id = null;
    try {
      if (leadData.agent_id) {
        const { rows } = await query('SELECT name, email, bmby_id FROM users WHERE id = $1 LIMIT 1', [leadData.agent_id]);
        if (rows && rows[0]) {
          agent_bmby_id = rows[0].bmby_id ? String(rows[0].bmby_id).trim() : null;
          const rawName = rows[0].name || agent_bmby_id;
          agent_name = rawName ? String(rawName).toLowerCase() : null;
          agent_email = rows[0].email || null;
        }
      } else if (!leadData.property_id && !leadData.project_id) {
        // General contact form (not property or project specific) - assign default agent
        agent_name = 'israel zeevi';
        agent_bmby_id = 'israel zeevi';
      }
    } catch (_) {}

    const payload = {
      lead_id: leadData.id,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      message: leadData.message,
      source: leadData.source,
      preferred_language: leadData.preferred_language,
      property_id: leadData.property_id,
      property_title,
      property_slug,
      property_url,
      project_id: leadData.project_id,
      project_title,
      project_slug,
      project_url,
      agent_id: leadData.agent_id,
      agent_name,
      agent_bmby_id,
      agent_email,
      created_at: leadData.created_at,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Lead sent to Zapier successfully');
    } else {
      console.error('Failed to send lead to Zapier:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error sending lead to Zapier:', error.message);
  }
};

// Public API: create a lead from property detail form
exports.createFromProperty = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: errors.array() });
    }
    const { name, email, message, propertyId, language } = req.body;
    // Robustly combine country code + phone if sent separately
    const phone = `${(req.body.countryCode || '').trim()} ${(req.body.phone || '').trim()}`.trim() || null;
    if (!name || !email || !propertyId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Determine agent from property
    const { rows } = await query('SELECT p.id, p.title, p.slug, p.agent_id, u.email AS agent_email, u.name AS agent_name FROM properties p LEFT JOIN users u ON u.id = p.agent_id WHERE p.id = $1', [propertyId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = rows[0];
    
    // Build property URL
    const originBase = resolveOriginBase();
    const propertyUrl = property.slug ? `${originBase}/properties/${property.slug}` : null;

    // Prevent quick duplicates (same email, same property within 5 minutes)
    const dupCheck = await query(
      `SELECT id FROM leads
        WHERE email = $1 AND property_id = $2 AND created_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY created_at DESC
        LIMIT 1`,
      [email, property.id]
    );

    const lead = dupCheck.rows[0] ? await Lead.findById(dupCheck.rows[0].id) : await Lead.create({
      property_id: property.id,
      agent_id: property.agent_id || null,
      name,
      email,
      phone,
      message,
      preferred_language: language || null,
      source: 'property_form'
    });

    // Respond quickly, then send emails asynchronously
    res.json({ success: true, lead });

    // Send to Zapier webhook (async)
    setImmediate(() => {
      sendToZapier(lead);
    });

    setImmediate(async () => {
      // Increment inquiry count in property_stats
      try {
        const upd = await query(`UPDATE property_stats SET email_clicks = email_clicks + 1, last_updated = NOW() WHERE property_id = $1`, [property.id]);
        if (upd.rowCount === 0) {
          await query(`INSERT INTO property_stats(property_id, views, email_clicks, last_updated) VALUES ($1, 0, 1, NOW()) ON CONFLICT DO NOTHING`, [property.id]);
        }
      } catch (_) {}
      await recordFormSubmission({
        entityType: 'property',
        entityId: property.id,
        meta: {
          form: 'property_detail',
          property_slug: property.slug || null,
          property_title: property.title || null
        },
        req
      });
      // Email to lead (thank you) — localized by preferred language
      try {
        const lang = String(language || '').slice(0,2).toLowerCase();
        const L = ['en','es','de'].includes(lang) ? lang : 'en';
        const subjects = {
          en: `Thank you for your interest in ${property.title}`,
          es: `Gracias por tu interés en ${property.title}`,
          de: `Vielen Dank für Ihr Interesse an ${property.title}`
        };
        const htmlBodies = {
          en: `
            <p>Hi ${name},</p>
            <p>Thank you for reaching out about <strong>${property.title}</strong>. Our team will be in touch soon.</p>
            <p>Best regards,<br/>Sweet Home Real Estate Investments' team</p>
          `,
          es: `
            <p>Hola ${name},</p>
            <p>Gracias por tu interés en <strong>${property.title}</strong>. Nuestro equipo se pondrá en contacto contigo pronto.</p>
            <p>Un saludo,<br/>Sweet Home Real Estate Investments</p>
          `,
          de: `
            <p>Hallo ${name},</p>
            <p>Vielen Dank für Ihr Interesse an <strong>${property.title}</strong>. Unser Team wird sich in Kürze bei Ihnen melden.</p>
            <p>Mit freundlichen Grüßen,<br/>Sweet Home Real Estate Investments</p>
          `
        };
        const textBodies = {
          en: `Hi ${name},\n\nThank you for reaching out about ${property.title}. Our team will be in touch soon.\n\nBest regards,\nSweet Home Real Estate Investments' team`,
          es: `Hola ${name},\n\nGracias por tu interés en ${property.title}. Nuestro equipo se pondrá en contacto contigo pronto.\n\nUn saludo,\nSweet Home Real Estate Investments`,
          de: `Hallo ${name},\n\nVielen Dank für Ihr Interesse an ${property.title}. Unser Team wird sich in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen,\nSweet Home Real Estate Investments`
        };
        const info = await sendMail({
          to: email,
          subject: subjects[L],
          html: htmlBodies[L],
          text: textBodies[L]
        });
        if (process.env.SMTP_DEBUG === 'true') {
          console.log('Lead thank-you email dispatched:', info && info.messageId);
        }
      } catch (_) {}

      // Email to agent (notification) with extra BCC when appropriate; fallback to direct send to extra if no agent
      if (property.agent_email) {
        try {
          // Build BCC list with extra recipients
          const bccList = [];
          if (EXTRA_LEAD_NOTIFY_EMAIL && !equalsIgnoreCase(property.agent_email, EXTRA_LEAD_NOTIFY_EMAIL)) {
            bccList.push(EXTRA_LEAD_NOTIFY_EMAIL);
          }
          if (JOSE_EMAIL && !equalsIgnoreCase(property.agent_email, JOSE_EMAIL) && !equalsIgnoreCase(EXTRA_LEAD_NOTIFY_EMAIL, JOSE_EMAIL)) {
            bccList.push(JOSE_EMAIL);
          }
          const info = await sendMail({
            to: property.agent_email,
            ...(bccList.length > 0 ? { bcc: bccList.join(',') } : {}),
            subject: `New lead for ${property.title}`,
            html: `
              <p>You have a new lead for <strong>${property.title}</strong>.</p>
              ${propertyUrl ? `<p><strong>Property:</strong> <a href="${propertyUrl}">${propertyUrl}</a></p>` : ''}
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p>You can view this lead in the CRM from your dashboard.</p>
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New lead for ${property.title}${propertyUrl ? `\nProperty: ${propertyUrl}` : ''}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('Lead notification email dispatched:', info && info.messageId);
          }
        } catch (_) {}
      } else if (EXTRA_LEAD_NOTIFY_EMAIL) {
        try {
          // Build recipient list with Jose if different from EXTRA_LEAD_NOTIFY_EMAIL
          const recipientList = [EXTRA_LEAD_NOTIFY_EMAIL];
          if (JOSE_EMAIL && !equalsIgnoreCase(EXTRA_LEAD_NOTIFY_EMAIL, JOSE_EMAIL)) {
            recipientList.push(JOSE_EMAIL);
          }
          await sendMail({
            to: recipientList.join(','),
            subject: `New lead for ${property.title}`,
            html: `
              <p>New lead received.</p>
              <ul>
                <li><strong>Property:</strong> ${property.title}</li>
                ${propertyUrl ? `<li><strong>Property Link:</strong> <a href="${propertyUrl}">${propertyUrl}</a></li>` : ''}
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New lead\nProperty: ${property.title}${propertyUrl ? `\nProperty Link: ${propertyUrl}` : ''}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
        } catch (_) {}
      }
    });

    return; // response already sent
  } catch (err) {
    next(err);
  }
};

// Public API: create a lead from project contact form
exports.createFromProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: errors.array() });
    }
    const { name, email, message, projectId, language } = req.body;
    // Robustly combine country code + phone if sent separately
    const phone = `${(req.body.countryCode || '').trim()} ${(req.body.phone || '').trim()}`.trim() || null;
    if (!name || !email || !projectId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Determine agent from project
    const { rows } = await query(
      `SELECT p.id, p.title, p.slug, p.agent_id, u.email AS agent_email, u.name AS agent_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.agent_id
        WHERE p.id = $1`,
      [projectId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = rows[0];
    
    // Build project URL
    const originBase = resolveOriginBase();
    const projectUrl = project.slug ? `${originBase}/projects/${project.slug}` : null;

    // Prevent quick duplicates (same email, same project within 5 minutes)
    const dupCheck = await query(
      `SELECT id FROM leads
         WHERE email = $1 AND project_id = $2 AND created_at >= NOW() - INTERVAL '5 minutes'
         ORDER BY created_at DESC
         LIMIT 1`,
      [email, project.id]
    );

    const lead = dupCheck.rows[0] ? await Lead.findById(dupCheck.rows[0].id) : await Lead.create({
      project_id: project.id,
      agent_id: project.agent_id || null,
      name,
      email,
      phone,
      message,
      preferred_language: language || null,
      source: 'project_form'
    });

    // Respond quickly
    res.json({ success: true, lead });

    // Send to Zapier webhook (async)
    setImmediate(() => {
      sendToZapier(lead);
    });

    // Emails (async)
    setImmediate(async () => {
      await recordFormSubmission({
        entityType: 'project',
        entityId: project.id,
        meta: {
          form: 'project_detail',
          project_slug: project.slug || null,
          project_title: project.title || null
        },
        req
      });
      try {
        const lang = String(language || '').slice(0,2).toLowerCase();
        const L = ['en','es','de'].includes(lang) ? lang : 'en';
        const subjects = {
          en: `Thank you for your interest in ${project.title}`,
          es: `Gracias por tu interés en ${project.title}`,
          de: `Vielen Dank für Ihr Interesse an ${project.title}`
        };
        const htmlBodies = {
          en: `
            <p>Hi ${name},</p>
            <p>Thank you for your interest in <strong>${project.title}</strong>. Our team will be in touch soon.</p>
            <p>Best regards,<br/>Sweet Home Real Estate Investments' team</p>
          `,
          es: `
            <p>Hola ${name},</p>
            <p>Gracias por tu interés en <strong>${project.title}</strong>. Nuestro equipo se pondrá en contacto contigo pronto.</p>
            <p>Un saludo,<br/>Sweet Home Real Estate Investments</p>
          `,
          de: `
            <p>Hallo ${name},</p>
            <p>Vielen Dank für Ihr Interesse an <strong>${project.title}</strong>. Unser Team wird sich in Kürze bei Ihnen melden.</p>
            <p>Mit freundlichen Grüßen,<br/>Sweet Home Real Estate Investments</p>
          `
        };
        const textBodies = {
          en: `Hi ${name},\n\nThank you for your interest in ${project.title}. Our team will be in touch soon.\n\nBest regards,\nSweet Home Real Estate Investments' team`,
          es: `Hola ${name},\n\nGracias por tu interés en ${project.title}. Nuestro equipo se pondrá en contacto contigo pronto.\n\nUn saludo,\nSweet Home Real Estate Investments`,
          de: `Hallo ${name},\n\nVielen Dank für Ihr Interesse an ${project.title}. Unser Team wird sich in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen,\nSweet Home Real Estate Investments`
        };
        const info = await sendMail({
          to: email,
          subject: subjects[L],
          html: htmlBodies[L],
          text: textBodies[L]
        });
        if (process.env.SMTP_DEBUG === 'true') {
          console.log('Project lead thank-you email dispatched:', info && info.messageId);
        }
      } catch (_) {}

      if (project.agent_email) {
        try {
          // Build BCC list with extra recipients
          const bccList = [];
          if (EXTRA_LEAD_NOTIFY_EMAIL && !equalsIgnoreCase(project.agent_email, EXTRA_LEAD_NOTIFY_EMAIL)) {
            bccList.push(EXTRA_LEAD_NOTIFY_EMAIL);
          }
          if (JOSE_EMAIL && !equalsIgnoreCase(project.agent_email, JOSE_EMAIL) && !equalsIgnoreCase(EXTRA_LEAD_NOTIFY_EMAIL, JOSE_EMAIL)) {
            bccList.push(JOSE_EMAIL);
          }
          const info = await sendMail({
            to: project.agent_email,
            ...(bccList.length > 0 ? { bcc: bccList.join(',') } : {}),
            subject: `New lead for project: ${project.title}`,
            html: `
              <p>You have a new project lead for <strong>${project.title}</strong>.</p>
              ${projectUrl ? `<p><strong>Project:</strong> <a href="${projectUrl}">${projectUrl}</a></p>` : ''}
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p>You can view this lead in the CRM from your dashboard.</p>
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New project lead for ${project.title}${projectUrl ? `\nProject: ${projectUrl}` : ''}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('Project lead notification email dispatched:', info && info.messageId);
          }
        } catch (_) {}
      } else if (EXTRA_LEAD_NOTIFY_EMAIL) {
        try {
          // Build recipient list with Jose if different from EXTRA_LEAD_NOTIFY_EMAIL
          const recipientList = [EXTRA_LEAD_NOTIFY_EMAIL];
          if (JOSE_EMAIL && !equalsIgnoreCase(EXTRA_LEAD_NOTIFY_EMAIL, JOSE_EMAIL)) {
            recipientList.push(JOSE_EMAIL);
          }
          await sendMail({
            to: recipientList.join(','),
            subject: `New lead for project: ${project.title}`,
            html: `
              <p>New project lead received.</p>
              <ul>
                <li><strong>Project:</strong> ${project.title}</li>
                ${projectUrl ? `<li><strong>Project Link:</strong> <a href="${projectUrl}">${projectUrl}</a></li>` : ''}
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New project lead\nProject: ${project.title}${projectUrl ? `\nProject Link: ${projectUrl}` : ''}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
        } catch (_) {}
      }
    });

  } catch (err) { next(err); }
};
// Admin: list leads for the logged-in agent
exports.listForAdmin = async (req, res, next) => {
  try {
    const agentId = req.session.user.id;
    const filters = {
      q: req.query.q || '',
      status: req.query.status || '',
      from: req.query.from || '',
      to: req.query.to || '',
      propertyId: req.query.propertyId || '',
      projectId: req.query.projectId || '',
      leadType: req.query.leadType || '',
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20
    };
    const { rows, total } = await Lead.listForAgent(agentId, filters);
    res.render('admin/leads/manage-leads', {
      leads: rows,
      total,
      filters,
      currentUser: req.session.user,
      activePage: 'leads'
    });
  } catch (err) { next(err); }
};

// SuperAdmin: list all leads
exports.listAll = async (req, res, next) => {
  try {
    const filters = {
      q: req.query.q || '',
      status: req.query.status || '',
      from: req.query.from || '',
      to: req.query.to || '',
      agentId: req.query.agentId || '',
      propertyId: req.query.propertyId || '',
      projectId: req.query.projectId || '',
      leadType: req.query.leadType || '',
      leadKind: req.query.leadKind || '',
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20
    };
    const { rows, total } = await Lead.listAll(filters);
    // Fetch all agents for assignment dropdown
    const { rows: allAgents } = await query(`
      SELECT id, name
        FROM users
       WHERE role IN ('Admin','SuperAdmin')
         AND approved = true
       ORDER BY name
    `);
    // Pending requests count for sidebar badge
    const pendingCountRes = await query(
      "SELECT COUNT(*) AS count FROM users WHERE approved = false AND role IN ('Admin','SuperAdmin')"
    );
    const pendingCount = parseInt(pendingCountRes.rows[0].count, 10) || 0;
    res.render('superadmin/leads/manage-leads', {
      leads: rows,
      total,
      filters,
      currentUser: req.session.user,
      activePage: 'leads',
      pendingCount,
      allAgents
    });
  } catch (err) { next(err); }
};

// SuperAdmin: Export all leads (respects filters, no pagination)
exports.exportAll = async (req, res, next) => {
  try {
    const format = req.query.format || 'csv'; // 'csv' or 'excel'
    if (!['csv', 'excel'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid format. Use "csv" or "excel"' });
    }

    // Use the same filters as listAll, but without pagination
    const filters = {
      q: req.query.q || '',
      status: req.query.status || '',
      from: req.query.from || '',
      to: req.query.to || '',
      agentId: req.query.agentId || '',
      propertyId: req.query.propertyId || '',
      projectId: req.query.projectId || '',
      leadType: req.query.leadType || '',
      leadKind: req.query.leadKind || ''
    };

    // Get all leads matching filters (no pagination)
    const where = ['TRUE'];
    const params = [];
    let idx = 1;
    if (filters.q) { where.push(`(LOWER(l.name) LIKE LOWER($${idx}) OR LOWER(l.email) LIKE LOWER($${idx}) OR LOWER(l.phone) LIKE LOWER($${idx}) OR LOWER(l.message) LIKE LOWER($${idx}))`); params.push(`%${filters.q}%`); idx++; }
    if (filters.status) { where.push(`l.status = $${idx}`); params.push(filters.status); idx++; }
    if (filters.from) { where.push(`l.created_at >= $${idx}`); params.push(filters.from); idx++; }
    if (filters.to) { where.push(`l.created_at <= $${idx}`); params.push(filters.to); idx++; }
    if (filters.agentId) {
      if (filters.agentId === 'unassigned') {
        where.push(`l.agent_id IS NULL`);
      } else {
        where.push(`l.agent_id = $${idx}`);
        params.push(parseInt(filters.agentId, 10));
        idx++;
      }
    }
    if (filters.propertyId) { where.push(`l.property_id = $${idx}`); params.push(filters.propertyId); idx++; }
    if (filters.projectId) { where.push(`l.project_id = $${idx}`); params.push(filters.projectId); idx++; }
    if (filters.leadType === 'property') { where.push(`l.property_id IS NOT NULL`); }
    if (filters.leadType === 'project')  { where.push(`l.project_id IS NOT NULL`); }
    if (filters.leadKind === 'buyer')    { where.push(`(l.source = 'property_form' OR l.source = 'project_form')`); }
    if (filters.leadKind === 'seller')   { where.push(`l.source = 'seller_form'`); }
    if (filters.leadKind === 'unknown')  { where.push(`(l.source IS NULL OR l.source NOT IN ('property_form','project_form','seller_form'))`); }

    const exportSql = `
      SELECT l.*, 
             p.title AS property_title, p.slug AS property_slug, p.neighborhood AS property_neighborhood, p.city AS property_city, p.country AS property_country,
             pr.title AS project_title, pr.slug AS project_slug, pr.neighborhood AS project_neighborhood, pr.city AS project_city, pr.country AS project_country,
             u.name AS agent_name
        FROM leads l
        LEFT JOIN properties p ON p.id = l.property_id
        LEFT JOIN projects pr ON pr.id = l.project_id
        LEFT JOIN users u ON u.id = l.agent_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.created_at DESC
    `;
    const { rows: leads } = await query(exportSql, params);

    // Prepare data for export
    const exportData = leads.map(lead => {
      // Determine source text
      let sourceText = '';
      switch(lead.source) {
        case 'seller_form': sourceText = 'Sellers Form'; break;
        case 'contact_form': sourceText = 'General Contact Form'; break;
        case 'property_form': sourceText = 'Property Form'; break;
        case 'project_form': sourceText = 'Project Form'; break;
        default: sourceText = lead.source || 'Unknown';
      }

      // Determine location for property
      let propertyLocation = '';
      if (lead.property_id && (lead.property_neighborhood || lead.property_city)) {
        propertyLocation = `${lead.property_neighborhood || lead.property_city}, ${lead.property_city || lead.property_country}`;
      }

      // Determine location for project
      let projectLocation = '';
      if (lead.project_id && (lead.project_neighborhood || lead.project_city)) {
        projectLocation = `${lead.project_neighborhood || lead.project_city}, ${lead.project_city || lead.project_country}`;
      }

      // Format dates
      const createdDate = lead.created_at ? new Date(lead.created_at).toLocaleString() : '';
      const lastContactDate = lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleString() : '';

      // Parse internal notes count
      const notesCount = lead.internal_notes ? String(lead.internal_notes).split(/\n\n+/).filter(Boolean).length : 0;

      return {
        'ID': lead.id,
        'Created Date': createdDate,
        'Name': lead.name || '',
        'Email': lead.email || '',
        'Phone': lead.phone || '',
        'Message': lead.message || '',
        'Status': lead.status || 'New',
        'Source': sourceText,
        'Preferred Language': lead.preferred_language ? String(lead.preferred_language).toUpperCase() : '',
        'Property ID': lead.property_id || '',
        'Property Title': lead.property_title || '',
        'Property Location': propertyLocation,
        'Project ID': lead.project_id || '',
        'Project Title': lead.project_title || '',
        'Project Location': projectLocation,
        'Agent Name': lead.agent_name || 'Unassigned',
        'Agent ID': lead.agent_id || '',
        'Last Contact Date': lastContactDate,
        'Internal Notes Count': notesCount,
        'Internal Notes': lead.internal_notes || '',
        'Seller Neighborhood': lead.seller_neighborhood || '',
        'Seller Size (sqm)': lead.seller_size || '',
        'Seller Rooms': lead.seller_rooms || '',
        'Seller Occupancy Status': lead.seller_occupancy_status || '',
        'UTM Source': lead.utm_source || '',
        'UTM Medium': lead.utm_medium || '',
        'UTM Campaign': lead.utm_campaign || '',
        'UTM Term': lead.utm_term || '',
        'UTM Content': lead.utm_content || '',
        'Referrer': lead.referrer || '',
        'Page Path': lead.page_path || ''
      };
    });

    if (format === 'csv') {
      // Generate CSV
      if (exportData.length === 0) {
        return res.status(404).json({ success: false, message: 'No leads found matching the filters' });
      }

      // Get headers from first row
      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];

      // Add data rows
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');
      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 compatibility
    } else {
      // Generate Excel
      if (exportData.length === 0) {
        return res.status(404).json({ success: false, message: 'No leads found matching the filters' });
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

      // Set column widths for better readability
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 20 }, // Created Date
        { wch: 20 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Phone
        { wch: 40 }, // Message
        { wch: 15 }, // Status
        { wch: 20 }, // Source
        { wch: 18 }, // Preferred Language
        { wch: 12 }, // Property ID
        { wch: 30 }, // Property Title
        { wch: 30 }, // Property Location
        { wch: 12 }, // Project ID
        { wch: 30 }, // Project Title
        { wch: 30 }, // Project Location
        { wch: 20 }, // Agent Name
        { wch: 10 }, // Agent ID
        { wch: 20 }, // Last Contact Date
        { wch: 18 }, // Internal Notes Count
        { wch: 50 }, // Internal Notes
        { wch: 20 }, // Seller Neighborhood
        { wch: 15 }, // Seller Size
        { wch: 12 }, // Seller Rooms
        { wch: 20 }, // Seller Occupancy Status
        { wch: 15 }, // UTM Source
        { wch: 15 }, // UTM Medium
        { wch: 20 }, // UTM Campaign
        { wch: 15 }, // UTM Term
        { wch: 15 }, // UTM Content
        { wch: 40 }, // Referrer
        { wch: 40 }  // Page Path
      ];
      worksheet['!cols'] = colWidths;

      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    }
  } catch (err) { next(err); }
};

// Update lead (status, notes, last_contact_at)
exports.updateLead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, internal_notes, last_contact_at, agent_id, append_note } = req.body;

    // Security: ensure admin can only update their leads; SuperAdmin can update any
    const { rows } = await query('SELECT agent_id, internal_notes FROM leads WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const ownerId = rows[0].agent_id;
    const role = req.session.user?.role;
    const currentId = req.session.user?.id;
    if (!(role === 'SuperAdmin' || ownerId === currentId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let updateFields = {
      ...(status ? { status } : {}),
      ...(typeof internal_notes === 'string' ? { internal_notes } : {}),
      ...(last_contact_at ? { last_contact_at } : {})
    };
    // If append_note is provided, append a new line with author and timestamp
    if (typeof append_note === 'string' && append_note.trim()) {
      const author = req.session.user?.name || 'Unknown';
      const ts = new Date().toISOString().replace('T',' ').slice(0,19);
      const existing = rows[0].internal_notes || '';
      const entry = `${append_note.trim()} (by ${author} on ${ts})`;
      const combined = existing ? `${existing}\n\n${entry}` : entry;
      updateFields.internal_notes = combined;
    }
    // Only SuperAdmin can reassign agent_id
    if (role === 'SuperAdmin' && (agent_id === null || agent_id === '' || Number.isFinite(Number(agent_id)))) {
      updateFields.agent_id = agent_id === '' ? null : (agent_id === null ? null : Number(agent_id));
    }

    const updated = await Lead.update(id, updateFields);
    res.json({ success: true, lead: updated });
  } catch (err) { next(err); }
};


// Delete lead (Admin can delete own leads; SuperAdmin can delete any)
exports.deleteLead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const role = req.session.user?.role;
    const currentId = req.session.user?.id;

    // Fetch lead owner
    const { rows } = await query('SELECT agent_id FROM leads WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const ownerId = rows[0].agent_id;

    if (!(role === 'SuperAdmin' || ownerId === currentId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await require('../models/Lead').remove(id);
    return res.json({ success: true });
  } catch (err) { next(err); }
};


