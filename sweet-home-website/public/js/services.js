(function(){
  // Load localized strings
  let S_I18N = {};
  try {
    const el = document.getElementById('i18n-services');
    if (el) S_I18N = JSON.parse(el.getAttribute('data-i18n') || '{}');
  } catch (_) {}
  const get = (p, fb) => { try { return p.split('.').reduce((o,k)=>(o&&o[k]!==undefined?o[k]:undefined), S_I18N) ?? fb; } catch(_){ return fb; } };
  const tabs = Array.from(document.querySelectorAll('#serviceTabs [role="tab"]'));
  const panel = document.getElementById('panel-service');
  const titleEl = document.getElementById('serviceTitle');
  const copyEl = document.getElementById('serviceCopy');
  const imageEl = document.getElementById('serviceImage');
  const ctaEl = document.getElementById('serviceCTA');
  const indicator = document.querySelector('.tab-indicator');

  const services = [
    {
      id: 'consulting',
      title: get('services.consulting.title','Property Consulting'),
      copy: get('services.consulting.copy',''),
      image: '/images/property-consulting.jpg',
      ctaHref: '#contact'
    },
    {
      id: 'management',
      title: get('services.management.title','Property Management'),
      copy: get('services.management.copy',''),
      image: '/images/property-management.jpg',
      ctaHref: '#contact'
    },
    {
      id: 'finance',
      title: get('services.finance.title','Financial Services'),
      copy: get('services.finance.copy',''),
      image: '/images/financial.services.jpg',
      ctaHref: '#contact'
    }
  ];

  function activateTab(newTab){
    tabs.forEach(t => {
      const selected = t === newTab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      t.classList.toggle('is-active', selected);
    });
    // Move indicator smoothly above active tab
    if (indicator) {
      const rect = newTab.getBoundingClientRect();
      const parentRect = newTab.parentElement.getBoundingClientRect();
      const centerX = rect.left + rect.width/2 - parentRect.left;
      const halfArrow = 10; // triangle half width from CSS borders
      indicator.style.transform = `translateX(${centerX - halfArrow}px)`;
    }
    const id = (newTab.id || '').replace('tab-','');
    const svc = services.find(s => newTab.id.includes(s.id)) || services[0];
    // Simple fade
    panel.classList.add('is-swapping');
    setTimeout(() => {
      titleEl.textContent = svc.title;
      copyEl.textContent = svc.copy;
      imageEl.style.backgroundImage = svc.image ? `url('${svc.image}')` : '';
      ctaEl.href = svc.ctaHref || '#contact';
      ctaEl.textContent = get('services.cta','Contact Us!');
      panel.classList.remove('is-swapping');
    }, 200);
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      const current = tabs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight'){ e.preventDefault(); const n = (current+1)%tabs.length; tabs[n].focus(); activateTab(tabs[n]); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); const n = (current-1+tabs.length)%tabs.length; tabs[n].focus(); activateTab(tabs[n]); }
      if (e.key === 'Home'){ e.preventDefault(); tabs[0].focus(); activateTab(tabs[0]); }
      if (e.key === 'End'){ e.preventDefault(); tabs[tabs.length-1].focus(); activateTab(tabs[tabs.length-1]); }
    });
  });

  // Position indicator on load
  const active = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
  if (active) setTimeout(() => activateTab(active), 0);

  // Recenter indicator on resize
  window.addEventListener('resize', () => {
    const current = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    if (current) activateTab(current);
  });

  // Contact form behavior
  const form = document.getElementById('servicesContactForm');
  if (form){
    const setError = (id, msg) => {
      const el = document.getElementById(id);
      const err = form.querySelector(`.error[data-for="${id}"]`);
      if (!err || !el) return;
      err.textContent = msg || '';
    };
    const validate = () => {
      let ok = true;
      const required = ['firstName','lastName','countryCode','phoneNumber','email','language'];
      required.forEach(id => {
        const v = (document.getElementById(id)?.value || '').trim();
        if (!v){ setError(id, 'Required'); ok=false; } else setError(id, '');
      });
      const email = document.getElementById('email')?.value || '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setError('email','Invalid'); ok=false; }
      return ok;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      if (!validate()) { status.style.display='block'; status.textContent=i18nGetServices('form.fix','Please fill the required fields.'); return; }
      const submitBtn = form.querySelector('.btn-submit');
      submitBtn.disabled = true; submitBtn.style.opacity = '0.7';
      try{
        const payload = {
          name: `${form.firstName.value.trim()} ${form.lastName.value.trim()}`.trim(),
          email: form.email.value.trim(),
          phone: `${form.countryCode.value.trim()} ${form.phoneNumber.value.trim()}`.trim(),
          message: (form.message.value || '').trim(),
          lead_type: 'unknown',
          language: form.language.value || ''
        };
        const res = await fetch('/api/leads/contact', {
          method:'POST', headers:{ 'Content-Type':'application/json', 'CSRF-Token': form._csrf.value },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed');
        status.style.display='block'; status.textContent=i18nGetServices('form.successShort','Thanks! We will contact you shortly.');
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = i18nGetServices('form.successToast','Thank you! Your message was successfully sent.');
          toast.classList.remove('error');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }
        form.reset();
      } catch(err){
        status.style.display='block'; status.textContent=i18nGetServices('form.errorStatus','There was a problem. Please try again.');
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = i18nGetServices('form.errorToast','Something went wrong. Please try again later.');
          toast.classList.add('error','show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }
      } finally {
        submitBtn.disabled = false; submitBtn.style.opacity = '1';
      }
    });
  }

  // Fancy tilt on desktop for the frosted panel
  (function initPanelParallax(){
    const panelEl = document.querySelector('.service-panel');
    if (!panelEl) return;
    let raf = null;
    function onMove(e){
      if (window.innerWidth < 1025) return; // desktop only
      const rect = panelEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;  // 0..1
      const y = (e.clientY - rect.top) / rect.height;  // 0..1
      const rotateY = (x - 0.5) * 6; // tilt left/right up to 6deg
      const rotateX = (0.5 - y) * 6; // tilt up/down up to 6deg
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        panelEl.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    }
    function reset(){
      if (raf) cancelAnimationFrame(raf);
      panelEl.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    }
    panelEl.addEventListener('mousemove', onMove);
    panelEl.addEventListener('mouseleave', reset);
    window.addEventListener('scroll', reset, { passive:true });
    window.addEventListener('resize', reset);
  })();
})();


