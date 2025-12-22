/**
 * Icon Theme Configuration
 * 
 * This file manages icon themes for the website.
 * You can easily switch between default and holiday-themed icons.
 * 
 * To add a new theme:
 * 1. Add a new theme object below
 * 2. Place your icon files in public/icons/{theme-name}/
 * 3. Update the theme paths accordingly
 */

const themes = {
  default: {
    name: 'Default',
    description: 'Standard icons for everyday use',
    icons: {
      bed: '/icons/icon_bed.svg',
      bath: '/icons/icon_bath.svg',
      size: '/icons/icon_size.svg',
      location: '/icons/icon_location.svg',
      propertyType: null, // Uses inline SVG
      occupancy: null, // Uses inline SVG
      rental: null // Uses inline SVG
    }
  },
  holiday: {
    name: 'Holiday',
    description: 'Christmas and New Year themed icons',
    icons: {
      bed: '/icons/holiday/icon_bed.png',
      bath: '/icons/holiday/icon_bath.png',
      size: '/icons/holiday/icon_size.png',
      location: '/icons/holiday/icon_location.png',
      propertyType: '/icons/holiday/icon_property_type.png',
      occupancy: '/icons/holiday/icon_occupancy.png',
      rental: '/icons/holiday/icon_rental.png'
    }
  },
  christmas: {
    name: 'Christmas',
    description: 'Christmas themed icons',
    icons: {
      bed: '/icons/holiday/icon_bed.png',
      bath: '/icons/holiday/icon_bath.png',
      size: '/icons/holiday/icon_size.png',
      location: '/icons/holiday/icon_location.png',
      propertyType: '/icons/holiday/icon_property_type.png',
      occupancy: '/icons/holiday/icon_occupancy.png',
      rental: '/icons/holiday/icon_rental.png'
    }
  }
  // Add more themes here as needed
  // example:
  // summer: {
  //   name: 'Summer',
  //   description: 'Summer themed icons',
  //   icons: {
  //     bed: '/icons/summer/icon_bed.svg',
  //     bath: '/icons/summer/icon_bath.svg',
  //     size: '/icons/summer/icon_size.svg',
  //     location: '/icons/summer/icon_location.svg'
  //   }
  // }
};

/**
 * Get the current active theme
 * Checks environment variable first, then falls back to default
 */
function getActiveTheme() {
  return process.env.ICON_THEME || 'default';
}

/**
 * Get icon path for a specific icon type in the active theme
 * @param {string} iconType - The type of icon (bed, bath, size, location)
 * @returns {string} - The path to the icon file
 */
function getIconPath(iconType) {
  const activeTheme = getActiveTheme();
  const theme = themes[activeTheme] || themes.default;
  return theme.icons[iconType] || themes.default.icons[iconType] || '';
}

/**
 * Get all available themes
 * @returns {Object} - Object with theme keys and their metadata
 */
function getAvailableThemes() {
  return Object.keys(themes).map(key => ({
    key,
    ...themes[key]
  }));
}

/**
 * Check if a theme exists
 * @param {string} themeKey - The theme key to check
 * @returns {boolean}
 */
function themeExists(themeKey) {
  return themes.hasOwnProperty(themeKey);
}

/**
 * Get theme metadata
 * @param {string} themeKey - The theme key
 * @returns {Object|null} - Theme metadata or null if not found
 */
function getTheme(themeKey) {
  return themes[themeKey] || null;
}

module.exports = {
  themes,
  getActiveTheme,
  getIconPath,
  getAvailableThemes,
  themeExists,
  getTheme
};

