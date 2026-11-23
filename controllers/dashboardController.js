const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const Favorite = require('../models/Favorite');
const asyncHandler = require('../utils/asyncHandler');
const { favouriteIdSet, presentRecipe } = require('../utils/presenters');
const { CATEGORIES } = require('../config/constants');

exports.stats = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const authorId = new mongoose.Types.ObjectId(userId);
  const [totalRecipes, myRecipes, myFavorites, grouped, recent, myLatest] = await Promise.all([
    Recipe.countDocuments(),
    Recipe.countDocuments({ author: authorId }),
    Favorite.countDocuments({ user: authorId }),
    Recipe.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Recipe.find().sort({ createdAt: -1 }).limit(6).populate('author', 'name'),
    Recipe.find({ author: authorId }).sort({ createdAt: -1 }).limit(4).populate('author', 'name')
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
  const ids = [...recent, ...myLatest].map((r) => r._id);
  const favs = await favouriteIdSet(userId, ids);
  res.json({
    success: true,
    data: {
      totalRecipes,
      myRecipes,
      myFavorites,
      categories: CATEGORIES.map((name) => ({ name, count: counts[name] || 0 })),
      recentRecipes: recent.map((r) => presentRecipe(r, favs, userId)),
      myLatestRecipes: myLatest.map((r) => presentRecipe(r, favs, userId))
    }
  });
});
