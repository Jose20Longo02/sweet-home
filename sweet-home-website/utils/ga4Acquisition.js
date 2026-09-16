/**
 * GA4 acquisition lookup for CRM leads (by ga_client_id).
 *
 * Requires:
 * - GA4_PROPERTY_ID (numeric, Admin → Property settings)
 * - GOOGLE_SERVICE_ACCOUNT_JSON (full JSON) or GOOGLE_APPLICATION_CREDENTIALS (file path)
 * - User-scoped custom dimension in GA4: event/user property `sh_ga_cid`
 *   (see docs/GA4_LEAD_ATTRIBUTION.md)
 *
 * Lookup prefers first-user acquisition (matches CRM first-touch).
 */
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { query } = require('../config/db');

let cachedClient = null;
let cachedKey = null;

function getPropertyId() {
  const raw = String(process.env.GA4_PROPERTY_ID || '').trim();
  if (!raw) return null;
  return raw.replace(/^properties\//, '');
}

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (json && String(json).trim()) {
    try {
      return JSON.parse(String(json));
    } catch (err) {
      console.warn('[ga4Acquisition] Invalid GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
      return null;
    }
  }
  // ADC / GOOGLE_APPLICATION_CREDENTIALS file path handled by client library
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return undefined;
  return null;
}

function isConfigured() {
  if (!getPropertyId()) return false;
  const creds = getCredentials();
  if (creds === null && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return false;
  return true;
}

function getClient() {
  const creds = getCredentials();
  const key = JSON.stringify({
    property: getPropertyId(),
    hasJson: Boolean(creds && typeof creds === 'object'),
    adc: process.env.GOOGLE_APPLICATION_CREDENTIALS || ''
  });
  if (cachedClient && cachedKey === key) return cachedClient;
  const options = {};
  if (creds && typeof creds === 'object') options.credentials = creds;
  cachedClient = new BetaAnalyticsDataClient(options);
  cachedKey = key;
  return cachedClient;
}

function mapChannelLabel({ source, medium, channelGroup }) {
  const s = String(source || '').trim().toLowerCase();
  const m = String(medium || '').trim().toLowerCase();
  const ch = String(channelGroup || '').trim();

  if (ch && ch !== '(not set)' && ch !== '(data not available)') {
    // Prefer GA4 channel group when clear
    if (/organic/i.test(ch)) {
      if (s.includes('google')) return 'Google Organic';
      if (s.includes('bing')) return 'Bing Organic';
      return ch;
    }
    if (/paid search/i.test(ch) || /paid social/i.test(ch) || /display/i.test(ch)) return ch;
    if (/direct/i.test(ch)) return 'Direct';
    if (/email/i.test(ch)) return 'Email';
    if (/referral/i.test(ch) && s) return `Referral (${s})`;
    if (ch) return ch;
  }

  if (!s || s === '(direct)' || s === '(not set)') {
    if (!m || m === '(none)' || m === '(not set)') return 'Direct';
  }
  if (s.includes('google') && (m === 'organic' || !m || m === '(not set)')) return 'Google Organic';
  if (s.includes('bing') && (m === 'organic' || !m || m === '(not set)')) return 'Bing Organic';
  if (m === 'organic') return s ? `${titleCase(s)} Organic` : 'Organic Search';
  if (m === 'cpc' || m === 'ppc' || m === 'paid') {
    if (s.includes('google')) return 'Google Ads';
    if (s.includes('bing')) return 'Bing Ads';
    return s ? `${titleCase(s)} (paid)` : 'Paid';
  }
  if (m === 'email' || s === 'email' || s === 'newsletter') return 'Email';
  if (s.includes('facebook') || s.includes('instagram')) return 'Meta / Social';
  if (s) return titleCase(s);
  return null;
}

function titleCase(str) {
  return String(str)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function rowValues(row, headers) {
  const out = {};
  (row.dimensionValues || []).forEach((v, i) => {
    out[headers[i]] = v.value;
  });
  return out;
}

/**
 * Look up first-user acquisition for a GA4 client id.
 * @returns {Promise<null|{source,medium,channelGroup,label,raw}>}
 */
async function lookupAcquisitionByClientId(clientId, { days = 90 } = {}) {
  const id = String(clientId || '').trim();
  if (!id || !isConfigured()) return null;

  const propertyId = getPropertyId();
  const client = getClient();
  const property = `properties/${propertyId}`;
  const startDate = `${Math.max(1, Math.min(90, Number(days) || 90))}daysAgo`;

  const attempts = [
    // Preferred once custom user dimension is registered
    {
      dimensions: [
        { name: 'customUser:sh_ga_cid' },
        { name: 'firstUserSource' },
        { name: 'firstUserMedium' },
        { name: 'firstUserDefaultChannelGroup' }
      ],
      filterField: 'customUser:sh_ga_cid',
      sourceKey: 'firstUserSource',
      mediumKey: 'firstUserMedium',
      channelKey: 'firstUserDefaultChannelGroup'
    },
    // Fallback if property exposes clientId (not available on all accounts)
    {
      dimensions: [
        { name: 'clientId' },
        { name: 'firstUserSource' },
        { name: 'firstUserMedium' },
        { name: 'firstUserDefaultChannelGroup' }
      ],
      filterField: 'clientId',
      sourceKey: 'firstUserSource',
      mediumKey: 'firstUserMedium',
      channelKey: 'firstUserDefaultChannelGroup'
    }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const [response] = await client.runReport({
        property,
        dateRanges: [{ startDate, endDate: 'today' }],
        dimensions: attempt.dimensions,
        metrics: [{ name: 'sessions' }],
        dimensionFilter: {
          filter: {
            fieldName: attempt.filterField,
            stringFilter: { matchType: 'EXACT', value: id }
          }
        },
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 5
      });

      const headers = (response.dimensionHeaders || []).map((h) => h.name);
      const rows = response.rows || [];
      if (!rows.length) {
        // Valid query, no rows yet (processing delay / no match)
        return null;
      }
      const best = rowValues(rows[0], headers);
      const source = best[attempt.sourceKey] || null;
      const medium = best[attempt.mediumKey] || null;
      const channelGroup = best[attempt.channelKey] || null;
      const label = mapChannelLabel({ source, medium, channelGroup });
      return {
        source,
        medium,
        channelGroup,
        label: label || channelGroup || source || null,
        via: attempt.filterField
      };
    } catch (err) {
      lastError = err;
      const msg = String(err.message || err);
      // Dimension not available — try next strategy
      if (/invalid|not a valid|UNKNOWN|does not support|Field/i.test(msg)) {
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    console.warn('[ga4Acquisition] lookup failed:', lastError.message || lastError);
  }
  return null;
}

/**
 * Persist GA4 acquisition fields on a lead row.
 * Only overwrites empty ga_* acquisition fields unless force=true.
 */
async function enrichLeadById(leadId, { force = false, days = 90 } = {}) {
  const { rows } = await query(
    `SELECT id, ga_client_id, ga_session_source, ga_session_medium, ga_channel_group,
            utm_source, utm_medium, referrer
       FROM leads WHERE id = $1`,
    [leadId]
  );
  const lead = rows[0];
  if (!lead) return { ok: false, reason: 'not_found' };
  if (!lead.ga_client_id) return { ok: false, reason: 'no_client_id' };
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };
  if (!force && lead.ga_session_source) return { ok: true, reason: 'already_enriched', lead };

  const found = await lookupAcquisitionByClientId(lead.ga_client_id, { days });
  if (!found) return { ok: false, reason: 'no_ga_match', lead };

  const { rows: updated } = await query(
    `UPDATE leads SET
        ga_session_source = $1,
        ga_session_medium = $2,
        ga_channel_group = $3,
        ga_enriched_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
    [found.source, found.medium, found.channelGroup || found.label, leadId]
  );

  return { ok: true, reason: 'enriched', lead: updated[0], lookup: found };
}

/**
 * Batch-enrich leads that have ga_client_id but no GA acquisition yet.
 */
async function enrichPendingLeads({ limit = 40, days = 90 } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'not_configured', results: [] };

  const { rows } = await query(
    `SELECT id FROM leads
      WHERE ga_client_id IS NOT NULL
        AND TRIM(ga_client_id) <> ''
        AND (ga_session_source IS NULL OR TRIM(ga_session_source) = '')
      ORDER BY created_at DESC
      LIMIT $1`,
    [Math.max(1, Math.min(200, Number(limit) || 40))]
  );

  const results = [];
  for (const row of rows) {
    try {
      // Gentle pacing for API quota
      // eslint-disable-next-line no-await-in-loop
      const r = await enrichLeadById(row.id, { force: false, days });
      results.push({ id: row.id, ...r });
    } catch (err) {
      results.push({ id: row.id, ok: false, reason: 'error', error: err.message });
    }
  }
  return { ok: true, reason: 'done', count: results.length, results };
}

function scheduleLeadEnrichment(leadId, { delayMs = 15 * 60 * 1000 } = {}) {
  if (!leadId || !isConfigured()) return;
  const wait = Math.max(60 * 1000, Number(delayMs) || 15 * 60 * 1000);
  setTimeout(() => {
    enrichLeadById(leadId, { force: false }).catch((err) => {
      console.warn('[ga4Acquisition] delayed enrich failed for lead', leadId, err.message || err);
    });
  }, wait).unref?.();
}

module.exports = {
  isConfigured,
  lookupAcquisitionByClientId,
  enrichLeadById,
  enrichPendingLeads,
  scheduleLeadEnrichment,
  mapChannelLabel
};
