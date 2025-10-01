// Initialize reCAPTCHA for project contact form (CSP-safe, no inline code)
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('recaptchaTokenProject');
    if (!input) return;
    var siteKey = input.getAttribute('data-site-key');
    if (!siteKey) return;

    function run() {
      try {
        grecaptcha.execute(siteKey, { action: 'property_lead' }).then(function(token) {
          if (input) input.value = token || '';
        }).catch(function() { /* ignore */ });
      } catch (_) {}
    }

    // Wait until grecaptcha is ready
    if (window.grecaptcha && typeof grecaptcha.ready === 'function') {
      grecaptcha.ready(run);
    } else {
      // Poll for grecaptcha if script loads later
      var tries = 0;
      var iv = setInterval(function() {
        tries += 1;
        if (window.grecaptcha && typeof grecaptcha.ready === 'function') {
          clearInterval(iv);
          grecaptcha.ready(run);
        } else if (tries > 20) {
          clearInterval(iv);
        }
      }, 250);
    }
  });
})();


