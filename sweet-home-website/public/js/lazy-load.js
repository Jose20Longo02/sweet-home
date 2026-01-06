// Lazy-load non-critical scripts when idle
(function() {
  'use strict';
  if (window.requestIdleCallback) {
    window.requestIdleCallback(function(){
      [
        '/js/home.js'
      ].forEach(function(src){
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        document.body.appendChild(s);
      });
    });
  }
})();

