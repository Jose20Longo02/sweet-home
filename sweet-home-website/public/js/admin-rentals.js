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
  if (!input || !preview || !form || !mount) return;

  var items = [];
  Array.prototype.forEach.call(preview.querySelectorAll('.item[data-url]'), function (node) {
    var url = node.getAttribute('data-url');
    if (url) items.push({ kind: 'url', url: url });
  });

  var dragFrom = null;

  function syncFiles() {
    var transfer = new DataTransfer();
    items.forEach(function (item) {
      if (item.kind === 'file') transfer.items.add(item.file);
    });
    input.files = transfer.files;
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
  }

  input.addEventListener('change', function () {
    Array.prototype.forEach.call(input.files || [], function (file) {
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
  });

  var publishingLocked = false;
  form.addEventListener('submit', function (event) {
    if (publishingLocked) {
      event.preventDefault();
      return;
    }
    syncFiles();
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

    var publishing = event.submitter && event.submitter.value === 'published';
    if (!publishing) return;
    publishingLocked = true;
    var status = document.createElement('input');
    status.type = 'hidden';
    status.name = 'status';
    status.value = 'published';
    mount.appendChild(status);
    Array.prototype.forEach.call(form.querySelectorAll('button[name="status"]'), function (button) {
      button.removeAttribute('name');
      if (button !== event.submitter) button.disabled = true;
    });
    showUploadOverlay(event.submitter);
  });

  render();
});
