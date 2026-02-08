// Mobile sidebar toggle for superadmin dashboard
document.addEventListener('DOMContentLoaded', function () {
  // Expose CSRF token for generic fetch calls
  window.__CSRF_TOKEN__ = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // Header solidify on scroll (for pages with .site-header.gradient: transparent -> white)
  (function initHeaderShrink() {
    const header = document.querySelector('.site-header.gradient');
    if (!header) return;
    function updateHeader() {
      const threshold = 40;
      if (window.scrollY > threshold) header.classList.add('shrink');
      else header.classList.remove('shrink');
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  })();

  // Header mobile menu toggle
  (function initSiteHeaderMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const mobile = document.getElementById('mobile-menu');
    if (!toggle || !mobile) return;
    toggle.addEventListener('click', function () {
      const open = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobile.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.classList.toggle('active', open);
    });
  })();

  // Adjust main top padding to sit below fixed header on pages using the dark header
  (function adjustMainOffset() {
    function applyOffset() {
      const header = document.querySelector('.site-header');
      const main = document.querySelector('main.main-offset');
      if (!header || !main) return;
      const h = header.offsetHeight || 0;
      // Add a small buffer for gradients/shadows
      main.style.paddingTop = (h + 8) + 'px';
    }
    applyOffset();
    window.addEventListener('resize', applyOffset, { passive: true });
  })();

  // Language dropdown (run on DOMContentLoaded; retry once if elements not found yet)
  (function initLanguageDropdown(){
    function setup(){
      const trigger = document.querySelector('.lang-switcher .lang-trigger');
      const menu = document.querySelector('.lang-switcher .lang-menu') || document.getElementById('lang-menu');
      if (!trigger || !menu) return false;
      function closeMenu(){
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded','false');
        menu.setAttribute('aria-hidden','true');
        document.removeEventListener('click', outside, true);
        document.removeEventListener('keydown', onKey, true);
      }
      function outside(e){ if (!menu.contains(e.target) && !trigger.contains(e.target)) closeMenu(); }
      function onKey(e){ if (e.key === 'Escape') closeMenu(); }
      trigger.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        const open = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) {
          setTimeout(function(){ document.addEventListener('click', outside, true); document.addEventListener('keydown', onKey, true); }, 0);
        }
      });
      menu.addEventListener('click', function(e){
        const langOption = e.target.closest('.lang-option');
        if (!langOption) return;
        if (langOption.classList.contains('is-active')) { e.preventDefault(); closeMenu(); return; }
        closeMenu();
      });
      return true;
    }
    if (!setup()) setTimeout(setup, 100);
  })();

  const panel = document.querySelector('.admin-panel');
  const toggle = document.querySelector('.mobile-nav-toggle');
  const overlay = document.querySelector('.admin-overlay');
  const sidebar = document.getElementById('superadmin-sidebar');
  if (!(panel && toggle && overlay && sidebar)) return;

  function openSidebar() {
    panel.classList.add('sidebar-open');
    toggle.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeSidebar() {
    panel.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }
  toggle.addEventListener('click', function () {
    if (panel.classList.contains('sidebar-open')) closeSidebar(); else openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeSidebar();
  });
});


