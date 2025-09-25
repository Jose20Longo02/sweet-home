// middleware/uploadProfilePic.js
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const s3 = require('../config/spaces');

// Use memory storage since we'll upload to Spaces
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

// Helper function to upload to Spaces
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const uploadToSpaces = async (buffer, filename, mimetype, userId, displayName) => {
  const nameSlug = slugify(displayName);
  const folder = userId ? (nameSlug ? `profiles/${userId}-${nameSlug}` : `profiles/${userId}`) : `profiles`;
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: `${folder}/${filename}`,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read'
  };
  
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const base = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : null;
        const url = base ? `${base}/${params.Key}` : data.Location;
        resolve({ url, key: params.Key, folder });
      }
    });
  });
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

      // Upload to Spaces
      const userId = req.session?.user?.id || null;
      const displayName = req.body?.name || req.session?.user?.name || '';
      const { url: fileUrl, key, folder } = await uploadToSpaces(buffer, finalFilename, mimetype, userId, displayName);
      
      // Store the CDN URL in req.file for the controller
      req.file.filename = finalFilename;
      req.file.url = fileUrl;
      req.file.key = key;
      req.file.folder = folder;
      
      next();
    } catch (e) {
      return next(e);
    }
  });
};