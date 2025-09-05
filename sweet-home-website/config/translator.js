// config/translator.js
// Hybrid translation helper using DeepL API with safe fallbacks.
// - Primary: DeepL (recommended for EN/ES/DE)
// - Optional fallback: Google Cloud Translation (if enabled)

// Use global fetch if available (Node 18+), otherwise lazy-load node-fetch (ESM)
const nodeFetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fetchFn = typeof fetch === 'function' ? fetch : nodeFetch;

const SUPPORTED = ['en', 'es', 'de'];

function getEnvBoolean(name, defaultValue) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

const CONFIG = {
  autoTranslate: getEnvBoolean('AUTO_TRANSLATE_ENABLED', true),
  provider: (process.env.TRANSLATION_PROVIDER || 'deepl').toLowerCase(),
  deepl: {
    apiKey: process.env.DEEPL_API_KEY || '',
    // Prefer explicit host via env; default to free host to avoid unintended charges
    host: process.env.DEEPL_API_HOST || 'api-free.deepl.com'
  },
  google: {
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY || ''
  }
};

async function translateWithDeepL(text, targetLang, { sourceLang = 'en', isHtml = false } = {}) {
  if (!text || !CONFIG.deepl.apiKey) return null;
  const url = `https://${CONFIG.deepl.host}/v2/translate`;
  const params = new URLSearchParams();
  params.append('auth_key', CONFIG.deepl.apiKey);
  params.append('text', text);
  params.append('target_lang', targetLang.toUpperCase());
  if (sourceLang) params.append('source_lang', sourceLang.toUpperCase());
  if (isHtml) {
    params.append('tag_handling', 'html');
    params.append('preserve_formatting', '1');
  }
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`DeepL error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  const translated = data && data.translations && data.translations[0] && data.translations[0].text;
  return translated || null;
}

async function translateWithGoogle(text, targetLang, { sourceLang = 'en' } = {}) {
  if (!text || !CONFIG.google.apiKey) return null;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(CONFIG.google.apiKey)}`;
  const body = {
    q: text,
    target: targetLang,
    source: sourceLang,
    format: 'text'
  };
  const res = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Google Translate error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  const translated = data && data.data && data.data.translations && data.data.translations[0] && data.data.translations[0].translatedText;
  return translated || null;
}

async function translateText(text, targetLang, opts = {}) {
  if (!CONFIG.autoTranslate) return null;
  const normalizedTarget = String(targetLang || '').slice(0, 2).toLowerCase();
  if (!SUPPORTED.includes(normalizedTarget)) return null;

  try {
    if (CONFIG.provider === 'deepl' && CONFIG.deepl.apiKey) {
      return await translateWithDeepL(text, normalizedTarget, opts);
    }
  } catch (e) {
    // fall through to optional fallback
  }
  try {
    if (CONFIG.google.apiKey) {
      return await translateWithGoogle(text, normalizedTarget, opts);
    }
  } catch (_) {}
  return null;
}

// Build or extend a JSON i18n object for a given field.
// values: { en: '...', es?: '...', de?: '...' }
function upsertFieldI18n(existing, values) {
  const out = existing && typeof existing === 'object' ? { ...existing } : {};
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      out[k] = v;
    }
  });
  return out;
}

// Given source English fields, ensure i18n objects for target locales.
// fields: { title, description, excerpt, content, ... }
// existing: { title_i18n, description_i18n, ... }
async function ensureLocalizedFields({ fields, existing = {}, sourceLang = 'en', targetLangs = ['es', 'de'], htmlFields = [] }) {
  if (!fields || typeof fields !== 'object') return {};
  const isHtmlField = (name) => htmlFields.includes(name);

  const results = {};
  const tasks = [];

  for (const [name, value] of Object.entries(fields)) {
    const existingI18n = existing[`${name}_i18n`] || {};
    const base = upsertFieldI18n(existingI18n, { [sourceLang]: value });
    results[`${name}_i18n`] = base; // seed with EN
    for (const tl of targetLangs) {
      if (!base[tl] || String(base[tl]).trim() === '') {
        tasks.push(
          (async () => {
            try {
              const translated = await translateText(value || '', tl, { sourceLang, isHtml: isHtmlField(name) });
              if (translated) results[`${name}_i18n`][tl] = translated;
            } catch (_) {}
          })()
        );
      }
    }
  }
  await Promise.all(tasks);
  return results;
}

module.exports = {
  translateText,
  ensureLocalizedFields,
  SUPPORTED
};


