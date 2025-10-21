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

// Handle message modal
function showMessageModal(message) {
  const modal = document.getElementById('messageModal');
  const content = document.getElementById('messageContent');
  if (modal && content) {
    content.textContent = decodeURIComponent(message);
    // Ensure proper positioning and overlay
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.zIndex = '9999';
    modal.style.background = 'rgba(0,0,0,0.45)';
  }
}

function hideMessageModal() {
  const modal = document.getElementById('messageModal');
  if (modal) {
    modal.style.display = 'none';
    // Reset any inline styles that might interfere
    modal.style.position = '';
    modal.style.top = '';
    modal.style.left = '';
    modal.style.width = '';
    modal.style.height = '';
    modal.style.zIndex = '';
    modal.style.background = '';
  }
}

// Add event listeners for message modal
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('messageModal');
  const closeBtn = document.getElementById('messageModalClose');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideMessageModal);
  }
  
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        hideMessageModal();
      }
    });
  }
});

document.addEventListener('click', function(e) {
  const showMessageId = e.target.getAttribute('data-show-message');
  if (showMessageId) {
    const message = e.target.getAttribute('data-message');
    if (message) {
      showMessageModal(message);
    }
  }
  
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
    const last = document.querySelector('.lead-last-contact[data-lead-id="' + saveId + '"]').value;
    const status = document.querySelector('.lead-status[data-lead-id="' + saveId + '"]').value;
    fetch('/api/leads/' + saveId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ append_note: newNote, last_contact_at: last, status })
    }).then(r => r.json()).then(() => {
      var row = document.getElementById('notes-' + saveId);
      if (row) row.style.display = 'none';
      var list = document.querySelector('[data-notes-list-for="' + saveId + '"]');
      var badge = document.querySelector('[data-notes-count-for="' + saveId + '"]');
      if (list && newNote.trim()) {
        var author = 'You';
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
  if (e.target.matches('.lead-agent')) {
    const id = e.target.getAttribute('data-lead-id');
    const agentId = e.target.value;
    fetch('/api/leads/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ agent_id: agentId })
    }).then(function(r){ if (!r.ok) throw new Error('Failed to assign'); return r.json(); }).catch(function(){
      alert('Failed to assign');
    });
  }
});


