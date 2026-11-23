const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const Favorite = require('../models/Favorite');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { removeUpload } = require('../utils/files');
const { favouriteIdSet, presentRecipe } = require('../utils/presenters');
const { CATEGORIES, DIFFICULTIES } = require('../config/constants');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELDS = ['recipeName', 'description', 'category', 'ingredients', 'instructions', 'preparationTime', 'cookingTime', 'servings', 'difficulty', 'cuisine', 'tags'];
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { recipeName: 1, _id: 1 }
};

function pick(body) {
  const out = {};
  FIELDS.forEach((f) => { if (body[f] !== undefined) out[f] = body[f]; });
  return out;
}

async function findRecipeOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Recipe not found.', 404);
  const recipe = await Recipe.findById(id).populate('author', 'name');
  if (!recipe) throw new AppError('Recipe not found.', 404);
  return recipe;
}

exports.list = asyncHandler(async (req, res) => {
  const { q, category, difficulty, cuisine, maxTime, sort, mine } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 24);
  const filter = {};

  if (mine === 'true') {
    if (!req.session.userId) throw new AppError('Please log in to continue.', 401);
    filter.author = new mongoose.Types.ObjectId(req.session.userId);
  }
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
    filter.$or = [{ recipeName: rx }, { 'ingredients.name': rx }, { cuisine: rx }, { tags: rx }];
  }
  if (CATEGORIES.includes(category)) filter.category = category;
  if (DIFFICULTIES.includes(difficulty)) filter.difficulty = difficulty;
  if (typeof cuisine === 'string' && cuisine.trim()) filter.cuisine = new RegExp(escapeRegex(cuisine.trim().slice(0, 50)), 'i');
  const limitMinutes = parseInt(maxTime, 10);
  if (limitMinutes > 0) filter.$expr = { $lte: [{ $add: ['$preparationTime', '$cookingTime'] }, limitMinutes] };

  const sortKey = typeof sort === 'string' && SORTS[sort] ? sort : 'newest';
  let query = Recipe.find(filter).sort(SORTS[sortKey]).skip((page - 1) * limit).limit(limit).populate('author', 'name');
  if (sortKey === 'name') query = query.collation({ locale: 'en', strength: 2 });

  const [recipes, total] = await Promise.all([query, Recipe.countDocuments(filter)]);
  const favs = await favouriteIdSet(req.session.userId, recipes.map((r) => r._id));
  res.json({
    success: true,
    data: {
      recipes: recipes.map((r) => presentRecipe(r, favs, req.session.userId)),
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
    }
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const recipe = await findRecipeOr404(req.params.id);
  const favs = await favouriteIdSet(req.session.userId, [recipe._id]);
  res.json({ success: true, data: { recipe: presentRecipe(recipe, favs, req.session.userId) } });
});

exports.create = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({ ...pick(req.body), author: req.userId, image: req.file ? req.file.filename : '' });
  await recipe.populate('author', 'name');
  res.status(201).json({ success: true, message: 'Recipe published.', data: { recipe: presentRecipe(recipe, new Set(), req.userId) } });
});

exports.update = asyncHandler(async (req, res) => {
  const recipe = await findRecipeOr404(req.params.id);
  if (String(recipe.author._id) !== String(req.userId)) throw new AppError('You can only edit your own recipes.', 403);

  Object.assign(recipe, pick(req.body));
  const oldImage = recipe.image;
  if (req.file) {
    recipe.image = req.file.filename;
  } else if (req.body.removeImage === 'true' || req.body.removeImage === true) {
    recipe.image = '';
  }
  await recipe.save();
  if (oldImage && oldImage !== recipe.image) removeUpload(oldImage);

  const favs = await favouriteIdSet(req.userId, [recipe._id]);
  res.json({ success: true, message: 'Recipe updated.', data: { recipe: presentRecipe(recipe, favs, req.userId) } });
});

exports.remove = asyncHandler(async (req, res) => {
  const recipe = await findRecipeOr404(req.params.id);
  if (String(recipe.author._id) !== String(req.userId)) throw new AppError('You can only delete your own recipes.', 403);
  await Favorite.deleteMany({ recipe: recipe._id });
  await recipe.deleteOne();
  removeUpload(recipe.image);
  res.json({ success: true, message: 'Recipe deleted.' });
});
