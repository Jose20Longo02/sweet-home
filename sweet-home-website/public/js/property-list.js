// Property List Page JavaScript

// Lightweight i18n loader for this page
let I18N = {};
function loadI18n() {
  try {
    const el = document.getElementById('i18n-property-list');
    if (!el) return;
    const raw = el.getAttribute('data-i18n') || '{}';
    I18N = JSON.parse(raw);
  } catch (_) { /* no-op */ }
}
function i18nGet(path, fallback) {
  try {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), I18N) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

// Global variables
let map = null;
let markers = [];
let propertiesData = [];

// Locations data for dynamic city population
let LOCATIONS = {};
let LOCATION_COLORS = {};

// Apply inline country colors to property cards for mapped countries
function applyLocationColors() {
  try {
    const cards = document.querySelectorAll('.property-card');
    cards.forEach(card => {
      const country = (card.dataset.country || '').trim();
      const hex = LOCATION_COLORS && LOCATION_COLORS[country];
      if (hex) {
        // Apply CSS variable used by accent strip and panel styles
        card.style.setProperty('--country-color', hex);
      }
    });
  } catch (_) {
    // no-op
  }
}

// Initialize collapsible filter groups (toggle open/closed)
function initializeCollapsibles() {
  try {
    const headers = document.querySelectorAll('.filter-group.collapsible > h4');
    headers.forEach((h) => {
      h.addEventListener('click', () => {
        const group = h.parentElement;
        if (group && group.classList.contains('collapsible')) {
          group.classList.toggle('collapsed');
        }
      });
    });
  } catch (_) { /* no-op */ }
}

// Mobile filters open/close
function toggleMobileFilters(open) {
  const sidebar = document.getElementById('filtersSidebar');
  const overlay = document.getElementById('filtersOverlay');
  if (!sidebar) return;
  if (open) {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('open');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
}

// Function to update cities based on selected country
function updateCities() {
  const countrySelect = document.getElementById('filterCountry');
  const citySelect = document.getElementById('filterCity');
  const neighborhoodSelect = document.getElementById('filterNeighborhood');
  
  if (!countrySelect || !citySelect) {
    console.warn('❌ Country or city select elements not found');
    return;
  }
  
  const selectedCountry = countrySelect.value;
  console.log('🌍 Updating cities for country:', selectedCountry);
  
  // Clear existing city options
  citySelect.innerHTML = `<option value="">${i18nGet('forms.anyCity','Any City')}</option>`;
  
  // Clear and disable neighborhood select
  if (neighborhoodSelect) {
    neighborhoodSelect.innerHTML = `<option value="">${i18nGet('forms.anyNeighborhood','Any Neighborhood')}</option>`;
    neighborhoodSelect.disabled = true;
  }
  
  if (selectedCountry && LOCATIONS[selectedCountry]) {
    // Add cities for selected country
    const cities = Object.keys(LOCATIONS[selectedCountry]);
    console.log('🏙️ Found cities:', cities);
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
    citySelect.disabled = false;
    console.log(`✅ Populated ${cities.length} cities, city dropdown enabled`);
  } else {
    citySelect.disabled = true;
    console.log('❌ No cities found for country:', selectedCountry);
  }
}

// Function to update neighborhoods based on selected city
function updateNeighborhoods() {
  const countrySelect = document.getElementById('filterCountry');
  const citySelect = document.getElementById('filterCity');
  const neighborhoodSelect = document.getElementById('filterNeighborhood');
  
  if (!countrySelect || !citySelect || !neighborhoodSelect) {
    console.warn('❌ One or more select elements not found for neighborhood update');
    return;
  }
  
  const selectedCountry = countrySelect.value;
  const selectedCity = citySelect.value;
  console.log('🏙️ Updating neighborhoods for city:', selectedCity, 'in country:', selectedCountry);
  
  // Clear existing neighborhood options
  neighborhoodSelect.innerHTML = '<option value="">Any Neighborhood</option>';
  
  if (selectedCountry && selectedCity && LOCATIONS[selectedCountry] && LOCATIONS[selectedCountry][selectedCity]) {
    // Add neighborhoods for selected city
    const neighborhoods = LOCATIONS[selectedCountry][selectedCity];
    console.log('🏘️ Found neighborhoods:', neighborhoods);
    
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement('option');
      option.value = neighborhood;
      option.textContent = neighborhood;
      neighborhoodSelect.appendChild(option);
    });
    neighborhoodSelect.disabled = false;
    console.log(`✅ Populated ${neighborhoods.length} neighborhoods, neighborhood dropdown enabled`);
  } else {
    neighborhoodSelect.disabled = true;
    console.log('❌ No neighborhoods found for city:', selectedCity);
  }
}

// Function to clear all filters
function clearAllFilters() {
  const countrySelect = document.getElementById('filterCountry');
  const citySelect = document.getElementById('filterCity');
  const neighborhoodSelect = document.getElementById('filterNeighborhood');
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  const minSizeInput = document.getElementById('minSize');
  const maxSizeInput = document.getElementById('maxSize');
  const yearBuiltMinInput = document.getElementById('yearBuiltMin');
  const yearBuiltMaxInput = document.getElementById('yearBuiltMax');
  
  if (countrySelect) countrySelect.value = '';
  if (citySelect) {
    citySelect.value = '';
    citySelect.disabled = true;
  }
  if (neighborhoodSelect) {
    neighborhoodSelect.value = '';
    neighborhoodSelect.disabled = true;
  }
  
  // Clear checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  
  // Clear price, size, and year inputs
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  if (minSizeInput) minSizeInput.value = '';
  if (maxSizeInput) maxSizeInput.value = '';
  if (yearBuiltMinInput) yearBuiltMinInput.value = '';
  if (yearBuiltMaxInput) yearBuiltMaxInput.value = '';
  
  // Submit form to refresh results
  const filtersForm = document.getElementById('filtersForm');
  if (filtersForm) filtersForm.submit();
}

// Function to remove a specific filter
function removeFilter(filterType, value = null) {
  const currentUrl = new URL(window.location);
  
  switch (filterType) {
    case 'country':
      currentUrl.searchParams.delete('country');
      currentUrl.searchParams.delete('city');
      currentUrl.searchParams.delete('neighborhood');
      break;
    case 'city':
      currentUrl.searchParams.delete('city');
      currentUrl.searchParams.delete('neighborhood');
      break;
    case 'type':
      if (value) {
        const types = currentUrl.searchParams.getAll('type');
        const newTypes = types.filter(t => t !== value);
        currentUrl.searchParams.delete('type');
        newTypes.forEach(t => currentUrl.searchParams.append('type', t));
      } else {
        currentUrl.searchParams.delete('type');
      }
      break;
    case 'price':
      currentUrl.searchParams.delete('min_price');
      currentUrl.searchParams.delete('max_price');
      break;
    case 'size':
      currentUrl.searchParams.delete('min_size');
      currentUrl.searchParams.delete('max_size');
      break;
    case 'year_built':
      currentUrl.searchParams.delete('year_built_min');
      currentUrl.searchParams.delete('year_built_max');
      break;
    case 'bedrooms':
      currentUrl.searchParams.delete('bedrooms');
      break;
    case 'bathrooms':
      currentUrl.searchParams.delete('bathrooms');
      break;
    case 'features':
      if (value) {
        const features = currentUrl.searchParams.getAll('features');
        const newFeatures = features.filter(f => f !== value);
        currentUrl.searchParams.delete('features');
        newFeatures.forEach(f => currentUrl.searchParams.append('features', f));
      } else {
        currentUrl.searchParams.delete('features');
      }
      break;
    case 'status':
      if (value) {
        const statuses = currentUrl.searchParams.getAll('status');
        const newStatuses = statuses.filter(s => s !== value);
        currentUrl.searchParams.delete('status');
        newStatuses.forEach(s => currentUrl.searchParams.append('status', s));
      } else {
        currentUrl.searchParams.delete('status');
      }
      break;
    case 'featured':
      currentUrl.searchParams.delete('featured');
      break;
    case 'new_listing':
      currentUrl.searchParams.delete('new_listing');
      break;
  }
  
  // Reset to page 1 when removing filters
  currentUrl.searchParams.delete('page');
  
  window.location.href = currentUrl.toString();
}

// Function to handle checkbox changes for multiple values
function handleCheckboxChange(name, value, checked) {
  const currentUrl = new URL(window.location);
  
  if (checked) {
    currentUrl.searchParams.append(name, value);
  } else {
    const values = currentUrl.searchParams.getAll(name);
    const newValues = values.filter(v => v !== value);
    currentUrl.searchParams.delete(name);
    newValues.forEach(v => currentUrl.searchParams.append(name, v));
  }
  
  // Reset to page 1 when changing filters
  currentUrl.searchParams.delete('page');
  
  window.location.href = currentUrl.toString();
}

// Function to switch between grid and list view
// Single default view (grid). Map/list toggles removed.

// Map functionality

function initializeMap() {
  const mapContainer = document.getElementById('propertyMap');
  if (!mapContainer) return;
  
  // Check if map is already initialized
  if (map) {
    return;
  }
  
  // Initialize map using Leaflet (you'll need to include Leaflet CSS and JS)
  try {
    // Create map centered on first property or default location
    const properties = window.propertiesData || [];
    let centerLat = 40.4168; // Default: Madrid
    let centerLng = -3.7038;
    
    if (properties.length > 0) {
      // Use first property's coordinates if available
      const firstProperty = properties[0];
      if (firstProperty.latitude && firstProperty.longitude) {
        centerLat = parseFloat(firstProperty.latitude);
        centerLng = parseFloat(firstProperty.longitude);
      }
    }
    
    // Create map instance
    map = L.map('propertyMap').setView([centerLat, centerLng], 10);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add markers for all properties
    addPropertyMarkers(properties);
    
    // Hide loading state
    const loadingElement = mapContainer.querySelector('.map-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error initializing map:', error);
    // Show error state
    const msg = i18nGet('map.error', 'Unable to load map. Please try refreshing the page.');
    const retry = i18nGet('common.retry', 'Retry');
    mapContainer.innerHTML = `
      <div class="map-error">
        <p>${msg}</p>
        <button onclick="initializeMap()" class="btn btn-secondary">${retry}</button>
      </div>
    `;
  }
}

function addPropertyMarkers(properties) {
  if (!map || !properties) return;
  
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  // Track properties that need geocoding
  const propertiesToGeocode = [];
  
  properties.forEach(property => {
    let lat, lng;
    
    // Check if property has coordinates
    if (property.latitude && property.longitude) {
      lat = parseFloat(property.latitude);
      lng = parseFloat(property.longitude);
    } else {
      // Add to geocoding queue
      propertiesToGeocode.push(property);
      return;
    }
    
    // Create custom marker icon
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-content">
          <div class="marker-price">€${formatPrice(property.price)}</div>
          <div class="marker-type">${property.type}</div>
        </div>
      `,
      iconSize: [80, 40],
      iconAnchor: [40, 20]
    });
    
    // Create marker
    const marker = L.marker([lat, lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(createMarkerPopup(property));
    
    markers.push(marker);
  });
  
  // Geocode properties without coordinates
  if (propertiesToGeocode.length > 0) {
    geocodeProperties(propertiesToGeocode);
  }
  
  // Fit map to show all markers
  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Function to geocode properties without coordinates
async function geocodeProperties(properties) {
  for (const property of properties) {
    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const query = encodeURIComponent(`${property.city}, ${property.country}`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          
          // Create custom marker icon
          const markerIcon = L.divIcon({
            className: 'custom-marker geocoded',
            html: `
              <div class="marker-content">
                <div class="marker-price">€${formatPrice(property.price)}</div>
                <div class="marker-type">${property.type}</div>
              </div>
            `,
            iconSize: [80, 40],
            iconAnchor: [40, 20]
          });
          
          // Create marker
          const marker = L.marker([lat, lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(createMarkerPopup(property));
          
          markers.push(marker);
          
          // Fit map to show all markers
          if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        }
      }
    } catch (error) {
      console.warn(`Could not geocode ${property.city}, ${property.country}:`, error);
    }
  }
}

function createMarkerPopup(property) {
  const bedsLabel = i18nGet('meta.beds', 'beds');
  const bathsLabel = i18nGet('meta.baths', 'baths');
  const sqmLabel = i18nGet('meta.sqm', 'm²');
  const viewDetails = i18nGet('viewDetails', 'View details');
  return `
    <div class="marker-popup">
      <img src="${property.photos && property.photos[0] ? property.photos[0] : '/img/property-placeholder.jpg'}" 
           alt="${property.title}" class="popup-image" loading="lazy" decoding="async">
      <div class="popup-content">
        <h4>${property.title}</h4>
        <p class="popup-location">${property.city}, ${property.country}</p>
        <p class="popup-price">€${formatPrice(property.price)}</p>
        <div class="popup-details">
          <span>${property.bedrooms || 0} ${bedsLabel}</span>
          <span>${property.bathrooms || 0} ${bathsLabel}</span>
          <span>${property.size || 0} ${sqmLabel}</span>
        </div>
        <a href="/properties/${property.slug}" class="popup-link">${viewDetails}</a>
      </div>
    </div>
  `;
}

// Helper function to format price
function formatPrice(price) {
  if (!price) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Function to update sorting
function updateSort() {
  const sortSelect = document.getElementById('sortBy');
  if (!sortSelect) return;
  
  const currentUrl = new URL(window.location);
  currentUrl.searchParams.set('sort', sortSelect.value);
  window.location.href = currentUrl.toString();
}

// No favorites system

// Property comparison functionality
let comparisonList = [];

// Function to compare property
function compareProperty(propertyId) {
  const propertyCard = document.querySelector(`[data-property-id="${propertyId}"]`);
  if (!propertyCard) return;

  // Track whether we added an item (to decide scrolling behavior)
  let didAdd = false;
  
  // Safely read current DOM structure
  const titleEl = propertyCard.querySelector('.property-title');
  const locationEl = propertyCard.querySelector('.pill-location');
  const priceEl = propertyCard.querySelector('.price-amount');
  const metaItems = propertyCard.querySelectorAll('.property-meta .meta-item span');
  const imgEl = propertyCard.querySelector('.property-image img');

  // Prefer explicit data-* attributes to avoid layout/translation issues
  const dataType = propertyCard.getAttribute('data-type') || '';
  const dataSize = propertyCard.getAttribute('data-size') || '';
  const dataBedrooms = propertyCard.getAttribute('data-bedrooms') || '';
  const dataBathrooms = propertyCard.getAttribute('data-bathrooms') || '';
  const dataPrice = priceEl ? Number(priceEl.getAttribute('data-price') || 0) : 0;

  // Fallbacks from visible meta if data-* is missing
  const fallbackSize = metaItems && metaItems[0] ? metaItems[0].textContent : '';
  const fallbackBedrooms = metaItems && metaItems[1] ? metaItems[1].textContent : '';
  const fallbackBathrooms = metaItems && metaItems[2] ? metaItems[2].textContent : '';

  const property = {
    id: propertyId,
    title: titleEl ? titleEl.textContent : '',
    location: locationEl ? locationEl.textContent : '',
    price: priceEl ? priceEl.textContent : '',
    type: dataType,
    bedrooms: dataBedrooms || fallbackBedrooms,
    bathrooms: dataBathrooms || fallbackBathrooms,
    size: dataSize || fallbackSize,
    image: imgEl ? imgEl.src : '',
    priceNumber: Number.isFinite(dataPrice) ? dataPrice : 0,
    sizeNumber: Number.parseFloat(dataSize || fallbackSize) || 0
  };
  
  // Check if property is already in comparison
  const existingIndex = comparisonList.findIndex(p => p.id === propertyId);
  
  if (existingIndex !== -1) {
    // Remove from comparison
    comparisonList.splice(existingIndex, 1);
    propertyCard.classList.remove('in-comparison');
    showNotification(i18nGet('compare.removed','Property removed from comparison'), 'info');
  } else {
    // Add to comparison (max 3 properties)
    if (comparisonList.length >= 3) {
      showNotification(i18nGet('compare.max','You can only compare up to 3 properties at a time'), 'warning');
      return;
    }
    
    comparisonList.push(property);
    propertyCard.classList.add('in-comparison');
    showNotification(i18nGet('compare.added','Property added to comparison'), 'success');
    didAdd = true;
  }
  
  updateComparisonUI();

  // When an item is added, scroll to the comparison panel to make it visible
  if (didAdd && comparisonList.length > 0) {
    const comparisonContainer = document.getElementById('comparisonContainer');
    if (comparisonContainer) {
      requestAnimationFrame(() => {
        // Scroll with offset so the panel sits higher and more visible
        const rect = comparisonContainer.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const offset = 160; // adjust if header height changes
        const targetY = rect.top + scrollTop - offset;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      });
    }
  }
}

// Function to update comparison UI
function updateComparisonUI() {
  const comparisonContainer = document.getElementById('comparisonContainer');
  if (!comparisonContainer) return;
  
  if (comparisonList.length === 0) {
    comparisonContainer.style.display = 'none';
    return;
  }
  
  comparisonContainer.style.display = 'block';
  
  const comparisonListEl = document.getElementById('comparisonList');
  comparisonListEl.innerHTML = comparisonList.map(property => `
    <div class="comparison-item">
      <img src="${property.image}" alt="${property.title}" class="comparison-image">
      <div class="comparison-details">
        <h4>${property.title}</h4>
        <p>${property.location}</p>
        <p class="comparison-price">${property.price}</p>
      </div>
      <button class="comparison-remove" onclick="compareProperty('${property.id}')" aria-label="${(i18nGet('compare.removeAria','Remove %s from comparison')||'').replace('%s', property.title)}" title="${i18nGet('compare.remove','Remove from comparison')}">&times;</button>
    </div>
  `).join('');
  
  // Update compare button text
  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) {
    const cta = i18nGet('compare.cta','Compare');
    compareBtn.textContent = `${cta} (${comparisonList.length})`;
    compareBtn.disabled = false;
  }
}

// Clear all compared properties
function clearComparison() {
  // Remove visual state from any cards
  comparisonList.forEach(p => {
    const card = document.querySelector(`[data-property-id="${p.id}"]`);
    if (card) card.classList.remove('in-comparison');
  });

  comparisonList = [];

  const comparisonContainer = document.getElementById('comparisonContainer');
  const comparisonListEl = document.getElementById('comparisonList');
  const compareBtn = document.getElementById('compareBtn');
  if (comparisonListEl) comparisonListEl.innerHTML = '';
  if (comparisonContainer) comparisonContainer.style.display = 'none';
  if (compareBtn) {
    const cta = i18nGet('compare.cta','Compare');
    compareBtn.textContent = `${cta} (0)`;
    compareBtn.disabled = true;
  }

  showNotification(i18nGet('compare.cleared','Comparison cleared'), 'info');
}

// Function to show comparison modal
function showComparisonModal() {
  if (comparisonList.length < 2) {
    showNotification(i18nGet('compare.needTwo','Please select at least 2 properties to compare'), 'warning');
    return;
  }
  
  const modal = document.getElementById('comparisonModal');
  const modalContent = document.getElementById('comparisonContent');
  
  if (!modal || !modalContent) return;
  
  // Create comparison table
  const comparisonTable = createComparisonTable();
  modalContent.innerHTML = comparisonTable;
  
  modal.style.display = 'block';
}

// Function to create comparison table
function createComparisonTable() {
  const headers = [i18nGet('compare.headers.feature','Feature'), ...comparisonList.map(p => p.title)];

  // Compute derived metrics
  const euroPerSqm = comparisonList.map(p => {
    const price = Number(p.priceNumber || 0);
    const size = Number(p.sizeNumber || 0);
    if (price > 0 && size > 0) return price / size;
    return null;
  });

  // Utility formatters
  const formatEuro = (n) => {
    if (!Number.isFinite(n)) return 'N/A';
    return '€' + Number(n).toLocaleString('en-US');
  };
  const formatEuroPerSqm = (n) => {
    if (!Number.isFinite(n)) return 'N/A';
    return '€' + Math.round(n).toLocaleString('en-US') + '/m²';
  };
  const formatSize = (n) => {
    if (!Number.isFinite(n)) return 'N/A';
    return Math.round(n) + ' m²';
  };
  const formatNumber = (n) => {
    if (n === null || typeof n === 'undefined' || n === '') return 'N/A';
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return String(num);
  };

  // Ranges/spreads (for summary rows)
  const numericPrices = comparisonList.map(p => Number(p.priceNumber || 0)).filter(v => v > 0);
  const numericSizes = comparisonList.map(p => Number(p.sizeNumber || 0)).filter(v => v > 0);
  const numericEurSqm = euroPerSqm.filter(v => Number.isFinite(v));
  const numBeds = comparisonList.map(p => Number(p.bedrooms)).filter(v => Number.isFinite(v));
  const numBaths = comparisonList.map(p => Number(p.bathrooms)).filter(v => Number.isFinite(v));

  const rangeRow = (label, arr, formatter) => {
    if (!arr.length) return [label, ...comparisonList.map(() => 'N/A')];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const spread = max - min;
    const spreadPct = min > 0 ? (spread / min) * 100 : null;
    const summary = spreadPct !== null ? `${formatter(min)} – ${formatter(max)} (Δ ${formatter(spread)}${Number.isFinite(spreadPct) ? `, ${spreadPct.toFixed(1)}%` : ''})` : `${formatter(min)} – ${formatter(max)} (Δ ${formatter(spread)})`;
    return [label, ...comparisonList.map((_, idx) => idx === 0 ? summary : '')];
  };

  const rows = [
    [i18nGet('compare.headers.image','Image'), ...comparisonList.map(p => `<img src="${p.image}" alt="${p.title}" class="comparison-modal-image">`)],
    [i18nGet('compare.headers.location','Location'), ...comparisonList.map(p => p.location)],
    [i18nGet('compare.headers.price','Price'), ...comparisonList.map(p => p.priceNumber ? formatEuro(p.priceNumber) : (p.price || ''))],
    ['€/m²', ...euroPerSqm.map(v => formatEuroPerSqm(v))],
    [i18nGet('compare.headers.size','Size'), ...comparisonList.map(p => p.sizeNumber ? formatSize(p.sizeNumber) : (p.size || ''))],
    [i18nGet('compare.headers.bedrooms','Bedrooms'), ...comparisonList.map(p => formatNumber(p.bedrooms))],
    [i18nGet('compare.headers.bathrooms','Bathrooms'), ...comparisonList.map(p => formatNumber(p.bathrooms))],
    // Summary rows
    rangeRow('Price range / spread', numericPrices, formatEuro),
    rangeRow('€/m² range / spread', numericEurSqm, formatEuroPerSqm),
    rangeRow('Size range / spread', numericSizes, formatSize),
    rangeRow('Bedrooms range', numBeds, (n)=>String(n)),
    rangeRow('Bathrooms range', numBaths, (n)=>String(n))
  ];

  let tableHTML = `
    <div class="comparison-table-container">
      <table class="comparison-table">
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach(row => {
    tableHTML += '<tr>';
    row.forEach((cell, index) => {
      if (index === 0) {
        tableHTML += `<td class="feature-label">${cell}</td>`;
      } else {
        tableHTML += `<td>${cell}</td>`;
      }
    });
    tableHTML += '</tr>';
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  return tableHTML;
}

// Function to close comparison modal
function closeComparisonModal() {
  const modal = document.getElementById('comparisonModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Function to show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Saved Searches Functionality
let savedSearches = [];

// Function to save current search
function saveSearch() {
  const modal = document.getElementById('saveSearchModal');
  if (!modal) return;
  
  // Pre-fill search name based on current filters
  const searchNameInput = document.getElementById('searchName');
  if (searchNameInput) {
    const currentFilters = getCurrentFilters();
    const searchName = generateSearchName(currentFilters);
    searchNameInput.value = searchName;
  }
  
  modal.style.display = 'block';
}

// Function to close save search modal
function closeSaveSearchModal() {
  const modal = document.getElementById('saveSearchModal');
  if (modal) modal.style.display = 'none';
}

// Function to close saved searches modal
function closeSavedSearchesModal() {
  const modal = document.getElementById('savedSearchesModal');
  if (modal) modal.style.display = 'none';
}

// Function to get current filters as an object
function getCurrentFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  const filters = {};
  
  // Get all filter parameters
  for (let [key, value] of urlParams.entries()) {
    if (key !== 'page') {
      if (filters[key]) {
        if (Array.isArray(filters[key])) {
          filters[key].push(value);
        } else {
          filters[key] = [filters[key], value];
        }
      } else {
        filters[key] = value;
      }
    }
  }
  
  return filters;
}

// Function to generate a search name based on filters
function generateSearchName(filters) {
  const parts = [];
  
  if (filters.country) parts.push(filters.country);
  if (filters.city) parts.push(filters.city);
  if (filters.type && filters.type.length > 0) {
    if (filters.type.length === 1) {
      parts.push(filters.type[0]);
    } else {
      parts.push(`${filters.type.length} types`);
    }
  }
  if (filters.bedrooms && filters.bedrooms.length > 0) {
    const maxBeds = Math.max(...filters.bedrooms.map(b => parseInt(b)));
    parts.push(`${maxBeds}+ bedroom`);
  }
  if (filters.min_price || filters.max_price) {
    if (filters.min_price && filters.max_price) {
      parts.push(`€${filters.min_price}-${filters.max_price}`);
    } else if (filters.min_price) {
      parts.push(`€${filters.min_price}+`);
    } else if (filters.max_price) {
      parts.push(`€${filters.max_price}-`);
    }
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Custom Search';
}

// Function to save search to localStorage
function saveSearchToStorage(searchName, description, emailAlerts) {
  const currentFilters = getCurrentFilters();
  const search = {
    id: Date.now(),
    name: searchName,
    description: description,
    filters: currentFilters,
    emailAlerts: emailAlerts,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  
  // Get existing searches
  const existing = localStorage.getItem('savedSearches');
  savedSearches = existing ? JSON.parse(existing) : [];
  
  // Add new search
  savedSearches.push(search);
  
  // Save to localStorage
  localStorage.setItem('savedSearches', savedSearches);
  
  showNotification(i18nGet('saved.savedOk','Search saved successfully!'), 'success');
  closeSaveSearchModal();
}

// Function to load saved searches
function loadSavedSearches() {
  const existing = localStorage.getItem('savedSearches');
  savedSearches = existing ? JSON.parse(existing) : [];
  return savedSearches;
}

// Function to apply saved search
function applySavedSearch(searchId) {
  const search = savedSearches.find(s => s.id === searchId);
  if (!search) return;
  
  // Update last used timestamp
  search.lastUsed = new Date().toISOString();
  localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
  
  // Build URL with saved filters
  const url = new URL('/properties', window.location.origin);
  
  Object.entries(search.filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });
  
  // Navigate to search results
  window.location.href = url.toString();
}

// Function to delete saved search
function deleteSavedSearch(searchId) {
  savedSearches = savedSearches.filter(s => s.id !== searchId);
  localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
  
  // Refresh the modal content
  showSavedSearchesModal();
  showNotification(i18nGet('saved.deletedOk','Search deleted successfully!'), 'info');
}

// Function to show saved searches modal
function showSavedSearchesModal() {
  const modal = document.getElementById('savedSearchesModal');
  const content = document.getElementById('savedSearchesContent');
  
  if (!modal || !content) return;
  
  const searches = loadSavedSearches();
  
  if (searches.length === 0) {
    content.innerHTML = `
      <div class="no-saved-searches">
        <div class="no-saved-searches-icon">🔍</div>
        <h4>${i18nGet('saved.noneTitle','No Saved Searches')}</h4>
        <p>${i18nGet('saved.noneHint','Save your property searches to quickly access them later.')}</p>
      </div>
    `;
  } else {
    content.innerHTML = searches.map(search => `
      <div class="saved-search-item">
        <div class="saved-search-info">
          <h4>${search.name}</h4>
          <p>${search.description || i18nGet('saved.noDescription','No description')}</p>
          <div class="saved-search-meta">
            <span>${i18nGet('saved.created','Created:')} ${new Date(search.createdAt).toLocaleDateString()}</span>
            <span>${i18nGet('saved.lastUsed','Last used:')} ${new Date(search.lastUsed).toLocaleDateString()}</span>
            ${search.emailAlerts ? `<span class="email-alert-badge">${i18nGet('saved.emailAlerts','Email Alerts')}</span>` : ''}
          </div>
        </div>
        <div class="saved-search-actions">
          <button class="btn btn-primary btn-sm" onclick="applySavedSearch(${search.id})">${i18nGet('saved.apply','Apply Search')}</button>
          <button class="btn btn-outline btn-sm" onclick="deleteSavedSearch(${search.id})">${i18nGet('saved.delete','Delete')}</button>
        </div>
      </div>
    `).join('');
  }
  
  modal.style.display = 'block';
}

// Initialize page functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Property list page initializing...');
  // Load localized strings for this page
  loadI18n();
  
  // Get locations data from the page if available
  const locationsData = document.getElementById('locations-data');
  if (locationsData) {
    try {
      const rawData = locationsData.getAttribute('data-locations') || '{}';
      LOCATIONS = JSON.parse(rawData);
      console.log('✅ Locations data loaded successfully:', LOCATIONS);
      console.log('📊 Available countries:', Object.keys(LOCATIONS));
    } catch (e) {
      console.error('❌ Could not parse locations data:', e);
      console.error('Raw data:', locationsData.getAttribute('data-locations'));
      LOCATIONS = {};
    }
  } else {
    console.warn('❌ Locations data element not found');
    LOCATIONS = {};
  }

  // Get location colors data from the page if available
  const locationColorsData = document.getElementById('location-colors-data');
  if (locationColorsData) {
    try {
      const raw = locationColorsData.getAttribute('data-location-colors') || '{}';
      LOCATION_COLORS = JSON.parse(raw);
      console.log('🎨 Location colors loaded:', LOCATION_COLORS);
    } catch (e) {
      console.error('❌ Could not parse location colors:', e);
      LOCATION_COLORS = {};
    }
  }
  
  // Validate locations data
  if (!LOCATIONS || typeof LOCATIONS !== 'object' || Object.keys(LOCATIONS).length === 0) {
    console.error('❌ Invalid or empty locations data:', LOCATIONS);
  } else {
    console.log('✅ Locations data validated successfully');
  }
  
  // Initialize cities dropdown
  console.log('🔍 Initializing cities dropdown...');
  updateCities();
  
  // Attach change listeners for location cascading without auto-applying filters
  const countrySelectEl = document.getElementById('filterCountry');
  const citySelectEl = document.getElementById('filterCity');
  if (countrySelectEl) {
    countrySelectEl.addEventListener('change', function() {
      updateCities();
    });
  }
  if (citySelectEl) {
    citySelectEl.addEventListener('change', function() {
      updateNeighborhoods();
    });
  }
  
  // Add event listeners for form submission
  const filtersForm = document.getElementById('filtersForm');
  if (filtersForm) {
    filtersForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateFilters();
    });
  }

  // Hide certain filter groups when only Land type is selected
  updateConditionalFilterVisibility();
  
  // Add event listener for save search form
  const saveSearchForm = document.getElementById('saveSearchForm');
  if (saveSearchForm) {
    saveSearchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const searchName = formData.get('searchName');
      const description = formData.get('searchDescription');
      const emailAlerts = formData.get('emailAlerts') === 'on';
      
      if (searchName.trim()) {
        saveSearchToStorage(searchName, description, emailAlerts);
      }
    });
  }
  
  // Remove auto-apply on checkbox change; apply only on explicit submit
  
  // Remove auto-apply on typing; users will click "Apply Filters"
  
  // Initialize filter state from URL
  initializeFilterState();
  
  // Load saved searches
  loadSavedSearches();

  // Initialize euro formatting for price inputs
  initializeEuroPriceInputs();

  // Apply country colors to property cards
  applyLocationColors();

  // Enable collapsible sections in filters
  initializeCollapsibles();

  // Close filters when clicking outside (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('filtersSidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) {
      const within = sidebar.contains(e.target) || e.target.closest('.mobile-filters-trigger');
      if (!within) toggleMobileFilters(false);
    }
  });

  // Delegate clicks on property cards and internal buttons to avoid inline handlers (CSP)
  const grid = document.getElementById('propertiesGrid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const btnCompare = e.target.closest('.btn-compare');
      if (btnCompare) {
        const card = e.target.closest('.property-card');
        if (card) {
          const id = card.getAttribute('data-property-id');
          if (id) compareProperty(id);
        }
        return;
      }
      const btnView = e.target.closest('.btn-view');
      if (btnView) {
        const card = e.target.closest('.property-card');
        const slug = card && card.getAttribute('data-slug');
        if (slug) window.location.href = `/properties/${slug}`;
        return;
      }
      const card = e.target.closest('.property-card');
      if (card) {
        const slug = card.getAttribute('data-slug');
        if (slug) window.location.href = `/properties/${slug}`;
      }
    });
  }

  // Wire compare panel buttons (CSP-safe)
  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      showComparisonModal();
    });
  }
  const clearComparisonBtn = document.getElementById('clearComparisonBtn');
  if (clearComparisonBtn) {
    clearComparisonBtn.addEventListener('click', () => {
      clearComparison();
    });
  }
  const comparisonModalClose = document.getElementById('comparisonModalClose');
  if (comparisonModalClose) {
    comparisonModalClose.addEventListener('click', () => {
      closeComparisonModal();
    });
  }

  // Mobile filters open/close (CSP-safe: no inline handlers)
  const openFiltersBtn = document.querySelector('.mobile-filters-trigger');
  if (openFiltersBtn) {
    openFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMobileFilters(true);
    });
  }
  const closeFiltersBtn = document.querySelector('.filters-close');
  if (closeFiltersBtn) {
    closeFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMobileFilters(false);
    });
  }
  const filtersOverlay = document.getElementById('filtersOverlay');
  if (filtersOverlay) {
    filtersOverlay.addEventListener('click', () => toggleMobileFilters(false));
  }
});

// Function to update filters from form inputs
function updateFilters() {
  const form = document.getElementById('filtersForm');
  if (!form) return;
  normalizePriceHiddenInputs();
  
  const formData = new FormData(form);
  const currentUrl = new URL(window.location);
  
  // Clear existing filter params
  const filterParams = ['country', 'city', 'neighborhood', 'type', 'min_price', 'max_price', 
                       'bedrooms', 'bathrooms', 'featured', 'new_listing', 'min_size', 'max_size',
                       'year_built_min', 'year_built_max', 'features', 'status'];
  filterParams.forEach(param => currentUrl.searchParams.delete(param));
  
  // Add new filter params
  for (let [key, value] of formData.entries()) {
    if (value && value.trim() !== '') {
      if (key === 'type' || key === 'bedrooms' || key === 'features' || key === 'status') {
        currentUrl.searchParams.append(key, value);
      } else {
        currentUrl.searchParams.set(key, value);
      }
    }
  }
  
  // Reset to page 1 when updating filters
  currentUrl.searchParams.delete('page');
  
  window.location.href = currentUrl.toString();
}

function updateConditionalFilterVisibility() {
  const typeChecks = document.querySelectorAll('input[name="type"]');
  const urlParams = new URLSearchParams(window.location.search);
  const urlTypes = urlParams.getAll('type').map(t => String(t).toLowerCase());
  const urlOnlyLand = urlTypes.length > 0 && urlTypes.every(t => t === 'land');
  const checks = Array.from(typeChecks);
  const someChecked = checks.some(cb => cb.checked);
  const checkedOnlyLand = someChecked && checks.every(cb => (cb.checked ? cb.value.toLowerCase() === 'land' : true));
  const isOnlyLand = checkedOnlyLand || urlOnlyLand;

  const groupsToToggle = [
    '[data-filter-group="bedrooms"]',
    '[data-filter-group="bathrooms"]',
    '[data-filter-group="year_built"]',
    '[data-filter-group="features"]'
  ];
  groupsToToggle.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.display = isOnlyLand ? 'none' : '';
    });
  });

  // Attach listeners to type checkboxes to react to changes
  typeChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      updateConditionalFilterVisibility();
    });
  });
}

// Ensure hidden numeric fields are synced before submit/navigation
function normalizePriceHiddenInputs() {
  const minText = document.getElementById('minPrice');
  const maxText = document.getElementById('maxPrice');
  const minHidden = document.getElementById('minPriceHidden');
  const maxHidden = document.getElementById('maxPriceHidden');
  if (minText && minHidden) {
    const n = parseEuroToNumber(minText.value);
    minHidden.value = Number.isFinite(n) ? n : '';
  }
  if (maxText && maxHidden) {
    const n = parseEuroToNumber(maxText.value);
    maxHidden.value = Number.isFinite(n) ? n : '';
  }
}

function initializeEuroPriceInputs() {
  const minText = document.getElementById('minPrice');
  const maxText = document.getElementById('maxPrice');
  const minHidden = document.getElementById('minPriceHidden');
  const maxHidden = document.getElementById('maxPriceHidden');

  [
    { text: minText, hidden: minHidden },
    { text: maxText, hidden: maxHidden }
  ].forEach(pair => {
    if (!pair.text || !pair.hidden) return;

    // Format any prefilled value
    if (pair.hidden.value) {
      const n = parseFloat(pair.hidden.value);
      pair.text.value = isFinite(n) && n >= 0 ? formatEuro(n) : '';
    }

    pair.text.addEventListener('input', () => {
      // Allow only digits; strip all non-digits
      const digits = pair.text.value.replace(/\D+/g, '');
      if (digits.length === 0) {
        pair.text.value = '';
        pair.hidden.value = '';
        return;
      }
      const num = parseInt(digits, 10);
      pair.hidden.value = Number.isFinite(num) ? String(num) : '';
      // Do not reformat on each keystroke to avoid cursor jumps
    });

    pair.text.addEventListener('blur', () => {
      // On blur, format nicely with separators
      const n = parseEuroToNumber(pair.text.value);
      pair.text.value = Number.isFinite(n) ? formatEuro(n) : '';
      pair.hidden.value = Number.isFinite(n) ? String(n) : '';
    });
  });
}

function parseEuroToNumber(value) {
  if (!value) return NaN;
  // Remove currency symbols, spaces, and separators
  const digits = String(value).replace(/[^0-9]/g, '');
  if (!digits) return NaN;
  return parseInt(digits, 10);
}

function formatEuro(number) {
  try {
    return `€${Number(number).toLocaleString('en-US')}`;
  } catch (_) {
    return `€${number}`;
  }
}

// Function to initialize filter state from URL parameters
function initializeFilterState() {
  console.log('🔍 Initializing filter state from URL parameters...');
  
  const urlParams = new URLSearchParams(window.location.search);
  
  // Set country and update cities/neighborhoods
  const country = urlParams.get('country');
  if (country) {
    console.log('🌍 Setting country from URL:', country);
    const countrySelect = document.getElementById('filterCountry');
    if (countrySelect) {
      countrySelect.value = country;
      console.log('✅ Country set, updating cities...');
      
      // Update cities first
      updateCities();
      
      // Set city if available (with a small delay to ensure cities are populated)
      const city = urlParams.get('city');
      if (city) {
        console.log('🏙️ Setting city from URL:', city);
        setTimeout(() => {
          const citySelect = document.getElementById('filterCity');
          if (citySelect) {
            citySelect.value = city;
            console.log('✅ City set, updating neighborhoods...');
            
            // Update neighborhoods
            updateNeighborhoods();
            
            // Set neighborhood if available (with a small delay to ensure neighborhoods are populated)
            const neighborhood = urlParams.get('neighborhood');
            if (neighborhood) {
              console.log('🏘️ Setting neighborhood from URL:', neighborhood);
              setTimeout(() => {
                const neighborhoodSelect = document.getElementById('filterNeighborhood');
                if (neighborhoodSelect) {
                  neighborhoodSelect.value = neighborhood;
                  console.log('✅ Neighborhood set successfully');
                } else {
                  console.warn('❌ Neighborhood select element not found');
                }
              }, 150); // Increased delay for neighborhoods
            }
          } else {
            console.warn('❌ City select element not found');
          }
        }, 100); // Delay for cities
      }
    } else {
      console.warn('❌ Country select element not found');
    }
  }
  
  // Set other filter values
  const yearBuiltMin = urlParams.get('year_built_min');
  const yearBuiltMax = urlParams.get('year_built_max');
  
  if (yearBuiltMin) {
    const yearBuiltMinInput = document.getElementById('yearBuiltMin');
    if (yearBuiltMinInput) yearBuiltMinInput.value = yearBuiltMin;
  }
  
  if (yearBuiltMax) {
    const yearBuiltMaxInput = document.getElementById('yearBuiltMax');
    if (yearBuiltMaxInput) yearBuiltMaxInput.value = yearBuiltMax;
  }
  
  console.log('✅ Filter state initialization complete');
}
