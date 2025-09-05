// JS for views/projects/edit-project.ejs extracted to satisfy CSP
document.addEventListener('DOMContentLoaded', function () {
  const dataNode = document.getElementById('proj-data');
  let LOCATIONS = {};
  try { LOCATIONS = JSON.parse(dataNode.getAttribute('data-locations') || '{}'); } catch(_) { LOCATIONS = {}; }
  const defaultCity = dataNode.getAttribute('data-default-city') || '';
  const defaultHood = dataNode.getAttribute('data-default-hood') || '';

  const countrySel = document.getElementById('country');
  const citySel = document.getElementById('city');
  const hoodSel = document.getElementById('neighborhood');

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
  countrySel.addEventListener('change', fillCities);
  citySel.addEventListener('change', fillNeighborhoods);
  fillCities();

  // Euro formatting for price ranges
  function bindEuro(inputDisplayId, inputHiddenId) {
    const display = document.getElementById(inputDisplayId);
    const hidden  = document.getElementById(inputHiddenId);
    const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
    const parseNumeric = (str) => {
      if (typeof str !== 'string') return null;
      const cleaned = str.replace(/[^0-9,\.]/g, '').replace(/,/g, '.');
      if (!cleaned) return null;
      const num = Number(cleaned);
      return Number.isNaN(num) ? null : num;
    };
    if (hidden && hidden.value) {
      const raw = Number(hidden.value);
      if (!Number.isNaN(raw)) display.value = euro.format(raw);
    }
    display.addEventListener('input', () => {
      const num = parseNumeric(display.value);
      if (num === null) { hidden.value = ''; return; }
      hidden.value = String(num.toFixed(2));
    });
    display.addEventListener('blur', () => {
      const num = parseNumeric(display.value);
      if (num === null) { display.value = ''; hidden.value = ''; return; }
      display.value = euro.format(num);
      hidden.value = String(num.toFixed(2));
    });
  }
  bindEuro('min_price_display', 'min_price');
  bindEuro('max_price_display', 'max_price');

  // Photo preview append for new selections
  const photosInput = document.getElementById('project_photos');
  const preview = document.getElementById('projPhotoPreview');
  if (photosInput && preview) {
    photosInput.addEventListener('change', () => {
      Array.from(photosInput.files).forEach((file) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement('div');
        item.className = 'item';
        const img = document.createElement('img');
        img.src = url; img.className = 'thumb';
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.textContent = 'drag';
        item.appendChild(img);
        item.appendChild(handle);
        preview.appendChild(item);
      });
    });
  }

  const videoInput = document.getElementById('project_video');
  const videoPreview = document.getElementById('projVideoPreview');
  if (videoInput) {
    videoInput.addEventListener('change', () => {
      videoPreview.innerHTML = '';
      if (videoInput.files && videoInput.files[0]) {
        const url = URL.createObjectURL(videoInput.files[0]);
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true; vid.playsInline = true;
        videoPreview.appendChild(vid);
      }
    });
  }
});


