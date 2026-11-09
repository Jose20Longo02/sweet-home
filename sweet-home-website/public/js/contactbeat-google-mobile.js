// V7. ContactBeat keeps its own widgets. This file does not retime them.
// It runs only for a first visit, on a phone, after an arrival from Google.
// Desktop visits and later visits are left completely alone.
// The corner button stays. A form opened from that button is never closed.
(function () {
  'use strict';

  var SESSION_CLASS = 'shContactbeatVisitClass';
  var GOOGLE_KEY = 'shContactbeatGoogleArrival';
  var SEEN_KEY = 'shContactbeatSeen';
  var visitorOpened = false;
  var watching = false;

  function isDesktop() {
    return window.matchMedia('(min-width: 1024px)').matches
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function googleHost(hostname) {
    var host = String(hostname || '').toLowerCase().replace(/^www\./, '');
    return /(^|\.)google\./.test(host);
  }

  function landedFromGoogle() {
    try {
      if (document.referrer && googleHost(new URL(document.referrer).hostname)) return true;
    } catch (e) { /* ignore a bad referrer */ }
    var params = new URLSearchParams(window.location.search);
    if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) return true;
    return (params.get('utm_source') || '').toLowerCase().indexOf('google') !== -1;
  }

  function shouldLimit() {
    try {
      if (!sessionStorage.getItem(SESSION_CLASS)) {
        var seen = localStorage.getItem(SEEN_KEY);
        sessionStorage.setItem(SESSION_CLASS, seen ? 'return' : 'new');
        localStorage.setItem(SEEN_KEY, '1');
      }
      if (landedFromGoogle()) sessionStorage.setItem(GOOGLE_KEY, '1');
      return sessionStorage.getItem(SESSION_CLASS) === 'new'
        && sessionStorage.getItem(GOOGLE_KEY) === '1'
        && !isDesktop();
    } catch (e) {
      return false;
    }
  }

  function eachShadow(fn) {
    var nodes = document.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].shadowRoot) fn(nodes[i].shadowRoot);
    }
  }

  function visibleDialogs() {
    var found = [];
    eachShadow(function (root) {
      var dialogs = root.querySelectorAll('[role="dialog"]');
      for (var i = 0; i < dialogs.length; i++) {
        var dialog = dialogs[i];
        var box = dialog.getBoundingClientRect();
        var style = window.getComputedStyle(dialog);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        if (box.width < 200 || box.height < 200) continue;
        found.push(dialog);
      }
    });
    return found;
  }

  function closeDialog(dialog) {
    var button = dialog.querySelector('.card__close, button[aria-label="Close"]');
    if (button) button.click();
  }

  function police() {
    if (visitorOpened || !shouldLimit()) return;
    visibleDialogs().forEach(closeDialog);
  }

  if (!shouldLimit()) return;

  watching = true;
  document.addEventListener('click', function (event) {
    if (!watching) return;
    var path = event.composedPath ? event.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node.classList && node.classList.contains('sticky-btn')) {
        visitorOpened = true;
        return;
      }
    }
  }, true);

  setInterval(police, 300);
})();
