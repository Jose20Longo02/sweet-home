// Christmas Popup Handler
(function() {
  'use strict';

  // Check if Christmas mode is active
  const body = document.body;
  const isChristmasMode = body.getAttribute('data-icon-theme') === 'christmas';
  
  if (!isChristmasMode) {
    return; // Exit if not in Christmas mode
  }

  const popup = document.getElementById('christmas-popup');
  if (!popup) {
    return; // Exit if popup doesn't exist
  }

  const STORAGE_KEY = 'christmasPopupShown';
  const closeBtn = popup.querySelector('.christmas-popup__close');
  const overlay = popup.querySelector('.christmas-popup__overlay');

  // Check if popup has already been shown
  function hasPopupBeenShown() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      // localStorage not available (private browsing, etc.)
      return false;
    }
  }

  // Mark popup as shown
  function markPopupAsShown() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      // localStorage not available, ignore
    }
  }

  // Show popup
  function showPopup() {
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  // Hide popup
  function hidePopup() {
    popup.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    markPopupAsShown();
  }

  // Close button click handler
  if (closeBtn) {
    closeBtn.addEventListener('click', hidePopup);
  }

  // Overlay click handler (close when clicking outside)
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        hidePopup();
      }
    });
  }

  // Escape key handler
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && popup.style.display === 'flex') {
      hidePopup();
    }
  });

  // Show popup if it hasn't been shown before
  // Wait a bit for page to load
  window.addEventListener('load', function() {
    setTimeout(function() {
      if (!hasPopupBeenShown()) {
        showPopup();
      }
    }, 1000); // Show after 1 second delay
  });

})();

