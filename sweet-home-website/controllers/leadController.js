// controllers/leadController.js
const { query } = require('../config/db');
const Lead = require('../models/Lead');
const sendMail = require('../config/mailer');

const { validationResult } = require('express-validator');

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
    const { rows } = await query('SELECT p.id, p.title, p.agent_id, u.email AS agent_email, u.name AS agent_name FROM properties p LEFT JOIN users u ON u.id = p.agent_id WHERE p.id = $1', [propertyId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = rows[0];

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

    setImmediate(async () => {
      // Increment inquiry count in property_stats
      try {
        const upd = await query(`UPDATE property_stats SET email_clicks = email_clicks + 1, last_updated = NOW() WHERE property_id = $1`, [property.id]);
        if (upd.rowCount === 0) {
          await query(`INSERT INTO property_stats(property_id, views, email_clicks, last_updated) VALUES ($1, 0, 1, NOW()) ON CONFLICT DO NOTHING`, [property.id]);
        }
      } catch (_) {}
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

      // Email to agent (notification)
      if (property.agent_email) {
        try {
          const info = await sendMail({
            to: property.agent_email,
            subject: `New lead for ${property.title}`,
            html: `
              <p>You have a new lead for <strong>${property.title}</strong>.</p>
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p>View in CRM: ${process.env.APP_URL || ''}/admin/dashboard/leads</p>
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New lead for ${property.title}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('Lead notification email dispatched:', info && info.messageId);
          }
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
      `SELECT p.id, p.title, p.agent_id, u.email AS agent_email, u.name AS agent_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.agent_id
        WHERE p.id = $1`,
      [projectId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = rows[0];

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

    // Emails (async)
    setImmediate(async () => {
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
          const info = await sendMail({
            to: project.agent_email,
            subject: `New lead for project: ${project.title}`,
            html: `
              <p>You have a new project lead for <strong>${project.title}</strong>.</p>
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                ${language ? `<li><strong>Preferred language:</strong> ${language}</li>` : ''}
              </ul>
              ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              <p>View in CRM: ${process.env.APP_URL || ''}/admin/dashboard/leads</p>
              <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
            `,
            text: `New project lead for ${project.title}\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${language ? `\nPreferred language: ${language}` : ''}${message ? `\nMessage: ${message}` : ''}`
          });
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('Project lead notification email dispatched:', info && info.messageId);
          }
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


