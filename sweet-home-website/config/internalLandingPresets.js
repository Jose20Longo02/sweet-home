const INTERNAL_LANDING_PRESETS = {
  berlin_main: {
    label: 'Berlin LP - Main',
    urls: {
      de: '/wohnungen-berlin-kaufen',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_tenant_strategy: {
    label: 'Berlin LP - Tenant-Occupied Strategy',
    urls: {
      de: '/wohnungen-berlin-kaufen',
      en: '/en/berlin-tenant-occupied-entry-strategy',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  cyprus_main: {
    label: 'Cyprus LP - Main',
    urls: {
      de: '/immobilien-zypern-kaufen',
      en: '/en/properties-for-sale-cyprus',
      es: '/es/propiedades-en-venta-chipre'
    }
  },
  dubai_main: {
    label: 'Dubai LP - Main',
    urls: {
      de: '/immobilien-dubai-kaufen',
      en: '/en/properties-for-sale-dubai',
      es: '/es/propiedades-en-venta-dubai'
    }
  },
  berlin_charlottenburg: {
    label: 'Berlin Neighborhood LP - Charlottenburg',
    urls: {
      de: '/wohnung-kaufen-charlottenburg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_moabit: {
    label: 'Berlin Neighborhood LP - Moabit',
    urls: {
      de: '/wohnung-kaufen-moabit',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_friedrichshain_kreuzberg: {
    label: 'Berlin Neighborhood LP - Friedrichshain-Kreuzberg',
    urls: {
      de: '/wohnung-kaufen-friedrichshain-kreuzberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_schoeneberg: {
    label: 'Berlin Neighborhood LP - Schoeneberg',
    urls: {
      de: '/wohnung-kaufen-schoeneberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_prenzlauer_berg: {
    label: 'Berlin Neighborhood LP - Prenzlauer Berg',
    urls: {
      de: '/wohnung-kaufen-prenzlauer-berg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_wedding: {
    label: 'Berlin Neighborhood LP - Wedding',
    urls: {
      de: '/wohnung-kaufen-wedding',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_tempelhof: {
    label: 'Berlin Neighborhood LP - Tempelhof',
    urls: {
      de: '/wohnung-kaufen-tempelhof',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_neukoelln: {
    label: 'Berlin Neighborhood LP - Neukoelln',
    urls: {
      de: '/wohnung-kaufen-neukoelln',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_reinickendorf: {
    label: 'Berlin Neighborhood LP - Reinickendorf',
    urls: {
      de: '/wohnung-kaufen-reinickendorf',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_kreuzberg: {
    label: 'Berlin Neighborhood LP - Kreuzberg',
    urls: {
      de: '/wohnung-kaufen-kreuzberg',
      en: '/en/properties-for-sale-berlin',
      es: '/es/propiedades-en-venta-berlin'
    }
  },
  berlin_spandau: {
    label: 'Berlin Neighborhood LP - Spandau',
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

function resolveInternalLandingUrl(key, lang) {
  const preset = INTERNAL_LANDING_PRESETS[key];
  if (!preset || !preset.urls) return null;
  const lcLang = String(lang || 'de').toLowerCase().slice(0, 2);
  return preset.urls[lcLang] || preset.urls.en || preset.urls.de || null;
}

module.exports = {
  INTERNAL_LANDING_PRESETS,
  getInternalLandingPresetOptions,
  resolveInternalLandingUrl
};
