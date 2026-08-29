(function () {
  'use strict';

  var SOURCE_SETTINGS = {
    email: { source: 'email', medium: 'email' },
    instagram: { source: 'instagram', medium: 'social' },
    facebook: { source: 'facebook', medium: 'social' },
    whatsapp: { source: 'whatsapp', medium: 'messaging' },
    linkedin: { source: 'linkedin', medium: 'social' },
    google: { source: 'google', medium: 'cpc' },
    other: { source: 'other', medium: 'referral' }
  };

  function slugify(value, fallback) {
    var normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    return normalized || fallback;
  }

  function getBaseUrl(form) {
    var input = form.querySelector('[data-campaign-base-url]');
    var raw = input ? input.value.trim() : (window.location.origin + window.location.pathname);
    if (!raw) return null;

    try {
      var url = /^https?:\/\//i.test(raw)
        ? new URL(raw)
        : new URL(raw, window.location.origin);
      url.hash = '';
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
        .forEach(function (key) { url.searchParams.delete(key); });
      return url;
    } catch (_) {
      return null;
    }
  }

  function generateLink(form) {
    var baseUrl = getBaseUrl(form);
    var sourceSelect = form.querySelector('[data-campaign-source]');
    var nameInput = form.querySelector('[data-campaign-name]');
    var contentSelect = form.querySelector('[data-campaign-content]');
    var resultWrap = form.querySelector('[data-campaign-result-wrap]');
    var resultInput = form.querySelector('[data-campaign-result]');
    var status = form.querySelector('[data-campaign-status]');
    var shareButton = form.querySelector('[data-campaign-share]');

    if (!baseUrl) {
      if (status) status.textContent = 'Please enter a valid page URL.';
      if (resultWrap) resultWrap.hidden = true;
      return null;
    }

    var sourceKey = sourceSelect ? sourceSelect.value : 'email';
    var settings = SOURCE_SETTINGS[sourceKey] || SOURCE_SETTINGS.other;
    var campaignName = slugify(nameInput && nameInput.value, 'campaign');
    var content = slugify(contentSelect && contentSelect.value, 'main_cta');

    if (nameInput) nameInput.value = campaignName;
    baseUrl.searchParams.set('utm_source', settings.source);
    baseUrl.searchParams.set('utm_medium', settings.medium);
    baseUrl.searchParams.set('utm_campaign', campaignName);
    baseUrl.searchParams.set('utm_content', content);

    var result = baseUrl.toString();
    if (resultInput) resultInput.value = result;
    if (resultWrap) resultWrap.hidden = false;
    if (status) status.textContent = 'Ready to copy and share.';
    if (shareButton && typeof navigator.share === 'function') shareButton.hidden = false;
    return result;
  }

  function setStatus(form, message) {
    var status = form.querySelector('[data-campaign-status]');
    if (status) status.textContent = message;
  }

  function copyText(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      var helper = document.createElement('textarea');
      helper.value = value;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (_) {}
      helper.remove();
      copied ? resolve() : reject(new Error('Copy failed'));
    });
  }

  function closeModal(root) {
    var modal = root.querySelector('[data-campaign-modal]');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function init(root) {
    var form = root.querySelector('[data-campaign-form]');
    if (!form) return;

    var defaultCampaign = slugify(
      form.getAttribute('data-campaign-default'),
      form.getAttribute('data-campaign-kind') + '_campaign'
    );
    var nameInput = form.querySelector('[data-campaign-name]');
    if (nameInput && !nameInput.value) nameInput.value = defaultCampaign;

    var openButton = root.querySelector('[data-campaign-open]');
    var modal = root.querySelector('[data-campaign-modal]');
    var closeButton = root.querySelector('[data-campaign-close]');
    var sourceSelect = form.querySelector('[data-campaign-source]');
    var contentSelect = form.querySelector('[data-campaign-content]');
    var copyButton = form.querySelector('[data-campaign-copy]');
    var shareButton = form.querySelector('[data-campaign-share]');

    if (openButton && modal) {
      openButton.addEventListener('click', function () {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        var firstInput = form.querySelector('select, input');
        if (firstInput) firstInput.focus();
      });
    }

    if (closeButton) closeButton.addEventListener('click', function () { closeModal(root); });
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal(root);
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      generateLink(form);
    });

    [sourceSelect, contentSelect].forEach(function (field) {
      if (field) field.addEventListener('change', function () { generateLink(form); });
    });

    if (copyButton) {
      copyButton.addEventListener('click', function () {
        var resultInput = form.querySelector('[data-campaign-result]');
        if (!resultInput || !resultInput.value) generateLink(form);
        resultInput = form.querySelector('[data-campaign-result]');
        if (!resultInput || !resultInput.value) return;
        copyText(resultInput.value)
          .then(function () { setStatus(form, 'Link copied to clipboard.'); })
          .catch(function () { setStatus(form, 'Select the link and copy it manually.'); });
      });
    }

    if (shareButton) {
      shareButton.addEventListener('click', function () {
        var result = generateLink(form);
        if (!result || typeof navigator.share !== 'function') return;
        navigator.share({
          title: 'Sweet Home campaign link',
          url: result
        }).catch(function () {});
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && modal.classList.contains('is-open')) {
        closeModal(root);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-campaign-tool]').forEach(init);
  });
})();
