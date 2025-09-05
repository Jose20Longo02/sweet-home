// public/js/auth-reset.js
document.addEventListener('DOMContentLoaded', function(){
  var form = document.querySelector('.auth-form');
  var btn  = form && form.querySelector('button[type="submit"]');
  function showOverlay(){
    var overlay = document.getElementById('resetOverlay');
    if (overlay) {
      try { if (overlay.parentElement !== document.body) document.body.appendChild(overlay); } catch (_) {}
      overlay.style.zIndex = '20000';
      overlay.hidden = false;
      overlay.style.display = 'flex';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-live', 'polite');
      overlay.setAttribute('aria-busy', 'true');
    }
  }
  if (btn) {
    btn.addEventListener('click', function(){
      if (form && typeof form.checkValidity === 'function' && !form.checkValidity()) return;
      requestAnimationFrame(showOverlay);
    }, { capture: true });
  }
  if (form) {
    form.addEventListener('submit', function(){ showOverlay(); }, { capture: true });
  }
});


