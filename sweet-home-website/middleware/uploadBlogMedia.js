const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const s3 = require('../config/spaces');

// Use memory storage since we'll upload to Spaces
const storage = multer.memoryStorage();

function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).toLowerCase();
  const safeBase = base
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${Date.now()}-${safeBase}${ext}`;
}

const fileFilter = (req, file, cb) => {
  const mm = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isCover = file.fieldname === 'cover' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  if (isCover) return cb(null, true);
  return cb(new Error('Invalid file type'), false);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
}).single('cover');

// Helper function to upload to Spaces
const uploadToSpaces = async (buffer, filename, mimetype) => {
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: `blog/${filename}`,
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
        resolve(url);
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

module.exports = function uploadBlogMedia(req, res, next) {
  uploader(req, res, async function (err) {
    if (err) return next(err);
    try {
      if (!req.file) return next();

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
      if (buffer.length > 2 * 1024 * 1024) { // If larger than 2MB
        buffer = await sharp(buffer)
          .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      // Generate sanitized filename
      const finalFilename = sanitizeFilename(filename);

      // Upload to Spaces
      const fileUrl = await uploadToSpaces(buffer, finalFilename, mimetype);
      
      // Store the CDN URL in req.file for the controller
      req.file.filename = finalFilename;
      req.file.url = fileUrl;
      
      next();
    } catch (e) { 
      next(e); 
    }
  });
};