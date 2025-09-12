// middleware/uploadProfilePic.js
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const sharp   = require('sharp');

// ensure upload folder exists
const uploadDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Generate a unique filename using timestamp and random string
    // This avoids conflicts and makes the filename more unique
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `profile-${timestamp}-${random}${ext}`);
  }
});

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

// Wrapper middleware: handle HEIC/HEIF by converting to JPEG after upload
module.exports = async function uploadProfilePic(req, res, next) {
  upload(req, res, async function (err) {
    if (err) return next(err);
    try {
      if (req.file) {
        const filePath = req.file.path;
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.heic' || ext === '.heif') {
          const destJpg = filePath.replace(/\.(heic|heif)$/i, '.jpg');
          try {
            const convert = require('heic-convert');
            const inputBuffer = fs.readFileSync(filePath);
            const outputBuffer = await convert({ buffer: inputBuffer, format: 'JPEG', quality: 0.8 });
            fs.writeFileSync(destJpg, outputBuffer);
          } catch (e) {
            // As a last resort, try sharp in case platform supports it
            try { await sharp(filePath).rotate().jpeg({ quality: 80 }).toFile(destJpg); }
            catch (e2) { return next(e); }
          }
          try { fs.unlinkSync(filePath); } catch (_) {}
          req.file.filename = path.basename(destJpg);
          req.file.path = destJpg;
          req.file.mimetype = 'image/jpeg';
          req.file.size = fs.statSync(destJpg).size;
        }
      }
      return next();
    } catch (e) {
      return next(e);
    }
  });
};