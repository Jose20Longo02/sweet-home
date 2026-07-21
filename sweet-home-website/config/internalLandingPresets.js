const INTERNAL_LANDING_PRESETS = {
  berlin_main: {
    label: 'Berlin Landing Page - Main',
    market: 'berlin',
    type: 'main',
    keywords: ['berlin', 'germany', 'capital', 'invest'],
    urls: {
      de: '/wohnungen-berlin-kaufen',
      en: '/en/properties-for-sale-berlin'
    }
  },
  cyprus_main: {
    label: 'Cyprus Landing Page - Main',
    market: 'cyprus',
    type: 'main',
    keywords: ['cyprus', 'paphos', 'limassol', 'larnaca', 'nicosia', 'mediterranean'],
    urls: {
      de: '/immobilien-zypern-kaufen',
      en: '/en/properties-for-sale-cyprus'
    }
  },
  dubai_main: {
    label: 'Dubai Landing Page - Main',
    market: 'dubai',
    type: 'main',
    keywords: ['dubai', 'uae', 'emirates', 'marina', 'downtown', 'business bay'],
    urls: {
      de: '/immobilien-dubai-kaufen',
      en: '/en/properties-for-sale-dubai'
    }
  },
  berlin_charlottenburg: {
    label: 'Berlin Neighborhood Landing Page - Charlottenburg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['charlottenburg', 'west berlin'],
    urls: {
      de: '/wohnung-kaufen-charlottenburg',
      en: '/wohnung-kaufen-charlottenburg'
    }
  },
  berlin_moabit: {
    label: 'Berlin Neighborhood Landing Page - Moabit',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['moabit', 'mitte'],
    urls: {
      de: '/wohnung-kaufen-moabit',
      en: '/wohnung-kaufen-moabit'
    }
  },
  berlin_friedrichshain_kreuzberg: {
    label: 'Berlin Neighborhood Landing Page - Friedrichshain-Kreuzberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['friedrichshain', 'kreuzberg', 'fhain'],
    urls: {
      de: '/wohnung-kaufen-friedrichshain-kreuzberg',
      en: '/wohnung-kaufen-friedrichshain-kreuzberg'
    }
  },
  berlin_schoeneberg: {
    label: 'Berlin Neighborhood Landing Page - Schoeneberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['schoeneberg', 'schoneberg'],
    urls: {
      de: '/wohnung-kaufen-schoeneberg',
      en: '/wohnung-kaufen-schoeneberg'
    }
  },
  berlin_prenzlauer_berg: {
    label: 'Berlin Neighborhood Landing Page - Prenzlauer Berg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['prenzlauer berg', 'pberg', 'prenzlauer'],
    urls: {
      de: '/wohnung-kaufen-prenzlauer-berg',
      en: '/wohnung-kaufen-prenzlauer-berg'
    }
  },
  berlin_wedding: {
    label: 'Berlin Neighborhood Landing Page - Wedding',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['wedding', 'gesundbrunnen'],
    urls: {
      de: '/wohnung-kaufen-wedding',
      en: '/wohnung-kaufen-wedding'
    }
  },
  berlin_tempelhof: {
    label: 'Berlin Neighborhood Landing Page - Tempelhof',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['tempelhof', 'tempelhofer'],
    urls: {
      de: '/wohnung-kaufen-tempelhof',
      en: '/wohnung-kaufen-tempelhof'
    }
  },
  berlin_neukoelln: {
    label: 'Berlin Neighborhood Landing Page - Neukoelln',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['neukoelln', 'neukölln', 'neukolln'],
    urls: {
      de: '/wohnung-kaufen-neukoelln',
      en: '/wohnung-kaufen-neukoelln'
    }
  },
  berlin_reinickendorf: {
    label: 'Berlin Neighborhood Landing Page - Reinickendorf',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['reinickendorf'],
    urls: {
      de: '/wohnung-kaufen-reinickendorf',
      en: '/wohnung-kaufen-reinickendorf'
    }
  },
  berlin_kreuzberg: {
    label: 'Berlin Neighborhood Landing Page - Kreuzberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['kreuzberg', 'bergmannkiez'],
    urls: {
      de: '/wohnung-kaufen-kreuzberg',
      en: '/wohnung-kaufen-kreuzberg'
    }
  },
  berlin_spandau: {
    label: 'Berlin Neighborhood Landing Page - Spandau',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['spandau'],
    urls: {
      de: '/wohnung-kaufen-spandau',
      en: '/wohnung-kaufen-spandau'
    }
  }
};

function getInternalLandingPresetOptions() {
  return Object.entries(INTERNAL_LANDING_PRESETS).map(([key, def]) => ({
    key,
    label: def.label
  }));
}

function getInternalLandingPresetEntries() {
  return Object.entries(INTERNAL_LANDING_PRESETS).map(([key, def]) => ({ key, ...def }));
}

function formatNameFromKey(key, market) {
  const raw = String(key || '');
  if (!raw) return '';
  const prefix = `${market}_`;
  const base = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  if (base === 'main') {
    if (market === 'berlin') return 'Berlin';
    if (market === 'cyprus') return 'Cyprus';
    if (market === 'dubai') return 'Dubai';
  }
  return base
    .split('_')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ')
    .replace(/\bNeukoelln\b/g, 'Neukoelln')
    .replace(/\bSchoeneberg\b/g, 'Schoeneberg');
}

function getInternalLandingPresetLabel(key, lang) {
  const preset = INTERNAL_LANDING_PRESETS[key];
  if (!preset) return '';
  const lcLang = String(lang || 'de').toLowerCase().slice(0, 2);
  const location = formatNameFromKey(key, preset.market);
  const isMain = preset.type === 'main';

  if (lcLang === 'de') {
    if (isMain && preset.market === 'berlin') return 'Wohnungen in Berlin kaufen';
    if (isMain && preset.market === 'cyprus') return 'Immobilien in Zypern kaufen';
    if (isMain && preset.market === 'dubai') return 'Immobilien in Dubai kaufen';
    return `Wohnungen in ${location} kaufen`;
  }

  if (lcLang === 'es') {
    if (isMain && preset.market === 'berlin') return 'Apartamentos en venta en Berlin';
    if (isMain && preset.market === 'cyprus') return 'Apartamentos en venta en Chipre';
    if (isMain && preset.market === 'dubai') return 'Apartamentos en venta en Dubai';
    return `Apartamentos en venta en ${location}`;
  }

  if (isMain && preset.market === 'berlin') return 'Apartments for sale in Berlin';
  if (isMain && preset.market === 'cyprus') return 'Apartments for sale in Cyprus';
  if (isMain && preset.market === 'dubai') return 'Apartments for sale in Dubai';
  return `Apartments for sale in ${location}`;
}

function resolveInternalLandingUrl(key, lang) {
  const preset = INTERNAL_LANDING_PRESETS[key];
  if (!preset || !preset.urls) return null;
  const lcLang = String(lang || 'de').toLowerCase().slice(0, 2);
  return preset.urls[lcLang] || preset.urls.en || preset.urls.de || null;
}

module.exports = {
  INTERNAL_LANDING_PRESETS,
  getInternalLandingPresetOptions,
  getInternalLandingPresetEntries,
  resolveInternalLandingUrl,
  getInternalLandingPresetLabel
};
