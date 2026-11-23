const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Recipe = require('../models/Recipe');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { presentRecipe } = require('../utils/presenters');

exports.list = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate({ path: 'recipe', populate: { path: 'author', select: 'name' } });
  const all = new Set(favs.filter((f) => f.recipe).map((f) => String(f.recipe._id)));
  const recipes = favs.filter((f) => f.recipe).map((f) => presentRecipe(f.recipe, all, req.userId));
  res.json({ success: true, data: { recipes } });
});

exports.add = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  if (!mongoose.isValidObjectId(recipeId) || !(await Recipe.exists({ _id: recipeId }))) throw new AppError('Recipe not found.', 404);
  let created = false;
  try {
    const r = await Favorite.updateOne({ user: req.userId, recipe: recipeId }, { $setOnInsert: { user: req.userId, recipe: recipeId } }, { upsert: true });
    created = r.upsertedCount > 0;
  } catch (err) {
    if (err.code !== 11000) throw err; // concurrent duplicate: already saved
  }
  res.status(created ? 201 : 200).json({ success: true, message: created ? 'Saved to favourites.' : 'Already in favourites.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  if (!mongoose.isValidObjectId(recipeId)) throw new AppError('Recipe not found.', 404);
  await Favorite.deleteOne({ user: req.userId, recipe: recipeId });
  res.json({ success: true, message: 'Removed from favourites.' });
});
