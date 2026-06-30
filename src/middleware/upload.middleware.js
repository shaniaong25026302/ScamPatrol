// <Rebecca Member 2 Start>
// Multer image upload middleware for scam case evidence screenshots/photos.
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-");

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});

function imageOnly(req, file, cb) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    return cb(null, true);
  }

  return cb(new Error("Only image files are allowed. Use JPG, PNG, WEBP, or GIF."));
}

const upload = multer({
  storage,
  fileFilter: imageOnly,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 3
  }
});

module.exports = upload;
// <Rebecca Member 2 End>
