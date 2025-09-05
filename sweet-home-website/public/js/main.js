// Mobile sidebar toggle for superadmin dashboard
document.addEventListener('DOMContentLoaded', function () {
  // Expose CSRF token for generic fetch calls
  window.__CSRF_TOKEN__ = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

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

  // Language dropdown (no inline JS)
  (function initLanguageDropdown(){
    const trigger = document.querySelector('.lang-switcher .lang-trigger');
    const menu = document.getElementById('lang-menu');
    if (!trigger || !menu) return;
    function closeMenu(){
      menu.classList.remove('open');
      trigger.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-hidden','true');
      document.removeEventListener('click', outside, true);
      document.removeEventListener('keydown', onKey, true);
    }
    function outside(e){ if (!menu.contains(e.target) && !trigger.contains(e.target)) closeMenu(); }
    function onKey(e){ if (e.key === 'Escape') closeMenu(); }
    trigger.addEventListener('click', function(){
      const open = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        // Defer binding to next tick to avoid capturing the same click that opened it
        setTimeout(function(){
          document.addEventListener('click', outside, true);
          document.addEventListener('keydown', onKey, true);
        }, 0);
      }
    });
  })();

  // Delegated fallback (in case markup loads differently)
  document.addEventListener('click', function(e){
    const trg = e.target.closest && e.target.closest('.lang-trigger');
    const menu = document.getElementById('lang-menu');
    if (trg && menu) {
      e.preventDefault();
      const isOpen = menu.classList.contains('open');
      if (isOpen) {
        menu.classList.remove('open');
        trg.setAttribute('aria-expanded','false');
        menu.setAttribute('aria-hidden','true');
      } else {
        menu.classList.add('open');
        trg.setAttribute('aria-expanded','true');
        menu.setAttribute('aria-hidden','false');
      }
    }
  }, false);

  // Language dropdown (no inline JS)
  (function initLanguageDropdown(){
    const trigger = document.querySelector('.lang-switcher .lang-trigger');
    const menu = document.getElementById('lang-menu');
    if (!trigger || !menu) return;
    function closeMenu(){
      menu.classList.remove('open');
      trigger.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-hidden','true');
      document.removeEventListener('click', outside, true);
      document.removeEventListener('keydown', onKey, true);
    }
    function outside(e){ if (!menu.contains(e.target) && !trigger.contains(e.target)) closeMenu(); }
    function onKey(e){ if (e.key === 'Escape') closeMenu(); }
    trigger.addEventListener('click', function(){
      const open = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        document.addEventListener('click', outside, true);
        document.addEventListener('keydown', onKey, true);
      }
    });
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


