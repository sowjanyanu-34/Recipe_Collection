const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One favourite per user per recipe
favoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });
favoriteSchema.index({ recipe: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);
