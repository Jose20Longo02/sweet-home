#!/usr/bin/env node
/**
 * Script to upload email template images to DigitalOcean Spaces
 * Usage: node scripts/upload-email-images.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const s3 = require('../config/spaces');

const BUCKET = process.env.DO_SPACES_BUCKET;
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT;

if (!BUCKET) {
  console.error('Error: DO_SPACES_BUCKET environment variable is not set');
  process.exit(1);
}

const imagesToUpload = [
  {
    localPath: path.join(__dirname, '../public/images/berlin-hero.jpg'),
    remoteKey: 'email-assets/berlin-hero.jpg',
    contentType: 'image/jpeg'
  },
  {
    localPath: path.join(__dirname, '../public/images/Sweet Home Logo.png'),
    remoteKey: 'email-assets/sweet-home-logo.png',
    contentType: 'image/png'
  }
];

async function uploadImage(localPath, remoteKey, contentType) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(localPath)) {
      reject(new Error(`File not found: ${localPath}`));
      return;
    }

    const fileContent = fs.readFileSync(localPath);

    const params = {
      Bucket: BUCKET,
      Key: remoteKey,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable'
    };

    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const cdnBase = CDN_ENDPOINT 
          ? (CDN_ENDPOINT.startsWith('http') ? CDN_ENDPOINT : `https://${CDN_ENDPOINT}`)
          : null;
        const url = cdnBase ? `${cdnBase}/${remoteKey}` : data.Location;
        resolve({ url, key: remoteKey });
      }
    });
  });
}

async function main() {
  console.log('Uploading email template images to DigitalOcean Spaces...\n');

  const results = {};

  for (const image of imagesToUpload) {
    try {
      console.log(`Uploading ${path.basename(image.localPath)}...`);
      const result = await uploadImage(image.localPath, image.remoteKey, image.contentType);
      results[image.remoteKey] = result.url;
      console.log(`✓ Uploaded: ${result.url}\n`);
    } catch (error) {
      console.error(`✗ Failed to upload ${path.basename(image.localPath)}:`, error.message);
      process.exit(1);
    }
  }

  console.log('='.repeat(60));
  console.log('Upload complete! Use these URLs in your email template:\n');
  console.log('Berlin Hero Image:');
  console.log(results['email-assets/berlin-hero.jpg']);
  console.log('\nLogo:');
  console.log(results['email-assets/sweet-home-logo.png']);
  console.log('\n='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

