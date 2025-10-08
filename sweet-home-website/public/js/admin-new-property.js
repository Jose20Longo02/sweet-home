// JS for views/properties/new-property.ejs moved out to satisfy CSP (no inline scripts)
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

  // Photo preview + drag to reorder (append across multiple selections)
  const photosInput = document.getElementById('photos');
  const preview = document.getElementById('photoPreview');
  let dragIndex = null;
  let selectedFiles = [];
  function setInputFromSelected() {
    const dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    photosInput.files = dt.files;
  }
  function rebuildPreview() {
    preview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'item';
      item.style.position = 'relative';
      item.draggable = true;
      const img = document.createElement('img');
      img.src = url; img.className = 'thumb';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label','Remove');
      remove.style.position = 'absolute';
      remove.style.right = '6px';
      remove.style.top = '6px';
      remove.style.width = '24px';
      remove.style.height = '24px';
      remove.style.borderRadius = '50%';
      remove.style.border = 'none';
      remove.style.background = 'rgba(0,0,0,0.6)';
      remove.style.color = '#fff';
      remove.style.cursor = 'pointer';
      remove.addEventListener('click', function(){
        selectedFiles.splice(index, 1);
        setInputFromSelected();
        rebuildPreview();
      });
      const handle = document.createElement('div');
      handle.className = 'handle';
      handle.textContent = 'drag';
      item.appendChild(img);
      item.appendChild(remove);
      item.appendChild(handle);
      item.addEventListener('dragstart', () => { dragIndex = index; });
      item.addEventListener('dragover', (e) => { e.preventDefault(); });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragIndex === null) return;
        const moved = selectedFiles.splice(dragIndex, 1)[0];
        selectedFiles.splice(index, 0, moved);
        setInputFromSelected();
        dragIndex = null;
        rebuildPreview();
      });
      preview.appendChild(item);
    });
  }
  photosInput.addEventListener('change', (e) => {
    const newlySelected = Array.from(photosInput.files || []);
    newlySelected.forEach(f => {
      const exists = selectedFiles.some(sf => sf.name === f.name && sf.size === f.size && sf.lastModified === f.lastModified);
      if (!exists) selectedFiles.push(f);
    });
    setInputFromSelected();
    rebuildPreview();
  });

  // Video source toggle
  const videoSrcUpload = document.getElementById('videoSrcUpload');
  const videoSrcLink   = document.getElementById('videoSrcLink');
  const videoUploadWrap= document.getElementById('videoUploadWrap');
  const videoUrlWrap   = document.getElementById('videoUrlWrap');
  const videoInput     = document.getElementById('video');
  const videoUrlInput  = document.getElementById('video_url');
  const videoPreview   = document.getElementById('videoPreview');

  function updateVideoSource() {
    const useUpload = videoSrcUpload.checked;
    videoUploadWrap.hidden = !useUpload;
    videoUrlWrap.hidden    = useUpload;
    if (useUpload) {
      if (videoUrlInput) { videoUrlInput.value = ''; videoUrlInput.disabled = true; }
      if (videoInput) { videoInput.disabled = false; }
    } else {
      if (videoInput) { videoInput.value = ''; videoInput.disabled = true; }
      if (videoUrlInput) { videoUrlInput.disabled = false; }
    }
  }
  if (videoSrcUpload) videoSrcUpload.addEventListener('change', updateVideoSource);
  if (videoSrcLink) videoSrcLink.addEventListener('change', updateVideoSource);

  if (videoInput) {
    videoInput.addEventListener('change', () => {
      videoPreview.innerHTML = '';
      if (videoInput.files && videoInput.files[0]) {
        const url = URL.createObjectURL(videoInput.files[0]);
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true; vid.playsInline = true; vid.style.maxWidth = '100%';
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label','Remove video');
        remove.style.position = 'absolute'; remove.style.right = '6px'; remove.style.top = '6px';
        remove.style.width = '24px'; remove.style.height = '24px'; remove.style.borderRadius = '50%';
        remove.style.border = 'none'; remove.style.background = 'rgba(0,0,0,0.6)'; remove.style.color = '#fff'; remove.style.cursor = 'pointer';
        remove.addEventListener('click', function(){
          videoInput.value = '';
          videoPreview.innerHTML = '';
        });
        container.appendChild(vid);
        container.appendChild(remove);
        videoPreview.appendChild(container);
      }
    });
  }

  // Floorplan preview
  const floorplanInput = document.getElementById('floorplan');
  const floorplanPreview = document.getElementById('floorplanPreview');
  if (floorplanInput) {
    floorplanInput.addEventListener('change', () => {
      floorplanPreview.innerHTML = '';
      if (floorplanInput.files && floorplanInput.files[0]) {
        const url = URL.createObjectURL(floorplanInput.files[0]);
        const img = document.createElement('img');
        img.src = url; img.className = 'thumb';
        const wrap = document.createElement('div'); wrap.className = 'item';
        wrap.appendChild(img);
        floorplanPreview.appendChild(wrap);
      }
    });
  }

  // Plan photo previews (HV)
  const planPhotoHVInput = document.getElementById('plan_photo_hv');
  const planPhotoPreviewHV = document.getElementById('planPhotoPreviewHV');
  if (planPhotoHVInput) {
    planPhotoHVInput.addEventListener('change', () => {
      planPhotoPreviewHV.innerHTML = '';
      if (planPhotoHVInput.files && planPhotoHVInput.files[0]) {
        const url = URL.createObjectURL(planPhotoHVInput.files[0]);
        const img = document.createElement('img');
        img.src = url; img.className = 'thumb';
        const wrap = document.createElement('div'); wrap.className = 'item';
        wrap.appendChild(img);
        planPhotoPreviewHV.appendChild(wrap);
      }
    });
  }

  // Plan photo previews (Land)
  const planPhotoInput = document.getElementById('plan_photo');
  const planPhotoPreview = document.getElementById('planPhotoPreview');
  if (planPhotoInput) {
    planPhotoInput.addEventListener('change', () => {
      planPhotoPreview.innerHTML = '';
      if (planPhotoInput.files && planPhotoInput.files[0]) {
        const url = URL.createObjectURL(planPhotoInput.files[0]);
        const img = document.createElement('img');
        img.src = url; img.className = 'thumb';
        const wrap = document.createElement('div'); wrap.className = 'item';
        wrap.appendChild(img);
        planPhotoPreview.appendChild(wrap);
      }
    });
  }

  // Features and Year Built visibility
  function updateFeaturesVisibility() {
    const t = (typeSel.value || '').toLowerCase();
    const sec = document.getElementById('featuresSection');
    if (sec) {
      const hide = (t === 'land');
      sec.hidden = hide;
      sec.querySelectorAll('input[type="checkbox"][name="features"]').forEach(i => { i.disabled = hide; });
    }
  }
  function updateYearBuiltVisibility() {
    const t = (typeSel.value || '').toLowerCase();
    const wrap = document.getElementById('yearBuiltField');
    const input = document.getElementById('year_built');
    const hide = (t === 'land');
    if (wrap) wrap.hidden = hide;
    if (input) input.disabled = hide;
  }
  // Rental income visibility
  function updateRentalIncomeVisibility() {
    const statusSel = document.getElementById('rental_status');
    const wrap = document.getElementById('rentalIncomeWrap');
    const input = document.getElementById('rental_income');
    const val = (statusSel && statusSel.value) || '';
    const show = (val === 'rented' || val === 'not_rented_potential');
    if (wrap) wrap.hidden = !show;
    if (input) input.disabled = !show;
  }
  const rentalStatus = document.getElementById('rental_status');
  if (rentalStatus) rentalStatus.addEventListener('change', updateRentalIncomeVisibility);

  // Price input formatting (Euro)
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
    if (num === null) { priceInputDisplay.value = ''; priceInputHidden.value = ''; return; }
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

  // Init
  fillCities();
  updateTypeBlocks();
  updateProjectVisibility();
  updateFeaturesVisibility();
  updateYearBuiltVisibility();
  typeSel.addEventListener('change', updateFeaturesVisibility);
  typeSel.addEventListener('change', updateYearBuiltVisibility);
  updateRentalIncomeVisibility();
});


