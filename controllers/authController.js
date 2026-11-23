const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;
// Used so a login for an unknown email takes about as long as a real one
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const destroy = (req) => new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw new AppError('An account with this email already exists.', 409, [{ field: 'email', message: 'Email already registered.' }]);
  const user = await User.create({ name, email, password: await bcrypt.hash(password, SALT_ROUNDS) });
  await regenerate(req);
  req.session.userId = String(user._id);
  res.status(201).json({ success: true, message: 'Account created. Welcome!', user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new AppError('Invalid email or password.', 401);
  await regenerate(req);
  req.session.userId = String(user._id);
  res.json({ success: true, message: 'Logged in successfully.', user });
});

exports.logout = asyncHandler(async (req, res) => {
  await destroy(req);
  res.clearCookie('recipe.sid');
  res.json({ success: true, message: 'Logged out.' });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    await destroy(req);
    throw new AppError('Please log in to continue.', 401);
  }
  res.json({ success: true, user });
});
