// Energy certificate (Energieausweis) options for property listings.
// Stored values are stable keys. Labels are English and German.

const CERTIFICATE_TYPES = [
  { value: 'demand', en: 'Demand certificate', de: 'Bedarfsausweis' },
  { value: 'consumption', en: 'Consumption certificate', de: 'Verbrauchsausweis' },
  { value: 'none', en: 'No information', de: 'Keine Angabe' }
];

const EFFICIENCY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const ENERGY_SOURCES = [
  { value: 'none', en: 'No information', de: 'Keine Angabe' },
  { value: 'geothermal', en: 'Geothermal energy', de: 'Erdwärme' },
  { value: 'solar', en: 'Solar energy', de: 'Solar' },
  { value: 'wood_pellets', en: 'Wood pellets', de: 'Holzpellets' },
  { value: 'gas', en: 'Gas', de: 'Gas' },
  { value: 'oil', en: 'Oil', de: 'Öl' },
  { value: 'district_heating', en: 'District heating', de: 'Fernwärme' },
  { value: 'electricity', en: 'Electricity', de: 'Strom' },
  { value: 'coal', en: 'Coal', de: 'Kohle' },
  { value: 'natural_gas_l', en: 'Natural gas L', de: 'Erdgas L' },
  { value: 'natural_gas_h', en: 'Natural gas H', de: 'Erdgas H' },
  { value: 'lpg', en: 'Liquefied gas', de: 'Flüssiggas' },
  { value: 'district_steam', en: 'District heating steam', de: 'Fernwärme-Dampf' },
  { value: 'wood', en: 'Wood', de: 'Holz' },
  { value: 'wood_chips', en: 'Wood chips', de: 'Holz-Hackschnitzel' },
  { value: 'coal_coke', en: 'Coal/coke', de: 'Kohle/Koks' },
  { value: 'local_heating', en: 'Local heating', de: 'Nahwärme' },
  { value: 'heat_supply', en: 'Heat supply', de: 'Wärmelieferung' },
  { value: 'bioenergy', en: 'Bioenergy', de: 'Bioenergie' },
  { value: 'wind', en: 'Wind energy', de: 'Windenergie' },
  { value: 'hydropower', en: 'Hydropower', de: 'Wasserenergie' },
  { value: 'ambient_heat', en: 'Ambient heat', de: 'Umweltwärme' },
  { value: 'chp_fossil', en: 'CHP fossil', de: 'KWK fossil' },
  { value: 'chp_renewable', en: 'CHP renewable', de: 'KWK erneuerbar' },
  { value: 'chp_regenerative', en: 'CHP regenerative', de: 'KWK regenerativ' },
  { value: 'chp_bio', en: 'CHP bioenergy', de: 'KWK bio' }
];

const HEATING_TYPES = [
  { value: 'none', en: 'No information', de: 'Keine Angabe' },
  { value: 'floor', en: 'Floor heating', de: 'Etagenheizung' },
  { value: 'stove', en: 'Individual stove heating', de: 'Ofenheizung' },
  { value: 'central', en: 'Central heating', de: 'Zentralheizung' },
  { value: 'chp', en: 'Combined heat and power plant', de: 'Blockheizkraftwerke' },
  { value: 'electric', en: 'Electric heating', de: 'Elektro-Heizung' },
  { value: 'district', en: 'District heating', de: 'Fernwärme' },
  { value: 'underfloor', en: 'Underfloor heating', de: 'Fußbodenheizung' },
  { value: 'gas', en: 'Gas heating', de: 'Gas-Heizung' },
  { value: 'wood_pellet', en: 'Wood pellet heating', de: 'Holz-Pelletheizung' },
  { value: 'night_storage', en: 'Night storage heaters', de: 'Nachtspeicheröfen' },
  { value: 'oil', en: 'Oil heating', de: 'Öl-Heizung' },
  { value: 'solar', en: 'Solar heating', de: 'Solar-Heizung' },
  { value: 'heat_pump', en: 'Heat pump', de: 'Wärmepumpe' }
];

const SOURCE_KEYS = new Set(ENERGY_SOURCES.map((row) => row.value));
const HEATING_KEYS = new Set(HEATING_TYPES.map((row) => row.value));
const TYPE_KEYS = new Set(CERTIFICATE_TYPES.map((row) => row.value));

function asList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return [];
  return [raw];
}

function parseDecimal(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(String(raw).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function readEnergyCertificate(body) {
  const source = body || {};
  const type = String(source.energy_certificate_type || '').trim();
  const errors = [];
  const cleared = {
    energy_certificate_type: type || null,
    energy_value: null,
    energy_efficiency_class: null,
    energy_sources: [],
    energy_certificate_year: null,
    heating_type: null
  };

  if (!TYPE_KEYS.has(type)) {
    errors.push('Energy certificate type is required');
    return { errors, values: cleared };
  }

  if (type === 'none') {
    return { errors, values: { ...cleared, energy_certificate_type: 'none' } };
  }

  const energyValue = parseDecimal(source.energy_value);
  const efficiencyClass = String(source.energy_efficiency_class || '').trim();
  let sources = asList(source.energy_sources).map((item) => String(item || '').trim()).filter(Boolean);
  if (sources.includes('none') && sources.length > 1) {
    sources = sources.filter((item) => item !== 'none');
  }
  sources = [...new Set(sources)];
  const yearRaw = String(source.energy_certificate_year || '').trim();
  const year = yearRaw === '' ? null : Number(yearRaw);
  const heating = String(source.heating_type || '').trim();
  const currentYear = new Date().getFullYear();
  const valueLabel = type === 'consumption' ? 'Final energy consumption' : 'Final energy demand';

  if (energyValue == null || Number.isNaN(energyValue) || energyValue < 0 || energyValue > 999999.99) {
    errors.push(valueLabel + ' must be a number in kWh/(m²·a)');
  }
  if (!EFFICIENCY_CLASSES.includes(efficiencyClass)) {
    errors.push('Energy efficiency class is required');
  }
  if (!sources.length || sources.some((item) => !SOURCE_KEYS.has(item))) {
    errors.push('Select at least one main energy source');
  }
  if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
    errors.push('Construction year according to the energy certificate is required');
  }
  if (!HEATING_KEYS.has(heating)) {
    errors.push('Heating type is required');
  }

  return {
    errors,
    values: {
      energy_certificate_type: type,
      energy_value: energyValue == null || Number.isNaN(energyValue) ? null : energyValue,
      energy_efficiency_class: efficiencyClass || null,
      energy_sources: sources,
      energy_certificate_year: Number.isInteger(year) ? year : null,
      heating_type: heating || null
    }
  };
}

function labelFor(list, value, lang) {
  const row = (list || []).find((item) => item.value === value);
  if (!row) return value || '';
  return lang === 'en' ? row.en : row.de;
}

module.exports = {
  CERTIFICATE_TYPES,
  EFFICIENCY_CLASSES,
  ENERGY_SOURCES,
  HEATING_TYPES,
  readEnergyCertificate,
  labelFor
};
