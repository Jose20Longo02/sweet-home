// middleware/uploadPropertyMedia.js
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ensure upload folder exists and store files under public/uploads/properties
const uploadDir = path.join(__dirname, '../public/uploads/properties');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-');
    const unique = Date.now() + '-' + base + ext;
    cb(null, unique);
  }
});

const fileFilter = (req, file, cb) => {
  const mm = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isImage = file.fieldname === 'photos' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  const isVideo = file.fieldname === 'video'  && /^video\/(mp4|quicktime|x-matroska)$/i.test(file.mimetype);
  const isFloor = file.fieldname === 'floorplan' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  const isPlan  = file.fieldname === 'plan_photo' && (/^image\/(jpeg|png|webp|heic|heif)$/i.test(mm) || ext === '.heic' || ext === '.heif');
  if (isImage || isVideo || isFloor || isPlan) return cb(null, true);
  return cb(new Error('Invalid file type'), false);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 25
  }
}).fields([
  { name: 'photos', maxCount: 20 },
  { name: 'video',  maxCount: 1  },
  { name: 'floorplan', maxCount: 1 },
  { name: 'plan_photo', maxCount: 1 }
]);

// Convert HEIC images to JPEG after upload so they render in browsers
module.exports = async function uploadPropertyMedia(req, res, next) {
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
            } else {
              throw e;
            }
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
      (req.files?.floorplan || []).forEach(f => all.push(convertIfHeic(f)));
      (req.files?.plan_photo || []).forEach(f => all.push(convertIfHeic(f)));
      await Promise.all(all);
      return next();
    } catch (e) { return next(e); }
  });
};