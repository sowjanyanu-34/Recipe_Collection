const AppError = require('../utils/AppError');

// API routes: respond with JSON 401
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return next(new AppError('Please log in to continue.', 401));
  req.userId = req.session.userId;
  next();
}

// Page routes: redirect to the login page
function requirePageAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

module.exports = { requireAuth, requirePageAuth };
