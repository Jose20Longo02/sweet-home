// Project Detail Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the page
  initializeProjectDetail();
});

function initializeProjectDetail() {
  // Initialize gallery functionality
  initializeGallery();
  
  // Initialize contact form
  initializeContactForm();
  relocateProjectContactOnMobile();
  
  // Initialize smooth scrolling
  initializeSmoothScrolling();
  
  // Initialize related project interactions
  initializeRelatedProjects();
}

// Gallery Functionality
function initializeGallery() {
  const mainImage = document.getElementById('main-image') || document.getElementById('mainVideo');
  const thumbnails = document.querySelectorAll('.thumbnail');
  const prevBtn = document.querySelector('.gallery-nav.prev');
  const nextBtn = document.querySelector('.gallery-nav.next');
  
  if (!mainImage || thumbnails.length === 0) return;

  // Wire play overlay if present
  setupVideoOverlayAndPoster();
  
  // Handle thumbnail clicks
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      const type = this.dataset.type || 'image';
      const idx = this.dataset.index;
      if (type === 'video') {
        showMainVideo(this.dataset.videoUrl);
      } else {
        const photoSrc = this.dataset.photo;
        updateMainImage(photoSrc, idx);
      }
      
      // Update active thumbnail
      updateActiveThumbnail(idx);
    });
  });
  
  // Add keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
      navigateGallery('prev');
    } else if (e.key === 'ArrowRight') {
      navigateGallery('next');
    }
  });
  
  // Hook up on-screen arrows if present
  if (prevBtn) prevBtn.addEventListener('click', () => navigateGallery('prev'));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateGallery('next'));

  // Add touch/swipe support for mobile
  initializeTouchSupport();
}

function updateMainImage(photoSrc, photoIndex) {
  const container = document.querySelector('.gallery-main');
  if (!container) return;
  const current = document.getElementById('main-image') || document.getElementById('mainVideo');
  if (current) current.style.opacity = '0';

  setTimeout(() => {
    // Remove existing img or picture entirely
    const existingPicture = container.querySelector('picture');
    const existingImg = container.querySelector('#main-image');
    const existingVideo = container.querySelector('#mainVideo');
    const existingOverlay = container.querySelector('.video-play-overlay');
    if (existingPicture) existingPicture.remove();
    if (existingImg) existingImg.remove();
    if (existingVideo) existingVideo.remove();
    if (existingOverlay) existingOverlay.remove();

    const img = document.createElement('img');
    img.id = 'main-image';
    img.className = 'main-image';
    img.alt = document.querySelector('.project-title') ? document.querySelector('.project-title').textContent : 'Project photo';
    img.decoding = 'async';
    img.src = photoSrc;
    container.insertBefore(img, container.firstChild);

    // Fade in
    requestAnimationFrame(() => { img.style.opacity = '1'; });
  }, 150);
}

function showMainVideo(videoUrl) {
  const container = document.querySelector('.gallery-main');
  if (!container) return;
  const current = document.getElementById('main-image') || document.getElementById('mainVideo');
  if (current) current.style.opacity = '0';

  setTimeout(() => {
    const existingPicture = container.querySelector('picture');
    const existingImg = container.querySelector('#main-image');
    const existingVideo = container.querySelector('#mainVideo');
    const existingOverlay = container.querySelector('.video-play-overlay');
    if (existingPicture) existingPicture.remove();
    if (existingImg) existingImg.remove();
    if (existingVideo) existingVideo.remove();
    if (existingOverlay) existingOverlay.remove();

    const vid = document.createElement('video');
    vid.id = 'mainVideo';
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    vid.style.width = '100%';
    vid.style.height = '100%';
    vid.style.objectFit = 'contain';
    const src = document.createElement('source');
    src.src = videoUrl;
    src.type = 'video/mp4';
    vid.appendChild(src);
    container.insertBefore(vid, container.firstChild);

    // Add play overlay button
    const btn = document.createElement('button');
    btn.className = 'video-play-overlay';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Play video');
    btn.innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="2" /><polygon points="26,20 26,44 46,32" fill="white" /></svg>';
    container.appendChild(btn);

    // Wire events
    btn.addEventListener('click', function(){ try { vid.play(); } catch (_) {} btn.style.display = 'none'; });
    vid.addEventListener('play', function(){ btn.style.display = 'none'; });
    vid.addEventListener('pause', function(){ btn.style.display = 'flex'; btn.dataset.shownAt = String(Date.now()); });
    // Show overlay initially
    btn.style.display = 'flex';
    // Do not add a manual click toggle; rely on native controls click behavior

    // Generate poster from 1s
    tryGeneratePoster(vid, 1);

    requestAnimationFrame(() => { vid.style.opacity = '1'; });
  }, 150);
}

function setupVideoOverlayAndPoster() {
  const vid = document.getElementById('mainVideo');
  const overlay = document.querySelector('.video-play-overlay');
  if (vid && overlay) {
    overlay.addEventListener('click', function(){ try { vid.play(); } catch (_) {} overlay.style.display = 'none'; });
    vid.addEventListener('play', function(){ overlay.style.display = 'none'; });
    vid.addEventListener('pause', function(){ overlay.style.display = 'flex'; overlay.dataset.shownAt = String(Date.now()); });
    tryGeneratePoster(vid, 1);
    // Ensure visible on initial paused state
    if (vid.paused) overlay.style.display = 'flex';
    // Do not add a manual click toggle; rely on native controls click behavior
  }
}

function tryGeneratePoster(videoEl, seconds) {
  if (!videoEl) return;
  // Ensure metadata is loaded
  const onLoaded = () => {
    // Clamp to video duration
    const target = Math.min(seconds || 1, Math.max(0.1, (videoEl.duration || 1) - 0.1));
    const seekAndCapture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      try {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl && dataUrl.length > 50) {
          videoEl.setAttribute('poster', dataUrl);
        }
      } catch (_) { /* ignore if cross-origin restrictions */ }
    };
    const onSeeked = () => {
      seekAndCapture();
      // Reset to start so poster shows until play
      try { videoEl.currentTime = 0; } catch (_) {}
      videoEl.removeEventListener('seeked', onSeeked);
    };
    videoEl.addEventListener('seeked', onSeeked);
    try { videoEl.currentTime = target; } catch (e) { /* fallback capture without seek */ seekAndCapture(); videoEl.removeEventListener('seeked', onSeeked); }
  };
  if (isNaN(videoEl.duration) || !(videoEl.videoWidth > 0)) {
    videoEl.addEventListener('loadedmetadata', onLoaded, { once: true });
    // Trigger metadata load if not already
    try { videoEl.preload = 'metadata'; } catch (_) {}
  } else {
    onLoaded();
  }
}

function updateActiveThumbnail(photoIndex) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.classList.remove('active');
  });
  
  const activeThumbnail = document.querySelector(`[data-index="${photoIndex}"]`);
  if (activeThumbnail) {
    activeThumbnail.classList.add('active');
  }
}

function navigateGallery(direction) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const activeThumbnail = document.querySelector('.thumbnail.active');
  
  if (!activeThumbnail || thumbnails.length <= 1) return;
  
  let currentIndex = parseInt(activeThumbnail.dataset.index);
  let newIndex;
  
  if (direction === 'prev') {
    newIndex = currentIndex > 0 ? currentIndex - 1 : thumbnails.length - 1;
  } else {
    newIndex = currentIndex < thumbnails.length - 1 ? currentIndex + 1 : 0;
  }
  
  const newThumbnail = document.querySelector(`[data-index="${newIndex}"]`);
  if (newThumbnail) {
    newThumbnail.click();
  }
}

function initializeTouchSupport() {
  const galleryMain = document.querySelector('.gallery-main');
  if (!galleryMain) return;
  
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  
  galleryMain.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  
  galleryMain.addEventListener('touchend', function(e) {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    
    handleSwipe();
  });
  
  function handleSwipe() {
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    // Check if it's a horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left - next image
        navigateGallery('next');
      } else {
        // Swipe right - previous image
        navigateGallery('prev');
      }
    }
  }
}

// Contact Form Functionality
function initializeContactForm() {
  const contactForm = document.getElementById('project-contact-form');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateContactForm()) {
      return;
    }
    
    // Submit form
    submitContactForm();
  });
  
  // Add real-time validation
  addFormValidation();
}

function validateContactForm() {
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  
  // Clear previous error states
  clearFormErrors();
  
  let isValid = true;
  
  if (!name) {
    showFieldError('contact-name', 'Name is required');
    isValid = false;
  }
  
  if (!email) {
    showFieldError('contact-email', 'Email is required');
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('contact-email', 'Please enter a valid email address');
    isValid = false;
  }
  
  if (!message) {
    showFieldError('contact-message', 'Message is required');
    isValid = false;
  }
  
  return isValid;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  // Add error class
  field.classList.add('error');
  
  // Create or update error message
  let errorElement = field.parentNode.querySelector('.error-message');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    field.parentNode.appendChild(errorElement);
  }
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

function clearFormErrors() {
  const errorFields = document.querySelectorAll('.form-input.error, .form-textarea.error');
  const errorMessages = document.querySelectorAll('.error-message');
  
  errorFields.forEach(field => {
    field.classList.remove('error');
  });
  
  errorMessages.forEach(message => {
    message.style.display = 'none';
  });
}

function addFormValidation() {
  const inputs = document.querySelectorAll('#project-contact-form input, #project-contact-form textarea');
  
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      validateField(this);
    });
    
    input.addEventListener('input', function() {
      // Clear error when user starts typing
      if (this.classList.contains('error')) {
        this.classList.remove('error');
        const errorMessage = this.parentNode.querySelector('.error-message');
        if (errorMessage) {
          errorMessage.style.display = 'none';
        }
      }
    });
  });
}

function validateField(field) {
  const value = field.value.trim();
  
  if (field.hasAttribute('required') && !value) {
    showFieldError(field.id, `${field.previousElementSibling.textContent} is required`);
    return false;
  }
  
  if (field.type === 'email' && value && !isValidEmail(value)) {
    showFieldError(field.id, 'Please enter a valid email address');
    return false;
  }
  
  return true;
}

function submitContactForm() {
  const form = document.getElementById('project-contact-form');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  submitBtn.disabled = true;
  
  // Collect form data and send JSON (server validations expect JSON body)
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  // Include recaptcha token if present
  if (!payload.recaptchaToken) {
    const rt = document.getElementById('recaptchaTokenProject');
    if (rt && rt.value) payload.recaptchaToken = rt.value;
  }
  if (!payload.projectId) payload.projectId = getProjectId();
  // include preferred language if present
  const langEl = form.querySelector('#contact-language');
  if (langEl && !payload.language) payload.language = langEl.value || '';
  // combine country code + phone
  if (payload.countryCode || payload.phone) {
    payload.phone = `${payload.countryCode || ''} ${payload.phone || ''}`.trim();
  }

  // Submit to server (JSON, like property leads)
  fetch('/api/leads/project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '')
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showSuccessMessage('Thank you! Your message has been sent successfully.');
      form.reset();
    } else {
      showErrorMessage(data.message || 'Error sending message. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showErrorMessage('Error sending message. Please try again.');
  })
  .finally(() => {
    // Reset button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  });
}

function showSuccessMessage(message) {
  showMessage(message, 'success');
}

function showErrorMessage(message) {
  showMessage(message, 'error');
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message-banner');
  existingMessages.forEach(msg => msg.remove());
  
  // Create message banner
  const messageBanner = document.createElement('div');
  messageBanner.className = `message-banner message-${type}`;
  messageBanner.innerHTML = `
    <div class="message-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="message-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Insert at top of form
  const contactCard = document.querySelector('.contact-card');
  contactCard.insertBefore(messageBanner, contactCard.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageBanner.parentNode) {
      messageBanner.remove();
    }
  }, 5000);
}

// Smooth Scrolling
function initializeSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Related Projects
function initializeRelatedProjects() {
  const relatedProjectItems = document.querySelectorAll('.related-project-item');
  
  relatedProjectItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateX(4px)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.transform = 'translateX(0)';
    });
  });
}

function relocateProjectContactOnMobile() {
  const card = document.getElementById('projectContactCard');
  if (!card) return;
  const doMove = () => {
    const isSmallScreen = window.matchMedia('(max-width: 1024px)').matches;
    if (isSmallScreen) {
      const footer = document.querySelector('footer');
      if (footer && card.nextElementSibling !== footer) {
        footer.parentNode.insertBefore(card, footer);
      }
    } else {
      const sidebar = document.querySelector('.project-sidebar');
      if (sidebar && !sidebar.contains(card)) {
        sidebar.insertBefore(card, sidebar.firstChild);
      }
    }
  };
  doMove();
  window.addEventListener('resize', doMove);
}

// Utility Functions
function getProjectId() {
  // Extract project ID from URL or data attribute
  const projectIdElement = document.querySelector('[data-project-id]');
  if (projectIdElement) {
    return projectIdElement.dataset.projectId;
  }
  
  // Fallback: try to extract from URL
  const urlParts = window.location.pathname.split('/');
  return urlParts[urlParts.length - 1];
}

function getProjectTitle() {
  const titleElement = document.querySelector('.project-title');
  return titleElement ? titleElement.textContent : 'Project';
}

// Add CSS for error states and messages
function addErrorStyles() {
  if (document.getElementById('error-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'error-styles';
  style.textContent = `
    .form-input.error,
    .form-textarea.error {
      border-color: var(--red-500) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
    
    .error-message {
      color: var(--red-600);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-1);
      display: none;
    }
    
    .message-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-4);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-6);
      font-size: var(--font-size-sm);
    }
    
    .message-success {
      background: var(--green-50);
      color: var(--green-700);
      border: 1px solid var(--green-200);
    }
    
    .message-error {
      background: var(--red-50);
      color: var(--red-700);
      border: 1px solid var(--red-200);
    }
    
    .message-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }
    
    .message-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: var(--font-size-lg);
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color var(--transition-fast);
    }
    
    .message-close:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    
    .form-input:focus.error,
    .form-textarea:focus.error {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize error styles
addErrorStyles();

// Export functions for global access
window.ProjectDetail = {
  navigateGallery,
  submitContactForm,
  showSuccessMessage,
  showErrorMessage
};
