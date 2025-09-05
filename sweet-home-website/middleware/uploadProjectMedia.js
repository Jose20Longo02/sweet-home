const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ensure upload folder exists and store files under public/uploads/projects
const uploadDir = path.join(__dirname, '../public/uploads/projects');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).toLowerCase();
  const safeBase = base
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${Date.now()}-${safeBase}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  }
});

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

module.exports = async function uploadProjectMedia(req, res, next) {
  uploader(req, res, async function (err) {
    if (err) return next(err);
    try {
      const sharp = require('sharp');
      let heicConvert;
      try { heicConvert = require('heic-convert'); } catch (_) { heicConvert = null; }
      const convertIfHeic = async (file) => {
        if (!file) return;
        const ext = path.extname(file.path).toLowerCase();
        if (ext === '.heic' || ext === '.heif') {
          const dest = file.path.replace(/\.(heic|heif)$/i, '.jpg');
          try {
            await sharp(file.path).rotate().jpeg({ quality: 80 }).toFile(dest);
          } catch (e) {
            if (heicConvert) {
              const inputBuffer = fs.readFileSync(file.path);
              const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.8 });
              fs.writeFileSync(dest, outputBuffer);
            } else { throw e; }
          }
          try { fs.unlinkSync(file.path); } catch (_) {}
          file.filename = path.basename(dest);
          file.path = dest;
          file.mimetype = 'image/jpeg';
          file.size = fs.statSync(dest).size;
        }
      };
      const all = [];
      (req.files?.photos || []).forEach(f => all.push(convertIfHeic(f)));
      await Promise.all(all);
      return next();
    } catch (e) { return next(e); }
  });
};


