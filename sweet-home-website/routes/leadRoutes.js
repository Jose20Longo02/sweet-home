// routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { query } = require('../config/db');
const sendMail = require('../config/mailer');
const { ensureAdmin, ensureSuperAdmin, ensureAuthenticated } = require('../middleware/authorize');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { recaptchaRequired } = require('../middleware/recaptcha');
const { spamDetection } = require('../middleware/spamDetection');
const recaptchaMinScore = (() => {
  const v = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  return Number.isFinite(v) ? v : 0.5;
})();

// Rate limiters for lead endpoints
const createLeadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const leadValidations = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').isString().trim().isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isString().trim().isLength({ max: 30 }),
  body('message').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  body('propertyId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('projectId').optional({ checkFalsy: true }).isInt({ min: 1 })
];

// Public API endpoints (rate limited + validated + spam detection)
router.post('/api/leads', createLeadLimiter, recaptchaRequired(recaptchaMinScore), leadValidations, spamDetection(), leadController.createFromProperty);
router.post('/api/leads/project', createLeadLimiter, recaptchaRequired(recaptchaMinScore), leadValidations, spamDetection(), leadController.createFromProject);

// Public contact form endpoint
router.post(
  '/api/leads/contact',
  createLeadLimiter,
  recaptchaRequired(recaptchaMinScore),
  spamDetection(),
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    body('email').isString().trim().isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).isString().trim().isLength({ max: 30 }),
    body('message').isString().trim().isLength({ min: 5, max: 2000 }),
    body('lead_type').optional({ checkFalsy: true }).isIn(['seller','buyer','unknown'])
  ],
  async (req, res, next) => {
    try {
      const Lead = require('../models/Lead');
      const { name, email, message, lead_type, language, neighborhood, size, rooms, occupancy } = req.body;
      // Combine countryCode + phone on server to be robust to client variations
      let phone = req.body.phone || '';
      const cc = (req.body.countryCode || '').trim();
      const ph = (req.body.phone || '').trim();
      if (cc || ph) phone = `${cc} ${ph}`.trim();
      
      // Parse seller property fields
      const seller_neighborhood = neighborhood ? String(neighborhood).trim() : null;
      const seller_size = size && !isNaN(parseFloat(size)) ? parseFloat(size) : null;
      const seller_rooms = rooms && !isNaN(parseFloat(rooms)) ? parseFloat(rooms) : null;
      const seller_occupancy_status = occupancy && ['empty', 'tenanted'].includes(occupancy) ? occupancy : null;
      // Extra throttle for seller leads: avoid duplicates per email within 15 minutes
      if (lead_type === 'seller' && email) {
        const { rows: existing } = await require('../config/db').query(
          `SELECT id FROM leads WHERE email = $1 AND source = 'seller_form' AND created_at >= NOW() - INTERVAL '15 minutes' LIMIT 1`,
          [email]
        );
        if (existing.length) {
          return res.json({ success: true, throttled: true });
        }
      }
      const lead = await Lead.create({
        property_id: null,
        project_id: null,
        agent_id: null,
        name, email, phone, message,
        preferred_language: language || null,
        source: lead_type === 'seller' ? 'seller_form' : 'contact_form',
        seller_neighborhood,
        seller_size,
        seller_rooms,
        seller_occupancy_status
      });
      res.json({ success: true, lead });

      // Send to Zapier webhook (async)
      setImmediate(async () => {
        try {
          // Use dedicated seller webhook if this is a seller lead, otherwise use general webhook
          const isSellerLead = lead_type === 'seller' || lead.source === 'seller_form';
          const webhookUrl = isSellerLead 
            ? (process.env.ZAPIER_SELLER_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL)
            : process.env.ZAPIER_WEBHOOK_URL;
          
          if (!webhookUrl) {
            console.log(`Zapier ${isSellerLead ? 'seller ' : ''}webhook URL not configured`);
            return;
          }

          const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
          const payload = {
            lead_id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            message: lead.message,
            source: lead.source,
            preferred_language: lead.preferred_language,
            property_id: lead.property_id,
            project_id: lead.project_id,
            agent_id: lead.agent_id,
            seller_neighborhood: lead.seller_neighborhood,
            seller_size: lead.seller_size,
            seller_rooms: lead.seller_rooms,
            seller_occupancy_status: lead.seller_occupancy_status,
            created_at: lead.created_at,
            timestamp: new Date().toISOString()
          };

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          const webhookType = isSellerLead ? 'seller ' : '';
          if (response.ok) {
            console.log(`Lead sent to Zapier ${webhookType}webhook successfully`);
          } else {
            console.error(`Failed to send lead to Zapier ${webhookType}webhook:`, response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error sending lead to Zapier webhook:', error.message);
        }
      });

      // Notify all SuperAdmins and the user depending on lead type
      const EXTRA_LEAD_NOTIFY_EMAIL = String(process.env.LEAD_EXTRA_NOTIFY_EMAIL || 'Israel@sweet-home.co.il').trim();
      const equalsIgnoreCase = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
      if (lead_type === 'seller') {
        try {
          const { rows: admins } = await query("SELECT email, name FROM users WHERE role = 'SuperAdmin' AND approved = true");
          const recipients = admins.map(a => a.email).filter(Boolean);
          if (recipients.length) {
            await sendMail({
              to: recipients.join(','),
              ...(EXTRA_LEAD_NOTIFY_EMAIL && !recipients.some(e => equalsIgnoreCase(e, EXTRA_LEAD_NOTIFY_EMAIL)) ? { bcc: EXTRA_LEAD_NOTIFY_EMAIL } : {}),
              subject: 'Sweet Home Real Estate Investments – New SELLER lead',
              html: `
                <p>New SELLER lead submitted on the For Sellers page.</p>
                <ul>
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                  ${seller_neighborhood ? `<li><strong>Neighborhood:</strong> ${seller_neighborhood}</li>` : ''}
                  ${seller_size ? `<li><strong>Size:</strong> ${seller_size} sqm</li>` : ''}
                  ${seller_rooms ? `<li><strong>Rooms:</strong> ${seller_rooms}</li>` : ''}
                  ${seller_occupancy_status ? `<li><strong>Occupancy:</strong> ${seller_occupancy_status === 'empty' ? 'Empty' : 'Tenanted'}</li>` : ''}
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p>Please review this lead from your SuperAdmin dashboard.</p>
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New SELLER lead\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${seller_neighborhood?`\nNeighborhood: ${seller_neighborhood}`:''}${seller_size?`\nSize: ${seller_size} sqm`:''}${seller_rooms?`\nRooms: ${seller_rooms}`:''}${seller_occupancy_status?`\nOccupancy: ${seller_occupancy_status === 'empty' ? 'Empty' : 'Tenanted'}`:''}${message?`\nMessage: ${message}`:''}\n\nBest regards,\nSweet Home Real Estate Investments' team`
            });
          }
        } catch (_) {}
        // If no admins or recipients were found, fallback to direct send to extra email
        try {
          const { rows: adminsCheck } = await query("SELECT 1 FROM users WHERE role = 'SuperAdmin' AND approved = true LIMIT 1");
          if (!adminsCheck.length && EXTRA_LEAD_NOTIFY_EMAIL) {
            await sendMail({
              to: EXTRA_LEAD_NOTIFY_EMAIL,
              subject: 'Sweet Home Real Estate Investments – New SELLER lead',
              html: `
                <p>New SELLER lead submitted.</p>
                <ul>
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                  ${seller_neighborhood ? `<li><strong>Neighborhood:</strong> ${seller_neighborhood}</li>` : ''}
                  ${seller_size ? `<li><strong>Size:</strong> ${seller_size} sqm</li>` : ''}
                  ${seller_rooms ? `<li><strong>Rooms:</strong> ${seller_rooms}</li>` : ''}
                  ${seller_occupancy_status ? `<li><strong>Occupancy:</strong> ${seller_occupancy_status === 'empty' ? 'Empty' : 'Tenanted'}</li>` : ''}
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New SELLER lead\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${seller_neighborhood?`\nNeighborhood: ${seller_neighborhood}`:''}${seller_size?`\nSize: ${seller_size} sqm`:''}${seller_rooms?`\nRooms: ${seller_rooms}`:''}${seller_occupancy_status?`\nOccupancy: ${seller_occupancy_status === 'empty' ? 'Empty' : 'Tenanted'}`:''}${message?`\nMessage: ${message}`:''}`
            });
          }
        } catch (_) {}
        // Thank-you to user (seller lead)
        try {
          const lang = String(language || '').slice(0,2).toLowerCase();
          const L = ['en','es','de'].includes(lang) ? lang : 'en';
          const subjects = {
            en: 'Thank you — Sweet Home Real Estate Investments',
            es: 'Gracias — Sweet Home Real Estate Investments',
            de: 'Danke — Sweet Home Real Estate Investments'
          };
          const firstName = (name || '').split(' ')[0] || name || '';
          const htmlBodies = {
            en: `<p>Hi ${firstName},</p><p>Thanks for contacting <strong>Sweet Home Real Estate Investments</strong>. Our team will be in touch as soon as possible.</p><p>Best regards,<br/>Sweet Home Real Estate Investments' team</p>`,
            es: `<p>Hola ${firstName},</p><p>Gracias por contactar con <strong>Sweet Home Real Estate Investments</strong>. Nuestro equipo se pondrá en contacto contigo lo antes posible.</p><p>Un saludo,<br/>Sweet Home Real Estate Investments</p>`,
            de: `<p>Hallo ${firstName},</p><p>Vielen Dank für Ihre Kontaktaufnahme mit <strong>Sweet Home Real Estate Investments</strong>. Unser Team wird sich so schnell wie möglich bei Ihnen melden.</p><p>Mit freundlichen Grüßen,<br/>Sweet Home Real Estate Investments</p>`
          };
          const textBodies = {
            en: `Hi ${firstName},\n\nThanks for contacting Sweet Home Real Estate Investments. Our team will be in touch as soon as possible.\n\nBest regards,\nSweet Home Real Estate Investments' team`,
            es: `Hola ${firstName},\n\nGracias por contactar con Sweet Home Real Estate Investments. Nuestro equipo se pondrá en contacto contigo lo antes posible.\n\nUn saludo,\nSweet Home Real Estate Investments`,
            de: `Hallo ${firstName},\n\nVielen Dank für Ihre Kontaktaufnahme mit Sweet Home Real Estate Investments. Unser Team wird sich so schnell wie möglich bei Ihnen melden.\n\nMit freundlichen Grüßen,\nSweet Home Real Estate Investments`
          };
          await sendMail({
            to: email,
            subject: subjects[L],
            html: htmlBodies[L],
            text: textBodies[L]
          });
        } catch(_) {}
      } else {
        // General (unknown/buyer) — Contact page/general inquiry
        try {
          const { rows: admins } = await query("SELECT email, name FROM users WHERE role = 'SuperAdmin' AND approved = true");
          const recipients = admins.map(a => a.email).filter(Boolean);
          if (recipients.length) {
            await sendMail({
              to: recipients.join(','),
              ...(EXTRA_LEAD_NOTIFY_EMAIL && !recipients.some(e => equalsIgnoreCase(e, EXTRA_LEAD_NOTIFY_EMAIL)) ? { bcc: EXTRA_LEAD_NOTIFY_EMAIL } : {}),
              subject: 'Sweet Home — New Contact form submission',
              html: `
                <p>You have a new inquiry from the <strong>Contact</strong> page.</p>
                <ul>
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                  ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p>Please review this lead from your SuperAdmin dashboard.</p>
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New Contact form submission\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${language?`\nPreferred language: ${language}`:''}${message?`\nMessage: ${message}`:''}\n\nBest regards,\nSweet Home Real Estate Investments' team`
            });
          }
        } catch(_) {}
        // Fallback when no admins present
        try {
          const { rows: adminsCheck2 } = await query("SELECT 1 FROM users WHERE role = 'SuperAdmin' AND approved = true LIMIT 1");
          if (!adminsCheck2.length && EXTRA_LEAD_NOTIFY_EMAIL) {
            await sendMail({
              to: EXTRA_LEAD_NOTIFY_EMAIL,
              subject: 'Sweet Home — New Contact form submission',
              html: `
                <p>New contact inquiry received.</p>
                <ul>
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                  ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New Contact form submission\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${language?`\nPreferred language: ${language}`:''}${message?`\nMessage: ${message}`:''}`
            });
          }
        } catch(_) {}
        // Thank-you to user — localized
        try {
          const lang = String(language || '').slice(0,2).toLowerCase();
          const L = ['en','es','de'].includes(lang) ? lang : 'en';
          const subjects = {
            en: 'Thank you — Sweet Home Real Estate Investments',
            es: 'Gracias — Sweet Home Real Estate Investments',
            de: 'Danke — Sweet Home Real Estate Investments'
          };
          const firstName = (name || '').split(' ')[0] || name || '';
          const htmlBodies = {
            en: `<p>Hi ${firstName},</p><p>Thanks for contacting <strong>Sweet Home Real Estate Investments</strong>. Our team will be in touch as soon as possible.</p><p>Best regards,<br/>Sweet Home Real Estate Investments' team</p>`,
            es: `<p>Hola ${firstName},</p><p>Gracias por contactar con <strong>Sweet Home Real Estate Investments</strong>. Nuestro equipo se pondrá en contacto contigo lo antes posible.</p><p>Un saludo,<br/>Sweet Home Real Estate Investments</p>`,
            de: `<p>Hallo ${firstName},</p><p>Vielen Dank für Ihre Kontaktaufnahme mit <strong>Sweet Home Real Estate Investments</strong>. Unser Team wird sich so schnell wie möglich bei Ihnen melden.</p><p>Mit freundlichen Grüßen,<br/>Sweet Home Real Estate Investments</p>`
          };
          const textBodies = {
            en: `Hi ${firstName},\n\nThanks for contacting Sweet Home Real Estate Investments. Our team will be in touch as soon as possible.\n\nBest regards,\nSweet Home Real Estate Investments' team`,
            es: `Hola ${firstName},\n\nGracias por contactar con Sweet Home Real Estate Investments. Nuestro equipo se pondrá en contacto contigo lo antes posible.\n\nUn saludo,\nSweet Home Real Estate Investments`,
            de: `Hallo ${firstName},\n\nVielen Dank für Ihre Kontaktaufnahme mit Sweet Home Real Estate Investments. Unser Team wird sich so schnell wie möglich bei Ihnen melden.\n\nMit freundlichen Grüßen,\nSweet Home Real Estate Investments`
          };
          await sendMail({
            to: email,
            subject: subjects[L],
            html: htmlBodies[L],
            text: textBodies[L]
          });
        } catch(_) {}
      }
    } catch (err) { next(err); }
  }
);

// Admin leads page (only their own leads)
router.get('/admin/dashboard/leads', ensureAdmin, leadController.listForAdmin);

// SuperAdmin leads page (all leads)
router.get('/superadmin/dashboard/leads', ensureSuperAdmin, leadController.listAll);

// Update lead (status/notes)
router.post('/api/leads/:id', ensureAuthenticated, leadController.updateLead);

// Delete lead (Admin: own leads; SuperAdmin: any)
router.delete('/api/leads/:id', ensureAuthenticated, leadController.deleteLead);

// Test endpoint for seller webhook (development/testing only)
// GET version for browser testing, POST version for API testing
router.get('/api/leads/test-seller-webhook', async (req, res, next) => {
  try {
    const isSellerWebhookConfigured = !!process.env.ZAPIER_SELLER_WEBHOOK_URL;
    const webhookUrl = process.env.ZAPIER_SELLER_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Zapier Webhook Test - Configuration Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .error { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 20px; border-radius: 8px; margin: 20px 0; }
            code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>⚠️ Configuration Required</h1>
          <div class="error">
            <strong>Error:</strong> Zapier webhook URL not configured.<br><br>
            Please set <code>ZAPIER_SELLER_WEBHOOK_URL</code> or <code>ZAPIER_WEBHOOK_URL</code> environment variable.
          </div>
          <a href="/owners" class="btn">Back to Sellers Page</a>
        </body>
        </html>
      `);
    }

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Create test payload with sample seller lead data
    const testPayload = {
      lead_id: 999999,
      name: 'Test Seller',
      email: 'test-seller@example.com',
      phone: '+49 123 456789',
      message: 'For Sellers page SELLER lead',
      source: 'seller_form',
      preferred_language: 'en',
      property_id: null,
      project_id: null,
      agent_id: null,
      seller_neighborhood: 'Mitte',
      seller_size: 75.5,
      seller_rooms: 2.5,
      seller_occupancy_status: 'empty',
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const responseText = await response.text();
      // Return HTML for browser viewing
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Zapier Webhook Test - Success</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .payload { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; overflow-x: auto; }
            pre { margin: 0; font-size: 12px; }
            h1 { color: #333; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <h1>✅ Webhook Test Successful!</h1>
          <div class="success">
            <strong>Success:</strong> Test payload sent successfully to <strong>${isSellerWebhookConfigured ? 'SELLER' : 'GENERAL'}</strong> webhook
          </div>
          <div class="info">
            <strong>Webhook Type:</strong> ${isSellerWebhookConfigured ? 'seller' : 'general'}<br>
            <strong>Zapier Response:</strong> ${responseText || 'OK'}
          </div>
          <div class="payload">
            <strong>Sent Payload:</strong>
            <pre>${JSON.stringify(testPayload, null, 2)}</pre>
          </div>
          <a href="/api/leads/test-seller-webhook" class="btn">Test Again</a>
          <a href="/owners" class="btn" style="background: #6c757d; margin-left: 10px;">Back to Sellers Page</a>
        </body>
        </html>
      `);
    } else {
      const errorText = await response.text();
      return res.status(response.status).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Zapier Webhook Test - Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>❌ Webhook Test Failed</h1>
          <div class="error">
            <strong>Error:</strong> Webhook returned ${response.status} ${response.statusText}<br>
            ${errorText ? `<pre>${errorText}</pre>` : ''}
          </div>
          <a href="/api/leads/test-seller-webhook" class="btn">Try Again</a>
        </body>
        </html>
      `);
    }
  } catch (error) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zapier Webhook Test - Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
          .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>❌ Error</h1>
        <div class="error">
          <strong>Error:</strong> ${error.message}
        </div>
        <a href="/api/leads/test-seller-webhook" class="btn">Try Again</a>
      </body>
      </html>
    `);
  }
});

// POST version for API testing (curl, Postman, etc.)
router.post('/api/leads/test-seller-webhook', async (req, res, next) => {
  try {
    const isSellerWebhookConfigured = !!process.env.ZAPIER_SELLER_WEBHOOK_URL;
    const webhookUrl = process.env.ZAPIER_SELLER_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Zapier webhook URL not configured. Please set ZAPIER_SELLER_WEBHOOK_URL or ZAPIER_WEBHOOK_URL environment variable.'
      });
    }

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Create test payload with sample seller lead data
    const testPayload = {
      lead_id: 999999,
      name: 'Test Seller',
      email: 'test-seller@example.com',
      phone: '+49 123 456789',
      message: 'For Sellers page SELLER lead',
      source: 'seller_form',
      preferred_language: 'en',
      property_id: null,
      project_id: null,
      agent_id: null,
      seller_neighborhood: 'Mitte',
      seller_size: 75.5,
      seller_rooms: 2.5,
      seller_occupancy_status: 'empty',
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const responseText = await response.text();
      return res.json({
        success: true,
        message: `Test payload sent successfully to ${isSellerWebhookConfigured ? 'SELLER' : 'GENERAL'} webhook`,
        webhook_url: webhookUrl.replace(/(\/hooks\/catch\/[^\/]+)\/[^\/]+(\/.*)?$/, '$1/XXXXX$2'), // Mask the URL
        webhook_type: isSellerWebhookConfigured ? 'seller' : 'general',
        payload: testPayload,
        zapier_response: responseText || 'OK'
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        message: `Webhook returned error: ${response.status} ${response.statusText}`,
        webhook_url: webhookUrl.replace(/(\/hooks\/catch\/[^\/]+)\/[^\/]+(\/.*)?$/, '$1/XXXXX$2'),
        error: errorText
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending test payload to webhook',
      error: error.message
    });
  }
});

module.exports = router;


