#!/usr/bin/env node

/**
 * Minify all JavaScript and CSS files in public/js and public/css
 * Creates .min.js and .min.css versions of the files
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');

const publicDir = path.join(__dirname, '..', 'public');

// Minify JavaScript file
async function minifyJavaScript(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await minifyJS(code, {
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace']
      },
      format: {
        comments: false
      }
    });
    
    if (result.error) {
      console.error(`Error minifying ${filePath}:`, result.error);
      return false;
    }
    
    const minPath = filePath.replace(/\.js$/, '.min.js');
    fs.writeFileSync(minPath, result.code);
    console.log(`✓ Minified: ${path.relative(publicDir, filePath)} → ${path.relative(publicDir, minPath)}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Minify CSS file
function minifyCSS(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const cleanCSS = new CleanCSS({
      level: 2,
      format: false
    });
    
    const result = cleanCSS.minify(code);
    
    if (result.errors && result.errors.length > 0) {
      console.error(`Errors minifying ${filePath}:`, result.errors);
      return false;
    }
    
    const minPath = filePath.replace(/\.css$/, '.min.css');
    fs.writeFileSync(minPath, result.styles);
    console.log(`✓ Minified: ${path.relative(publicDir, filePath)} → ${path.relative(publicDir, minPath)}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Recursively find all JS and CSS files
function findFiles(dir, extensions, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, extensions, fileList);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      // Skip already minified files
      if (!file.includes('.min.')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Main function
async function main() {
  console.log('Starting asset minification...\n');
  
  const jsFiles = findFiles(path.join(publicDir, 'js'), ['.js']);
  const cssFiles = findFiles(path.join(publicDir, 'css'), ['.css']);
  
  console.log(`Found ${jsFiles.length} JavaScript files and ${cssFiles.length} CSS files\n`);
  
  let jsSuccess = 0;
  let cssSuccess = 0;
  
  // Minify JavaScript files
  for (const file of jsFiles) {
    const success = await minifyJavaScript(file);
    if (success) jsSuccess++;
  }
  
  // Minify CSS files
  for (const file of cssFiles) {
    const success = minifyCSS(file);
    if (success) cssSuccess++;
  }
  
  console.log(`\n✓ Minification complete!`);
  console.log(`  JavaScript: ${jsSuccess}/${jsFiles.length} files`);
  console.log(`  CSS: ${cssSuccess}/${cssFiles.length} files`);
}

main().catch(console.error);

