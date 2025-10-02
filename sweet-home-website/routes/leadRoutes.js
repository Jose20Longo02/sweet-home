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

// Public API endpoints (rate limited + validated)
router.post('/api/leads', createLeadLimiter, recaptchaRequired(recaptchaMinScore), leadValidations, leadController.createFromProperty);
router.post('/api/leads/project', createLeadLimiter, recaptchaRequired(recaptchaMinScore), leadValidations, leadController.createFromProject);

// Public contact form endpoint
router.post(
  '/api/leads/contact',
  createLeadLimiter,
  recaptchaRequired(recaptchaMinScore),
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
      const { name, email, message, lead_type, language } = req.body;
      // Combine countryCode + phone on server to be robust to client variations
      let phone = req.body.phone || '';
      const cc = (req.body.countryCode || '').trim();
      const ph = (req.body.phone || '').trim();
      if (cc || ph) phone = `${cc} ${ph}`.trim();
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
        source: lead_type === 'seller' ? 'seller_form' : 'contact_form'
      });
      res.json({ success: true, lead });

      // Send to Zapier webhook (async)
      setImmediate(async () => {
        try {
          const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
          if (!webhookUrl) {
            console.log('Zapier webhook URL not configured');
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

          if (response.ok) {
            console.log('Lead sent to Zapier successfully');
          } else {
            console.error('Failed to send lead to Zapier:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error sending lead to Zapier:', error.message);
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
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p>Please review this lead from your SuperAdmin dashboard.</p>
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New SELLER lead\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${message?`\nMessage: ${message}`:''}\n\nBest regards,\nSweet Home Real Estate Investments' team`
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
                </ul>
                ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>` : ''}
                <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
              `,
              text: `New SELLER lead\nName: ${name}\nEmail: ${email}${phone?`\nPhone: ${phone}`:''}${message?`\nMessage: ${message}`:''}`
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

module.exports = router;


