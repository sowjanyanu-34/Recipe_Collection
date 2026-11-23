const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Deletes an uploaded image. Bundled images (paths starting with "/") are never deleted.
function removeUpload(filename) {
  if (!filename || filename.startsWith('/')) return;
  try {
    fs.unlinkSync(path.join(uploadsDir, path.basename(filename)));
  } catch (e) {
    /* already gone */
  }
}

module.exports = { uploadsDir, removeUpload };
