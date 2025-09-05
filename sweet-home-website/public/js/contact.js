(()=>{
  const card = document.querySelector('.office-card');
  if (!card) return;

  const shine = card.querySelector('.shine');
  let raf = null;

  function onMove(e){
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;  // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1

    const rotateX = (0.5 - y) * 8; // tilt range
    const rotateY = (x - 0.5) * 10;
    const tx = (x - 0.5) * 8;
    const ty = (y - 0.5) * 6;

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${tx}px, ${ty}px)`;
      if (shine) {
        shine.style.opacity = '1';
        const cx = x * 100;
        const cy = y * 100;
        shine.style.background = `radial-gradient(600px 600px at ${cx}% ${cy}%, rgba(255,255,255,.20), rgba(255,255,255,0) 45%)`;
      }
    });
  }

  function onEnter(){ card.classList.add('hovering'); if (shine) shine.style.opacity = '1'; }
  function onLeave(){ card.classList.remove('hovering'); card.style.transform = ''; if (shine) shine.style.opacity = '0'; }

  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerenter', onEnter);
  card.addEventListener('pointerleave', onLeave);
})();

// Handle contact form submission with user-friendly feedback
(()=>{
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const submitBtn = form.querySelector('button[type="submit"]');

  const messageEl = document.createElement('div');
  messageEl.className = 'form-message';
  form.appendChild(messageEl);

  form.addEventListener('submit', async (e) => {
    try {
      e.preventDefault();
      messageEl.className = 'form-message';
      messageEl.textContent = '';
      submitBtn.disabled = true;

      const body = new FormData(form);
      // Add lead_type and language mapping
      if (!body.get('lead_type')) body.set('lead_type', 'unknown');
      const langSelect = form.querySelector('#language');
      if (langSelect) body.set('language', langSelect.value || '');

      // Capture UTM, referrer, and path
      const params = new URLSearchParams(location.search);
      const setIf = (key, val) => { if (!body.get(key) && val) body.set(key, val); };
      setIf('utm_source', params.get('utm_source'));
      setIf('utm_medium', params.get('utm_medium'));
      setIf('utm_campaign', params.get('utm_campaign'));
      setIf('utm_term', params.get('utm_term'));
      setIf('utm_content', params.get('utm_content'));
      setIf('referrer', document.referrer);
      setIf('page_path', location.pathname);

      // Combine country code and phone if both present
      const country = body.get('countryCode') || '';
      const rawPhone = body.get('phone') || '';
      if (country || rawPhone) {
        body.set('phone', `${country} ${rawPhone}`.trim());
      }

      // Ensure recaptcha token exists if site key is provided
      var siteKey = form.getAttribute('data-recaptcha-site-key');
      if (siteKey && window.grecaptcha && typeof grecaptcha.execute === 'function') {
        try {
          const token = await grecaptcha.execute(siteKey, { action: 'contact' });
          if (!body.get('recaptchaToken')) body.set('recaptchaToken', token || '');
        } catch (_) { /* ignore; server will validate */ }
      }

      // Convert to application/x-www-form-urlencoded so Express can parse (no multipart)
      const urlBody = new URLSearchParams();
      for (const [k, v] of body.entries()) {
        urlBody.append(k, v);
      }

      const res = await fetch('/api/leads/contact', {
        method: 'POST',
        headers: {
          'x-csrf-token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: urlBody.toString()
      });
      const data = await res.json().catch(()=>({ success:false }));
      if (res.ok && data && data.success) {
        messageEl.classList.add('success');
        messageEl.textContent = (window.i18nGetHome ? i18nGetHome('contact.sent','Thank you! Your message has been sent successfully.') : 'Thank you! Your message has been sent successfully.');
        form.reset();
      } else {
        throw new Error((data && data.message) || 'Unable to send your message. Please try again.');
      }
    } catch (err) {
      messageEl.classList.add('error');
      messageEl.textContent = err.message || 'Something went wrong. Please try again later.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();


