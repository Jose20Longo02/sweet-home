(function () {
  var typeEl = document.getElementById('energy_certificate_type');
  var details = document.getElementById('energyDetails');
  var valueText = document.getElementById('energyValueText');
  var valueInput = document.getElementById('energy_value');
  if (!typeEl || !details) return;

  function sync() {
    var type = typeEl.value;
    var show = type === 'demand' || type === 'consumption';
    details.hidden = !show;
    details.querySelectorAll('[data-energy-required]').forEach(function (el) {
      if (show) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
    if (valueText && valueInput) {
      var label = type === 'consumption'
        ? valueInput.getAttribute('data-consumption-label')
        : valueInput.getAttribute('data-demand-label');
      valueText.textContent = label;
    }
  }

  typeEl.addEventListener('change', sync);
  sync();

  var boxes = document.querySelectorAll('input[name="energy_sources"]');
  boxes.forEach(function (box) {
    box.addEventListener('change', function () {
      if (box.value === 'none' && box.checked) {
        boxes.forEach(function (other) {
          if (other !== box) other.checked = false;
        });
        return;
      }
      if (box.checked && box.value !== 'none') {
        boxes.forEach(function (other) {
          if (other.value === 'none') other.checked = false;
        });
      }
    });
  });
})();
