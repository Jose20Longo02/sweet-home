// Quick DeepL API test - run: node scripts/test-deepl.js
require('dotenv').config();
const { translateText } = require('../config/translator');

async function test() {
  console.log('DEEPL_API_KEY present:', !!process.env.DEEPL_API_KEY);
  try {
    const result = await translateText('Hello world', 'de', { sourceLang: 'en' });
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
}
test();
