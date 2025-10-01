(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var input = document.getElementById('recaptchaTokenServices');
    if (!input) return;
    var siteKey = input.getAttribute('data-site-key');
    if (!siteKey) return;

    function run(){
      try {
        grecaptcha.execute(siteKey, { action: 'contact' }).then(function(token){
          if (input) input.value = token || '';
        }).catch(function(){});
      } catch(_){}
    }

    if (window.grecaptcha && typeof grecaptcha.ready === 'function') {
      grecaptcha.ready(run);
    } else {
      var tries = 0;
      var iv = setInterval(function(){
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


