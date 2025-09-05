function getCsrfToken() {
  var m = document.querySelector('meta[name="csrf-token"]');
  return m ? m.getAttribute('content') : '';
}

function ensureModal() {
  var existing = document.getElementById('confirm-modal');
  if (existing) return existing;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal';
  overlay.innerHTML = '\n    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">\n      <header id="confirm-title">Confirm deletion</header>\n      <div class="modal-body">Are you sure you want to delete this lead? This action cannot be undone.</div>\n      <div class="modal-actions">\n        <button class="btn btn-light" data-modal-cancel>Cancel</button>\n        <button class="btn btn-danger" data-modal-confirm>Delete</button>\n      </div>\n    </div>\n  ';
  document.body.appendChild(overlay);
  return overlay;
}

function openConfirm() {
  var overlay = ensureModal();
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  return new Promise(function(resolve){
    function onCancel(){ cleanup(); resolve(false); }
    function onConfirm(){ cleanup(); resolve(true); }
    function cleanup(){
      overlay.classList.remove('open');
      overlay.style.display = 'none';
      overlay.removeEventListener('click', overlayClick);
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
    }
    function overlayClick(e){ if (e.target === overlay) onCancel(); }
    var cancelBtn = overlay.querySelector('[data-modal-cancel]');
    var confirmBtn = overlay.querySelector('[data-modal-confirm]');
    overlay.addEventListener('click', overlayClick);
    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
  });
}

document.addEventListener('click', function(e) {
  const toggleId = e.target.getAttribute('data-toggle-notes');
  if (toggleId) {
    const row = document.getElementById('notes-' + toggleId);
    if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
  }
  var saveBtn = e.target.closest('[data-save]');
  const saveId = saveBtn && saveBtn.getAttribute('data-save');
  if (saveId) {
    const notesEl = document.querySelector('.lead-new-note[data-lead-id="' + saveId + '"]');
    const newNote = (notesEl && notesEl.value) || '';
    var lastEl = document.querySelector('.lead-last-contact[data-lead-id="' + saveId + '"]');
    var statusEl = document.querySelector('.lead-status[data-lead-id="' + saveId + '"]');
    const last = lastEl ? lastEl.value : null;
    const status = statusEl ? statusEl.value : null;
    var payload = {};
    if (newNote.trim()) payload.append_note = newNote;
    if (last) payload.last_contact_at = last;
    if (status) payload.status = status;
    fetch('/api/leads/' + saveId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then((resp) => {
      // Close notes panel
      var row = document.getElementById('notes-' + saveId);
      if (row) row.style.display = 'none';
      // Update notes count badge
      var list = document.querySelector('[data-notes-list-for="' + saveId + '"]');
      var badge = document.querySelector('[data-notes-count-for="' + saveId + '"]');
      if (list && newNote.trim()) {
        var author = document.querySelector('meta[name="csrf-token"]') ? 'You' : 'You';
        var when = new Date().toISOString().replace('T',' ').slice(0,19);
        var li = document.createElement('li');
        li.style.marginBottom = '6px';
        li.innerHTML = '<div>' + newNote.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' +
                       '<div style="font-size:12px;color:var(--gray-600);">by ' + author + ' • ' + when + '</div>';
        list.appendChild(li);
        if (badge) {
          var current = parseInt(badge.textContent || '0', 10) || 0;
          badge.textContent = String(current + 1);
        }
      }
      if (notesEl) notesEl.value = '';
    }).catch(() => {/* silent */});
  }
  var delBtn = e.target.closest('[data-delete-lead]');
  const delId = delBtn && delBtn.getAttribute('data-delete-lead');
  if (delId) {
    openConfirm().then(function(ok){
      if (!ok) return;
      fetch('/api/leads/' + delId, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } })
        .then(r => r.json())
        .then(resp => {
          if (resp && resp.success) {
            const row = delBtn.closest('tr');
            const notesRow = document.getElementById('notes-' + delId);
            if (notesRow) notesRow.remove();
            if (row) row.remove();
          } else {
            alert('Failed to delete');
          }
        })
        .catch(() => alert('Failed to delete'));
    });
  }
});

document.addEventListener('change', function(e) {
  if (e.target.matches('.lead-status')) {
    const id = e.target.getAttribute('data-lead-id');
    fetch('/api/leads/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ status: e.target.value })
    });
  }
  if (e.target.matches('.lead-last-contact')) {
    const id = e.target.getAttribute('data-lead-id');
    fetch('/api/leads/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ last_contact_at: e.target.value })
    });
  }
});


