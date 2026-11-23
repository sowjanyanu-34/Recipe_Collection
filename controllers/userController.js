const bcrypt = require('bcrypt');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Favorite = require('../models/Favorite');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('User not found.', 404);
  const [recipes, favorites] = await Promise.all([Recipe.countDocuments({ author: user._id }), Favorite.countDocuments({ user: user._id })]);
  res.json({ success: true, data: { user, stats: { recipes, favorites } } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userId).select('+password');
  if (!user) throw new AppError('User not found.', 404);

  if (email !== user.email && (await User.exists({ email, _id: { $ne: user._id } }))) {
    throw new AppError('That email is already used by another account.', 409, [{ field: 'email', message: 'Email already registered.' }]);
  }
  if (newPassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError('Current password is incorrect.', 400, [{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
    }
    user.password = await bcrypt.hash(newPassword, 12);
  }
  user.name = name;
  user.email = email;
  await user.save();
  res.json({ success: true, message: 'Profile updated.', user });
});
