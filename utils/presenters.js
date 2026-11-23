const Favorite = require('../models/Favorite');

async function favouriteIdSet(userId, recipeIds) {
  if (!userId || !recipeIds.length) return new Set();
  const favs = await Favorite.find({ user: userId, recipe: { $in: recipeIds } }).select('recipe');
  return new Set(favs.map((f) => String(f.recipe)));
}

function presentRecipe(recipe, favSet, userId) {
  const obj = recipe.toJSON();
  const authorId = recipe.author && recipe.author._id ? recipe.author._id : recipe.author;
  obj.isFavorite = favSet.has(String(recipe._id));
  obj.isOwner = Boolean(userId) && String(authorId) === String(userId);
  return obj;
}

module.exports = { favouriteIdSet, presentRecipe };
