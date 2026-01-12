// Export functionality for superadmin leads page
(function() {
  function initExport() {
    console.log('[export-leads] init start');
    const exportBtn = document.getElementById('exportLeadsBtn');
    const exportModal = document.getElementById('exportModal');
    const exportModalClose = document.getElementById('exportModalClose');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');

    if (!exportBtn) { console.warn('[export-leads] button not found'); return; }
    if (!exportModal) { console.warn('[export-leads] modal not found'); return; }
    console.log('[export-leads] elements found');

    // Get current filter parameters from URL
    function getFilterParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      
      // Copy all filter parameters
      ['q', 'status', 'from', 'to', 'agentId', 'propertyId', 'projectId', 'leadType', 'leadKind'].forEach(key => {
        const value = urlParams.get(key);
        if (value) params.set(key, value);
      });
      
      return params.toString();
    }

    // Open export modal
    exportBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      exportModal.classList.add('show');
      exportModal.style.display = 'flex';
      console.log('[export-leads] open modal');
    });

    // Close export modal
    if (exportModalClose) {
      exportModalClose.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        exportModal.classList.remove('show');
        exportModal.style.display = 'none';
        console.log('[export-leads] close modal via X');
      });
    }

    // Close modal when clicking outside
    exportModal.addEventListener('click', function(e) {
      if (e.target === exportModal) {
        exportModal.classList.remove('show');
        exportModal.style.display = 'none';
        console.log('[export-leads] close modal via overlay');
      }
    });

    // Export as CSV
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const filterParams = getFilterParams();
        const url = '/superadmin/dashboard/leads/export?format=csv' + (filterParams ? '&' + filterParams : '');
        window.location.href = url;
        exportModal.classList.remove('show');
        exportModal.style.display = 'none';
        console.log('[export-leads] export CSV', url);
      });
    }

    // Export as Excel
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const filterParams = getFilterParams();
        const url = '/superadmin/dashboard/leads/export?format=excel' + (filterParams ? '&' + filterParams : '');
        window.location.href = url;
        exportModal.classList.remove('show');
        exportModal.style.display = 'none';
        console.log('[export-leads] export Excel', url);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExport);
  } else {
    initExport();
  }
  console.log('[export-leads] script loaded');
})();

