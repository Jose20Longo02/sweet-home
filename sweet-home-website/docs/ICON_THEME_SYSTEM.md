# Icon Theme System

This system allows you to easily switch between different icon themes (e.g., default and holiday-themed icons) throughout the website.

## How It Works

1. **Theme Configuration**: Icons are defined in `config/iconThemes.js`
2. **Active Theme**: Controlled by `ICON_THEME` environment variable (defaults to `'default'`)
3. **Icon Rendering**: Use the `icon.ejs` partial to render icons with theme support

## Using Icons in Templates

### Method 1: Using the Icon Partial (Recommended)

```ejs
<%- include('partials/icon', { 
  type: 'bed',      // 'bed' | 'bath' | 'size' | 'location'
  size: 16,         // 16 | 20 | 24 | 32 (default: 16)
  color: '#000',     // CSS color (default: 'currentColor')
  inline: true       // adds margin-right if true (default: false)
}) %>
```

**Examples:**

```ejs
<!-- Bed icon, 16px, inline -->
<%- include('partials/icon', { type: 'bed', size: 16, inline: true }) %>
<%= property.rooms %> rooms

<!-- Bath icon, 20px, with custom color -->
<%- include('partials/icon', { type: 'bath', size: 20, color: 'var(--primary-color)' }) %>
<%= property.bathrooms %> baths

<!-- Location icon, 16px, inline -->
<%- include('partials/icon', { type: 'location', size: 16, inline: true }) %>
<%= property.city %>, <%= property.country %>
```

### Method 2: Using CSS Classes (Legacy - Still Works)

The old CSS class system still works for backward compatibility:

```ejs
<span class="icon icon-16 icon-inline icon-mask icon-bed" style="color: #000;"></span>
```

However, this method uses hardcoded icon paths and won't respect the theme system.

## Adding a New Theme

1. **Create the theme in `config/iconThemes.js`:**

```javascript
summer: {
  name: 'Summer',
  description: 'Summer themed icons',
  icons: {
    bed: '/icons/summer/icon_bed.svg',
    bath: '/icons/summer/icon_bath.svg',
    size: '/icons/summer/icon_size.svg',
    location: '/icons/summer/icon_location.svg'
  }
}
```

2. **Place your icon files** in `public/icons/summer/`:
   - `icon_bed.svg`
   - `icon_bath.svg`
   - `icon_size.svg`
   - `icon_location.svg`

3. **Activate the theme** by setting `ICON_THEME=summer` in your `.env` file and restarting the server.

## Switching Themes

### Option 1: Environment Variable (Recommended for Production)

1. Open your `.env` file
2. Add or update: `ICON_THEME=holiday`
3. Restart your server

### Option 2: Admin Interface

1. Go to `/superadmin/dashboard/settings/icons`
2. Select the theme you want
3. Follow the instructions to set the environment variable and restart

## Available Icons

- **bed**: Bedroom/rooms icon
- **bath**: Bathroom icon
- **size**: Size/area icon
- **location**: Location/address icon

## Icon Sizes

Supported sizes: `16`, `20`, `24`, `32` (in pixels)

## Migration Guide

To migrate existing icon usage to the new system:

**Before:**
```ejs
<span class="icon icon-16 icon-inline icon-mask icon-bed" style="color: #000;"></span>
<%= property.rooms %> rooms
```

**After:**
```ejs
<%- include('partials/icon', { type: 'bed', size: 16, inline: true, color: '#000' }) %>
<%= property.rooms %> rooms
```

## JavaScript Usage

For dynamically generated content in JavaScript, you can use the icon path directly:

```javascript
const iconPath = '/icons/icon_bed.svg'; // This would need to be passed from server
// Or use the theme system by making an API call to get the current theme
```

For client-side rendering, you might want to create a small helper function that fetches the current theme from the server.

## Troubleshooting

- **Icons not changing**: Make sure you've set `ICON_THEME` in your `.env` file and restarted the server
- **Missing icons**: Verify that all icon files exist in the theme directory
- **Icons not showing**: Check browser console for 404 errors on icon files

