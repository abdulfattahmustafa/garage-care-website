const crypto = require('crypto');
const multer = require('multer');
const tenantDb = require('../tenantDb');

// Only a small allow-list of document/image types — never trust the
// client-supplied filename or extension, only the sniffed mimetype, and
// always write with a randomized name (no user input in the stored path).
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  // Resolved per-request so each showroom's files land in its own
  // tenant folder — never a shared uploads directory.
  destination: (req, file, cb) => cb(null, tenantDb.getUploadsDir(req.tenantSlug)),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || '';
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('نوع الملف غير مسموح — بس صور (JPG/PNG/WEBP) أو PDF'));
    }
    cb(null, true);
  },
});

// Wraps upload.single(field) so multer/file-filter errors render a friendly
// redirect instead of the default Express error page.
function uploadSingle(field, onError) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) {
        let message = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') message = 'الملف كبير جدًا — الحد الأقصى 10 ميقابايت';
        return onError(req, res, message);
      }
      next();
    });
  };
}

module.exports = { upload, uploadSingle, getUploadsDir: tenantDb.getUploadsDir };
