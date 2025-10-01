(function() {
  // Load i18n for owners page
  let O_I18N = {};
  try {
    const el = document.getElementById('i18n-owners');
    if (el) O_I18N = JSON.parse(el.getAttribute('data-i18n') || '{}');
  } catch (_) {}
  const t = (path, fallback) => {
    try { return path.split('.').reduce((o,k)=>(o&&o[k]!==undefined?o[k]:undefined), O_I18N) ?? fallback; } catch(_){ return fallback; }
  };
  /* Recently Sold infinite track */
  const carousel = document.getElementById('soldCarousel');
  if (carousel) {
    const track = carousel.querySelector('.sold-track');
    if (track) {
      // Duplicate children to enable seamless loop
      const items = Array.from(track.children);
      items.forEach(node => track.appendChild(node.cloneNode(true)));
      // Optional: speed via data attribute (seconds)
      const speed = Number(carousel.getAttribute('data-speed') || 30);
      track.style.setProperty('--sold-duration', `${Math.max(10, speed)}s`);

      // Pause on hover for accessibility/UX
      let isPaused = false;
      const pause = () => { if (!isPaused) { track.style.animationPlayState = 'paused'; isPaused = true; } };
      const resume = () => { if (isPaused) { track.style.animationPlayState = 'running'; isPaused = false; } };
      carousel.addEventListener('mouseenter', pause);
      carousel.addEventListener('mouseleave', resume);
      carousel.addEventListener('focusin', pause);
      carousel.addEventListener('focusout', resume);
    }
  }

  /* Lead form behavior */
  const form = document.getElementById('ownersLeadForm');
  if (!form) return;

  /** Helpers **/
  const setError = (id, message) => {
    const input = document.getElementById(id);
    const msg = form.querySelector(`.error[data-for="${id}"]`);
    if (!input || !msg) return;
    if (message) {
      input.classList.add('invalid');
      msg.textContent = message;
    } else {
      input.classList.remove('invalid');
      msg.textContent = '';
    }
  };

  const validate = () => {
    let valid = true;
    const name = document.getElementById('fullName');
    const cc = document.getElementById('countryCode');
    const phone = document.getElementById('phone');
    const email = document.getElementById('email');
    const language = document.getElementById('language');

    if (!name.value.trim()) { setError('fullName', t('validation.fullName','Please enter your full name')); valid = false; } else setError('fullName');
    if (!cc.value.trim()) { setError('countryCode', t('validation.countryCode','Please enter a country code')); valid = false; } else setError('countryCode');
    if (!phone.value.trim()) { setError('phone', t('validation.phone','Please enter a phone number')); valid = false; } else setError('phone');
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setError('email', t('validation.email','Enter a valid email address')); valid = false; } else setError('email');
    if (!language.value.trim()) { setError('language', t('validation.language','Select a language')); valid = false; } else setError('language');

    return valid;
  };

  ['fullName','countryCode','phone','email','language'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', () => validate());
    el && el.addEventListener('change', () => validate());
  });

  // Honeypot field for anti-spam
  let honey = form.querySelector('input[name="website"]');
  if (!honey) {
    honey = document.createElement('input');
    honey.type = 'text';
    honey.name = 'website';
    honey.autocomplete = 'off';
    honey.tabIndex = -1;
    honey.style.position = 'absolute';
    honey.style.left = '-9999px';
    form.appendChild(honey);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    if (!validate()) { status && (status.style.display = 'block', status.textContent = t('form.fixErrors','Please fix the errors above.')); return; }
    if (honey && honey.value) { return; } // bot filled honeypot

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    // Include recaptcha token if present; if missing try to generate
    if (!payload.recaptchaToken) {
      const rt = document.getElementById('recaptchaTokenOwners');
      if (rt && rt.value) payload.recaptchaToken = rt.value;
      if (!payload.recaptchaToken && window.grecaptcha && typeof grecaptcha.execute === 'function') {
        const siteKey = rt && rt.getAttribute('data-site-key');
        if (siteKey && typeof grecaptcha.ready === 'function') {
          try {
            await new Promise((resolve)=>{
              grecaptcha.ready(function(){
                grecaptcha.execute(siteKey, { action: 'owners_lead' }).then(function(token){
                  payload.recaptchaToken = token || '';
                  resolve();
                }).catch(function(){ resolve(); });
              });
            });
          } catch(_) {}
        }
      }
    }

    try {
      status && (status.style.display = 'block', status.textContent = t('form.sending','Sending...'));
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }
      const res = await fetch('/api/leads/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': payload._csrf || document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'x-csrf-token': payload._csrf || document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: `${payload.countryCode || ''} ${payload.phone || ''}`.trim(),
          message: `For Sellers page SELLER lead`,
          lead_type: 'seller',
          language: payload.language || ''
        })
      });
      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      status.textContent = data && data.success ? t('form.successShort','Thanks! We will reach out shortly.') : t('form.submitted','Submission received.');
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = t('form.successToast','Thank you! Your message was successfully sent.');
        toast.classList.remove('error');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
      form.reset();
    } catch (err) {
      status && (status.style.display = 'block', status.textContent = t('form.errorStatus','There was a problem. Please try again.'));
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = t('form.errorToast','Something went wrong. Please try again later.');
        toast.classList.add('error','show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
    }
  });
})();


