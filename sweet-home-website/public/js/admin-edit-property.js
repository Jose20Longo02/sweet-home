// JS for views/properties/edit-property.ejs extracted to satisfy CSP
document.addEventListener('DOMContentLoaded', function () {
  const dataNode = document.getElementById('np-data');
  let LOCATIONS = {};
  try { LOCATIONS = JSON.parse(dataNode.getAttribute('data-locations') || '{}'); } catch(_) { LOCATIONS = {}; }
  const defaultCity = dataNode.getAttribute('data-default-city') || '';
  const defaultHood = dataNode.getAttribute('data-default-hood') || '';

  const countrySel = document.getElementById('country');
  const citySel = document.getElementById('city');
  const hoodSel = document.getElementById('neighborhood');
  const typeSel = document.getElementById('type');
  const isInProject = document.getElementById('is_in_project');
  const projectWrap = document.getElementById('projectWrap');
  const projectSelect = document.getElementById('project_id');

  function fillCities() {
    const cities = Object.keys((LOCATIONS[countrySel.value]||{}));
    citySel.innerHTML = '<option value="">Select city</option>';
    cities.forEach(ct => {
      const opt = document.createElement('option');
      opt.value = ct; opt.textContent = ct;
      if (defaultCity === ct) opt.selected = true;
      citySel.appendChild(opt);
    });
    citySel.disabled = cities.length === 0;
    fillNeighborhoods();
  }
  function fillNeighborhoods() {
    const hoods = ((LOCATIONS[countrySel.value]||{}))[citySel.value] || [];
    hoodSel.innerHTML = '<option value="">Select neighborhood (optional)</option>';
    hoods.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      if (defaultHood === h) opt.selected = true;
      hoodSel.appendChild(opt);
    });
    hoodSel.disabled = hoods.length === 0;
  }

  function updateTypeBlocks() {
    const t = typeSel.value;
    const blocks = [
      { id: 'typeApartment', active: t === 'Apartment' },
      { id: 'typeHouseVilla', active: t === 'House' || t === 'Villa' },
      { id: 'typeLand', active: t === 'Land' }
    ];
    blocks.forEach(({ id, active }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = !active;
      el.querySelectorAll('input, select, textarea').forEach(ctrl => { ctrl.disabled = !active; });
    });

    const apt = t === 'Apartment';
    const hv  = t === 'House' || t === 'Villa';
    const land= t === 'Land';

    const aptSize = document.getElementById('apartment_size');
    const bedA = document.getElementById('bedrooms_a');
    const bathA = document.getElementById('bathrooms_a');
    if (aptSize) aptSize.required = apt;
    if (bedA) bedA.required = apt;
    if (bathA) bathA.required = apt;

    const totalSize = document.getElementById('total_size');
    const bedHV = document.getElementById('bedrooms_hv');
    const bathHV = document.getElementById('bathrooms_hv');
    if (totalSize) totalSize.required = hv;
    if (bedHV) bedHV.required = hv;
    if (bathHV) bathHV.required = hv;

    const landSize = document.getElementById('land_size');
    if (landSize) landSize.required = land;
  }

  function updateProjectVisibility() {
    const on = !!isInProject.checked;
    projectWrap.hidden = !on;
    projectSelect.required = on;
    projectSelect.disabled = !on;
    if (!on) projectSelect.value = '';
  }

  countrySel.addEventListener('change', fillCities);
  citySel.addEventListener('change', fillNeighborhoods);
  typeSel.addEventListener('change', updateTypeBlocks);
  isInProject.addEventListener('change', updateProjectVisibility);

  // Initialize selects based on current values
  (function initSelections(){
    fillCities();
    if (defaultCity) citySel.value = defaultCity;
    fillNeighborhoods();
  })();
  updateTypeBlocks();
  updateProjectVisibility();

  // Hide features section for Land type
  function updateFeaturesVisibility() {
    const t = (typeSel.value || '').toLowerCase();
    const sec = document.getElementById('featuresSection');
    if (sec) {
      const hide = (t === 'land');
      sec.hidden = hide;
      sec.querySelectorAll('input[type="checkbox"][name="features"]').forEach(i => { i.disabled = hide; });
    }
  }
  updateFeaturesVisibility();
  typeSel.addEventListener('change', updateFeaturesVisibility);

  // Year built visibility for land
  function updateYearBuiltVisibility() {
    const t = (typeSel.value || '').toLowerCase();
    const wrap = document.getElementById('yearBuiltField');
    const input = document.getElementById('year_built');
    const hide = (t === 'land');
    if (wrap) wrap.hidden = hide;
    if (input) input.disabled = hide;
  }
  updateYearBuiltVisibility();
  typeSel.addEventListener('change', updateYearBuiltVisibility);

  // Price Euro formatting
  const priceInputHidden = document.getElementById('price');
  const priceInputDisplay = document.getElementById('price_display');
  const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  const parseNumeric = (str) => {
    if (typeof str !== 'string') return null;
    const cleaned = str.replace(/[^0-9,\.]/g, '').replace(/,/g, '.');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  };
  if (priceInputHidden && priceInputHidden.value) {
    const raw = Number(priceInputHidden.value);
    if (!Number.isNaN(raw)) priceInputDisplay.value = euro.format(raw);
  }
  priceInputDisplay.addEventListener('input', () => {
    const num = parseNumeric(priceInputDisplay.value);
    if (num === null) { priceInputHidden.value = ''; return; }
    priceInputHidden.value = String(num.toFixed(2));
  });
  priceInputDisplay.addEventListener('blur', () => {
    const num = parseNumeric(priceInputDisplay.value);
    if (num === null) { priceInputDisplay.value=''; priceInputHidden.value=''; return; }
    priceInputDisplay.value = euro.format(num);
    priceInputHidden.value = String(num.toFixed(2));
  });

  // Prevent double submit and show uploading overlay
  (function lockWhileUploading(){
    const form = document.getElementById('propertyForm');
    if (!form) return;
    let isSubmitting = false;
    form.addEventListener('submit', function() {
      if (isSubmitting) return false;
      if (!form.checkValidity()) { return true; }
      isSubmitting = true;
      const overlay = document.getElementById('uploadOverlay');
      if (overlay) { overlay.hidden = false; overlay.style.display = 'flex'; }
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent || '';
        submitBtn.textContent = 'Uploading...';
      }
    }, { capture: true });
  })();
});


