// U5. The live lead popup is ContactBeat (widget code e73dec), not our Christmas overlay.
// ContactBeat runs four widgets from its backoffice:
//   4254 sticky button, bottom left, opens only when tapped
//   4256 full-screen form after 45 seconds
//   4257 full-screen form on leave (exit intent)
//   4258 full-screen form after 35 seconds of inactivity
// The timed forms cover the article. This script leaves the sticky button,
// allows one desktop exit-intent form per session, and closes every other overlay.
(function () {
  'use strict';

  var SESSION_KEY = 'contactbeatExitShown';
  var GOOGLE_KEY = 'contactbeatGoogleArrival';
  var GOOGLE_GRACE_MS = 45000;
  var allowReason = '';
  var allowUntil = 0;
  var keptDialog = null;

  function isDesktop() {
    return window.matchMedia('(min-width: 1024px)').matches
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function storageGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) { /* storage unavailable */ }
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

  function rememberGoogleArrival() {
    if (!landedFromGoogle()) return;
    if (!storageGet(GOOGLE_KEY)) storageSet(GOOGLE_KEY, String(Date.now()));
  }

  function googleGraceActive() {
    var arrived = storageGet(GOOGLE_KEY);
    if (!arrived) return false;
    return (Date.now() - Number(arrived)) < GOOGLE_GRACE_MS;
  }

  function exitAlreadyShown() {
    return storageGet(SESSION_KEY) === '1';
  }

  function allow(reason) {
    allowReason = reason;
    allowUntil = Date.now() + 2500;
  }

  function canAcceptNew() {
    if (Date.now() > allowUntil) return false;
    if (allowReason === 'sticky') return true;
    return allowReason === 'exit' && isDesktop() && !googleGraceActive() && !exitAlreadyShown();
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
    var dialogs = visibleDialogs();
    if (keptDialog && dialogs.indexOf(keptDialog) === -1) keptDialog = null;
    var acceptNew = canAcceptNew() && !keptDialog;
    dialogs.forEach(function (dialog) {
      if (dialog === keptDialog) return;
      if (acceptNew) {
        keptDialog = dialog;
        acceptNew = false;
        if (allowReason === 'exit') storageSet(SESSION_KEY, '1');
        return;
      }
      closeDialog(dialog);
    });
  }

  rememberGoogleArrival();

  document.addEventListener('click', function (event) {
    var path = event.composedPath ? event.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node.classList && node.classList.contains('sticky-btn')) {
        allow('sticky');
        return;
      }
    }
  }, true);

  document.addEventListener('mouseout', function (event) {
    if (!isDesktop() || event.relatedTarget || event.clientY > 0) return;
    if (googleGraceActive() || exitAlreadyShown()) return;
    allow('exit');
  }, true);

  setInterval(police, 300);
})();
