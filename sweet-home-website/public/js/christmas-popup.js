// Christmas Popup Handler
(function() {
  'use strict';

  // Check if Christmas mode is active
  const body = document.body;
  const isChristmasMode = body.getAttribute('data-icon-theme') === 'christmas';
  
  if (!isChristmasMode) {
    // If Christmas mode is disabled, clear the popup flag so it can show again when reactivated
    try {
      localStorage.removeItem('christmasPopupShown_christmas');
    } catch (e) {
      // localStorage not available, ignore
    }
    return; // Exit if not in Christmas mode
  }

  const popup = document.getElementById('christmas-popup');
  if (!popup) {
    console.log('Christmas popup: Popup element not found');
    return; // Exit if popup doesn't exist
  }
  
  console.log('Christmas popup: Found popup element, initializing...');

  // Use a key specific to Christmas mode activation
  // This allows the popup to show again when Christmas mode is reactivated
  const STORAGE_KEY = 'christmasPopupShown_christmas';
  const closeBtn = popup.querySelector('.christmas-popup__close');
  const overlay = popup.querySelector('.christmas-popup__overlay');

  // Check if popup has already been shown for this Christmas activation
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
  // Wait for DOM to be ready and then show after a short delay
  function initPopup() {
    setTimeout(function() {
      const hasBeenShown = hasPopupBeenShown();
      console.log('Christmas popup: Has been shown?', hasBeenShown);
      if (!hasBeenShown) {
        console.log('Christmas popup: Showing popup...');
        showPopup();
      } else {
        console.log('Christmas popup: Popup already shown, skipping');
      }
    }, 1000); // Show after 1 second delay
  }

  // Try multiple ways to ensure the popup shows
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    // DOM is already ready
    initPopup();
  }

  // Also try on window load as a fallback
  window.addEventListener('load', function() {
    if (!hasPopupBeenShown() && popup.style.display === 'none') {
      showPopup();
    }
  });

})();

