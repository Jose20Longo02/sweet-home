/**
 * Middleware to serve minified assets when available
 * Automatically serves .min.js and .min.css files if they exist
 * Must be placed BEFORE express.static middleware
 */

const fs = require('fs');
const path = require('path');

module.exports = function minifyAssetsMiddleware(req, res, next) {
  const url = req.url.split('?')[0]; // Remove query string
  
  // Check if it's a JS or CSS file request (not already minified)
  if (url.match(/\.(js|css)$/) && !url.includes('.min.')) {
    // Check if minified version exists
    const minPath = url.replace(/\.(js|css)$/, '.min.$1');
    const fullMinPath = path.join(process.cwd(), 'public', minPath);
    
    if (fs.existsSync(fullMinPath)) {
      // Modify the request URL to serve minified version
      const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
      req.url = minPath + queryString;
    }
  }
  
  next();
};

