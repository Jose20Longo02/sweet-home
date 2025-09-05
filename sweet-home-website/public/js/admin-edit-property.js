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

  // Delegation for removing existing media (photos/videos)
  document.addEventListener('click', function(e){
    const photoBtn = e.target.closest('[data-remove-photo]');
    if (photoBtn) {
      const url = photoBtn.getAttribute('data-remove-photo');
      const hidden = document.getElementById('remove_existing_photos');
      if (hidden) {
        const arr = hidden.value ? hidden.value.split('\n') : [];
        if (!arr.includes(url)) arr.push(url);
        hidden.value = arr.join('\n');
      }
      const item = photoBtn.closest('.item');
      if (item) item.remove();
    }
    const vidBtn = e.target.closest('[data-remove-video]');
    if (vidBtn) {
      const flag = document.getElementById('remove_existing_video');
      if (flag) flag.value = 'true';
      const vp = document.getElementById('videoPreview');
      if (vp) vp.innerHTML = '';
    }
    // Plan/floorplan remove buttons are disabled per request
  });

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
      // Force removal flags if preview is empty and no new file selected
      try {
        const typeVal = (document.getElementById('type')?.value || '').toLowerCase();
        const floorplanFlag = document.getElementById('remove_existing_floorplan');
        const planFlag = document.getElementById('remove_existing_plan_photo');
        const floorplanInput = document.getElementById('floorplan');
        const floorplanPrev = document.getElementById('floorplanPreview');
        const planHVInput = document.getElementById('plan_photo_hv');
        const planHVPrev = document.getElementById('planPhotoPreviewHV');
        const planInput = document.getElementById('plan_photo');
        const planPrev = document.getElementById('planPhotoPreview');

        if (typeVal === 'apartment' && floorplanFlag) {
          const noExisting = floorplanPrev && !floorplanPrev.querySelector('.item');
          const noNew = !floorplanInput || !floorplanInput.files || floorplanInput.files.length === 0;
          if (noExisting && noNew) floorplanFlag.value = 'true';
        }
        if ((typeVal === 'house' || typeVal === 'villa') && planFlag) {
          const noExisting = planHVPrev && !planHVPrev.querySelector('.item');
          const noNew = !planHVInput || !planHVInput.files || planHVInput.files.length === 0;
          if (noExisting && noNew) planFlag.value = 'true';
        }
        if (typeVal === 'land' && planFlag) {
          const noExisting = planPrev && !planPrev.querySelector('.item');
          const noNew = !planInput || !planInput.files || planInput.files.length === 0;
          if (noExisting && noNew) planFlag.value = 'true';
        }
      } catch (_) {}
      isSubmitting = true;
      const overlay = document.getElementById('uploadOverlay');
      if (overlay) {
        try {
          if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
          overlay.style.position = 'fixed';
          overlay.style.inset = '0';
          overlay.style.zIndex = '20000';
          overlay.style.display = 'flex';
          overlay.hidden = false;
        } catch(_) { overlay.hidden = false; overlay.style.display = 'flex'; }
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent || '';
        submitBtn.textContent = 'Uploading...';
      }
    }, { capture: true });
  })();

  // Photos preview for newly selected files (append to existing grid)
  (function initPhotoPreviews(){
    const photosInput = document.getElementById('photos');
    const preview = document.getElementById('photoPreview');
    const orderedMount = document.getElementById('orderedExistingPhotos');
    if (!photosInput || !preview) return;
    function rebuildNewPreviews() {
      // remove previously added new previews
      preview.querySelectorAll('.item[data-new="1"]').forEach(n => n.remove());
      const files = Array.from(photosInput.files || []);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('data-new', '1');
        item.dataset.fileName = file.name;
        item.dataset.fileSize = String(file.size);
        item.dataset.fileLastMod = String(file.lastModified);
        item.style.position = 'relative';
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
          const current = Array.from(photosInput.files || []);
          const idx = current.findIndex(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
          if (idx >= 0) {
            current.splice(idx, 1);
            const dt = new DataTransfer();
            current.forEach(f => dt.items.add(f));
            photosInput.files = dt.files;
            rebuildNewPreviews();
          } else {
            item.remove();
          }
        });
        item.appendChild(img);
        item.appendChild(remove);
        preview.appendChild(item);
      });
    }
    // Make existing items draggable and persist order via hidden inputs
    function initDragForExisting() {
      const items = Array.from(preview.querySelectorAll('.item'));
      items.forEach((item, index) => {
        item.draggable = true;
        item.addEventListener('dragstart', () => { item.classList.add('dragging'); item.dataset.dragIndex = String(index); });
        item.addEventListener('dragend', () => { item.classList.remove('dragging'); delete item.dataset.dragIndex; persistOrder(); });
        item.addEventListener('dragover', (e) => { e.preventDefault(); });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          const from = items.findIndex(it => it.classList.contains('dragging'));
          const to = items.indexOf(item);
          if (from === -1 || to === -1 || from === to) return;
          const parent = item.parentNode;
          const moving = items[from];
          if (from < to) {
            parent.insertBefore(moving, item.nextSibling);
          } else {
            parent.insertBefore(moving, item);
          }
          // refresh items reference
          initDragForExisting();
          persistOrder();
        });
      });
    }

    function persistOrder() {
      if (!orderedMount) return;
      // clear previous
      orderedMount.innerHTML = '';
      const items = Array.from(preview.querySelectorAll('.item'));
      items.forEach(it => {
        const img = it.querySelector('img.thumb');
        if (!img) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'photos_order';
        if (it.getAttribute('data-new') === '1') {
          const files = Array.from(photosInput.files || []);
          const idx = files.findIndex(f => String(f.name) === it.dataset.fileName && String(f.size) === it.dataset.fileSize && String(f.lastModified) === it.dataset.fileLastMod);
          if (idx >= 0) input.value = 'file:' + idx; else return;
        } else {
          const url = img.getAttribute('src'); if (!url) return;
          input.value = 'url:' + url;
        }
        orderedMount.appendChild(input);
      });
    }

    initDragForExisting();
    persistOrder();
    photosInput.addEventListener('change', () => { rebuildNewPreviews(); initDragForExisting(); persistOrder(); });
  })();

  // Video source toggle + preview for newly selected video
  (function initVideo(){
    const videoSrcUpload = document.getElementById('videoSrcUpload');
    const videoSrcLink   = document.getElementById('videoSrcLink');
    const videoUploadWrap= document.getElementById('videoUploadWrap');
    const videoUrlWrap   = document.getElementById('videoUrlWrap');
    const videoInput     = document.getElementById('video');
    const videoUrlInput  = document.getElementById('video_url');
    const videoPreview   = document.getElementById('videoPreview');
    const removeFlag     = document.getElementById('remove_existing_video');

    function updateVideoSource() {
      const useUpload = !!(videoSrcUpload && videoSrcUpload.checked);
      if (videoUploadWrap) videoUploadWrap.hidden = !useUpload;
      if (videoUrlWrap)    videoUrlWrap.hidden    = useUpload;
      if (useUpload) {
        if (videoUrlInput) { videoUrlInput.value = ''; videoUrlInput.disabled = true; }
        if (videoInput)    { videoInput.disabled = false; }
      } else {
        if (videoInput)    { videoInput.value = ''; videoInput.disabled = true; }
        if (videoUrlInput) { videoUrlInput.disabled = false; }
        if (videoPreview)  { videoPreview.innerHTML = ''; }
      }
    }
    if (videoSrcUpload) videoSrcUpload.addEventListener('change', updateVideoSource);
    if (videoSrcLink)   videoSrcLink.addEventListener('change', updateVideoSource);
    updateVideoSource();

    if (videoInput && videoPreview) {
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
          remove.type = 'button';
          remove.textContent = '×';
          remove.setAttribute('aria-label','Remove video');
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
            videoInput.value = '';
            videoPreview.innerHTML = '';
            if (removeFlag) removeFlag.value = 'false';
          });
          container.appendChild(vid);
          container.appendChild(remove);
          videoPreview.appendChild(container);
          // ensure old video file gets removed when replacing
          if (removeFlag) removeFlag.value = 'true';
        }
      });
    }
  })();
});


