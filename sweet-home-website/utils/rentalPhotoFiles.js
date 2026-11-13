const fs = require('fs');
const path = require('path');
const FurnishedRental = require('../models/FurnishedRental');
const { videoFileName } = require('./rentalVideo');

const PHOTO_DIR = path.resolve(process.cwd(), 'uploads', 'furnished-rentals', 'photos');
const SPACES_PREFIX = 'furnished-rentals/photos/';

function rentalPhotoName(url) {
  let pathname = String(url || '').trim();
  if (!pathname) return null;
  try {
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
      pathname = new URL(pathname).pathname;
    }
  } catch (_) {
    return null;
  }
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch (_) {}
  const normalized = decoded.replace(/\\/g, '/');
  const marker = '/furnished-rentals/photos/';
  const at = normalized.indexOf(marker);
  if (at === -1) return null;
  const name = normalized.slice(at + marker.length);
  if (!name || name.includes('/') || name.includes('..')) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}

function localPhotoPath(name) {
  const file = path.resolve(PHOTO_DIR, name);
  if (file !== path.join(PHOTO_DIR, name)) return null;
  return file;
}

function removeLocalPhoto(name) {
  const file = localPhotoPath(name);
  if (!file) return;
  if (!fs.existsSync(file)) return;
  fs.unlinkSync(file);
}

function removeSpacesPhoto(name) {
  if (!process.env.DO_SPACES_BUCKET) return Promise.resolve();
  const s3 = require('../config/spaces');
  const key = `${SPACES_PREFIX}${name}`;
  return new Promise((resolve, reject) => {
    s3.deleteObject({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    }, (err) => (err ? reject(err) : resolve()));
  });
}

async function deleteStoredRentalPhoto(url) {
  const name = rentalPhotoName(url);
  if (!name) return;
  const remote = String(url).startsWith('http://') || String(url).startsWith('https://');
  if (remote) {
    await removeSpacesPhoto(name);
    return;
  }
  removeLocalPhoto(name);
}

async function deleteUnusedRentalPhotos(urls) {
  const unique = [...new Set((urls || []).map((url) => String(url || '').trim()).filter(Boolean))];
  for (const url of unique) {
    if (!rentalPhotoName(url)) continue;
    if (await FurnishedRental.photoReferenced(url)) continue;
    try {
      await deleteStoredRentalPhoto(url);
    } catch (error) {
      console.error('Failed to delete rental photo:', error.message);
    }
  }
}

const VIDEO_DIR = path.resolve(process.cwd(), 'uploads', 'furnished-rentals', 'videos');
const VIDEO_PREFIX = 'furnished-rentals/videos/';

function localVideoPath(name) {
  const file = path.resolve(VIDEO_DIR, name);
  if (file !== path.join(VIDEO_DIR, name)) return null;
  return file;
}

function removeLocalVideo(name) {
  const file = localVideoPath(name);
  if (!file || !fs.existsSync(file)) return;
  fs.unlinkSync(file);
}

function removeSpacesVideo(name) {
  if (!process.env.DO_SPACES_BUCKET) return Promise.resolve();
  const s3 = require('../config/spaces');
  return new Promise((resolve, reject) => {
    s3.deleteObject({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: `${VIDEO_PREFIX}${name}`
    }, (err) => (err ? reject(err) : resolve()));
  });
}

async function deleteStoredRentalVideo(url) {
  const name = videoFileName(url);
  if (!name) return;
  const remote = String(url).startsWith('http://') || String(url).startsWith('https://');
  if (remote) {
    await removeSpacesVideo(name);
    return;
  }
  removeLocalVideo(name);
}

async function deleteUnusedRentalVideos(urls) {
  const unique = [...new Set((urls || []).map((url) => String(url || '').trim()).filter(Boolean))];
  for (const url of unique) {
    if (!videoFileName(url)) continue;
    if (await FurnishedRental.videoReferenced(url)) continue;
    try {
      await deleteStoredRentalVideo(url);
    } catch (error) {
      console.error('Failed to delete rental video:', error.message);
    }
  }
}

module.exports = {
  rentalPhotoName,
  deleteUnusedRentalPhotos,
  deleteUnusedRentalVideos
};
