require('dotenv').config();
const createApp = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recipe_collection_db';

async function start() {
  if (!process.env.SESSION_SECRET) {
    console.error('\n[ERROR] SESSION_SECRET is not set. Copy .env.example to .env and set a long random secret.\n');
    process.exit(1);
  }
  if (process.env.SESSION_SECRET === 'replace_with_a_long_random_secret') {
    console.warn('[WARN] SESSION_SECRET still has the example value. Change it in .env before deploying anywhere public.');
  }
  try {
    await connectDB(MONGODB_URI);
    console.log('MongoDB connected.');
  } catch (err) {
    console.error('\n[ERROR] Could not connect to MongoDB at the configured MONGODB_URI.');
    console.error('  - Local install: make sure the "MongoDB Server" Windows service is running.');
    console.error('  - Atlas: check the connection string, database user password and IP access list.');
    console.error('  Details: ' + err.message + '\n');
    process.exit(1);
  }
  const app = createApp({ mongoUrl: MONGODB_URI });
  app.listen(PORT, () => console.log(`Recipe Collection is running at http://localhost:${PORT}`));
}

start();
