// Initialize reCAPTCHA for project contact form (CSP-safe, no inline code)
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    try {
      var input = document.getElementById('recaptchaTokenProject');
      if (!input) return;
      var siteKey = input.getAttribute('data-site-key');
      if (!siteKey || !window.grecaptcha || typeof grecaptcha.ready !== 'function') return;
      grecaptcha.ready(function() {
        grecaptcha.execute(siteKey, { action: 'property_lead' }).then(function(token) {
          if (input) input.value = token;
        }).catch(function(_) {
          // silent
        });
      });
    } catch (_) {}
  });
})();


