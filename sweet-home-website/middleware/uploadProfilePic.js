// middleware/uploadProfilePic.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const s3 = require('../config/spaces');

// Use memory storage since we'll upload to Spaces or write locally
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mm = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isImage = mm.startsWith('image/') || ext === '.heic' || ext === '.heif';
  if (isImage) return cb(null, true);
  return cb(new Error('Only images allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('profile_picture');

// Helper: slugify for folder names
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Upload to DigitalOcean Spaces (only when DO_SPACES_BUCKET is set)
// Use putObject (core S3 API) so it works in all environments; upload() can be missing in some setups
const uploadToSpaces = async (buffer, filename, mimetype, userId, displayName) => {
  const nameSlug = slugify(displayName);
  const folder = userId ? (nameSlug ? `profiles/${userId}-${nameSlug}` : `profiles/${userId}`) : `profiles`;
  const key = `${folder}/${filename}`;
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read'
  };

  return new Promise((resolve, reject) => {
    s3.putObject(params, (err) => {
      if (err) {
        reject(err);
      } else {
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const base = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : null;
        const url = base ? `${base}/${key}` : `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${key}`;
        resolve({ url, key, folder });
      }
    });
  });
};

// Local fallback when Spaces is not configured (e.g. dev)
const saveToLocal = (buffer, finalFilename) => {
  const dir = path.join(process.cwd(), 'uploads', 'profiles');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, finalFilename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/profiles/${finalFilename}`;
};

// Helper function to convert HEIC to JPEG
const convertHeicToJpeg = async (buffer) => {
  try {
    const jpegBuffer = await heicConvert({
      buffer: buffer,
      format: 'JPEG',
      quality: 0.8
    });
    return jpegBuffer;
  } catch (error) {
    throw new Error('Failed to convert HEIC image');
  }
};

// Main middleware function
module.exports = async function uploadProfilePic(req, res, next) {
  upload(req, res, async function (err) {
    if (err) return next(err);
    try {
      if (!req.file) {
        return next();
      }

      let buffer = req.file.buffer;
      let filename = req.file.originalname;
      let mimetype = req.file.mimetype;

      // Convert HEIC/HEIF to JPEG
      if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif') {
        buffer = await convertHeicToJpeg(buffer);
        filename = filename.replace(/\.(heic|heif)$/i, '.jpg');
        mimetype = 'image/jpeg';
      }

      // Resize image if needed
      if (buffer.length > 1024 * 1024) { // If larger than 1MB
        buffer = await sharp(buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      // Generate unique filename
      const ext = path.extname(filename);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const finalFilename = `profile-${timestamp}-${random}${ext}`;

      req.file.filename = finalFilename;

      // When DigitalOcean Spaces is configured, upload there; otherwise save locally
      if (process.env.DO_SPACES_BUCKET) {
        const userId = req.session?.user?.id || null;
        const displayName = req.body?.name || req.session?.user?.name || '';
        const { url: fileUrl, key, folder } = await uploadToSpaces(buffer, finalFilename, mimetype, userId, displayName);
        req.file.url = fileUrl;
        req.file.key = key;
        req.file.folder = folder;
      } else {
        req.file.url = saveToLocal(buffer, finalFilename);
        req.file.key = null;
        req.file.folder = 'profiles';
      }

      next();
    } catch (e) {
      return next(e);
    }
  });
};