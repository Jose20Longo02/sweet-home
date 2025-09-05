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

  // Prices formatting
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

  // Project photos preview
  const photosInput = document.getElementById('project_photos');
  const preview = document.getElementById('projPhotoPreview');
  if (photosInput && preview) {
    let dragIndex = null;
    function rebuildPreview() {
      preview.innerHTML = '';
      Array.from(photosInput.files).forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement('div');
        item.className = 'item';
        item.draggable = true;
        const img = document.createElement('img');
        img.src = url; img.className = 'thumb';
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.textContent = 'drag';
        item.appendChild(img);
        item.appendChild(handle);
        item.addEventListener('dragstart', () => { dragIndex = index; });
        item.addEventListener('dragover', (e) => { e.preventDefault(); });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragIndex === null) return;
          const files = Array.from(photosInput.files);
          const moved = files.splice(dragIndex, 1)[0];
          files.splice(index, 0, moved);
          const dt = new DataTransfer();
          files.forEach(f => dt.items.add(f));
          photosInput.files = dt.files;
          dragIndex = null;
          rebuildPreview();
        });
        preview.appendChild(item);
      });
    }
    photosInput.addEventListener('change', rebuildPreview);
  }

  const videoInput = document.getElementById('project_video');
  const videoPreview = document.getElementById('projVideoPreview');
  if (videoInput && videoPreview) {
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

  (function lockWhileUploading(){
    const form = document.getElementById('projectForm');
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


