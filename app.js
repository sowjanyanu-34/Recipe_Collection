const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const { uploadsDir } = require('./utils/files');
const { requirePageAuth } = require('./middleware/authMiddleware');
const { notFoundApi, errorHandler } = require('./middleware/errorMiddleware');

const pagesDir = path.join(__dirname, 'public', 'pages');
const page = (file) => (req, res) => res.sendFile(path.join(pagesDir, file));

function createApp({ mongoUrl } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'upgrade-insecure-requests': null // the app runs on plain http://localhost
        }
      }
    })
  );
  if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const sessionOptions = {
    name: 'recipe.sid',
    secret: process.env.SESSION_SECRET || 'test-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 1000 * 60 * 60 * 24 * 7 }
  };
  if (mongoUrl) {
    const MongoStore = require('connect-mongo');
    sessionOptions.store = MongoStore.create({ mongoUrl, collectionName: 'sessions', ttl: 60 * 60 * 24 * 7 });
  }
  app.use(session(sessionOptions));

  app.use('/uploads', express.static(uploadsDir, { fallthrough: false, index: false, maxAge: '7d' }));
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  // API
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/recipes', require('./routes/recipeRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/favorites', require('./routes/favoriteRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use('/api', notFoundApi);

  // Pages
  app.get('/', page('index.html'));
  app.get('/register', page('register.html'));
  app.get('/login', page('login.html'));
  app.get('/explore', page('explore.html'));
  app.get('/dashboard', requirePageAuth, page('dashboard.html'));
  app.get('/my-recipes', requirePageAuth, page('my-recipes.html'));
  app.get('/favorites', requirePageAuth, page('favorites.html'));
  app.get('/profile', requirePageAuth, page('profile.html'));
  app.get('/recipes/new', requirePageAuth, page('add-recipe.html'));
  app.get('/recipes/:id/edit', requirePageAuth, page('edit-recipe.html'));
  app.get('/recipes/:id', page('recipe.html'));

  app.use((req, res) => res.status(404).sendFile(path.join(pagesDir, '404.html')));
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
