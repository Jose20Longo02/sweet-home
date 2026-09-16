/**
 * Enrich CRM leads with GA4 first-user acquisition (by ga_client_id).
 *
 * Usage:
 *   node scripts/enrich-leads-ga4.js
 *   LIMIT=50 node scripts/enrich-leads-ga4.js
 *
 * Requires env: GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS)
 * See docs/GA4_LEAD_ATTRIBUTION.md
 */
require('dotenv').config();
const { isConfigured, enrichPendingLeads } = require('../utils/ga4Acquisition');

async function main() {
  if (!isConfigured()) {
    console.error('GA4 acquisition is not configured.');
    console.error('Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS).');
    process.exit(1);
  }
  const limit = parseInt(process.env.LIMIT || '40', 10);
  console.log(`Enriching up to ${limit} leads…`);
  const result = await enrichPendingLeads({ limit });
  const ok = (result.results || []).filter((r) => r.ok).length;
  const noMatch = (result.results || []).filter((r) => r.reason === 'no_ga_match').length;
  console.log(`Done. enriched=${ok} no_ga_match=${noMatch} total_attempted=${result.count}`);
  (result.results || []).forEach((r) => {
    if (!r.ok) console.log(`  lead ${r.id}: ${r.reason}${r.error ? ' — ' + r.error : ''}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
