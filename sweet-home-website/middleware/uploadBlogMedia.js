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
  limits: { fileSize: 20 * 1024 * 1024, files: 1 } // 20 MB per file
}).single('cover');

// Helper: upload to Spaces using putObject (core S3 API; upload() can be missing in some setups)
const uploadToSpaces = async (buffer, filename, mimetype, folder) => {
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
        resolve({ url, key });
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
    if (err) {
      // Handle Multer errors with user-friendly messages
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new Error('File too large. Maximum file size is 20 MB. Please compress or resize your image before uploading. You can use an online compressor like https://www.iloveimg.com/compress-image'));
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new Error('Too many files. Only one cover image is allowed.'));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new Error(`Unexpected field: "${err.field}". Only "cover" field is allowed.`));
        }
      }
      // Handle invalid file type error
      if (err.message === 'Invalid file type') {
        return next(new Error('Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported for cover images.'));
      }
      // Handle other errors (e.g., invalid file type)
      return next(err);
    }
    try {
      if (!req.file) return next();

      let buffer = req.file.buffer;
      let filename = req.file.originalname;
      let mimetype = req.file.mimetype;

      // Convert HEIC/HEIF to JPEG
      if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif') {
        try {
          buffer = await convertHeicToJpeg(buffer);
          filename = filename.replace(/\.(heic|heif)$/i, '.jpg');
          mimetype = 'image/jpeg';
        } catch (heicError) {
          return next(new Error('Failed to convert HEIC image. Please try converting it to JPEG first using an online converter.'));
        }
      }

      // Resize image if needed
      if (buffer.length > 2 * 1024 * 1024) { // If larger than 2MB
        try {
          buffer = await sharp(buffer)
            .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
        } catch (sharpError) {
          return next(new Error('Failed to process image. The file may be corrupted or in an unsupported format. Please try a different image.'));
        }
      }

      // Generate sanitized filename
      const finalFilename = sanitizeFilename(filename);

      // Upload directly under blog/<provisionalSlug>/cover using title; controller will reconcile if slug changes
      const slugify = (s) => String(s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const provisionalSlug = slugify(req.body?.title);
      const folder = `blog/${provisionalSlug}/cover`;
      
      try {
        const { url: fileUrl, key } = await uploadToSpaces(buffer, finalFilename, mimetype, folder);
        
        // Store the CDN URL in req.file for the controller
        req.file.filename = finalFilename;
        req.file.url = fileUrl;
        req.file.key = key;
        req.file.provisionalSlug = provisionalSlug;
      } catch (uploadError) {
        return next(new Error('Failed to upload image to server. Please check your internet connection and try again. If the problem persists, the file may be too large or corrupted.'));
      }
      
      next();
    } catch (e) {
      // Catch any unexpected errors and provide user-friendly message
      if (e.message && e.message.length < 200) {
        return next(e);
      }
      return next(new Error('An unexpected error occurred while processing your image. Please try a different image or contact support if the problem persists.'));
    }
  });
};