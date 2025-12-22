# Pages Using Icons

This document lists all pages that display property/project icons and should be affected by the icon theme system.

## Public Pages

### 1. Home Page (`/`)
- **File**: `public/js/home.js` (JavaScript-generated)
- **Icons used**: `icon-bed`, `icon-bath`, `icon-size`
- **Location**: Featured properties section
- **Rendering**: Client-side JavaScript

### 2. Properties Listing (`/properties`)
- **File**: `views/properties/property-list.ejs`
- **Icons used**: `icon-bed`, `icon-bath`, `icon-size`, `icon-location`
- **Location**: Property cards in the listing

### 3. Property Detail (`/properties/:slug`)
- **File**: `views/properties/property-detail.ejs`
- **Icons used**: `icon-bed`, `icon-bath`, `icon-size`
- **Location**: Property details section

### 4. Projects Listing (`/projects`)
- **File**: `views/projects/project-list.ejs`
- **Icons used**: `icon-location`
- **Location**: Project cards

### 5. Project Detail (`/projects/:slug`)
- **File**: `views/projects/project-detail.ejs`
- **Icons used**: `icon-bed`, `icon-bath`
- **Location**: Property cards within project

## Admin Pages

### 6. Admin Properties (`/admin/properties` or `/superadmin/dashboard/properties`)
- **File**: `views/admin/properties/my-properties.ejs`
- **Icons used**: `icon-bed`, `icon-bath`, `icon-size`
- **Location**: Property cards in admin dashboard

## How Icons Are Rendered

All icons use CSS classes:
- `.icon-bed`
- `.icon-bath`
- `.icon-size`
- `.icon-location`

These classes are controlled by CSS variables set in `views/layouts/main.ejs`:
- `--icon-bed`
- `--icon-bath`
- `--icon-size`
- `--icon-location`

The CSS variables are dynamically set based on the `ICON_THEME` environment variable.

## Testing

To verify icons are working:
1. Visit `/test-icons` - Debug page showing all icons
2. Check browser DevTools → Elements → `<head>` → Look for `<style id="icon-theme-styles">`
3. Inspect any icon element → Check computed `--icon` CSS variable

