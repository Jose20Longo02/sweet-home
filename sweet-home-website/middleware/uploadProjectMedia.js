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
  const isImage = file.fieldname === 'photos' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  const isVideo = file.fieldname === 'video' && /^video\/(mp4|quicktime|x-matroska)$/i.test(file.mimetype);
  const isPdf   = file.fieldname === 'brochure' && (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'));
  if (isImage || isVideo || isPdf) return cb(null, true);
  return cb(new Error('Invalid file type'), false);
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
        const url = cdn ? `${cdn}/${params.Key}` : data.Location;
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
  const fileUrl = await uploadToSpaces(buffer, finalFilename, mimetype, folder);
  
  // Return file info with Spaces URL
  return {
    filename: finalFilename,
    url: fileUrl,
    mimetype: mimetype,
    size: buffer.length
  };
};

module.exports = async function uploadProjectMedia(req, res, next) {
  uploader(req, res, async function (err) {
    if (err) return next(err);
    try {
      const processedFiles = {};

      // Process photos
      if (req.files?.photos) {
        processedFiles.photos = [];
        for (const file of req.files.photos) {
          const processed = await processAndUploadFile(file, 'projects/photos');
          if (processed) processedFiles.photos.push(processed);
        }
      }

      // Process video
      if (req.files?.video) {
        const processed = await processAndUploadFile(req.files.video[0], 'projects/videos');
        if (processed) processedFiles.video = [processed];
      }

      // Process brochure
      if (req.files?.brochure) {
        const processed = await processAndUploadFile(req.files.brochure[0], 'projects/brochures');
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