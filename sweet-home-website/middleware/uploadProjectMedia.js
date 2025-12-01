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
  // Reject unexpected file fields immediately
  const allowedFields = ['photos', 'video', 'brochure'];
  if (!allowedFields.includes(file.fieldname)) {
    return cb(new Error(`Unexpected field: "${file.fieldname}". Allowed fields: ${allowedFields.join(', ')}`), false);
  }
  
  const mm = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isImage = file.fieldname === 'photos' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  const isVideo = file.fieldname === 'video' && /^video\/(mp4|quicktime|x-matroska)$/i.test(file.mimetype);
  const isPdf   = file.fieldname === 'brochure' && (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'));
  if (isImage || isVideo || isPdf) return cb(null, true);
  
  // Provide specific error message based on field type
  let errorMsg = `Invalid file type for "${file.fieldname}". `;
  if (file.fieldname === 'photos') {
    errorMsg += 'Allowed formats: JPEG, PNG, WebP, HEIC/HEIF';
  } else if (file.fieldname === 'video') {
    errorMsg += 'Allowed formats: MP4, QuickTime (.mov), Matroska (.mkv)';
  } else if (file.fieldname === 'brochure') {
    errorMsg += 'Allowed format: PDF';
  }
  errorMsg += `. Received: ${file.mimetype || 'unknown'} (${ext || 'no extension'})`;
  return cb(new Error(errorMsg), false);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 25
  }
}).fields([
  { name: 'photos',   maxCount: 20 },
  { name: 'video',    maxCount: 1  },
  { name: 'brochure', maxCount: 1  }
]);

// Helper function to upload to Spaces
const uploadToSpaces = async (buffer, filename, mimetype, folder) => {
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
        resolve({ url, key: params.Key });
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

// Helper function to process and upload a single file
const processAndUploadFile = async (file, folder) => {
  if (!file) return null;

  let buffer = file.buffer;
  let filename = file.originalname;
  let mimetype = file.mimetype;

  // Convert HEIC/HEIF to JPEG
  if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
    buffer = await convertHeicToJpeg(buffer);
    filename = filename.replace(/\.(heic|heif)$/i, '.jpg');
    mimetype = 'image/jpeg';
  }

  // Resize images if needed (except videos and PDFs)
  if (mimetype.startsWith('image/') && buffer.length > 2 * 1024 * 1024) { // If larger than 2MB
    buffer = await sharp(buffer)
      .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  // Generate sanitized filename
  const finalFilename = sanitizeFilename(filename);

  // Upload to Spaces
  const { url: fileUrl, key } = await uploadToSpaces(buffer, finalFilename, mimetype, folder);
  
  // Return file info with Spaces URL
  return {
    filename: finalFilename,
    url: fileUrl,
    key,
    mimetype: mimetype,
    size: buffer.length
  };
};

module.exports = async function uploadProjectMedia(req, res, next) {
  uploader(req, res, async function (err) {
    if (err) {
      // Handle Multer errors with user-friendly messages
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const fieldName = err.field || '';
          // Check if it's a video file
          if (fieldName === 'video') {
            return next(new Error('File too large. Maximum file size is 20 MB. Please compress your video before uploading. You can use an online video compressor like https://www.veed.io/tools/video-compressor'));
          } else {
            // It's an image file (photos) or PDF (brochure)
            if (fieldName === 'brochure') {
              return next(new Error('File too large. Maximum file size is 20 MB. Please compress your PDF before uploading.'));
            } else {
              return next(new Error('File too large. Maximum file size is 20 MB. Please compress or resize your image before uploading. You can use an online compressor like https://www.iloveimg.com/compress-image'));
            }
          }
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new Error('Too many files. Maximum allowed: 20 photos, 1 video, 1 brochure.'));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          const fieldName = err.field || 'unknown';
          return next(new Error(`Unexpected file field: "${fieldName}". Allowed fields: photos, video, brochure. Please check your form field names.`));
        }
      }
      // Handle invalid file type errors (unsupported formats)
      if (err.message && err.message.includes('Invalid file type')) {
        return next(err); // Pass through the detailed error message from fileFilter
      }
      return next(err);
    }
    try {
      const processedFiles = {};

      const projId = req.params && req.params.id ? String(req.params.id) : null;
      const basePrefix = projId ? `projects/${projId}` : `projects`;

      // Process photos
      if (req.files?.photos) {
        processedFiles.photos = [];
        for (const file of req.files.photos) {
          const processed = await processAndUploadFile(file, `${basePrefix}/photos`);
          if (processed) processedFiles.photos.push(processed);
        }
      }

      // Process video
      if (req.files?.video) {
        const processed = await processAndUploadFile(req.files.video[0], `${basePrefix}/videos`);
        if (processed) processedFiles.video = [processed];
      }

      // Process brochure
      if (req.files?.brochure) {
        const processed = await processAndUploadFile(req.files.brochure[0], `${basePrefix}/brochure`);
        if (processed) processedFiles.brochure = [processed];
      }

      // Replace req.files with processed files
      req.files = processedFiles;
      
      return next();
    } catch (e) { 
      return next(e); 
    }
  });
};