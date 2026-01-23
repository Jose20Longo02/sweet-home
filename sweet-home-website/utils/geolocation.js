const maxmind = require('maxmind');
const path = require('path');
const fs = require('fs');

let lookup = null;
let dbPath = null;

/**
 * Initialize the GeoLite2 database
 * Call this once at application startup
 */
async function initializeGeolocation() {
  // Try multiple possible locations for the GeoLite2 database
  const possiblePaths = [
    path.join(__dirname, '..', 'data', 'GeoLite2-Country.mmdb'),
    path.join(__dirname, '..', 'GeoLite2-Country.mmdb'),
    path.join(process.cwd(), 'data', 'GeoLite2-Country.mmdb'),
    path.join(process.cwd(), 'GeoLite2-Country.mmdb'),
    process.env.GEOLITE2_DB_PATH
  ].filter(Boolean);

  for (const dbPathOption of possiblePaths) {
    if (fs.existsSync(dbPathOption)) {
      try {
        lookup = await maxmind.open(dbPathOption);
        dbPath = dbPathOption;
        console.log(`[geolocation] Loaded GeoLite2 database from: ${dbPathOption}`);
        return true;
      } catch (err) {
        console.warn(`[geolocation] Failed to load database from ${dbPathOption}:`, err.message);
      }
    }
  }

  console.warn('[geolocation] GeoLite2 database not found. Country tracking will be disabled.');
  console.warn('[geolocation] To enable country tracking:');
  console.warn('  1. Create a free MaxMind account at https://www.maxmind.com/en/geolite2/signup');
  console.warn('  2. Download GeoLite2-Country database');
  console.warn('  3. Place it in: data/GeoLite2-Country.mmdb');
  return false;
}

/**
 * Get country code from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {string|null} - ISO country code (e.g., 'US', 'GB', 'CY') or null if not found
 */
function getCountryFromIp(ipAddress) {
  if (!lookup || !ipAddress) {
    return null;
  }

  try {
    // Handle IPv6-mapped IPv4 addresses
    const cleanIp = ipAddress.replace(/^::ffff:/, '');
    
    // Skip local/private IPs
    if (
      cleanIp === '127.0.0.1' ||
      cleanIp === 'localhost' ||
      cleanIp.startsWith('192.168.') ||
      cleanIp.startsWith('10.') ||
      cleanIp.startsWith('172.16.') ||
      cleanIp.startsWith('172.17.') ||
      cleanIp.startsWith('172.18.') ||
      cleanIp.startsWith('172.19.') ||
      cleanIp.startsWith('172.20.') ||
      cleanIp.startsWith('172.21.') ||
      cleanIp.startsWith('172.22.') ||
      cleanIp.startsWith('172.23.') ||
      cleanIp.startsWith('172.24.') ||
      cleanIp.startsWith('172.25.') ||
      cleanIp.startsWith('172.26.') ||
      cleanIp.startsWith('172.27.') ||
      cleanIp.startsWith('172.28.') ||
      cleanIp.startsWith('172.29.') ||
      cleanIp.startsWith('172.30.') ||
      cleanIp.startsWith('172.31.')
    ) {
      return null;
    }

    const result = lookup.get(cleanIp);
    
    if (result && result.country && result.country.iso_code) {
      return result.country.iso_code;
    }
    
    return null;
  } catch (err) {
    // Silently fail - geolocation is not critical
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[geolocation] Error looking up IP:', ipAddress, err.message);
    }
    return null;
  }
}

/**
 * Get country name from IP address (optional, for display)
 * @param {string} ipAddress - IP address to lookup
 * @returns {string|null} - Country name or null
 */
function getCountryNameFromIp(ipAddress) {
  if (!lookup || !ipAddress) {
    return null;
  }

  try {
    const cleanIp = ipAddress.replace(/^::ffff:/, '');
    const result = lookup.get(cleanIp);
    
    if (result && result.country && result.country.names && result.country.names.en) {
      return result.country.names.en;
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  initializeGeolocation,
  getCountryFromIp,
  getCountryNameFromIp
};
