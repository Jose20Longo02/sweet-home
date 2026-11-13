const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const heicConvert = require('heic-convert');

const storage = multer.memoryStorage();

const uploader = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 21 },
  fileFilter(req, file, cb) {
    const type = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.fieldname === 'photos') {
      const ok = /^image\/(jpeg|png|webp|heic|heif)$/.test(type) || ext === '.heic' || ext === '.heif';
      if (!ok) return cb(new Error('Photos must be JPEG, PNG, WebP, or HEIC.'));
      return cb(null, true);
    }
    if (file.fieldname === 'video') {
      const ok = /^video\/(mp4|quicktime|x-matroska)$/.test(type) || ext === '.mp4' || ext === '.mov' || ext === '.mkv';
      if (!ok) return cb(new Error('Video must be MP4, MOV, or MKV. A longer video can be a YouTube or Vimeo link.'));
      return cb(null, true);
    }
    return cb(new Error('Only apartment photos and one video can be uploaded here.'));
  }
}).fields([
  { name: 'photos', maxCount: 20 },
  { name: 'video', maxCount: 1 }
]);

function saveLocal(buffer, filename, folder) {
  const dir = path.join(process.cwd(), 'uploads', 'furnished-rentals', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/furnished-rentals/${folder}/${filename}`;
}

function uploadToSpaces(buffer, filename, mimetype, folder) {
  const s3 = require('../config/spaces');
  const key = `furnished-rentals/${folder}/${filename}`;
  return new Promise((resolve, reject) => {
    s3.putObject({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read'
    }, (err) => {
      if (err) return reject(err);
      const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
      const base = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : null;
      const url = base
        ? `${base}/${key}`
        : `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${key}`;
      resolve(url);
    });
  });
}

async function prepare(file) {
  let buffer = file.buffer;
  let filename = file.originalname || 'photo.jpg';
  let mimetype = file.mimetype || 'image/jpeg';
  if (mimetype === 'image/heic' || mimetype === 'image/heif') {
    buffer = await heicConvert({ buffer, format: 'JPEG', quality: 0.8 });
    filename = filename.replace(/\.(heic|heif)$/i, '.jpg');
    mimetype = 'image/jpeg';
  }
  if (mimetype.startsWith('image/') && buffer.length > 2 * 1024 * 1024) {
    buffer = await sharp(buffer)
      .rotate()
      .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    mimetype = 'image/jpeg';
    filename = filename.replace(/\.(png|webp|jpe?g)$/i, '.jpg');
  }
  const ext = path.extname(filename).toLowerCase() || '.jpg';
  const base = path.basename(filename, ext).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-') || 'photo';
  const finalName = `${Date.now()}-${base}${ext}`;
  const url = process.env.DO_SPACES_BUCKET
    ? await uploadToSpaces(buffer, finalName, mimetype, 'photos')
    : saveLocal(buffer, finalName, 'photos');
  return { url };
}

async function prepareVideo(file) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.mp4';
  const base = path.basename(file.originalname || 'video', ext).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-') || 'video';
  const finalName = `${Date.now()}-${base}${ext}`;
  const mimetype = file.mimetype || 'video/mp4';
  const url = process.env.DO_SPACES_BUCKET
    ? await uploadToSpaces(file.buffer, finalName, mimetype, 'videos')
    : saveLocal(file.buffer, finalName, 'videos');
  return { url };
}

function rejectUpload(req, res, next, message) {
  if (req.get('X-Requested-With') === 'fetch') {
    return res.status(400).json({ error: message });
  }
  return next(new Error(message));
}

module.exports = function uploadRentalPhotos(req, res, next) {
  uploader(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return rejectUpload(req, res, next, 'Each file must be 20 MB or smaller. A longer video should be a YouTube or Vimeo link.');
      }
      if (err instanceof multer.MulterError && (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')) {
        return rejectUpload(req, res, next, 'Only 20 photos and one video are allowed');
      }
      return rejectUpload(req, res, next, err.message || 'The photos could not be uploaded.');
    }
    try {
      const incoming = req.files || {};
      const photoFiles = Array.isArray(incoming.photos) ? incoming.photos : [];
      const videoFiles = Array.isArray(incoming.video) ? incoming.video : [];
      const photos = [];
      for (const file of photoFiles) photos.push(await prepare(file));
      const video = [];
      for (const file of videoFiles) video.push(await prepareVideo(file));
      req.files = { photos, video };
      return next();
    } catch (error) {
      console.error(error);
      return rejectUpload(req, res, next, 'The photos could not be uploaded. Try fewer photos, or smaller ones.');
    }
  });
};
