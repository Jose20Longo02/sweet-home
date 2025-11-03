/**
 * Google Analytics 4 Helper Functions for Real Estate Website
 * Provides easy-to-use tracking functions for common real estate website events
 */

(function() {
  'use strict';

  // Check if gtag is available
  const hasGA = typeof window.gtag === 'function';

  /**
   * Log analytics events (for debugging)
   */
  function logEvent(eventName, params) {
    // Enable debug logging by setting window.ANALYTICS_DEBUG = true
    if (window.ANALYTICS_DEBUG && window.console) {
      console.log('[Analytics]', eventName, params);
    }
  }

  /**
   * Track a custom event
   * @param {string} eventName - Event name
   * @param {object} params - Event parameters
   */
  function trackEvent(eventName, params) {
    if (!hasGA) {
      logEvent(eventName, params);
      return;
    }

    try {
      gtag('event', eventName, params || {});
      logEvent(eventName, params);
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }

  /**
   * Track property detail page view
   * @param {string|number} propertyId - Property ID or slug
   * @param {string} propertyTitle - Property title
   * @param {number} price - Property price
   * @param {string} location - Property location (city, neighborhood)
   * @param {string} propertyType - Property type (Apartment, House, Villa, Land)
   */
  function trackPropertyView(propertyId, propertyTitle, price, location, propertyType) {
    trackEvent('view_property', {
      property_id: String(propertyId),
      property_title: propertyTitle,
      property_price: price || null,
      property_location: location || null,
      property_type: propertyType || null,
      value: price || null,
      currency: 'EUR'
    });
  }

  /**
   * Track property search/filter
   * @param {object} filters - Search filters object
   */
  function trackPropertySearch(filters) {
    trackEvent('search_properties', {
      search_term: filters.search || null,
      property_type: filters.type || null,
      city: filters.city || null,
      min_price: filters.minPrice || null,
      max_price: filters.maxPrice || null,
      bedrooms: filters.bedrooms || null,
      sort_by: filters.sort || null
    });
  }

  /**
   * Track property comparison
   * @param {string|number} propertyId - Property ID
   * @param {string} action - 'add' or 'remove'
   */
  function trackPropertyComparison(propertyId, action) {
    trackEvent('compare_property', {
      property_id: String(propertyId),
      action: action // 'add' or 'remove'
    });
  }

  /**
   * Track property share
   * @param {string|number} propertyId - Property ID
   * @param {string} method - Share method (email, social, copy_link)
   */
  function trackPropertyShare(propertyId, method) {
    trackEvent('share_property', {
      property_id: String(propertyId),
      method: method
    });
  }

  /**
   * Track form submission
   * @param {string} formType - Type of form (property_contact, project_contact, seller_form, contact_form)
   * @param {string|number} propertyId - Property ID (if applicable)
   * @param {string|number} projectId - Project ID (if applicable)
   * @param {object} additionalData - Additional form data
   */
  function trackFormSubmit(formType, propertyId, projectId, additionalData) {
    const params = {
      form_type: formType,
      property_id: propertyId ? String(propertyId) : null,
      project_id: projectId ? String(projectId) : null
    };

    // Add additional data if provided
    if (additionalData) {
      Object.assign(params, additionalData);
    }

    // Mark as conversion event
    trackEvent('contact_form_submit', params);
  }

  /**
   * Track contact action (email, phone, WhatsApp)
   * @param {string} actionType - 'email', 'phone', or 'whatsapp'
   * @param {string|number} propertyId - Property ID (if applicable)
   * @param {string|number} projectId - Project ID (if applicable)
   */
  function trackContactAction(actionType, propertyId, projectId) {
    const eventName = actionType === 'email' ? 'email_click' :
                     actionType === 'phone' ? 'phone_click' :
                     actionType === 'whatsapp' ? 'whatsapp_click' :
                     'contact_action';

    trackEvent(eventName, {
      property_id: propertyId ? String(propertyId) : null,
      project_id: projectId ? String(projectId) : null,
      contact_method: actionType
    });
  }

  /**
   * Track project view
   * @param {string|number} projectId - Project ID
   * @param {string} projectTitle - Project title
   */
  function trackProjectView(projectId, projectTitle) {
    trackEvent('view_project', {
      project_id: String(projectId),
      project_title: projectTitle
    });
  }

  /**
   * Track filter application
   * @param {object} filters - Applied filters
   */
  function trackFilterApplied(filters) {
    trackEvent('filter_properties', {
      filters: JSON.stringify(filters)
    });
  }

  /**
   * Track property sorting
   * @param {string} sortBy - Sort option (price_asc, price_desc, newest, etc.)
   */
  function trackSortApplied(sortBy) {
    trackEvent('sort_properties', {
      sort_by: sortBy
    });
  }

  /**
   * Track page view with custom parameters
   * @param {string} pagePath - Page path
   * @param {string} pageTitle - Page title
   */
  function trackPageView(pagePath, pageTitle) {
    if (!hasGA) {
      logEvent('page_view', { page_path: pagePath, page_title: pageTitle });
      return;
    }

    try {
      const measurementId = window.GA_MEASUREMENT_ID || '';
      if (measurementId) {
        gtag('config', measurementId, {
          page_path: pagePath,
          page_title: pageTitle
        });
        logEvent('page_view', { page_path: pagePath, page_title: pageTitle });
      }
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  }

  /**
   * Track virtual page view (for SPA-like navigation)
   * @param {string} virtualPath - Virtual path
   * @param {string} virtualTitle - Virtual title
   */
  function trackVirtualPageView(virtualPath, virtualTitle) {
    trackPageView(virtualPath, virtualTitle);
  }

  // Export public API
  window.analytics = {
    trackEvent: trackEvent,
    trackPropertyView: trackPropertyView,
    trackPropertySearch: trackPropertySearch,
    trackPropertyComparison: trackPropertyComparison,
    trackPropertyShare: trackPropertyShare,
    trackFormSubmit: trackFormSubmit,
    trackContactAction: trackContactAction,
    trackProjectView: trackProjectView,
    trackFilterApplied: trackFilterApplied,
    trackSortApplied: trackSortApplied,
    trackPageView: trackPageView,
    trackVirtualPageView: trackVirtualPageView
  };

  // Auto-track page views on load
  if (hasGA && document.readyState === 'complete') {
    trackPageView(window.location.pathname, document.title);
  } else if (hasGA) {
    window.addEventListener('load', function() {
      trackPageView(window.location.pathname, document.title);
    });
  }

})();

