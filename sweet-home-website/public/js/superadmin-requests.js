// public/js/superadmin-requests.js
// Show overlay with appropriate message when approving/rejecting account requests

document.addEventListener('DOMContentLoaded', function(){
  var overlay = document.getElementById('actionOverlay');
  var titleEl = document.getElementById('actionTitle');
  if (!overlay || !titleEl) return;

  function showOverlay(text){
    titleEl.textContent = text || 'Working...';
    overlay.hidden = false;
    overlay.style.display = 'flex';
  }

  // Attach to approve/reject forms
  var approveForms = document.querySelectorAll('form[action$="/approve"]');
  var rejectForms  = document.querySelectorAll('form[action$="/reject"]');

  approveForms.forEach(function(f){
    f.addEventListener('submit', function(){
      showOverlay('Approving...');
    }, { capture: true });
  });
  rejectForms.forEach(function(f){
    f.addEventListener('submit', function(){
      showOverlay('Rejecting...');
    }, { capture: true });
  });
});


