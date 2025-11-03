# Google Analytics Setup Guide for Real Estate Website

## Overview
This guide outlines the best practices for implementing Google Analytics (GA4) on a real estate website to track user behavior, conversions, and property interactions.

## Prerequisites

1. **Create a Google Analytics 4 Property**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new GA4 property (not Universal Analytics)
   - Note your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Environment Variables**
   Add to your `.env` file:
   ```
   GA_MEASUREMENT_ID=G-XXXXXXXXXX
   GA_CONSENT_DEFAULT=denied  # or 'granted' for dev
   ```

## Implementation Steps

### Step 1: Basic Setup (Already Done ✓)
The basic GA4 tracking code is already implemented in `views/layouts/main.ejs` with:
- Consent Mode support
- Exclusion of admin pages
- Proper CSP headers configured

### Step 2: Enhanced Event Tracking

We've added a comprehensive tracking system that tracks:

#### Property-Related Events
- **view_property** - When a user views a property detail page
- **search_properties** - When users search/filter properties
- **compare_properties** - When users add properties to comparison
- **share_property** - When users share a property

#### Contact/Lead Events
- **contact_form_submit** - Form submissions (property, project, contact, seller)
- **email_click** - When users click email button
- **phone_click** - When users click phone number
- **whatsapp_click** - When users click WhatsApp button

#### Navigation Events
- **view_project** - When users view a project detail page
- **filter_properties** - When users apply filters
- **sort_properties** - When users sort property listings

## Key Metrics to Track

### 1. **Property Engagement**
- Property detail page views
- Time spent on property pages
- Photo gallery interactions
- Map views

### 2. **Lead Generation**
- Form submissions (all types)
- Contact method clicks (email/phone/WhatsApp)
- Conversion rate by property type
- Lead source attribution

### 3. **Search Behavior**
- Search terms
- Filter usage
- Property comparison activity
- Bounce rate on search results

### 4. **User Journey**
- Entry points
- Navigation paths
- Exit pages
- Session duration

## Custom Events Implementation

All tracking is handled through the `public/js/analytics.js` helper file which provides:

```javascript
// Track property view
analytics.trackPropertyView(propertyId, propertyTitle, price, location);

// Track form submission
analytics.trackFormSubmit(formType, propertyId, additionalData);

// Track contact action
analytics.trackContactAction(actionType, propertyId);
```

## Testing Your Implementation

1. **Install GA Debugger Extension**
   - Chrome: [GA Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

2. **Use GA4 DebugView**
   - Go to Analytics > Configure > DebugView
   - Enable debug mode in your browser
   - Verify events are firing correctly

3. **Check Real-Time Reports**
   - Go to Analytics > Reports > Realtime
   - Test your website and verify events appear

## Privacy & Compliance

### GDPR/CCPA Compliance
- Consent Mode is configured (default: denied)
- Implement a cookie consent banner to update consent
- Users must opt-in before tracking begins

### Recommended Cookie Banner
You should implement a cookie consent banner that:
1. Shows on first visit
2. Allows users to accept/deny cookies
3. Updates GA consent mode:
   ```javascript
   gtag('consent', 'update', {
     'analytics_storage': 'granted',
     'ad_storage': 'granted'
   });
   ```

## Best Practices for Real Estate

1. **Track Property IDs** - Use property slugs/IDs for consistent tracking
2. **Monitor Conversion Funnels** - Set up funnels from property view → contact → lead
3. **Segment by Property Type** - Track apartment vs house vs land separately
4. **Track Price Points** - Include price ranges in events for segmentation
5. **Monitor Lead Quality** - Track which properties generate most leads
6. **Search Behavior** - Track popular search terms and filters

## Common Custom Dimensions to Set Up

In GA4 Admin > Custom Definitions > Custom Dimensions:

1. **Property Type** - Apartment, House, Villa, Land
2. **Property Price Range** - €0-200k, €200k-500k, etc.
3. **Property Location** - City, Neighborhood
4. **Lead Source** - Form type (property, project, seller, contact)
5. **Contact Method** - Email, Phone, WhatsApp

## Conversion Events to Mark

In GA4 Admin > Events, mark these as conversions:

- ✅ `contact_form_submit` - Main conversion goal
- ✅ `email_click` - High-intent action
- ✅ `phone_click` - High-intent action
- ✅ `whatsapp_click` - High-intent action

## Next Steps

1. Set up your GA4 property and get Measurement ID
2. Add `GA_MEASUREMENT_ID` to your `.env` file
3. Test tracking using DebugView
4. Set up custom reports and dashboards
5. Create conversion goals
6. Implement cookie consent banner (if not already done)

## Support

For issues or questions:
- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [GA4 Events Reference](https://developers.google.com/analytics/devguides/collection/ga4/events)

