const { query } = require('../config/db');

const DEFAULT_LEAD_NOTIFICATION_SETTINGS = {
  property_form: {
    notifyAssignedAgent: true,
    recipientEmails: []
  },
  project_form: {
    notifyAssignedAgent: true,
    recipientEmails: []
  },
  general_forms: {
    notifyAssignedAgent: false,
    recipientEmails: ['Israel@sweet-home.co.il', 'irem@sweet-home.co.il']
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
  return {
    notifyAssignedAgent: parseBoolean(config.notifyAssignedAgent, defaults.notifyAssignedAgent),
    recipientEmails: normalizeEmailList(
      Array.isArray(config.recipientEmails) ? config.recipientEmails : config.recipientEmailsText
    )
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

  for (const category of SUPPORTED_CATEGORIES) {
    const defaults = DEFAULT_LEAD_NOTIFICATION_SETTINGS[category];
    await query(
      `INSERT INTO lead_notification_settings (category, notify_assigned_agent, recipient_emails)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (category) DO NOTHING`,
      [category, defaults.notifyAssignedAgent, JSON.stringify(defaults.recipientEmails)]
    );
  }
}

async function getLeadNotificationSettings() {
  await ensureLeadNotificationSettingsTable();
  const { rows } = await query(
    `SELECT category, notify_assigned_agent, recipient_emails, updated_at
       FROM lead_notification_settings
      WHERE category = ANY($1::text[])`,
    [SUPPORTED_CATEGORIES]
  );

  const mapped = {};
  for (const row of rows) {
    mapped[row.category] = {
      notifyAssignedAgent: Boolean(row.notify_assigned_agent),
      recipientEmails: normalizeEmailList(Array.isArray(row.recipient_emails) ? row.recipient_emails : []),
      updatedAt: row.updated_at || null
    };
  }

  const finalSettings = {};
  for (const category of SUPPORTED_CATEGORIES) {
    const defaults = DEFAULT_LEAD_NOTIFICATION_SETTINGS[category];
    finalSettings[category] = mapped[category] || {
      notifyAssignedAgent: defaults.notifyAssignedAgent,
      recipientEmails: [...defaults.recipientEmails],
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
  }

  return getLeadNotificationSettings();
}

module.exports = {
  DEFAULT_LEAD_NOTIFICATION_SETTINGS,
  getLeadNotificationSetting,
  getLeadNotificationSettings,
  updateLeadNotificationSettings,
  normalizeEmailList
};
