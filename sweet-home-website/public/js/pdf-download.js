// PDF Download Handler with Loading Indicator
(function() {
  'use strict';

  const loadingModal = document.getElementById('pdfLoadingModal');
  const downloadButtons = document.querySelectorAll('.js-download-expose');
  
  let isDownloading = false;

  function showLoadingModal() {
    if (loadingModal) {
      loadingModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      isDownloading = true;
    }
  }

  function hideLoadingModal() {
    if (loadingModal) {
      loadingModal.style.display = 'none';
      document.body.style.overflow = '';
      isDownloading = false;
    }
  }

  function disableButtons() {
    downloadButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    });
  }

  function enableButtons() {
    downloadButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
  }

  function downloadPDF(url, filename) {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          if (response.headers.get('content-type')?.includes('text/plain')) {
            return response.text().then(text => {
              throw new Error(text || `HTTP error! status: ${response.status}`);
            });
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'expose.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      });
  }

  function handleDownloadClick(event) {
    event.preventDefault();
    
    if (isDownloading) {
      return;
    }

    const button = event.currentTarget;
    const slug = button.getAttribute('data-slug');
    const type = button.getAttribute('data-type'); // 'property' or 'project'
    
    if (!slug || !type) {
      console.error('PDF download: Missing slug or type');
      return;
    }

    const url = `/${type === 'property' ? 'properties' : 'projects'}/${slug}/pdf`;
    const filename = `${type}-${slug}-expose.pdf`;

    // Show loading modal and disable buttons
    showLoadingModal();
    disableButtons();

    // Start download
    downloadPDF(url, filename)
      .then(() => {
        // Download successful
        hideLoadingModal();
        enableButtons();
      })
      .catch(error => {
        // Download failed
        console.error('PDF download error:', error);
        hideLoadingModal();
        enableButtons();
        
        // Show error message to user
        alert('Error downloading PDF: ' + (error.message || 'An unexpected error occurred. Please try again.'));
      });
  }

  // Add event listeners to all download buttons
  if (downloadButtons.length > 0) {
    downloadButtons.forEach(button => {
      button.addEventListener('click', handleDownloadClick);
    });
  }

})();
