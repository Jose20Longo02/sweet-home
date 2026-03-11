// Simulate backfill flow - run: node scripts/test-backfill-flow.js
require('dotenv').config();
const { ensureCompleteTranslations } = require('../utils/translationHelper');

async function test() {
  const fields = { title: 'Hello world', description: 'Test description' };
  const existingI18n = {};
  const result = await ensureCompleteTranslations(fields, existingI18n);
  console.log('Result:', JSON.stringify(result, null, 2));
}
test().catch(e => console.error(e));
