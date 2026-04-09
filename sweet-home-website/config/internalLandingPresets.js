const INTERNAL_LANDING_PRESETS = {
  berlin_main: {
    label: 'Berlin Landing Page - Main',
    market: 'berlin',
    type: 'main',
    keywords: ['berlin', 'germany', 'capital', 'invest'],
    urls: {
      de: '/wohnungen-berlin-kaufen',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  cyprus_main: {
    label: 'Cyprus Landing Page - Main',
    market: 'cyprus',
    type: 'main',
    keywords: ['cyprus', 'paphos', 'limassol', 'larnaca', 'nicosia', 'mediterranean'],
    urls: {
      de: '/immobilien-zypern-kaufen',
      en: '/en/properties-for-sale-cyprus',
      es: '/es/propiedades-en-venta-chipre'
    }
  },
  dubai_main: {
    label: 'Dubai Landing Page - Main',
    market: 'dubai',
    type: 'main',
    keywords: ['dubai', 'uae', 'emirates', 'marina', 'downtown', 'business bay'],
    urls: {
      de: '/immobilien-dubai-kaufen',
      en: '/en/properties-for-sale-dubai',
      es: '/es/propiedades-en-venta-dubai'
    }
  },
  berlin_charlottenburg: {
    label: 'Berlin Neighborhood Landing Page - Charlottenburg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['charlottenburg', 'west berlin'],
    urls: {
      de: '/wohnung-kaufen-charlottenburg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_moabit: {
    label: 'Berlin Neighborhood Landing Page - Moabit',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['moabit', 'mitte'],
    urls: {
      de: '/wohnung-kaufen-moabit',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_friedrichshain_kreuzberg: {
    label: 'Berlin Neighborhood Landing Page - Friedrichshain-Kreuzberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['friedrichshain', 'kreuzberg', 'fhain'],
    urls: {
      de: '/wohnung-kaufen-friedrichshain-kreuzberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_schoeneberg: {
    label: 'Berlin Neighborhood Landing Page - Schoeneberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['schoeneberg', 'schoneberg'],
    urls: {
      de: '/wohnung-kaufen-schoeneberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_prenzlauer_berg: {
    label: 'Berlin Neighborhood Landing Page - Prenzlauer Berg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['prenzlauer berg', 'pberg', 'prenzlauer'],
    urls: {
      de: '/wohnung-kaufen-prenzlauer-berg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_wedding: {
    label: 'Berlin Neighborhood Landing Page - Wedding',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['wedding', 'gesundbrunnen'],
    urls: {
      de: '/wohnung-kaufen-wedding',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_tempelhof: {
    label: 'Berlin Neighborhood Landing Page - Tempelhof',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['tempelhof', 'tempelhofer'],
    urls: {
      de: '/wohnung-kaufen-tempelhof',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_neukoelln: {
    label: 'Berlin Neighborhood Landing Page - Neukoelln',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['neukoelln', 'neukölln', 'neukolln'],
    urls: {
      de: '/wohnung-kaufen-neukoelln',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_reinickendorf: {
    label: 'Berlin Neighborhood Landing Page - Reinickendorf',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['reinickendorf'],
    urls: {
      de: '/wohnung-kaufen-reinickendorf',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_kreuzberg: {
    label: 'Berlin Neighborhood Landing Page - Kreuzberg',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['kreuzberg', 'bergmannkiez'],
    urls: {
      de: '/wohnung-kaufen-kreuzberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_spandau: {
    label: 'Berlin Neighborhood Landing Page - Spandau',
    market: 'berlin',
    type: 'neighborhood',
    keywords: ['spandau'],
    urls: {
      de: '/wohnung-kaufen-spandau',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
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
  resolveInternalLandingUrl
};
