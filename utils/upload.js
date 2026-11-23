const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('./AppError');
const { uploadsDir, removeUpload } = require('./files');
const { MAX_IMAGE_BYTES } = require('../config/constants');

const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT_BY_MIME[file.mimetype])
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_BY_MIME[file.mimetype] || !ALLOWED_EXT.includes(ext)) {
      return cb(new AppError('Only JPG, JPEG, PNG and WEBP images are allowed.', 400));
    }
    cb(null, true);
  }
});

// Checks the real file signature, not just the declared type
function verifyImage(req, res, next) {
  if (!req.file) return next();
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(req.file.path, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (!(jpg || png || webp)) {
    removeUpload(req.file.filename);
    req.file = undefined;
    return next(new AppError('The uploaded file is not a valid image.', 400));
  }
  next();
}

module.exports = { uploadImage: [upload.single('image'), verifyImage] };
