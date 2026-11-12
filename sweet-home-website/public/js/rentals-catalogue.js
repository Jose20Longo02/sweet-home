(function () {
  function toggleFilters(open) {
    var sidebar = document.getElementById('filtersSidebar');
    var overlay = document.getElementById('filtersOverlay');
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
  }

  var openButton = document.getElementById('filtersOpen');
  var closeButton = document.getElementById('filtersClose');
  var overlay = document.getElementById('filtersOverlay');
  if (openButton) openButton.addEventListener('click', function () { toggleFilters(true); });
  if (closeButton) closeButton.addEventListener('click', function () { toggleFilters(false); });
  if (overlay) overlay.addEventListener('click', function () { toggleFilters(false); });

  document.querySelectorAll('.filter-group.collapsible > h4').forEach(function (heading) {
    heading.addEventListener('click', function () {
      var group = heading.parentElement;
      if (group) group.classList.toggle('collapsed');
    });
  });

  var sort = document.getElementById('sortBy');
  var form = document.getElementById('rentalFilters');
  var sidebarDate = document.getElementById('availableFrom');
  var toolbarDate = document.getElementById('availableFromToolbar');
  function phoneFilters() {
    return window.matchMedia('(max-width: 1024px)').matches;
  }
  function syncMoveIn(source, target) {
    if (!source || !target || source.value === target.value) return;
    target.value = source.value;
  }
  function submitFilters() {
    if (!form) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.submit();
  }
  if (sidebarDate && toolbarDate) {
    sidebarDate.addEventListener('input', function () { syncMoveIn(sidebarDate, toolbarDate); });
    toolbarDate.addEventListener('input', function () { syncMoveIn(toolbarDate, sidebarDate); });
    sidebarDate.addEventListener('change', function () {
      syncMoveIn(sidebarDate, toolbarDate);
      submitFilters();
    });
    toolbarDate.addEventListener('change', function () {
      syncMoveIn(toolbarDate, sidebarDate);
      if (phoneFilters()) submitFilters();
    });
  }
  function dropEmptyFields() {
    if (!form) return;
    var fields = [sort].concat(Array.prototype.slice.call(form.querySelectorAll('input, select')));
    if (phoneFilters() && sidebarDate && toolbarDate) sidebarDate.value = toolbarDate.value;
    if (toolbarDate) toolbarDate.removeAttribute('name');
    fields.forEach(function (field) {
      if (!field || !field.name) return;
      var value = String(field.value || '').trim();
      if (!value || (field.name === 'sort' && value === 'rent_low')) field.removeAttribute('name');
    });
  }
  if (form) form.addEventListener('submit', dropEmptyFields);
  if (sort && form) {
    sort.addEventListener('change', function () {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    });
  }

  var grid = document.getElementById('rentalGrid');
  if (grid) {
    grid.addEventListener('click', function (event) {
      if (event.target.closest('a, button')) return;
      var card = event.target.closest('.property-card');
      var href = card && card.getAttribute('data-href');
      if (href) window.location.href = href;
    });
  }
})();
