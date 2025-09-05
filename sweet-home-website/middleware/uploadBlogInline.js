const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/blog/inline');
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
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
});

const fileFilter = (req, file, cb) => {
  const mm = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isImage = /^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(mm) || ['.jpg','.jpeg','.png','.webp','.gif','.heic','.heif'].includes(ext);
  if (isImage) return cb(null, true);
  return cb(new Error('Invalid file type'), false);
};

const uploader = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('image');

module.exports = function uploadBlogInline(req, res, next) {
  uploader(req, res, async function (err) {
    if (err) return next(err);
    try {
      if (!req.file) return next();
      const sharp = require('sharp');
      let heicConvert;
      try { heicConvert = require('heic-convert'); } catch (_) { heicConvert = null; }
      const ext = path.extname(req.file.path).toLowerCase();
      if (ext === '.heic' || ext === '.heif') {
        const dest = req.file.path.replace(/\.(heic|heif)$/i, '.jpg');
        try {
          await sharp(req.file.path).rotate().jpeg({ quality: 80 }).toFile(dest);
        } catch (e) {
          if (heicConvert) {
            const inputBuffer = fs.readFileSync(req.file.path);
            const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.8 });
            fs.writeFileSync(dest, outputBuffer);
          } else { throw e; }
        }
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        req.file.filename = path.basename(dest);
        req.file.path = dest;
        req.file.mimetype = 'image/jpeg';
        req.file.size = fs.statSync(dest).size;
      }
      next();
    } catch (e) { next(e); }
  });
};


