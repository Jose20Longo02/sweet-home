const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const heicConvert = require('heic-convert');

const storage = multer.memoryStorage();

const uploader = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter(req, file, cb) {
    if (file.fieldname !== 'photos') {
      return cb(new Error('Only apartment photos can be uploaded here.'));
    }
    const type = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const ok = /^image\/(jpeg|png|webp|heic|heif)$/.test(type) || ext === '.heic' || ext === '.heif';
    if (!ok) return cb(new Error('Photos must be JPEG, PNG, WebP, or HEIC.'));
    return cb(null, true);
  }
}).array('photos', 20);

function saveLocal(buffer, filename) {
  const dir = path.join(process.cwd(), 'uploads', 'furnished-rentals', 'photos');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/furnished-rentals/photos/${filename}`;
}

function uploadToSpaces(buffer, filename, mimetype) {
  const s3 = require('../config/spaces');
  const key = `furnished-rentals/photos/${filename}`;
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
    ? await uploadToSpaces(buffer, finalName, mimetype)
    : saveLocal(buffer, finalName);
  return { url };
}

module.exports = function uploadRentalPhotos(req, res, next) {
  uploader(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new Error('Each photo must be 20 MB or smaller.'));
      }
      return next(err);
    }
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await prepare(file));
      }
      req.files = { photos: uploaded };
      return next();
    } catch (error) {
      return next(error);
    }
  });
};
