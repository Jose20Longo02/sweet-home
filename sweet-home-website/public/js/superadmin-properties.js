document.addEventListener('DOMContentLoaded', () => {
  const dataNode = document.getElementById('mp-data');
  let LOCATIONS = {};
  try { LOCATIONS = JSON.parse(dataNode?.getAttribute('data-locations') || '{}'); } catch(_) { LOCATIONS = {}; }
  const countrySel = document.getElementById('countrySelect');
  const citySel    = document.getElementById('citySelect');
  const filterForm = document.getElementById('filterForm');

  if (countrySel && citySel && filterForm) {
    countrySel.addEventListener('change', () => {
      const country = countrySel.value;
      const cityObj = LOCATIONS[country] || {};
      const cities  = Object.keys(cityObj);
      citySel.innerHTML = '<option value="">All Cities</option>';
      if (cities.length) {
        cities.forEach(ct => {
          const opt = document.createElement('option');
          opt.value = ct;
          opt.textContent = ct;
          citySel.append(opt);
        });
        citySel.disabled = false;
      } else {
        citySel.disabled = true;
      }
      // Clear city selection when country changes (don't auto-submit)
      citySel.value = '';
    });
  }

  // Reassignment: submit only when the value actually changes
  document.querySelectorAll('form.reassign-form').forEach((f) => {
    const sel = f.querySelector('select[name="agent_id"]');
    if (!sel) return;
    let prevValue = sel.value;

    const submitForm = () => {
      if (f.__submitting) return;
      f.__submitting = true;
      const overlay = document.getElementById('reassignOverlay');
      if (overlay) { overlay.hidden = false; overlay.style.display = 'flex'; }
      if (typeof f.requestSubmit === 'function') {
        f.requestSubmit();
      } else {
        f.submit();
      }
    };

    sel.addEventListener('change', () => {
      if (sel.value !== prevValue) {
        submitForm();
        prevValue = sel.value;
      }
    });
  });
});


