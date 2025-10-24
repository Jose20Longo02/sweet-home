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
    if (!i18n[lang] || String(i18n[lang]).trim() === '') {
      missingLangs.push(lang);
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
    
    if (missingLangs.length === 0) {
      // No missing translations, keep existing
      results[i18nKey] = existingFieldI18n;
      continue;
    }
    
    // Start with existing translations
    results[i18nKey] = { ...existingFieldI18n };
    
    // Ensure source language is set
    if (!results[i18nKey][sourceLang]) {
      results[i18nKey][sourceLang] = fieldValue;
    }
    
    // Generate missing translations
    for (const targetLang of missingLangs) {
      tasks.push(
        (async () => {
          try {
            const { translateText } = require('../config/translator');
            const translated = await translateText(fieldValue, targetLang, { 
              sourceLang, 
              isHtml: fieldName === 'description' 
            });
            if (translated) {
              results[i18nKey][targetLang] = translated;
            }
          } catch (error) {
            console.log(`Translation failed for ${fieldName} to ${targetLang}:`, error.message);
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
