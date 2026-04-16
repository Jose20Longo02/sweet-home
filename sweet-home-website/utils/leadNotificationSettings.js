const { query } = require('../config/db');

const DEFAULT_LEAD_NOTIFICATION_SETTINGS = {
  property_form: {
    notifyAssignedAgent: true,
    recipientEmails: [],
    zapierDefaultAgentId: null
  },
  project_form: {
    notifyAssignedAgent: true,
    recipientEmails: [],
    zapierDefaultAgentId: null
  },
  contact_form: {
    notifyAssignedAgent: false,
    recipientEmails: ['Israel@sweet-home.co.il', 'irem@sweet-home.co.il'],
    zapierDefaultAgentId: null
  },
  seller_form: {
    notifyAssignedAgent: false,
    recipientEmails: ['Israel@sweet-home.co.il', 'irem@sweet-home.co.il'],
    zapierDefaultAgentId: null
  },
  berlin_investor_strategy_form: {
    notifyAssignedAgent: false,
    recipientEmails: ['Israel@sweet-home.co.il', 'irem@sweet-home.co.il'],
    zapierDefaultAgentId: null
  }
};

const SUPPORTED_CATEGORIES = Object.keys(DEFAULT_LEAD_NOTIFICATION_SETTINGS);

function normalizeEmailList(input) {
  const source = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter(Boolean);

  const seen = new Set();
  const normalized = [];

  for (const raw of source) {
    const email = String(raw || '').trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(email);
  }

  return normalized;
}

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return true;
    if (['0', 'false', 'off', 'no'].includes(normalized)) return false;
  }
  return fallback;
}

function sanitizeCategoryConfig(category, config = {}) {
  const defaults = DEFAULT_LEAD_NOTIFICATION_SETTINGS[category];
  const parsedZapierAgentId = config.zapierDefaultAgentId === null || config.zapierDefaultAgentId === ''
    ? null
    : Number.parseInt(config.zapierDefaultAgentId, 10);
  return {
    notifyAssignedAgent: parseBoolean(config.notifyAssignedAgent, defaults.notifyAssignedAgent),
    recipientEmails: normalizeEmailList(
      Array.isArray(config.recipientEmails) ? config.recipientEmails : config.recipientEmailsText
    ),
    zapierDefaultAgentId: Number.isFinite(parsedZapierAgentId) ? parsedZapierAgentId : defaults.zapierDefaultAgentId
  };
}

async function ensureLeadNotificationSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS lead_notification_settings (
      category TEXT PRIMARY KEY,
      notify_assigned_agent BOOLEAN NOT NULL DEFAULT FALSE,
      recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `ALTER TABLE lead_notification_settings
     ADD COLUMN IF NOT EXISTS zapier_default_agent_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL`
  );

  // Backward compatibility migration:
  // if legacy "general_forms" exists, use it to seed the separated categories.
  let legacyGeneral = null;
  try {
    const { rows } = await query(
      `SELECT notify_assigned_agent, recipient_emails
         FROM lead_notification_settings
        WHERE category = 'general_forms'
        LIMIT 1`
    );
    if (rows && rows[0]) {
      legacyGeneral = {
        notifyAssignedAgent: Boolean(rows[0].notify_assigned_agent),
        recipientEmails: normalizeEmailList(Array.isArray(rows[0].recipient_emails) ? rows[0].recipient_emails : []),
        zapierDefaultAgentId: null
      };
    }
  } catch (_) {}

  for (const category of SUPPORTED_CATEGORIES) {
    const defaults = DEFAULT_LEAD_NOTIFICATION_SETTINGS[category];
    const seed = (legacyGeneral && ['contact_form', 'seller_form', 'berlin_investor_strategy_form'].includes(category))
      ? legacyGeneral
      : defaults;
    await query(
      `INSERT INTO lead_notification_settings (category, notify_assigned_agent, recipient_emails)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (category) DO NOTHING`,
      [category, seed.notifyAssignedAgent, JSON.stringify(seed.recipientEmails)]
    );
  }
}

async function getLeadNotificationSettings() {
  await ensureLeadNotificationSettingsTable();
  const { rows } = await query(
    `SELECT category, notify_assigned_agent, recipient_emails, zapier_default_agent_id, updated_at
       FROM lead_notification_settings
      WHERE category = ANY($1::text[])`,
    [SUPPORTED_CATEGORIES]
  );

  const mapped = {};
  for (const row of rows) {
    mapped[row.category] = {
      notifyAssignedAgent: Boolean(row.notify_assigned_agent),
      recipientEmails: normalizeEmailList(Array.isArray(row.recipient_emails) ? row.recipient_emails : []),
      zapierDefaultAgentId: row.zapier_default_agent_id ? Number(row.zapier_default_agent_id) : null,
      updatedAt: row.updated_at || null
    };
  }

  const finalSettings = {};
  for (const category of SUPPORTED_CATEGORIES) {
    const defaults = DEFAULT_LEAD_NOTIFICATION_SETTINGS[category];
    finalSettings[category] = mapped[category] || {
      notifyAssignedAgent: defaults.notifyAssignedAgent,
      recipientEmails: [...defaults.recipientEmails],
      zapierDefaultAgentId: defaults.zapierDefaultAgentId,
      updatedAt: null
    };
  }

  return finalSettings;
}

async function getLeadNotificationSetting(category) {
  const settings = await getLeadNotificationSettings();
  return settings[category] || sanitizeCategoryConfig(category, {});
}

async function updateLeadNotificationSettings(updates = {}, updatedBy = null) {
  await ensureLeadNotificationSettingsTable();

  for (const category of SUPPORTED_CATEGORIES) {
    if (!updates[category]) continue;
    const config = sanitizeCategoryConfig(category, updates[category]);
    await query(
      `INSERT INTO lead_notification_settings (category, notify_assigned_agent, recipient_emails, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (category) DO UPDATE
         SET notify_assigned_agent = EXCLUDED.notify_assigned_agent,
             recipient_emails = EXCLUDED.recipient_emails,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
      [category, config.notifyAssignedAgent, JSON.stringify(config.recipientEmails), updatedBy || null]
    );
    await query(
      `UPDATE lead_notification_settings
          SET zapier_default_agent_id = $2
        WHERE category = $1`,
      [category, config.zapierDefaultAgentId]
    );
  }

  return getLeadNotificationSettings();
}

function getLeadCategoryFromSource(source) {
  const raw = String(source || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'property_form') return 'property_form';
  if (raw === 'project_form') return 'project_form';
  if (raw === 'contact_form') return 'contact_form';
  if (raw === 'seller_form') return 'seller_form';
  if (raw === 'berlin_investor_strategy_form') return 'berlin_investor_strategy_form';
  return null;
}

async function getZapierDefaultAgentForSource(source) {
  const category = getLeadCategoryFromSource(source);
  if (!category) return null;
  const setting = await getLeadNotificationSetting(category);
  if (!setting || !setting.zapierDefaultAgentId) return null;
  const { rows } = await query(
    `SELECT id, name, email, bmby_id
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [setting.zapierDefaultAgentId]
  );
  return rows && rows[0] ? rows[0] : null;
}

module.exports = {
  DEFAULT_LEAD_NOTIFICATION_SETTINGS,
  getLeadNotificationSetting,
  getLeadNotificationSettings,
  updateLeadNotificationSettings,
  normalizeEmailList,
  getZapierDefaultAgentForSource
};
