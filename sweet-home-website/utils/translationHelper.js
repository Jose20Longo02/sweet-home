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
  const tasks = [];
  
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
    
    // ALWAYS ensure source language is set with current content
    // This is crucial for proper language switching
    results[i18nKey][sourceLang] = fieldValue;
    
    // Generate missing translations
    for (const targetLang of missingLangs) {
      tasks.push(
        (async () => {
            try {
              const { translateText } = require('../config/translator');
              console.log(`[TranslationHelper] Attempting to translate ${fieldName} from ${sourceLang} to ${targetLang}`);
              console.log(`[TranslationHelper] Source text: "${fieldValue.substring(0, 100)}..."`);
              const translated = await translateText(fieldValue, targetLang, { 
                sourceLang, 
                isHtml: fieldName === 'description' 
              });
              if (translated) {
                results[i18nKey][targetLang] = translated;
                console.log(`[TranslationHelper] ✅ Generated ${sourceLang}→${targetLang} for ${fieldName}: "${translated.substring(0, 100)}..."`);
              } else {
                console.log(`[TranslationHelper] ❌ No translation generated for ${sourceLang}→${targetLang} (API not configured or failed)`);
              }
            } catch (error) {
              console.log(`[TranslationHelper] ❌ Translation failed for ${fieldName} to ${targetLang}:`, error.message);
            }
        })()
      );
    }
  }
  
  // Wait for all translations to complete
  await Promise.all(tasks);
  
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

module.exports = {
  getMissingTranslations,
  generateMissingTranslations,
  ensureCompleteTranslations
};
