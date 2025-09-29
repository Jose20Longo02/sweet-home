// utils/imageNaming.js
// Utility functions for generating SEO-friendly image names

/**
 * Sanitizes a string for use in file names
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeForFileName(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[\s\W]+/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50);
}

/**
 * Generates SEO-friendly image name for properties
 * @param {Object} propertyData - Property form data
 * @param {number} imageNumber - Sequential number for the image
 * @returns {string} - Generated file name
 */
function generatePropertyImageName(propertyData, imageNumber) {
  const { type, title, neighborhood, city, country } = propertyData;
  
  // Sanitize property type
  const sanitizedType = sanitizeForFileName(type);
  
  // Determine location (prefer neighborhood, fallback to city, then country)
  let location = '';
  if (neighborhood && neighborhood.trim()) {
    location = sanitizeForFileName(neighborhood);
  } else if (city && city.trim()) {
    location = sanitizeForFileName(city);
  } else if (country && country.trim()) {
    location = sanitizeForFileName(country);
  }
  
  // Build the name
  const parts = [sanitizedType];
  if (location) {
    parts.push(location);
  }
  parts.push(imageNumber.toString());
  
  return parts.join('-') + '.jpg';
}

/**
 * Generates SEO-friendly image name for projects
 * @param {Object} projectData - Project form data
 * @param {number} imageNumber - Sequential number for the image
 * @returns {string} - Generated file name
 */
function generateProjectImageName(projectData, imageNumber) {
  const { title, neighborhood, city, country } = projectData;
  
  // Sanitize project title
  const sanitizedTitle = sanitizeForFileName(title);
  
  // Determine location (prefer neighborhood, fallback to city, then country)
  let location = '';
  if (neighborhood && neighborhood.trim()) {
    location = sanitizeForFileName(neighborhood);
  } else if (city && city.trim()) {
    location = sanitizeForFileName(city);
  } else if (country && country.trim()) {
    location = sanitizeForFileName(country);
  }
  
  // Build the name
  const parts = [sanitizedTitle];
  if (location) {
    parts.push(location);
  }
  parts.push(imageNumber.toString());
  
  return parts.join('-') + '.jpg';
}

/**
 * Generates SEO-friendly name for property videos
 * @param {Object} propertyData - Property form data
 * @param {number} videoNumber - Sequential number for the video
 * @returns {string} - Generated file name
 */
function generatePropertyVideoName(propertyData, videoNumber) {
  const { type, title, neighborhood, city, country } = propertyData;
  
  // Sanitize property type
  const sanitizedType = sanitizeForFileName(type);
  
  // Determine location (prefer neighborhood, fallback to city, then country)
  let location = '';
  if (neighborhood && neighborhood.trim()) {
    location = sanitizeForFileName(neighborhood);
  } else if (city && city.trim()) {
    location = sanitizeForFileName(city);
  } else if (country && country.trim()) {
    location = sanitizeForFileName(country);
  }
  
  // Build the name: type-location-video-number.mp4
  const parts = [sanitizedType];
  if (location) {
    parts.push(location);
  }
  parts.push('video', videoNumber.toString());
  
  return parts.join('-') + '.mp4';
}

/**
 * Generates SEO-friendly name for project videos
 * @param {Object} projectData - Project form data
 * @param {number} videoNumber - Sequential number for the video
 * @returns {string} - Generated file name
 */
function generateProjectVideoName(projectData, videoNumber) {
  const { title, neighborhood, city, country } = projectData;
  
  // Sanitize project title
  const sanitizedTitle = sanitizeForFileName(title);
  
  // Determine location (prefer neighborhood, fallback to city, then country)
  let location = '';
  if (neighborhood && neighborhood.trim()) {
    location = sanitizeForFileName(neighborhood);
  } else if (city && city.trim()) {
    location = sanitizeForFileName(city);
  } else if (country && country.trim()) {
    location = sanitizeForFileName(country);
  }
  
  // Build the name: project-title-location-video-number.mp4
  const parts = [sanitizedTitle];
  if (location) {
    parts.push(location);
  }
  parts.push('video', videoNumber.toString());
  
  return parts.join('-') + '.mp4';
}

/**
 * Generates SEO-friendly name for any uploaded file
 * @param {Object} formData - Form data containing title/location info
 * @param {string} fileType - Type of file ('property' or 'project')
 * @param {number} fileNumber - Sequential number
 * @param {string} originalExtension - Original file extension
 * @param {string} mediaType - Type of media ('image' or 'video')
 * @returns {string} - Generated file name
 */
function generateSEOFileName(formData, fileType, fileNumber, originalExtension = '.jpg', mediaType = 'image') {
  if (mediaType === 'video') {
    if (fileType === 'property') {
      return generatePropertyVideoName(formData, fileNumber);
    } else if (fileType === 'project') {
      return generateProjectVideoName(formData, fileNumber);
    }
  } else {
    if (fileType === 'property') {
      return generatePropertyImageName(formData, fileNumber);
    } else if (fileType === 'project') {
      return generateProjectImageName(formData, fileNumber);
    }
  }
  
  // Fallback for unknown types
  return `file-${fileNumber}${originalExtension}`;
}

module.exports = {
  sanitizeForFileName,
  generatePropertyImageName,
  generateProjectImageName,
  generatePropertyVideoName,
  generateProjectVideoName,
  generateSEOFileName
};
