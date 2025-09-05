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
    const orderedMount = document.getElementById('orderedExistingPhotos');
    let draggingEl = null;
    photosInput.addEventListener('change', () => {
      // Remove only previously-added new previews and append fresh ones
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
            // remove and refresh just the new previews
            preview.querySelectorAll('.item[data-new="1"]').forEach(n => n.remove());
            Array.from(photosInput.files || []).forEach((f) => {
              const u = URL.createObjectURL(f);
              const it = document.createElement('div');
              it.className='item'; it.setAttribute('data-new','1'); it.style.position='relative';
              const im = document.createElement('img'); im.src = u; im.className='thumb';
              const rm = document.createElement('button'); rm.type='button'; rm.textContent='×'; rm.setAttribute('aria-label','Remove');
              rm.style.position='absolute'; rm.style.right='6px'; rm.style.top='6px'; rm.style.width='24px'; rm.style.height='24px'; rm.style.borderRadius='50%'; rm.style.border='none'; rm.style.background='rgba(0,0,0,0.6)'; rm.style.color='#fff'; rm.style.cursor='pointer';
              rm.addEventListener('click', function(){
                const cur2 = Array.from(photosInput.files || []);
                const idx2 = cur2.findIndex(ff => ff.name === f.name && ff.size === f.size && ff.lastModified === f.lastModified);
                if (idx2 >= 0) {
                  cur2.splice(idx2, 1);
                  const dt2 = new DataTransfer();
                  cur2.forEach(ff => dt2.items.add(ff));
                  photosInput.files = dt2.files;
                  preview.querySelectorAll('.item[data-new="1"]').forEach(n => n.remove());
                  Array.from(photosInput.files || []).forEach((f3) => {
                    const u3 = URL.createObjectURL(f3);
                    const it3 = document.createElement('div'); it3.className='item'; it3.setAttribute('data-new','1'); it3.style.position='relative';
                    const im3 = document.createElement('img'); im3.src = u3; im3.className='thumb';
                    const rm3 = document.createElement('button'); rm3.type='button'; rm3.textContent='×'; rm3.setAttribute('aria-label','Remove');
                    rm3.style.position='absolute'; rm3.style.right='6px'; rm3.style.top='6px'; rm3.style.width='24px'; rm3.style.height='24px'; rm3.style.borderRadius='50%'; rm3.style.border='none'; rm3.style.background='rgba(0,0,0,0.6)'; rm3.style.color='#fff'; rm3.style.cursor='pointer';
                    rm3.addEventListener('click', function(){ /* will be handled by outer listener on rebuild */ });
                    it3.appendChild(im3); it3.appendChild(rm3); preview.appendChild(it3);
                  });
                }
              });
              it.appendChild(im); it.appendChild(rm); preview.appendChild(it);
            });
          } else {
            item.remove();
          }
        });
        item.appendChild(img);
        item.appendChild(remove);
        preview.appendChild(item);
      });
      initDragForExisting();
      persistOrder();
    });
    function initDragForExisting(){
      const items = Array.from(preview.querySelectorAll('.item'));
      items.forEach((item, index) => {
        item.draggable = true;
        item.addEventListener('dragstart', (e) => { draggingEl = item; item.classList.add('dragging'); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; });
        item.addEventListener('dragend', () => { if (draggingEl) draggingEl.classList.remove('dragging'); draggingEl = null; persistOrder(); });
        item.addEventListener('dragover', (e) => { e.preventDefault(); });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          if (!draggingEl || draggingEl === item) return;
          const parent = item.parentNode || preview;
          const siblings = Array.from(preview.children);
          const from = siblings.indexOf(draggingEl);
          const to = siblings.indexOf(item);
          if (from < 0 || to < 0) return;
          if (from < to) parent.insertBefore(draggingEl, item.nextSibling);
          else parent.insertBefore(draggingEl, item);
          if (draggingEl) draggingEl.classList.remove('dragging');
          draggingEl = null;
          initDragForExisting();
          persistOrder();
        });
      });
    }
    function persistOrder(){
      if (!orderedMount) return;
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
  }

  // Delegation for removing existing media
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
      const vp = document.getElementById('projVideoPreview');
      if (vp) vp.innerHTML = '';
    }
  });

  const videoInput = document.getElementById('project_video');
  const videoPreview = document.getElementById('projVideoPreview');
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
        remove.style.position = 'absolute';
        remove.style.right = '6px';
        remove.style.top = '6px';
        remove.style.width = '24px';
        remove.style.height = '24px';
        remove.style.border = 'none';
        remove.style.borderRadius = '50%';
        remove.style.background = 'rgba(0,0,0,0.6)';
        remove.style.color = '#fff';
        remove.style.cursor = 'pointer';
        remove.addEventListener('click', function(){
          videoInput.value = '';
          videoPreview.innerHTML = '';
          const flag = document.getElementById('remove_existing_video');
          if (flag) flag.value = 'true';
        });
        container.appendChild(vid);
        container.appendChild(remove);
        videoPreview.appendChild(container);
      }
    });
  }

  // Ensure overlay is on top during submit
  (function ensureOverlay(){
    const form = document.getElementById('projectForm');
    if (!form) return;
    let submitting = false;
    form.addEventListener('submit', function(){
      if (submitting) return false;
      if (!form.checkValidity()) return true;
      submitting = true;
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
    }, { capture: true });
  })();
});


