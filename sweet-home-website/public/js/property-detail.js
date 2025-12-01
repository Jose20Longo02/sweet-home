// Property Detail Page JavaScript
class PropertyDetailPage {
  constructor() {
    this.currentPhotoIndex = 0;
    this.mediaItems = []; // { type: 'video'|'image', src: string }
    this.map = null;
    this.propertyId = this.getPropertyIdFromUrl();
    this.isSubmittingLead = false;
    this.youtubePlayer = null;
    this.youtubeErrorTimeout = null;
    
    this.init();
  }

  init() {
    this.loadPhotos();
    this.initMap();
    this.loadSimilarProperties();
    this.bindEvents();
    this.incrementView();
    this.initDescriptionToggle();
    this.initVideoOverlay();
    this.relocateContactFormOnMobile();
    this.initRecaptcha();
    this.initYouTubePlayer();
  }

  initYouTubePlayer() {
    const container = document.getElementById('mainPhoto');
    if (!container) return;
    
    const videoKind = container.getAttribute('data-video-kind');
    const youtubeId = container.getAttribute('data-youtube-id');
    const videoUrl = container.getAttribute('data-video-url');
    
    if (videoKind === 'youtube' && youtubeId && typeof YT !== 'undefined') {
      // Wait for YouTube IFrame API to be ready
      if (YT.Player) {
        this.createYouTubePlayer(youtubeId, videoUrl);
      } else {
        window.onYouTubeIframeAPIReady = () => {
          this.createYouTubePlayer(youtubeId, videoUrl);
        };
      }
    } else if (videoKind === 'youtube' && youtubeId) {
      // Fallback: if YouTube API is not available, use regular iframe with error detection
      this.initYouTubeIframeFallback(container, youtubeId, videoUrl);
    }
  }

  createYouTubePlayer(videoId, videoUrl) {
    const container = document.getElementById('mainPhoto');
    if (!container) return;

    // Remove existing iframe
    const existingIframe = container.querySelector('iframe');
    if (existingIframe) existingIframe.remove();

    // Hide error fallback if visible
    const errorFallback = document.getElementById('youtubeErrorFallback');
    if (errorFallback) errorFallback.style.display = 'none';

    // Hide play overlay for YouTube videos
    const overlay = document.querySelector('.video-play-overlay');
    if (overlay) overlay.style.display = 'none';

    // Create div for YouTube player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player';
    container.insertBefore(playerDiv, container.firstChild);

    try {
      this.youtubePlayer = new YT.Player('youtube-player', {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onError: (event) => {
            this.handleYouTubeError(event, videoUrl);
          },
          onReady: () => {
            // Clear any error timeout
            if (this.youtubeErrorTimeout) {
              clearTimeout(this.youtubeErrorTimeout);
              this.youtubeErrorTimeout = null;
            }
            // Ensure player takes full size
            const playerElement = document.getElementById('youtube-player');
            if (playerElement) {
              playerElement.style.width = '100%';
              playerElement.style.height = '100%';
            }
          }
        }
      });

      // Set a timeout to detect if player fails to load (e.g., Error 153)
      this.youtubeErrorTimeout = setTimeout(() => {
        if (this.youtubePlayer && this.youtubePlayer.getPlayerState() === undefined) {
          this.handleYouTubeError({ data: 153 }, videoUrl);
        }
      }, 5000);
    } catch (error) {
      console.error('Error creating YouTube player:', error);
      this.handleYouTubeError({ data: 153 }, videoUrl);
    }
  }

  initYouTubeIframeFallback(container, videoId, videoUrl) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
    
    // Remove existing iframe
    const existingIframe = container.querySelector('iframe');
    if (existingIframe) existingIframe.remove();

    // Hide error fallback if visible
    const errorFallback = document.getElementById('youtubeErrorFallback');
    if (errorFallback) errorFallback.style.display = 'none';

    // Hide play overlay for YouTube videos
    const overlay = document.querySelector('.video-play-overlay');
    if (overlay) overlay.style.display = 'none';

    const iframe = document.createElement('iframe');
    iframe.id = 'youtube-iframe';
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = '0';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.src = embedUrl;
    
    // Listen for load errors
    iframe.onload = () => {
      // Check if iframe loaded successfully by trying to access its content
      // Note: This won't work due to CORS, but we can check for error messages
      setTimeout(() => {
        // If YouTube shows an error, it will be visible in the iframe
        // We can't directly detect it, but we can show a fallback after a delay
        // if the iframe seems to have issues
      }, 3000);
    };

    iframe.onerror = () => {
      this.handleYouTubeError({ data: 153 }, videoUrl);
    };

    container.insertBefore(iframe, container.firstChild);
  }

  handleYouTubeError(event, videoUrl) {
    const container = document.getElementById('mainPhoto');
    if (!container) return;

    // Remove YouTube player/iframe
    const player = document.getElementById('youtube-player');
    if (player) player.remove();
    const iframe = container.querySelector('iframe#youtube-iframe');
    if (iframe) iframe.remove();
    if (this.youtubePlayer) {
      try {
        this.youtubePlayer.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.youtubePlayer = null;
    }

    // Show error fallback
    let errorFallback = document.getElementById('youtubeErrorFallback');
    if (!errorFallback) {
      errorFallback = document.createElement('div');
      errorFallback.id = 'youtubeErrorFallback';
      errorFallback.className = 'youtube-error-fallback';
      errorFallback.innerHTML = `
        <div class="youtube-error-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Video unavailable</h3>
          <p>This video cannot be embedded. It may be private, deleted, or embedding may be disabled.</p>
          <a href="${videoUrl}" target="_blank" rel="noopener" class="btn btn-primary">
            Watch on YouTube
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      `;
      container.insertBefore(errorFallback, container.firstChild);
    }
    errorFallback.style.display = 'flex';

    // Hide play overlay
    const overlay = document.querySelector('.video-play-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  initVideoOverlay() {
    const video = document.getElementById('mainVideo');
    const overlay = document.querySelector('.video-play-overlay');
    if (!video || !overlay) return;
    const syncOverlay = () => {
      overlay.style.display = video.paused ? 'flex' : 'none';
    };
    syncOverlay();
    video.addEventListener('play', syncOverlay);
    video.addEventListener('pause', syncOverlay);
    video.addEventListener('ended', syncOverlay);
  }

  getPropertyIdFromUrl() {
    // Prefer embedded data-id from DOM
    const dataEl = document.getElementById('propertyData');
    const idAttr = dataEl ? dataEl.getAttribute('data-id') : null;
    if (idAttr) return idAttr;
    // Fallback to last URL segment
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }

  loadPhotos() {
    // Build media items based on thumbnails ordering (video first if present)
    const thumbEls = document.querySelectorAll('.gallery-thumbnails .thumbnail');
    this.mediaItems = Array.from(thumbEls).map(el => {
      const type = el.getAttribute('data-type') || 'image';
      if (type === 'video') {
        return {
          type: 'video',
          src: el.getAttribute('data-video-url') || '',
          kind: el.getAttribute('data-video-kind') || 'file',
          embed: el.getAttribute('data-video-embed') || ''
        };
      }
      const img = el.querySelector('img');
      return { type: 'image', src: img ? img.src : '' };
    });

    if (this.mediaItems.length > 0) {
      this.updateMainPhoto(0);
    }
  }

  updateMainPhoto(index) {
    const mainContainer = document.getElementById('mainPhoto');
    const existingImg = document.getElementById('mainPhotoImg');
    const existingVideo = document.getElementById('mainVideo');
    const thumbnails = document.querySelectorAll('.gallery-thumbnails .thumbnail');
    if (!mainContainer || thumbnails.length === 0 || this.mediaItems.length === 0) return;

    const item = this.mediaItems[index];
    // Toggle active thumb
    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    if (item.type === 'video') {
      // Replace image with video element
      if (existingImg) {
        existingImg.remove();
      }
      const container = document.getElementById('mainPhoto');
      const kind = container?.getAttribute('data-video-kind') || item.kind || 'file';
      const embed = container?.getAttribute('data-video-embed') || item.embed || '';
      const youtubeId = container?.getAttribute('data-youtube-id') || item.youtubeId || '';
      const videoUrl = container?.getAttribute('data-video-url') || item.videoUrl || '';
      
      if (kind !== 'file' && embed) {
        // Handle YouTube videos with IFrame API
        if (kind === 'youtube' && youtubeId && typeof YT !== 'undefined' && YT.Player) {
          // Hide play overlay for YouTube videos
          const overlay = document.querySelector('.video-play-overlay');
          if (overlay) overlay.style.display = 'none';
          
          // Destroy existing player
          if (this.youtubePlayer) {
            try {
              this.youtubePlayer.destroy();
            } catch (e) {
              // Ignore destroy errors
            }
            this.youtubePlayer = null;
          }
          
          // Remove existing iframe
          const existingIframe = mainContainer.querySelector('iframe');
          if (existingIframe) existingIframe.remove();
          const existingPlayer = document.getElementById('youtube-player');
          if (existingPlayer) existingPlayer.remove();
          const existingError = document.getElementById('youtubeErrorFallback');
          if (existingError) existingError.remove();
          
          // Create new player
          const playerDiv = document.createElement('div');
          playerDiv.id = 'youtube-player';
          mainContainer.insertBefore(playerDiv, mainContainer.firstChild);
          
          try {
            this.youtubePlayer = new YT.Player('youtube-player', {
              videoId: youtubeId,
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin
              },
              events: {
                onError: (event) => {
                  this.handleYouTubeError(event, videoUrl);
                },
                onReady: () => {
                  // Ensure player takes full size
                  const playerElement = document.getElementById('youtube-player');
                  if (playerElement) {
                    playerElement.style.width = '100%';
                    playerElement.style.height = '100%';
                  }
                }
              }
            });
          } catch (error) {
            console.error('Error creating YouTube player:', error);
            this.handleYouTubeError({ data: 153 }, videoUrl);
          }
        } else {
          // Fallback for Vimeo or YouTube without API
          const existingIframe = mainContainer.querySelector('iframe');
          const existingPlayer = document.getElementById('youtube-player');
          if (existingPlayer) existingPlayer.remove();
          if (existingVideo) existingVideo.remove();
          
          // Hide play overlay for YouTube/Vimeo embeds
          if (kind === 'youtube' || kind === 'vimeo') {
            const overlay = document.querySelector('.video-play-overlay');
            if (overlay) overlay.style.display = 'none';
          }
          
          if (!existingIframe) {
            const iframe = document.createElement('iframe');
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.style.border = '0';
            iframe.style.position = 'absolute';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.src = embed;
            if (kind === 'youtube') {
              iframe.id = 'youtube-iframe';
              iframe.onerror = () => {
                this.handleYouTubeError({ data: 153 }, videoUrl);
              };
            }
            mainContainer.insertBefore(iframe, mainContainer.firstChild);
          } else {
            existingIframe.src = embed;
          }
        }
      } else {
        if (!existingVideo) {
          const video = document.createElement('video');
          video.id = 'mainVideo';
          video.controls = true;
          video.playsInline = true;
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'contain';
          video.style.background = '#000';
          const source = document.createElement('source');
          source.src = item.src;
          source.type = 'video/mp4';
          video.appendChild(source);
          mainContainer.insertBefore(video, mainContainer.firstChild);
        } else {
          const srcEl = existingVideo.querySelector('source');
          if (srcEl) srcEl.src = item.src;
          existingVideo.load();
        }
      }
      // Add/play overlay button if missing
      let overlay = document.querySelector('.video-play-overlay');
      if (!overlay) {
        overlay = document.createElement('button');
        overlay.className = 'video-play-overlay';
        overlay.type = 'button';
        overlay.setAttribute('aria-label', 'Play video');
        overlay.onclick = playMainVideo;
        overlay.innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="2" /><polygon points="26,20 26,44 46,32" fill="white" /></svg>';
        mainContainer.appendChild(overlay);
      }
      // Ensure overlay visible initially
      overlay.style.display = 'flex';
      // Bind overlay sync to this new video
      if (typeof this.initVideoOverlay === 'function') this.initVideoOverlay();
      const lightboxImage = document.getElementById('lightboxImage');
      if (lightboxImage) lightboxImage.src = '';
    } else {
      // Replace/ensure an image is present
      const existingIframe = mainContainer.querySelector('iframe');
      if (existingVideo) existingVideo.remove();
      if (existingIframe) existingIframe.remove();
      // Hide overlay if present when image is shown
      const overlay = document.querySelector('.video-play-overlay');
      if (overlay) overlay.style.display = 'none';
      let img = existingImg;
      // If current image is inside a <picture>, replace it with a plain <img>
      if (img) {
        const pictureEl = img.closest('picture');
        if (pictureEl && pictureEl.parentElement) {
          const newImg = document.createElement('img');
          newImg.id = 'mainPhotoImg';
          newImg.alt = document.querySelector('.property-title')?.textContent || 'Photo';
          newImg.onclick = openLightbox;
          newImg.decoding = 'async';
          pictureEl.parentElement.replaceChild(newImg, pictureEl);
          img = newImg;
        }
      }
      if (!img) {
        img = document.createElement('img');
        img.id = 'mainPhotoImg';
        img.alt = document.querySelector('.property-title')?.textContent || 'Photo';
        img.onclick = openLightbox;
        img.decoding = 'async';
        mainContainer.insertBefore(img, mainContainer.firstChild);
      }
      img.src = item.src;
      // Clear responsive attrs as we don't maintain <picture> dynamically
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      const lightboxImage = document.getElementById('lightboxImage');
      if (lightboxImage) lightboxImage.src = item.src;
    }

    this.currentPhotoIndex = index;
  }

  initMap() {
    const mapContainer = document.getElementById('propertyMap');
    if (!mapContainer) return;

    // Prefer data attributes for coordinates
    const data = document.getElementById('propertyData');
    const latAttr = data?.getAttribute('data-latitude');
    const lngAttr = data?.getAttribute('data-longitude');
    const mapLink = data?.getAttribute('data-map-link');
    let lat = latAttr ? parseFloat(latAttr) : NaN;
    let lng = lngAttr ? parseFloat(lngAttr) : NaN;

    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    const initLeaflet = (clat, clng) => {
      try {
        this.map = L.map('propertyMap').setView([clat, clng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        const propertyMarker = L.marker([clat, clng]).addTo(this.map);
        const propertyTitle = document.querySelector('.property-title').textContent;
        const propertyLocation = document.querySelector('.property-location').textContent.trim();
        propertyMarker.bindPopup(`
          <div style="text-align: center;">
            <strong>${propertyTitle}</strong><br>
            <small>${propertyLocation}</small>
          </div>
        `);
        const loadingElement = mapContainer.querySelector('.map-loading');
        if (loadingElement) loadingElement.remove();
      } catch (error) {
        console.error('Error initializing map:', error);
        this.showMapError('Failed to load map');
      }
    };

    // If explicit coordinates present (legacy), use them; otherwise require a map link
    if (hasCoords) {
      initLeaflet(lat, lng);
      return;
    }
    if (mapLink && mapLink.trim()) {
      const parsed = this.extractCoordsFromLink(mapLink);
      if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
        initLeaflet(parsed.lat, parsed.lng);
        return;
      }
      this.showMapError('Invalid map link');
      return;
    }
    // No map link: hide the entire section per product requirement
    const section = document.querySelector('.property-location-map');
    if (section) section.style.display = 'none';
    return;
  }

  extractCoordsFromLink(input) {
    if (!input || typeof input !== 'string') return null;
    const text = input.trim();
    let m = text.match(/@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
    m = text.match(/[?&](?:q|ll)=\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
    m = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
    return null;
  }

  showMapError(message) {
    const mapContainer = document.getElementById('propertyMap');
    if (!mapContainer) return;

    const loadingElement = mapContainer.querySelector('.map-loading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="text-align: center; color: #dc3545;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <p>${message}</p>
        </div>
      `;
    }
  }

  loadSimilarProperties() {
    const similarContainer = document.getElementById('similarProperties');
    if (!similarContainer) return;

    // Fetch similar properties from the same city/country
    const propertyCountry = document.querySelector('.location-item:first-child strong').nextSibling.textContent.trim();
    const propertyCity = document.querySelector('.location-item:nth-child(2) strong').nextSibling.textContent.trim();
    
    fetch(`/properties/api/similar?country=${encodeURIComponent(propertyCountry)}&city=${encodeURIComponent(propertyCity)}&exclude=${this.propertyId}&limit=3`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.properties.length > 0) {
          this.renderSimilarProperties(data.properties);
        } else {
          this.showSimilarPropertiesError();
        }
      })
      .catch(error => {
        console.error('Error loading similar properties:', error);
        this.showSimilarPropertiesError();
      });
  }

  incrementView() {
    const id = this.propertyId;
    if (!id) return;
    fetch(`/properties/api/${encodeURIComponent(id)}/view`, {
      method: 'POST',
      headers: {
        'CSRF-Token': (document.querySelector('meta[name="csrf-token"]').getAttribute('content') || '')
      }
    }).catch(() => {});
  }

  renderSimilarProperties(properties) {
    const similarContainer = document.getElementById('similarProperties');
    if (!similarContainer) return;

    similarContainer.innerHTML = properties.map(property => `
      <div class="similar-property" onclick="window.location.href='/properties/${property.slug}'">
        <div class="similar-property-image">
          <img src="${property.photos && property.photos.length > 0 ? property.photos[0] : '/img/property-placeholder.jpg'}" 
               alt="${property.title}" loading="lazy" decoding="async">
        </div>
        <div class="similar-property-content">
          <h4>${property.title}</h4>
          <p class="similar-property-location">${property.neighborhood}, ${property.city}</p>
          <p class="similar-property-price">€${Number(property.price || 0).toLocaleString('en-US')}</p>
        </div>
      </div>
    `).join('');
  }

  initRecaptcha() {
    try {
      const input = document.getElementById('recaptchaTokenProperty');
      const siteKey = input ? input.getAttribute('data-site-key') : null;
      if (!siteKey || !window.grecaptcha || typeof grecaptcha.ready !== 'function') return;
      grecaptcha.ready(function() {
        grecaptcha.execute(siteKey, { action: 'property_lead' }).then(function(token) {
          if (input) input.value = token;
        });
      });
    } catch (_) {}
  }

  showSimilarPropertiesError() {
    const similarContainer = document.getElementById('similarProperties');
    if (!similarContainer) return;

    similarContainer.innerHTML = `
      <div class="similar-properties-error">
        <p>No similar properties available at the moment.</p>
      </div>
    `;
  }

  bindEvents() {
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', this.handleContactFormSubmit.bind(this));
    }
    // Gallery nav (CSP-safe)
    const prevBtn = document.querySelector('.gallery-nav.prev');
    const nextBtn = document.querySelector('.gallery-nav.next');
    if (prevBtn) prevBtn.addEventListener('click', () => previousPhoto());
    if (nextBtn) nextBtn.addEventListener('click', () => nextPhoto());
    // Thumbnails
    document.querySelectorAll('.gallery-thumbnails .thumbnail').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!Number.isNaN(idx)) showPhoto(idx);
      });
    });
    // Lightbox open
    const mainImg = document.getElementById('mainPhotoImg');
    if (mainImg) mainImg.addEventListener('click', () => openLightbox());
    // Lightbox controls
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      const closeBtn = lightbox.querySelector('.lightbox-close');
      const prev = lightbox.querySelector('.lightbox-prev');
      const next = lightbox.querySelector('.lightbox-next');
      if (closeBtn) closeBtn.addEventListener('click', () => closeLightbox());
      if (prev) prev.addEventListener('click', () => previousPhoto());
      if (next) next.addEventListener('click', () => nextPhoto());
    }
    // Video overlay
    const playBtn = document.querySelector('.video-play-overlay');
    if (playBtn) playBtn.addEventListener('click', () => playMainVideo());
    // Actions
    const shareBtn = document.querySelector('.js-share-btn');
    if (shareBtn) shareBtn.addEventListener('click', () => shareProperty());
    const contactBtn = document.querySelector('.js-contact-btn');
    if (contactBtn) contactBtn.addEventListener('click', () => contactAgent());
    // Share modal delegated events (no inline handlers)
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
      // Close button
      const closeBtn = shareModal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => closeShareModal());
      }
      // Options
      const options = shareModal.querySelectorAll('.share-option');
      options.forEach(option => {
        option.addEventListener('click', () => {
          const platform = option.getAttribute('data-platform');
          if (platform === 'copy') {
            copyLink();
          } else {
            shareOnSocial(platform);
          }
        });
      });
    }

    // Floorplan/Plan popup
    const planBtn = document.querySelector('.plan-button');
    if (planBtn) {
      planBtn.addEventListener('click', () => {
        const url = planBtn.getAttribute('data-plan-url');
        if (!url) return;
        openImagePopup(url);
      });
    }
  }

  initDescriptionToggle() {
    const content = document.getElementById('descriptionContent');
    const toggle = document.getElementById('descriptionToggle');
    if (!content || !toggle) return;
    const hasOverflow = content.scrollHeight > content.clientHeight + 10;
    if (!hasOverflow) {
      toggle.style.display = 'none';
      content.classList.remove('collapsed');
      return;
    }
    toggle.addEventListener('click', () => {
      const collapsed = content.classList.toggle('collapsed');
      toggle.textContent = collapsed ? 'Read more' : 'Read less';
    });
  }

  relocateContactFormOnMobile() {
    const inline = document.getElementById('inlineContactForm');
    const mobileMount = document.querySelector('.mobile-contact-form');
    const mapSection = document.querySelector('.property-location-map');
    if (!inline || !mobileMount || !mapSection) return;
    const doMove = () => {
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      if (isMobile) {
        // move after map section
        mobileMount.style.display = 'block';
        mapSection.insertAdjacentElement('afterend', mobileMount);
        if (!mobileMount.contains(inline)) {
          mobileMount.appendChild(inline);
        }
      } else {
        // move back to sidebar if not already there
        const sidebar = document.querySelector('.property-sidebar');
        if (sidebar && !sidebar.contains(inline)) {
          sidebar.insertBefore(inline, sidebar.firstChild);
        }
        mobileMount.style.display = 'none';
      }
    };
    doMove();
    window.addEventListener('resize', doMove);
  }

  async handleContactFormSubmit(event) {
    event.preventDefault();
    if (this.isSubmittingLead) return;
    this.isSubmittingLead = true;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending...';
    }
    
    const formData = new FormData(event.target);
    const formDataObj = Object.fromEntries(formData.entries());
    // Ensure a fresh reCAPTCHA v3 token right before submit (tokens expire quickly)
    try {
      const rt = document.getElementById('recaptchaTokenProperty');
      const siteKey = rt ? rt.getAttribute('data-site-key') : null;
      if (siteKey && window.grecaptcha && typeof grecaptcha.execute === 'function') {
        const token = await grecaptcha.execute(siteKey, { action: 'property_lead' });
        if (token) {
          formDataObj.recaptchaToken = token;
          if (rt) rt.value = token;
        }
      } else {
        // fallback to any existing token already on the page
        if (!formDataObj.recaptchaToken && rt && rt.value) formDataObj.recaptchaToken = rt.value;
      }
    } catch (_) {
      // If recaptcha fails, let server validate and respond accordingly
      if (!formDataObj.recaptchaToken) {
        const rt = document.getElementById('recaptchaTokenProperty');
        if (rt && rt.value) formDataObj.recaptchaToken = rt.value;
      }
    }
    // combine country code + phone
    if (formDataObj.countryCode || formDataObj.phone) {
      formDataObj.phone = `${formDataObj.countryCode || ''} ${formDataObj.phone || ''}`.trim();
    }
    // include preferred language
    if (!formDataObj.language) {
      const lang = document.getElementById('contactLanguage');
      if (lang) formDataObj.language = lang.value || '';
    }
    
    // Add property information
    formDataObj.propertyId = this.propertyId;
    formDataObj.propertyTitle = document.querySelector('.property-title').textContent;
    
    // Send contact form
    fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': (document.querySelector('meta[name="csrf-token"]').getAttribute('content') || '')
      },
      body: JSON.stringify(formDataObj)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Track form submission
        if (window.analytics && window.analytics.trackFormSubmit) {
          window.analytics.trackFormSubmit('property_contact', this.propertyId, null, {
            property_title: formDataObj.propertyTitle || ''
          });
        }
        this.showSuccessMessage('Thank you! Your inquiry was submitted. A team member will be in touch soon.');
        // Close the contact modal
        if (typeof closeContactModal === 'function') closeContactModal();
        event.target.reset();
      } else {
        this.showErrorMessage(data.message || 'Failed to send message. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      this.showErrorMessage('An error occurred. Please try again later.');
    })
    .finally(() => {
      this.isSubmittingLead = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // No favorite system

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Show message
    setTimeout(() => messageDiv.classList.add('show'), 100);
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageDiv.classList.remove('show');
      setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
  }
}

// Photo Gallery Functions
function showPhoto(index) {
  const idx = typeof index === 'string' ? parseInt(index, 10) : index;
  if (window.propertyDetailPage && Number.isFinite(idx)) {
    window.propertyDetailPage.updateMainPhoto(idx);
    return;
  }
}

function nextPhoto() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  if (thumbnails.length === 0) return;
  
  let nextIndex = 0;
  if (window.propertyDetailPage) {
    nextIndex = (window.propertyDetailPage.currentPhotoIndex + 1) % thumbnails.length;
  }
  
  showPhoto(nextIndex);
}

function previousPhoto() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  if (thumbnails.length === 0) return;
  
  let prevIndex = 0;
  if (window.propertyDetailPage) {
    prevIndex = (window.propertyDetailPage.currentPhotoIndex - 1 + thumbnails.length) % thumbnails.length;
  }
  
  showPhoto(prevIndex);
}

// Modal Functions
function contactAgent() {
  const inline = document.getElementById('inlineContactForm');
  if (inline) {
    inline.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const nameInput = document.getElementById('contactName');
    if (nameInput) nameInput.focus({ preventScroll: true });
    return;
  }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

function shareProperty() {
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Simple image popup for floorplan/plan
function openImagePopup(src) {
  let overlay = document.getElementById('imagePopupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'imagePopupOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';

    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '90vw';
    wrapper.style.maxHeight = '90vh';
    wrapper.style.position = 'relative';
    wrapper.style.boxShadow = '0 20px 60px rgba(0,0,0,.5)';

    const img = document.createElement('img');
    img.id = 'imagePopupImg';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '90vh';
    img.style.borderRadius = '8px';
    img.alt = 'Plan';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '-12px';
    closeBtn.style.right = '-12px';
    closeBtn.style.width = '36px';
    closeBtn.style.height = '36px';
    closeBtn.style.borderRadius = '18px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = '#fff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.lineHeight = '36px';
    closeBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,.25)';
    closeBtn.addEventListener('click', () => closeImagePopup());

    wrapper.appendChild(img);
    wrapper.appendChild(closeBtn);
    overlay.appendChild(wrapper);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeImagePopup(); });
    document.body.appendChild(overlay);
  }
  const imgEl = document.getElementById('imagePopupImg');
  if (imgEl) imgEl.src = src;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeImagePopup() {
  const overlay = document.getElementById('imagePopupOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Lightbox
function openLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const mainPhotoImg = document.getElementById('mainPhotoImg');
  if (lightbox && lightboxImage && mainPhotoImg) {
    lightboxImage.src = mainPhotoImg.src;
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Play overlay handler (global for inline onclick)
function playMainVideo() {
  const video = document.getElementById('mainVideo');
  const overlay = document.querySelector('.video-play-overlay');
  const container = document.getElementById('mainPhoto');
  const videoKind = container?.getAttribute('data-video-kind');
  
  // Handle YouTube videos
  if (videoKind === 'youtube' && window.propertyDetailPage && window.propertyDetailPage.youtubePlayer) {
    try {
      window.propertyDetailPage.youtubePlayer.playVideo();
      if (overlay) overlay.style.display = 'none';
    } catch (error) {
      console.error('Error playing YouTube video:', error);
    }
    return;
  }
  
  // Handle regular video files
  if (video) {
    video.play();
    if (overlay) overlay.style.display = 'none';
  }
}

// Social Sharing Functions
function shareOnSocial(platform) {
  const propertyTitle = document.querySelector('.property-title').textContent;
  const propertyUrl = window.location.href;
  const propertyData = document.getElementById('propertyData');
  const propertyId = propertyData ? propertyData.getAttribute('data-id') : null;
  
  // Track share event
  if (window.analytics && window.analytics.trackPropertyShare) {
    window.analytics.trackPropertyShare(propertyId, platform);
  }
  
  let shareUrl = '';
  
  switch (platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`;
      break;
    case 'instagram':
      // Instagram doesn't have a direct sharing API, so we'll copy the property info and open Instagram
      const instagramText = `Check out this property: ${propertyTitle} - ${propertyUrl}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(instagramText).then(() => {
          if (window.propertyDetailPage) {
            window.propertyDetailPage.showSuccessMessage('Property info copied! You can now paste it on Instagram.');
          }
        }).catch(() => {
          fallbackCopyTextToClipboard(instagramText);
        });
      } else {
        fallbackCopyTextToClipboard(instagramText);
      }
      shareUrl = `https://www.instagram.com/`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(propertyUrl)}`;
      break;
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
  
  closeShareModal();
}

function copyLink() {
  const propertyUrl = window.location.href;
  const propertyData = document.getElementById('propertyData');
  const propertyId = propertyData ? propertyData.getAttribute('data-id') : null;
  
  // Track share event (copy link)
  if (window.analytics && window.analytics.trackPropertyShare) {
    window.analytics.trackPropertyShare(propertyId, 'copy_link');
  }
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(propertyUrl).then(() => {
      // Show success message
      if (window.propertyDetailPage) {
        window.propertyDetailPage.showSuccessMessage('Link copied to clipboard!');
      }
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopyTextToClipboard(propertyUrl);
    });
  } else {
    // Fallback for older browsers
    fallbackCopyTextToClipboard(propertyUrl);
  }
  
  closeShareModal();
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    if (window.propertyDetailPage) {
      window.propertyDetailPage.showSuccessMessage('Link copied to clipboard!');
    }
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    if (window.propertyDetailPage) {
      window.propertyDetailPage.showErrorMessage('Failed to copy link');
    }
  }
  
  document.body.removeChild(textArea);
}

function callAgent() {
  // Track phone click
  const propertyData = document.getElementById('propertyData');
  const propertyId = propertyData ? propertyData.getAttribute('data-id') : null;
  
  if (window.analytics && window.analytics.trackContactAction) {
    window.analytics.trackContactAction('phone', propertyId, null);
  }
  
  // This would typically open a phone dialer or show a phone number
  // For now, we'll show a message
  if (window.propertyDetailPage) {
    window.propertyDetailPage.showSuccessMessage('Phone functionality coming soon!');
  }
}

// Close modals when clicking outside
// Removed modal outside click handler (inline form)

// Close modals with Escape key
// Removed modal ESC handler (inline form)

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.propertyDetailPage = new PropertyDetailPage();
});

// Add CSS for messages
const messageStyles = document.createElement('style');
messageStyles.textContent = `
  .message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  }
  
  .message.show {
    transform: translateX(0);
  }
  
  .message-success { background-color: #16a34a; }
  .message-error { background-color: #dc2626; }
  .message-info { background-color: #2563eb; }
  .spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.4); border-top-color: rgba(255,255,255,1); border-radius:50%; animation: spin 0.8s linear infinite; margin-right:8px; vertical-align:-2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .similar-property {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .similar-property:hover {
    background: #e9ecef;
    transform: translateY(-2px);
  }
  
  .similar-property-image {
    width: 80px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
  }
  
  .similar-property-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .similar-property-content {
    flex: 1;
  }
  
  .similar-property-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #2c3e50;
  }
  
  .similar-property-location {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: #6c757d;
  }
  
  .similar-property-price {
    margin: 0;
    font-weight: 600;
    color: #28a745;
  }
  
  .similar-properties-error {
    text-align: center;
    color: #6c757d;
    padding: 2rem;
  }
  
  /* removed favorited styles (no favorites system) */
`;

document.head.appendChild(messageStyles);
