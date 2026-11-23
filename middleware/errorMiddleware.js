const { removeUpload } = require('../utils/files');

function notFoundApi(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (req.file) removeUpload(req.file.filename);

  let status = err.status || 500;
  let message = err.message || 'Server error.';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0].message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier or value.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value already exists.';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large. The maximum size is 5 MB.' : `Upload error: ${err.message}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body.';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong on the server.';
  }
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}

module.exports = { notFoundApi, errorHandler };
