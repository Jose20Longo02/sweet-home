// utils/translationHelper.js
const { detectLanguageFromFields, getTargetLanguages } = require('./languageDetection');
const { ensureLocalizedFields } = require('../config/translator');

/**
 * Enhanced translation helper for existing properties/projects
 * Automatically detects missing translations and generates them
 */

/**
 * Check if translations are missing for a given i18n object
 * @param {Object} i18n - The i18n object (e.g., { en: "text", de: "text" })
 * @param {string} sourceLang - The detected source language
 * @returns {Array<string>} - Array of missing target languages
 */
function getMissingTranslations(i18n, sourceLang) {
  if (!i18n || typeof i18n !== 'object') {
    return getTargetLanguages(sourceLang);
  }
  
  const targetLangs = getTargetLanguages(sourceLang);
  const missingLangs = [];
  
  for (const lang of targetLangs) {
    const translation = i18n[lang];
    
    // Check if translation is missing or empty
    if (!translation || String(translation).trim() === '') {
      missingLangs.push(lang);
      continue;
    }
    
    // Check if the existing translation is actually in the wrong language
    // If the translation content is the same as the source language content, it's not translated
    const sourceContent = i18n[sourceLang];
    if (sourceContent && String(translation).trim() === String(sourceContent).trim()) {
      console.log(`[TranslationHelper] Translation for ${lang} is identical to source (${sourceLang}), regenerating...`);
      missingLangs.push(lang);
      continue;
    }
    
    // Additional check: detect if the translation is actually in the source language
    // Only do this check if the translation is significantly different from source content
    if (String(translation).trim() !== String(sourceContent).trim()) {
      const { detectLanguageFromFields } = require('./languageDetection');
      const detectedLang = detectLanguageFromFields({ text: translation });
      if (detectedLang === sourceLang) {
        console.log(`[TranslationHelper] Translation for ${lang} is detected as ${sourceLang}, regenerating...`);
        missingLangs.push(lang);
      }
    }
  }
  
  return missingLangs;
}

/**
 * Generate missing translations for existing content
 * @param {Object} fields - Object containing title, description, etc.
 * @param {Object} existingI18n - Existing i18n data from database
 * @param {string} sourceLang - Detected source language
 * @returns {Object} - Updated i18n object with missing translations
 */
async function generateMissingTranslations(fields, existingI18n, sourceLang) {
  if (!fields || typeof fields !== 'object') {
    return existingI18n || {};
  }
  
  console.log(`[TranslationHelper] generateMissingTranslations called with sourceLang: ${sourceLang}`);
  console.log(`[TranslationHelper] Fields:`, fields);
  console.log(`[TranslationHelper] Existing i18n:`, existingI18n);
  
  const results = {};
  
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (!fieldValue || typeof fieldValue !== 'string' || fieldValue.trim() === '') {
      continue;
    }
    
    const i18nKey = `${fieldName}_i18n`;
    const existingFieldI18n = existingI18n[i18nKey] || {};
    
    // Check for missing translations
    const missingLangs = getMissingTranslations(existingFieldI18n, sourceLang);
    
    console.log(`[TranslationHelper] Field ${fieldName}: missing languages:`, missingLangs);
    
    if (missingLangs.length === 0) {
      // No missing translations, keep existing
      results[i18nKey] = existingFieldI18n;
      console.log(`[TranslationHelper] No missing translations for ${fieldName}, keeping existing`);
      continue;
    }
    
    // Start with existing translations
    results[i18nKey] = { ...existingFieldI18n };
    
    // Clean up the source content before translation to avoid mixed languages
    let cleanSourceContent = fieldValue;
    
    // If the content contains mixed languages separated by '__', extract only the source language part
    if (fieldValue.includes('__')) {
      const parts = fieldValue.split('__');
      if (parts.length >= 2) {
        // Take only the first part (usually the source language)
        // Don't trim to preserve line breaks and formatting
        cleanSourceContent = parts[0];
        console.log(`[TranslationHelper] Detected mixed language content, using first part: "${cleanSourceContent.substring(0, 100)}..."`);
      }
    }
    
    // ALWAYS ensure source language is set with current content
    // This is crucial for proper language switching
    results[i18nKey][sourceLang] = cleanSourceContent;
    
    // Generate missing translations (sequential to avoid DeepL 429 rate limit)
    const { translateText } = require('../config/translator');
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    for (const targetLang of missingLangs) {
      await delay(400);
      try {
        console.log(`[TranslationHelper] Attempting to translate ${fieldName} from ${sourceLang} to ${targetLang}`);
        console.log(`[TranslationHelper] Source text: "${cleanSourceContent.substring(0, 100)}..."`);
        const translated = await translateText(cleanSourceContent, targetLang, {
          sourceLang,
          isHtml: fieldName === 'description'
        });
        if (translated) {
          const hasLineBreaks = translated.includes('\n');
          console.log(`[TranslationHelper] Translation has line breaks: ${hasLineBreaks}`);
          if (!hasLineBreaks && cleanSourceContent.includes('\n')) {
            console.log(`[TranslationHelper] ⚠️ Line breaks lost in translation, attempting to restore...`);
            const lines = cleanSourceContent.split('\n');
            const translatedLines = [];
            for (const line of lines) {
              if (line.trim() === '') {
                translatedLines.push('');
              } else {
                await delay(300);
                try {
                  const lineTranslation = await translateText(line.trim(), targetLang, { sourceLang });
                  translatedLines.push(lineTranslation || line);
                } catch (error) {
                  translatedLines.push(line);
                }
              }
            }
            const restoredTranslation = translatedLines.join('\n');
            results[i18nKey][targetLang] = restoredTranslation;
            console.log(`[TranslationHelper] ✅ Restored line breaks for ${sourceLang}→${targetLang}: "${restoredTranslation.substring(0, 100)}..."`);
          } else {
            results[i18nKey][targetLang] = translated;
            console.log(`[TranslationHelper] ✅ Generated ${sourceLang}→${targetLang} for ${fieldName}: "${translated.substring(0, 100)}..."`);
          }
        } else {
          console.log(`[TranslationHelper] ❌ No translation generated for ${sourceLang}→${targetLang} (API not configured or failed)`);
        }
      } catch (error) {
        console.log(`[TranslationHelper] ❌ Translation failed for ${fieldName} to ${targetLang}:`, error.message);
      }
    }
  }
  
  return results;
}

/**
 * Enhanced translation function for edit operations
 * Detects language, checks for missing translations, and generates them
 * @param {Object} fields - Object containing title, description, etc.
 * @param {Object} existingI18n - Existing i18n data from database
 * @returns {Object} - Complete i18n object with all translations
 */
async function ensureCompleteTranslations(fields, existingI18n = {}) {
  if (!fields || typeof fields !== 'object') {
    return existingI18n;
  }
  
  try {
    // Detect source language from current content
    const sourceLang = detectLanguageFromFields(fields);
    
    // Generate missing translations
    const updatedI18n = await generateMissingTranslations(fields, existingI18n, sourceLang);
    
    return updatedI18n;
    
  } catch (error) {
    console.log('Translation enhancement failed:', error.message);
    return existingI18n;
  }
}

/**
 * Translate an array of amenity strings to all target languages.
 * Returns { en: [...], de: [...], es: [...] } - each lang maps to an array of translated strings.
 * @param {string[]} amenities - Array of amenity strings (e.g. ["Elevator access to all floors", ...])
 * @param {string} sourceLang - Source language of the amenities
 * @param {Object} existingAmenitiesI18n - Optional existing amenities_i18n from DB to preserve/fill
 * @returns {Object} - amenities_i18n object
 */
async function ensureAmenitiesTranslations(amenities, sourceLang, existingAmenitiesI18n = {}) {
  if (!Array.isArray(amenities) || amenities.length === 0) {
    return existingAmenitiesI18n || {};
  }

  const { getTargetLanguages } = require('./languageDetection');
  const { translateText } = require('../config/translator');
  const targetLangs = getTargetLanguages(sourceLang);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  const result = { [sourceLang]: amenities.filter(Boolean).map(s => String(s || '').trim()) };
  for (const t of targetLangs) {
    result[t] = [];
  }

  const validAmenities = amenities.map(s => String(s || '').trim()).filter(Boolean);
  const existingByLang = {};
  for (const tl of targetLangs) {
    existingByLang[tl] = existingAmenitiesI18n[tl] && Array.isArray(existingAmenitiesI18n[tl]) ? existingAmenitiesI18n[tl] : [];
  }

  for (let i = 0; i < validAmenities.length; i++) {
    const item = validAmenities[i];
    if (!item) continue;

    for (const tl of targetLangs) {
      const existing = existingByLang[tl][i];
      if (existing && String(existing).trim() && String(existing).trim() !== item) {
        result[tl].push(String(existing).trim());
        continue;
      }
      await delay(400);
      try {
        const translated = await translateText(item, tl, { sourceLang });
        result[tl].push(translated || item);
      } catch (_) {
        result[tl].push(item);
      }
    }
  }

  return result;
}

module.exports = {
  getMissingTranslations,
  generateMissingTranslations,
  ensureCompleteTranslations,
  ensureAmenitiesTranslations
};
