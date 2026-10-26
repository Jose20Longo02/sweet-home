(function () {
  var typeEl = document.getElementById('energy_certificate_type');
  var details = document.getElementById('energyDetails');
  var valueText = document.getElementById('energyValueText');
  var valueInput = document.getElementById('energy_value');
  if (!typeEl || !details) return;

  function sync() {
    var type = typeEl.value;
    var show = type === 'demand' || type === 'consumption';
    details.hidden = !show;
    details.querySelectorAll('[data-energy-required]').forEach(function (el) {
      if (show) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
    if (valueText && valueInput) {
      var label = type === 'consumption'
        ? valueInput.getAttribute('data-consumption-label')
        : valueInput.getAttribute('data-demand-label');
      valueText.textContent = label;
    }
  }

  typeEl.addEventListener('change', sync);
  sync();

  var boxes = document.querySelectorAll('input[name="energy_sources"]');
  boxes.forEach(function (box) {
    box.addEventListener('change', function () {
      if (box.value === 'none' && box.checked) {
        boxes.forEach(function (other) {
          if (other !== box) other.checked = false;
        });
        return;
      }
      if (box.checked && box.value !== 'none') {
        boxes.forEach(function (other) {
          if (other.value === 'none') other.checked = false;
        });
      }
    });
  });

  var pass = document.getElementById('energyPass');
  var input = document.getElementById('energy_certificate_pdf');
  var drop = document.getElementById('energyPassDrop');
  var fileRow = document.getElementById('energyPassFile');
  var nameEl = document.getElementById('energyPassName');
  var noteEl = document.getElementById('energyPassNote');
  var openEl = document.getElementById('energyPassOpen');
  var replaceBtn = document.getElementById('energyPassReplace');
  var removeBtn = document.getElementById('energyPassRemove');
  var removeFlag = document.getElementById('remove_existing_energy_pdf');
  var errorEl = document.getElementById('energyPassError');
  if (!pass || !input || !drop || !fileRow || !removeFlag) return;

  function setError(message) {
    if (!errorEl) return;
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  var existingUrl = pass.getAttribute('data-existing-url') || '';
  var objectUrl = '';

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function isPdf(file) {
    return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  }

  function showEmpty(message) {
    drop.hidden = false;
    fileRow.hidden = true;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }
    if (message && noteEl) noteEl.textContent = message;
  }

  function showFile(name, note, href) {
    drop.hidden = true;
    fileRow.hidden = false;
    if (nameEl) nameEl.textContent = name || 'energy-certificate.pdf';
    if (noteEl) noteEl.textContent = note || '';
    if (openEl) {
      if (href) {
        openEl.hidden = false;
        openEl.href = href;
      } else {
        openEl.hidden = true;
        openEl.removeAttribute('href');
      }
    }
  }

  function useFile(file) {
    if (!isPdf(file)) {
      input.value = '';
      setError('Choose a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      input.value = '';
      setError('That PDF is larger than 20 MB.');
      return;
    }
    setError('');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    removeFlag.value = 'false';
    showFile(file.name, formatSize(file.size) + ' · ready to upload', objectUrl);
  }

  drop.addEventListener('click', function () { input.click(); });
  if (replaceBtn) replaceBtn.addEventListener('click', function () { input.click(); });
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      input.value = '';
      removeFlag.value = existingUrl ? 'true' : 'false';
      setError('');
      showEmpty();
    });
  }

  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    if (!file) return;
    useFile(file);
  });

  ['dragenter', 'dragover'].forEach(function (eventName) {
    drop.addEventListener(eventName, function (event) {
      event.preventDefault();
      drop.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (eventName) {
    drop.addEventListener(eventName, function (event) {
      event.preventDefault();
      drop.classList.remove('is-dragover');
    });
  });
  drop.addEventListener('drop', function (event) {
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    var transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    useFile(file);
  });
})();
