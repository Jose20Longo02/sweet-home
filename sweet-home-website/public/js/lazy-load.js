// Lazy-load non-critical scripts when idle
// Note: home.js is loaded directly by home.ejs; do not add it here or it loads twice and throws "Identifier 'HOME_I18N' has already been declared"
(function() {
  'use strict';
  if (window.requestIdleCallback) {
    window.requestIdleCallback(function(){
      [].forEach(function(src){
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        document.body.appendChild(s);
      });
    });
  }
})();

