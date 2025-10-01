// Home Page JavaScript
// Lightweight i18n loader for Home
let HOME_I18N = {};
function loadHomeI18n() {
  try {
    const el = document.getElementById('i18n-home');
    if (!el) return;
    HOME_I18N = JSON.parse(el.getAttribute('data-i18n') || '{}');
  } catch (_) { /* no-op */ }
}
function hGet(path, fallback) {
  try {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), HOME_I18N) ?? fallback;
  } catch (_) { return fallback; }
}

document.addEventListener('DOMContentLoaded', function() {
  try { if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; } } catch (_) {}
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  // Minimal logging in production
  loadHomeI18n();
  
  // Get locations data from the page
  window.locations = {};
  
  // Load locations data from data attribute
  const locationsData = document.getElementById('locations-data');
  if (locationsData) {
    try {
      window.locations = JSON.parse(locationsData.getAttribute('data-locations') || '{}');
    } catch (_) { window.locations = {}; }
  }

  // Validate locations data structure
  if (!window.locations || typeof window.locations !== 'object' || Object.keys(window.locations).length === 0) {
    console.error('❌ Invalid or empty locations data:', window.locations);
    return;
  }

  // Initialize city dropdown functionality
  // Lightweight init first
  initializeCityDropdown();
  // Header shrink on scroll (transparent to solid)
  const header = document.querySelector('.site-header');
  function updateHeader() {
    if (!header) return;
    const threshold = 40;
    if (window.scrollY > threshold) header.classList.add('shrink'); else header.classList.remove('shrink');
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Defer non-critical work
  const idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
  idle(() => {
    // Load featured properties after first paint
    loadFeaturedProperties();
    // Initialize simple carousels
    initCardsCarousel('#featuredCarousel');
    initCardsCarousel('#testimonialsCarousel');
    // Lazy-init International carousel when visible
    const intl = document.getElementById('intlCarousel');
    if (intl && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          initStretchCarousel('#intlCarousel');
          io.disconnect();
        }
      }, { rootMargin: '0px 0px -20% 0px' });
      io.observe(intl);
    } else {
      initStretchCarousel('#intlCarousel');
    }
    // Mobile hero slideshow (single panel rotates every 5s)
    initMobileHeroSlideshow();
    // Init Recommended Project slider if present
    initRecommendedProject();
    // Initialize search form
    initializeSearchForm();
    // Bind mortgage calculator
    const form = document.getElementById('mortgageForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateMortgage();
      });
    }
  });
});

// Ensure top on back/forward cache restore as well
window.addEventListener('pageshow', function (e) {
  if (e.persisted) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
});

// Initialize city dropdown functionality
function initializeCityDropdown() {
  // dropdown init
  
  const countrySelect = document.getElementById('country');
  const citySelect = document.getElementById('city');
  const neighborhoodSelect = document.getElementById('neighborhood');
  
  
  if (!countrySelect || !citySelect || !neighborhoodSelect) {
    console.error('❌ One or more dropdown elements not found');
    return;
  }
  
  // Verify locations data structure
  
  // Set initial state - city and neighborhood should be disabled initially
  citySelect.disabled = true;
  neighborhoodSelect.disabled = true;
  
  // Keep default as "Any country"; do not auto-select the first country
  
  // Initialize city dropdown when country changes
  countrySelect.addEventListener('change', function() {
    const selectedCountry = this.value;
    
    // Reset city and neighborhood dropdowns
    citySelect.innerHTML = '<option value="">Any City</option>';
    neighborhoodSelect.innerHTML = '<option value="">Any Neighborhood</option>';
    
    if (selectedCountry && window.locations[selectedCountry]) {
      const cities = Object.keys(window.locations[selectedCountry]);
      
      // Populate cities
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
      citySelect.disabled = false;
      neighborhoodSelect.disabled = true; // Keep neighborhood disabled until city is selected
      
      // Add a default city selection to trigger the neighborhood dropdown
      // Do not auto-select a city to avoid work
    } else {
      citySelect.disabled = true;
      neighborhoodSelect.disabled = true;
    }
  });
  
  // Initialize neighborhood dropdown when city changes
  citySelect.addEventListener('change', function() {
    const selectedCountry = countrySelect.value;
    const selectedCity = this.value;
    
    // Reset neighborhood dropdown
    neighborhoodSelect.innerHTML = '<option value="">Any Neighborhood</option>';
    
    if (selectedCity && window.locations[selectedCountry] && window.locations[selectedCountry][selectedCity]) {
      const neighborhoods = window.locations[selectedCountry][selectedCity];
      console.log('🏘️ Available neighborhoods:', neighborhoods);
      
      // Populate neighborhoods
      neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.value = neighborhood;
        option.textContent = neighborhood;
        neighborhoodSelect.appendChild(option);
      });
      neighborhoodSelect.disabled = false;
    } else {
      neighborhoodSelect.disabled = true;
    }
  });
  
  console.log('✅ Dropdown initialization complete');
  console.log('🎯 Event listeners attached to country and city dropdowns');
}

// Add test function for debugging
function testDropdowns() {
  console.log('🧪 Testing dropdowns...');
  
  const countrySelect = document.getElementById('country');
  const citySelect = document.getElementById('city');
  const neighborhoodSelect = document.getElementById('neighborhood');
  
  console.log('🔍 Dropdown elements found:', {
    country: countrySelect ? countrySelect.value : 'Not found',
    city: citySelect ? citySelect.value : 'Not found',
    neighborhood: neighborhoodSelect ? neighborhoodSelect.value : 'Not found'
  });
  
  console.log('🔍 Dropdown states:', {
    countryDisabled: countrySelect ? countrySelect.disabled : 'N/A',
    cityDisabled: citySelect ? citySelect.disabled : 'N/A',
    neighborhoodDisabled: neighborhoodSelect ? neighborhoodSelect.disabled : 'N/A'
  });
  
  console.log('🔍 Dropdown options:', {
    countryOptions: countrySelect ? countrySelect.options.length : 'N/A',
    cityOptions: citySelect ? citySelect.options.length : 'N/A',
    neighborhoodOptions: neighborhoodSelect ? neighborhoodSelect.options.length : 'N/A'
  });
  
  console.log('🔍 Locations data available:', window.locations);
  
  // Try to manually populate city dropdown
  if (countrySelect && countrySelect.value && window.locations[countrySelect.value]) {
    console.log('🧪 Manually populating city dropdown...');
    const cities = Object.keys(window.locations[countrySelect.value]);
    citySelect.innerHTML = '<option value="">Any City</option>';
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
    citySelect.disabled = false;
    console.log('✅ City dropdown populated with', cities.length, 'cities');
  }
}

// Load featured properties
async function loadFeaturedProperties() {
  const featuredContainer = document.getElementById('featuredProperties');
  const featuredSection = document.querySelector('.section.featured');
  const featuredCarousel = document.getElementById('featuredCarousel');
  if (!featuredContainer || !featuredSection) return;
  // Hide section until we confirm we have enough items
  featuredSection.style.display = 'none';
  
  try {
    // Show loading state
    featuredContainer.innerHTML = `
      <div class="property-card loading-placeholder">
        <div class="property-image"></div>
        <div class="property-content">
          <div class="property-title"></div>
          <div class="property-location"></div>
          <div class="property-price"></div>
        </div>
      </div>
      <div class="property-card loading-placeholder">
        <div class="property-image"></div>
        <div class="property-content">
          <div class="property-title"></div>
          <div class="property-location"></div>
          <div class="property-price"></div>
        </div>
      </div>
      <div class="property-card loading-placeholder">
        <div class="property-image"></div>
        <div class="property-content">
          <div class="property-title"></div>
          <div class="property-location"></div>
          <div class="property-price"></div>
        </div>
      </div>
    `;
    
    // Fetch featured properties from API (mounted at /properties)
    const response = await fetch('/properties/api/featured');
    if (!response.ok) {
      throw new Error('Failed to fetch featured properties');
    }
    
    const properties = await response.json();
    
    // Require at least 4 properties to show the section
    if (properties.length >= 4) {
      featuredSection.style.display = '';
      featuredContainer.innerHTML = properties.map(property => {
        const size = property.size ? `${property.size} m²` : null;
        const beds = Number.isFinite(property.bedrooms) && property.bedrooms !== null ? `${property.bedrooms}` : null;
        const baths = Number.isFinite(property.bathrooms) && property.bathrooms !== null ? `${property.bathrooms}` : null;
        const priceText = property.price ? formatEuro(property.price) : '';
        return `
        <article class="property-card">
          <div class="img-wrap" ${priceText ? `data-price="${priceText}"` : ''}>
            <img src="${property.photos && property.photos[0] ? property.photos[0] : '/img/property-placeholder.jpg'}" alt="${property.title}" loading="lazy" onerror="this.src='/img/property-placeholder.jpg'">
          </div>
          <div class="meta">
            <div class="title">${property.title}</div>
            ${priceText ? `<div class="price">${priceText}</div>` : ''}
            <div class="location">${property.city}, ${property.country}</div>
            <div class="features-row">
              ${size ? `
              <div class="feature">
                <span class="icon icon-16 icon-inline icon-mask icon-size"></span>
                <span>${size}</span>
              </div>` : ''}
              ${beds ? `
              <div class="feature">
                <span class="icon icon-16 icon-inline icon-mask icon-bed"></span>
                <span>${beds} bed${Number(beds) === 1 ? '' : 's'}</span>
              </div>` : ''}
              ${baths ? `
              <div class="feature">
                <span class="icon icon-16 icon-inline icon-mask icon-bath"></span>
                <span>${baths} bath${Number(baths) === 1 ? '' : 's'}</span>
              </div>` : ''}
            </div>
            <a class="learn-more" href="/properties/${property.slug}">Learn more →</a>
          </div>
        </article>`;
      }).join('');

      // Mark center card
      markCenterCard(featuredContainer);
      // Trigger a resize to force spacer recomputation in carousels
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
      // Explicitly center the second card after layout settles
      const track = featuredCarousel?.querySelector('.cards-track');
      if (track) {
        requestAnimationFrame(() => {
          const cards = [...track.querySelectorAll('.property-card:not(.loading-placeholder)')];
          if (cards.length >= 2) {
            const card = cards[1];
            const target = card.offsetLeft + (card.offsetWidth / 2) - (track.clientWidth / 2);
            const max = Math.max(0, track.scrollWidth - track.clientWidth);
            const clamped = Math.max(0, Math.min(target, max));
            track.scrollTo({ left: clamped, behavior: 'auto' });
            markCenterCard(track);
          }
        });
      }
    } else {
      // Keep the entire section hidden if fewer than 4
      featuredSection.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading featured properties:', error);
    // Hide the section on error to avoid layout gaps
    if (featuredSection) featuredSection.style.display = 'none';
  }
}

// Initialize search form
function initializeSearchForm() {
  const searchForm = document.querySelector('.search-form');
  if (!searchForm) {
    console.warn('❌ Search form not found');
    return;
  }
  
  console.log('🔍 Initializing search form...');
  
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('🔍 Search form submitted');
    
    const formData = new FormData(this);
    const searchParams = new URLSearchParams();
    
    // Build search query
    for (let [key, value] of formData.entries()) {
      if (value && value.trim() !== '') {
        searchParams.append(key, value);
        console.log(`🔍 Adding search parameter: ${key} = ${value}`);
      }
    }
    
    // Redirect to properties page with search parameters
    const searchUrl = `/properties?${searchParams.toString()}`;
    console.log('🔍 Redirecting to:', searchUrl);
    window.location.href = searchUrl;
  });
  
  console.log('✅ Search form initialized');
}

// Format price with commas
function formatPrice(price) {
  if (!price) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Removed parallax transform to avoid initial scroll nudge on load

// Add intersection observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
    }
  });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
  const animatedElements = document.querySelectorAll('.service-card, .property-card');
  animatedElements.forEach(el => observer.observe(el));
});

// Mortgage Calculator Functions
function parseEuro(value) {
  if (value === undefined || value === null) return 0;
  // Strip ALL non-digits (handles . , spaces, NBSP, currency symbol)
  const digitsOnly = value.toString().replace(/[^0-9]/g, '');
  const n = parseInt(digitsOnly, 10);
  return isNaN(n) ? 0 : n;
}

function formatEuro(value) {
  try {
    // Detect locale from <html lang="...">
    const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    const map = { en: 'en-US', es: 'es-ES', de: 'de-DE' };
    const locale = map[lang] || 'en-US';
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    return formatter.format(Math.max(0, Math.round(value)));
  } catch (_) {
    return `€${formatPrice(Math.max(0, Math.round(value)))}`;
  }
}

function calculateMortgage() {
  const propertyPrice = parseEuro(document.getElementById('propertyPrice').value);
  const downPayment = parseEuro(document.getElementById('downPayment').value);
  const loanTerm = parseInt(document.getElementById('loanTerm').value) || 30;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
  
  if (propertyPrice <= 0 || downPayment < 0 || interestRate <= 0) {
    alert(hGet('calc.errors.invalid','Please enter valid values for all fields.'));
    return;
  }
  
  if (downPayment >= propertyPrice) {
    alert(hGet('calc.errors.downTooHigh','Down payment cannot be greater than or equal to property price.'));
    return;
  }
  
  const loanAmount = propertyPrice - downPayment;
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  
  // Calculate monthly payment using the mortgage formula
  let monthlyPayment = 0;
  if (monthlyInterestRate > 0) {
    monthlyPayment = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
                     (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  }
  
  // Calculate total interest and cost
  const totalInterest = (monthlyPayment * numberOfPayments) - loanAmount;
  const totalCost = monthlyPayment * numberOfPayments;
  
  // Estimate property tax (typically 1-2% of property value annually)
  const annualPropertyTax = propertyPrice * 0.015; // 1.5% estimate
  const monthlyPropertyTax = annualPropertyTax / 12;
  
  // Estimate insurance (typically 0.5-1% of property value annually)
  const annualInsurance = propertyPrice * 0.0075; // 0.75% estimate
  const monthlyInsurance = annualInsurance / 12;
  
  const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + monthlyInsurance;
  
  // Display results
  document.getElementById('monthlyPayment').textContent = formatEuro(monthlyPayment);
  document.getElementById('propertyTax').textContent = formatEuro(monthlyPropertyTax);
  document.getElementById('insurance').textContent = formatEuro(monthlyInsurance);
  document.getElementById('totalPayment').textContent = formatEuro(totalMonthlyPayment);

  document.getElementById('loanAmount').textContent = formatEuro(loanAmount);
  document.getElementById('totalInterest').textContent = formatEuro(totalInterest);
  document.getElementById('totalCost').textContent = formatEuro(totalCost);
  
  // Show results
  const resultsEl = document.getElementById('calculatorResults');
  const containerEl = resultsEl?.closest('.calculator-container');
  if (resultsEl) resultsEl.style.display = 'block';
  if (containerEl) containerEl.classList.add('has-results');
  
  // Scroll to results
  document.getElementById('calculatorResults').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

// ===== New: simple carousel helpers =====
function initCardsCarousel(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const track = root.querySelector('.cards-track');
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const getCards = () => [...track.querySelectorAll('.property-card, .testimonial-card')];
  const isFeatured = root.id === 'featuredCarousel';
  let didInitialCenter = false;

  function trackCenterX() {
    const r = track.getBoundingClientRect();
    return r.left + r.width / 2;
  }

  function centerCardByIndex(i) {
    const cards = getCards();
    if (!cards.length) return;
    const idx = Math.max(0, Math.min(cards.length - 1, i));
    const card = cards[idx];
    const target = card.offsetLeft + (card.offsetWidth / 2) - (track.clientWidth / 2);
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const clamped = Math.max(0, Math.min(target, max));
    track.scrollTo({ left: clamped, behavior: 'smooth' });
  }

  function currentCenteredIndex() {
    const cards = getCards();
    if (!cards.length) return 0;
    const center = track.scrollLeft + track.clientWidth / 2;
    let min = Infinity, best = 0;
    cards.forEach((c, i) => {
      const cx = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cx - center);
      if (d < min) { min = d; best = i; }
    });
    return best;
  }

  // Allow first/last card to be centered by adding dynamic side padding
  // Hide native scrollbar (visual only)
  track.classList.add('no-scrollbar');
  if (!document.getElementById('no-scrollbar-style')) {
    const style = document.createElement('style');
    style.id = 'no-scrollbar-style';
    style.textContent = `.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
  }

  // Create spacer elements so first/last items can be centered without clipping
  function ensureSpacers() {
    const cards = getCards();
    const first = cards[0];
    if (!first) return;
    let leftSpacer = track.querySelector('.edge-spacer.left');
    let rightSpacer = track.querySelector('.edge-spacer.right');
    if (!leftSpacer) {
      leftSpacer = document.createElement('div');
      leftSpacer.className = 'edge-spacer left';
      track.insertBefore(leftSpacer, track.firstChild);
    }
    if (!rightSpacer) {
      rightSpacer = document.createElement('div');
      rightSpacer.className = 'edge-spacer right';
      track.appendChild(rightSpacer);
    }
    const styles = window.getComputedStyle(track);
    const gapPx = parseFloat(styles.gap || styles.columnGap || '0') || 0;
    const gutter = Math.max(0, (track.clientWidth - first.offsetWidth) / 2 - (gapPx / 2));
    leftSpacer.style.flex = '0 0 ' + gutter + 'px';
    rightSpacer.style.flex = '0 0 ' + gutter + 'px';
  }

  ensureSpacers();
  window.addEventListener('resize', ensureSpacers);

  // Recompute spacers when children change (after async content loads)
  const mo = new MutationObserver(() => {
    requestAnimationFrame(() => {
      ensureSpacers();
      if (isFeatured && !didInitialCenter) {
        const cards = getCards();
        if (cards.length >= 2) { centerCardByIndex(1); didInitialCenter = true; }
      }
      markCenterCard(track);
    });
  });
  mo.observe(track, { childList: true });

  prev?.addEventListener('click', () => {
    const i = currentCenteredIndex();
    centerCardByIndex(i - 1);
  });
  next?.addEventListener('click', () => {
    const i = currentCenteredIndex();
    centerCardByIndex(i + 1);
  });

  // Keep center highlight in sync on scroll
  track?.addEventListener('scroll', () => markCenterCard(track));

  // Center card on click
  track?.addEventListener('click', (e) => {
    const card = e.target.closest('.property-card, .testimonial-card');
    if (!card || !track.contains(card)) return;
    const i = getCards().indexOf(card);
    if (i >= 0) centerCardByIndex(i);
  });

  // Initial center mark
  setTimeout(() => {
    ensureSpacers();
    if (isFeatured && !didInitialCenter) {
      const cards = getCards();
      if (cards.length >= 2) { centerCardByIndex(1); didInitialCenter = true; }
    }
    markCenterCard(track);
  }, 0);
}

function markCenterCard(container) {
  const cards = [...container.querySelectorAll('.property-card, .testimonial-card')];
  if (!cards.length) return;
  const center = container.scrollLeft + container.clientWidth / 2;
  let closest = null, minDist = Infinity;
  cards.forEach(card => {
    const cx = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cx - center);
    if (dist < minDist) { minDist = dist; closest = card; }
    card.classList.remove('is-center');
  });
  closest?.classList.add('is-center');
}

function initStretchCarousel(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const track = root.querySelector('.stretch-track');
  const cards = [...track.querySelectorAll('.stretch-card')];
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  let idx = cards.findIndex(c => c.classList.contains('is-focused'));
  if (idx < 0) idx = 1;

  function setFocused(i) {
    cards.forEach((c, j) => c.classList.toggle('is-focused', j === i));
    // Ensure focused card scrolls into view on narrow screens
    cards[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  setFocused(idx);
  prev?.addEventListener('click', () => { idx = (idx - 1 + cards.length) % cards.length; setFocused(idx); });
  next?.addEventListener('click', () => { idx = (idx + 1) % cards.length; setFocused(idx); });
  cards.forEach((c, j) => c.addEventListener('click', () => { idx = j; setFocused(idx); }));
}

// Recommended Project slider
function initRecommendedProject() {
  const hero = document.querySelector('.project-hero');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('.slide')];
  if (slides.length <= 1) return; // nothing to rotate
  const prev = hero.querySelector('.ctrl.prev');
  const next = hero.querySelector('.ctrl.next');
  let idx = 0;

  function apply(i) {
    slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
  }

  function go(delta) {
    idx = (idx + delta + slides.length) % slides.length;
    apply(idx);
  }

  // Manual controls only (auto-rotate disabled)
  prev && prev.addEventListener('click', () => { go(-1); });
  next && next.addEventListener('click', () => { go(1); });

  // Parallax on scroll (subtle)
  let raf = null;
  const maxShift = 120; // px — stronger parallax
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // progress: 0 at middle, negative above, positive below
      const center = rect.top + rect.height / 2 - vh / 2;
      const norm = Math.max(-1, Math.min(1, center / (vh / 2)));
      const shift = -norm * maxShift;
      const active = hero.querySelector('.slide.is-active');
      if (active) active.style.transform = `translateY(${shift}px) scale(1.08)`;
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initMobileHeroSlideshow() {
  const mq = window.matchMedia('(max-width: 560px)');
  const hero = document.querySelector('.hero-panels');
  if (!hero) return;
  const panels = [...hero.querySelectorAll('.panel')];
  if (!panels.length) return;

  let timer = null;
  let idx = 0;

  function applyState() {
    panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
  }

  function start() {
    stop();
    if (!mq.matches) {
      // desktop: ensure all panels visible and stacked side-by-side
      panels.forEach(p => p.classList.remove('is-active'));
      return;
    }
    idx = 0; applyState();
    timer = setInterval(() => { idx = (idx + 1) % panels.length; applyState(); }, 5000);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  mq.addEventListener ? mq.addEventListener('change', start) : mq.addListener(start);
  start();
}

// Add input validation for calculator
document.addEventListener('DOMContentLoaded', function() {
  const priceInput = document.getElementById('propertyPrice');
  const downInput = document.getElementById('downPayment');
  const rateInput = document.getElementById('interestRate');

  function sanitizeToDigits(input) {
    const caret = input.selectionStart;
    const numeric = input.value.replace(/[^0-9]/g, '');
    input.value = numeric;
    try { input.setSelectionRange(caret, caret); } catch (_) {}
  }

  function reformatEuroOnBlur(input) {
    const value = parseEuro(input.value);
    input.value = value ? formatEuro(value) : '';
  }

  if (priceInput) {
    priceInput.addEventListener('input', () => sanitizeToDigits(priceInput));
    priceInput.addEventListener('blur', () => reformatEuroOnBlur(priceInput));
    priceInput.addEventListener('focus', () => { const v = parseEuro(priceInput.value); priceInput.value = v ? String(v) : ''; });
  }
  if (downInput) {
    downInput.addEventListener('input', () => sanitizeToDigits(downInput));
    downInput.addEventListener('blur', () => {
      // clamp to property price
      const price = parseEuro(priceInput?.value || 0);
      let down = parseEuro(downInput.value);
      if (down > price) down = price;
      downInput.value = down ? formatEuro(down) : '';
    });
    downInput.addEventListener('focus', () => { const v = parseEuro(downInput.value); downInput.value = v ? String(v) : ''; });
  }
  if (rateInput) {
    rateInput.addEventListener('input', function() {
      const value = parseFloat(this.value);
      const min = 0;
      const max = 25;
      if (!isNaN(value)) {
        if (value < min) this.value = String(min);
        if (value > max) this.value = String(max);
      }
    });
  }
});

// ========================================
// SOCIAL MEDIA BAR FUNCTIONALITY
// ========================================

function initSocialMediaBar() {
  const socialBar = document.getElementById('socialBar');
  if (!socialBar) return;

  // Add scroll-based visibility
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateSocialBarVisibility() {
    const currentScrollY = window.scrollY;
    const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
    const isMobile = window.innerWidth <= 768;
    
    // Hide when scrolling down, show when scrolling up
    if (scrollDirection === 'down' && currentScrollY > 200) {
      if (isMobile) {
        socialBar.style.transform = 'translateX(-50%) translateY(100px)';
      } else {
        socialBar.style.transform = 'translateY(-50%) translateX(100px)';
      }
      socialBar.style.opacity = '0';
    } else {
      if (isMobile) {
        socialBar.style.transform = 'translateX(-50%) translateY(0)';
      } else {
        socialBar.style.transform = 'translateY(-50%) translateX(0)';
      }
      socialBar.style.opacity = '0.9';
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateSocialBarVisibility);
      ticking = true;
    }
  }

  // Listen for scroll events
  window.addEventListener('scroll', requestTick, { passive: true });

  // Add click tracking for analytics (if needed)
  const socialLinks = socialBar.querySelectorAll('.social-link');
  socialLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const platform = this.classList[1]; // facebook, instagram, etc.
      console.log(`Social media click: ${platform}`);
      
      // You can add analytics tracking here
      // gtag('event', 'social_click', { platform: platform });
    });
  });

  // Add hover effects for better UX
  socialBar.addEventListener('mouseenter', function() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.style.transform = 'translateX(-50%) scale(1.05)';
    } else {
      this.style.transform = 'translateY(-50%) scale(1.05)';
    }
    this.style.opacity = '1';
  });

  socialBar.addEventListener('mouseleave', function() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.style.transform = 'translateX(-50%) scale(1)';
    } else {
      this.style.transform = 'translateY(-50%) scale(1)';
    }
    this.style.opacity = '0.9';
  });
}

// Initialize social media bar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initSocialMediaBar();
});
