document.addEventListener('DOMContentLoaded', function () {
  function showUploadOverlay(button) {
    var overlay = document.getElementById('uploadOverlay');
    if (overlay) {
      try {
        if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '20000';
        overlay.style.display = 'flex';
        overlay.hidden = false;
      } catch (err) {
        overlay.hidden = false;
        overlay.style.display = 'flex';
      }
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Uploading...';
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('form.reassign-form'), function (reassignForm) {
    var select = reassignForm.querySelector('select[name="agent_id"]');
    if (!select) return;
    var previous = select.value;
    select.addEventListener('change', function () {
      if (select.value === previous || reassignForm.__submitting) return;
      reassignForm.__submitting = true;
      previous = select.value;
      showUploadOverlay(null);
      var title = document.querySelector('.upload-title');
      var sub = document.querySelector('.upload-sub');
      if (title) title.textContent = 'Saving...';
      if (sub) sub.textContent = 'Updating the agent in charge.';
      if (typeof reassignForm.requestSubmit === 'function') reassignForm.requestSubmit();
      else reassignForm.submit();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('form[action*="/status"]'), function (statusForm) {
    statusForm.addEventListener('submit', function (event) {
      var status = statusForm.querySelector('input[name="status"]');
      if (!status || status.value !== 'published') return;
      showUploadOverlay(event.submitter || statusForm.querySelector('button[type="submit"]'));
    });
  });

  var input = document.getElementById('photos');
  var preview = document.getElementById('photoPreview');
  var form = document.getElementById('rentalForm');
  var mount = document.getElementById('orderedPhotos');

  function syncVideoSource() {
    if (!form) return;
    var selected = form.querySelector('input[name="video_source"]:checked');
    var source = selected ? selected.value : 'none';
    var uploadWrap = document.getElementById('videoUploadWrap');
    var linkWrap = document.getElementById('videoUrlWrap');
    var file = document.getElementById('video');
    var link = document.getElementById('video_url');
    if (uploadWrap) uploadWrap.hidden = source !== 'upload';
    if (linkWrap) linkWrap.hidden = source !== 'link';
    if (file) file.disabled = source !== 'upload';
    if (link) link.disabled = source !== 'link';
  }
  function syncUtilitiesMode() {
    if (!form) return;
    var selected = form.querySelector('input[name="utilities_mode"]:checked');
    var showAmount = selected && selected.value === 'amount';
    var wrap = document.getElementById('utilitiesAmountWrap');
    var amount = document.getElementById('utilities_amount');
    var details = document.getElementById('utilitiesDetails');
    if (wrap) wrap.hidden = !showAmount;
    if (amount) amount.disabled = !showAmount;
    if (details) details.classList.toggle('is-note-only', !showAmount);
  }
  if (form) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name="video_source"]'), function (choice) {
      choice.addEventListener('change', syncVideoSource);
    });
    Array.prototype.forEach.call(form.querySelectorAll('input[name="utilities_mode"]'), function (choice) {
      choice.addEventListener('change', syncUtilitiesMode);
    });
    syncVideoSource();
    syncUtilitiesMode();
  }

  var videoInput = document.getElementById('video');
  var videoFilePreview = document.getElementById('videoFilePreview');
  var storedVideoPreview = document.getElementById('storedVideoPreview');
  var videoLinkInput = document.getElementById('video_url');
  var videoLinkPreview = document.getElementById('videoLinkPreview');
  if (videoInput && videoFilePreview && window.AdminVideoPreview) {
    videoInput.addEventListener('change', function () {
      var file = videoInput.files && videoInput.files[0];
      if (storedVideoPreview) storedVideoPreview.hidden = Boolean(file);
      window.AdminVideoPreview.showFile(videoFilePreview, file, function () {
        videoInput.value = '';
        if (storedVideoPreview) storedVideoPreview.hidden = false;
      });
    });
  }
  if (videoLinkInput && videoLinkPreview && window.AdminVideoPreview) {
    var paintRentalLink = function () {
      window.AdminVideoPreview.showLink(videoLinkPreview, videoLinkInput.value);
    };
    videoLinkInput.addEventListener('input', paintRentalLink);
    paintRentalLink();
  }
  if (!input || !preview || !form || !mount) return;

  var items = [];
  Array.prototype.forEach.call(preview.querySelectorAll('.item[data-url]'), function (node) {
    var url = node.getAttribute('data-url');
    if (url) items.push({ kind: 'url', url: url });
  });

  var dragFrom = null;

  function syncFiles() {
    try {
      var transfer = new DataTransfer();
      items.forEach(function (item) {
        if (item.kind === 'file') transfer.items.add(item.file);
      });
      input.files = transfer.files;
    } catch (err) {}
  }

  function render() {
    preview.innerHTML = '';
    items.forEach(function (item, index) {
      var el = document.createElement('div');
      el.className = 'item';
      el.draggable = true;

      var img = document.createElement('img');
      img.className = 'thumb';
      img.alt = '';
      img.src = item.kind === 'url' ? item.url : URL.createObjectURL(item.file);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-btn';
      remove.setAttribute('aria-label', 'Remove');
      remove.textContent = '×';
      remove.addEventListener('click', function () {
        items.splice(index, 1);
        syncFiles();
        render();
      });

      var handle = document.createElement('div');
      handle.className = 'handle';
      handle.textContent = 'drag';

      el.appendChild(img);
      el.appendChild(remove);
      el.appendChild(handle);
      el.addEventListener('dragstart', function () {
        dragFrom = index;
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', function () {
        dragFrom = null;
        el.classList.remove('dragging');
      });
      el.addEventListener('dragover', function (event) { event.preventDefault(); });
      el.addEventListener('drop', function (event) {
        event.preventDefault();
        if (dragFrom === null || dragFrom === index) return;
        var moved = items.splice(dragFrom, 1)[0];
        items.splice(index, 0, moved);
        dragFrom = null;
        syncFiles();
        render();
      });
      preview.appendChild(el);
    });
    input.required = items.length === 0;
    var notice = document.getElementById('uploadError');
    if (notice && notice.textContent === 'Only 20 photos are allowed' && items.length < maxPhotos) {
      notice.hidden = true;
    }
  }

  input.addEventListener('change', function () {
    var blocked = false;
    Array.prototype.forEach.call(input.files || [], function (file) {
      if (items.length >= maxPhotos) {
        blocked = true;
        return;
      }
      var exists = items.some(function (item) {
        return item.kind === 'file'
          && item.file.name === file.name
          && item.file.size === file.size
          && item.file.lastModified === file.lastModified;
      });
      if (!exists) items.push({ kind: 'file', file: file });
    });
    syncFiles();
    render();
    if (blocked) showFormError('Only 20 photos are allowed');
  });

  var publishingLocked = false;
  var maxPhotos = 20;
  var maxFileBytes = 20 * 1024 * 1024;
  var maxTotalBytes = 90 * 1024 * 1024;

  function showFormError(message) {
    var notice = document.getElementById('uploadError');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'uploadError';
      notice.className = 'error';
      form.insertBefore(notice, form.firstChild);
    }
    notice.hidden = false;
    notice.textContent = message;
  }

  function hideFormError() {
    var notice = document.getElementById('uploadError');
    if (notice) notice.hidden = true;
  }

  function photoProblem() {
    var files = items.filter(function (item) { return item.kind === 'file'; });
    var total = files.reduce(function (sum, item) { return sum + (item.file.size || 0); }, 0);
    if (items.length > maxPhotos) return 'Only 20 photos are allowed';
    if (files.some(function (item) { return item.file.size > maxFileBytes; })) return 'Each photo must be 20 MB or smaller.';
    if (total > maxTotalBytes) return 'These photos are too large to send together. Save with fewer photos, then add the rest from the edit page.';
    if (!items.length) return 'Add at least one photo.';
    return '';
  }

  function videoProblem() {
    var selected = form.querySelector('input[name="video_source"]:checked');
    var source = selected ? selected.value : 'none';
    if (source === 'link') {
      var link = document.getElementById('video_url');
      var value = link ? link.value.trim() : '';
      if (!value) return 'Paste a video link, or choose no video.';
      if (!/^https?:\/\//i.test(value)) return 'The video link must start with https://.';
      return '';
    }
    if (source !== 'upload') return '';
    var file = document.getElementById('video');
    var chosen = file && file.files && file.files[0];
    if (chosen && chosen.size > maxFileBytes) return 'The video must be 20 MB or smaller. Compress it, or paste a YouTube or Vimeo link.';
    if (!chosen && form.getAttribute('data-stored-video') !== '1') return 'Choose a video file, or paste a link instead.';
    return '';
  }

  function releaseSubmit(button) {
    publishingLocked = false;
    var overlay = document.getElementById('uploadOverlay');
    if (overlay) {
      overlay.hidden = true;
      overlay.style.display = 'none';
    }
    if (button) {
      button.disabled = false;
      if (button.getAttribute('data-label')) button.textContent = button.getAttribute('data-label');
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (publishingLocked) return;
    hideFormError();
    syncVideoSource();
    var problem = photoProblem() || videoProblem();
    if (problem) {
      showFormError(problem);
      return;
    }
    if (!form.reportValidity()) return;

    mount.innerHTML = '';
    var managed = document.createElement('input');
    managed.type = 'hidden';
    managed.name = 'photos_managed';
    managed.value = '1';
    mount.appendChild(managed);
    Array.prototype.forEach.call(form.querySelectorAll('input[name="existing_photos"]'), function (node) {
      node.remove();
    });
    var fileIndex = 0;
    items.forEach(function (item) {
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'photos_order';
      if (item.kind === 'url') {
        hidden.value = 'url:' + item.url;
      } else {
        hidden.value = 'file:' + fileIndex;
        fileIndex += 1;
      }
      mount.appendChild(hidden);
    });

    var submitter = event.submitter;
    var photoName = input.getAttribute('name');
    input.removeAttribute('name');
    var data = new FormData(form);
    if (photoName) input.setAttribute('name', photoName);
    items.forEach(function (item) {
      if (item.kind === 'file') data.append('photos', item.file, item.file.name);
    });
    if (submitter && submitter.name === 'status') data.append('status', submitter.value);

    publishingLocked = true;
    if (submitter && !submitter.getAttribute('data-label')) {
      submitter.setAttribute('data-label', submitter.textContent);
    }
    showUploadOverlay(submitter);

    fetch(form.action, {
      method: 'POST',
      body: data,
      credentials: 'same-origin',
      redirect: 'follow',
      headers: { 'X-Requested-With': 'fetch' }
    }).then(function (response) {
      var type = response.headers.get('content-type') || '';
      if (type.indexOf('application/json') !== -1) {
        return response.json().then(function (payload) {
          releaseSubmit(submitter);
          showFormError((payload && payload.error) || 'The photos could not be uploaded.');
        });
      }
      if (response.status === 413) {
        releaseSubmit(submitter);
        showFormError('These photos are too large to send together. Save with fewer photos, then add the rest from the edit page.');
        return;
      }
      if (response.status === 502 || response.status === 504) {
        releaseSubmit(submitter);
        showFormError('The save did not finish. Try again.');
        return;
      }
      if (response.redirected) {
        window.location.href = response.url;
        return;
      }
      return response.text().then(function (html) {
        document.open();
        document.write(html);
        document.close();
      });
    }).catch(function () {
      releaseSubmit(submitter);
      showFormError('The photos did not go through. Try fewer photos, or smaller ones.');
    });
  });

  render();
});
