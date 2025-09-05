// public/js/register.js
// Handles: area->position population, profile picture preview (HEIC-aware), email check, password match

document.addEventListener('DOMContentLoaded', function(){
  var areaRolesScript = document.getElementById('area-roles');
  var areaRoles = {};
  try {
    areaRoles = areaRolesScript ? JSON.parse(areaRolesScript.textContent || '{}') : {};
  } catch (_) { areaRoles = {}; }

  var areaSelect  = document.getElementById('areaSelect');
  var posSelect   = document.getElementById('positionSelect');
  var picInput    = document.getElementById('profile_picture');
  var picPreview  = document.getElementById('profilePreview');
  var emailInput  = document.getElementById('email');
  var emailError  = document.getElementById('emailError');
  var pw1         = document.getElementById('password');
  var pw2         = document.getElementById('passwordConfirm');
  var pwError     = document.getElementById('passwordError');
  var form        = document.querySelector('.auth-form');

  if (areaSelect && posSelect) {
    var populatePositions = function(selectedArea){
      var opts = (areaRoles && selectedArea && areaRoles[selectedArea]) ? areaRoles[selectedArea] : [];
      posSelect.innerHTML = '';
      if (opts && opts.length) {
        posSelect.disabled = false;
        posSelect.appendChild(new Option('-- Select Position --',''));
        opts.forEach(function(role){ posSelect.appendChild(new Option(role, role)); });
      } else {
        posSelect.disabled = true;
        posSelect.innerHTML = '<option>Choose an area first</option>';
      }
    };
    populatePositions(areaSelect.value);
    areaSelect.addEventListener('change', function(){ populatePositions(areaSelect.value); });
  }

  if (picInput && picPreview) {
    picInput.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if (!file) { picPreview.style.display = 'none'; return; }
      var name = (file.name || '').toLowerCase();
      var isHeic = name.endsWith('.heic') || name.endsWith('.heif');

      var loadHeic2Any = function(){
        return new Promise(function(resolve, reject){
          if (window.heic2any) return resolve(window.heic2any);
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
          s.onload = function(){ resolve(window.heic2any); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      };

      var reader = new FileReader();
      reader.onload = function(ev){
        (async function(){
          try {
            if (isHeic) {
              var heic2any = await loadHeic2Any();
              var inputBlob = new Blob([ev.target.result]);
              var outBlob = await heic2any({ blob: inputBlob, toType: 'image/jpeg', quality: 0.8 });
              if (picPreview.dataset.urlrev) URL.revokeObjectURL(picPreview.dataset.urlrev);
              var objUrl = URL.createObjectURL(outBlob);
              picPreview.dataset.urlrev = objUrl;
              picPreview.src = objUrl;
            } else {
              picPreview.src = ev.target.result;
            }
            picPreview.style.display = 'block';
          } catch (err) {
            try {
              var blob = new Blob([ev.target.result], { type: file.type || 'application/octet-stream' });
              var objUrl2 = URL.createObjectURL(blob);
              picPreview.src = objUrl2; picPreview.style.display = 'block';
            } catch (_) { picPreview.style.display = 'none'; }
          }
        })();
      };
      if (isHeic) reader.readAsArrayBuffer(file); else reader.readAsDataURL(file);
    });
  }

  if (pw1 && pw2 && pwError) {
    pw2.addEventListener('blur', function(){
      pwError.textContent = (pw1.value && pw1.value !== pw2.value) ? 'Passwords do not match' : '';
    });
  }

  if (emailInput && emailError) {
    emailInput.addEventListener('blur', function(){
      var email = (emailInput.value || '').trim();
      if (!email) { emailError.textContent = ''; return; }
      fetch('/auth/check-email?email=' + encodeURIComponent(email), { headers: { 'X-CSRF-Token': window.__CSRF_TOKEN__ || '' } })
        .then(function(resp){ return resp.ok ? resp.json() : { exists: false }; })
        .then(function(data){ emailError.textContent = data && data.exists ? 'Email already in use' : ''; })
        .catch(function(){ /* network error ignored */ });
    });
  }

  if (form) {
    var isSubmitting = false;
    var showSubmitting = function(){
      var overlay = document.getElementById('uploadOverlay');
      if (overlay) {
        // Ensure overlay escapes any stacking context by moving to <body>
        try { if (overlay.parentElement !== document.body) document.body.appendChild(overlay); } catch (_) {}
        overlay.style.zIndex = '20000';
        overlay.hidden = false;
        overlay.style.display = 'flex';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
      }
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent || '';
        submitBtn.textContent = 'Submitting...';
      }
    };

    // Show immediately on button click for better perceived feedback
    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.addEventListener('click', function(){
        if (isSubmitting) return;
        // Only show if native validation would pass
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
        isSubmitting = true;
        // Ensure paint before navigation
        requestAnimationFrame(showSubmitting);
      }, { capture: true });
    }

    // Fallback for Enter key submits or other programmatic submits
    form.addEventListener('submit', function(e){
      if (isSubmitting) { /* let it submit */ return; }
      var ok = true;
      if (pw1 && pw2 && pwError && pw1.value && pw1.value !== pw2.value) {
        pwError.textContent = 'Passwords do not match';
        ok = false;
      }
      if (emailError && emailError.textContent) ok = false;
      if (!ok) { e.preventDefault(); return false; }
      isSubmitting = true;
      showSubmitting();
    }, { capture: true });
  }
});


