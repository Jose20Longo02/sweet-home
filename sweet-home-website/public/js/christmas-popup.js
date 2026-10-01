// Christmas popup: desktop exit intent, once per session.
// Never on a timer, never on mobile, never in the first moments after a Google arrival.
(function () {
  'use strict';

  var SESSION_KEY = 'christmasPopupShown';
  var GOOGLE_ARRIVAL_KEY = 'christmasPopupGoogleArrival';
  var GOOGLE_GRACE_MS = 45000;
  var body = document.body;
  var isChristmasMode = body && body.getAttribute('data-icon-theme') === 'christmas';

  if (!isChristmasMode) {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(GOOGLE_ARRIVAL_KEY);
      localStorage.removeItem('christmasPopupShown_christmas');
    } catch (e) { /* storage unavailable */ }
    return;
  }

  var popup = document.getElementById('christmas-popup');
  if (!popup) return;

  var closeBtn = popup.querySelector('.christmas-popup__close');
  var overlay = popup.querySelector('.christmas-popup__overlay');
  var armed = false;
  var open = false;

  function isDesktop() {
    return window.matchMedia('(min-width: 1024px)').matches
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function alreadyShown() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) { /* storage unavailable */ }
  }

  function googleHost(hostname) {
    var host = String(hostname || '').toLowerCase().replace(/^www\./, '');
    return /(^|\.)google\./.test(host);
  }

  function landedFromGoogle() {
    try {
      if (document.referrer && googleHost(new URL(document.referrer).hostname)) return true;
    } catch (e) { /* ignore bad referrer */ }
    var params = new URLSearchParams(window.location.search);
    if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) return true;
    return (params.get('utm_source') || '').toLowerCase().indexOf('google') !== -1;
  }

  function rememberGoogleArrival() {
    if (!landedFromGoogle()) return;
    try {
      if (!sessionStorage.getItem(GOOGLE_ARRIVAL_KEY)) {
        sessionStorage.setItem(GOOGLE_ARRIVAL_KEY, String(Date.now()));
      }
    } catch (e) { /* storage unavailable */ }
  }

  function googleGraceActive() {
    try {
      var arrived = sessionStorage.getItem(GOOGLE_ARRIVAL_KEY);
      if (!arrived) return false;
      return (Date.now() - Number(arrived)) < GOOGLE_GRACE_MS;
    } catch (e) {
      return landedFromGoogle();
    }
  }

  function showPopup() {
    if (open || alreadyShown() || !armed || !isDesktop() || googleGraceActive()) return;
    open = true;
    markShown();
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function hidePopup() {
    open = false;
    popup.style.display = 'none';
    document.body.style.overflow = '';
    markShown();
  }

  rememberGoogleArrival();

  document.addEventListener('mousemove', function () {
    armed = true;
  }, { once: true });

  document.addEventListener('mouseout', function (event) {
    if (event.relatedTarget || event.toElement) return;
    if (event.clientY > 0) return;
    showPopup();
  });

  if (closeBtn) closeBtn.addEventListener('click', hidePopup);
  if (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) hidePopup();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popup.style.display === 'flex') hidePopup();
  });

  window.addEventListener('resize', function () {
    if (!isDesktop() && popup.style.display === 'flex') hidePopup();
  });
})();
