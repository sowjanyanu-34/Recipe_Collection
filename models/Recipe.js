const mongoose = require('mongoose');
const { CATEGORIES, DIFFICULTIES } = require('../config/constants');

const recipeSchema = new mongoose.Schema(
  {
    recipeName: { type: String, required: [true, 'Recipe name is required.'], trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, required: [true, 'Description is required.'], trim: true, minlength: 10, maxlength: 600 },
    category: { type: String, required: true, enum: CATEGORIES },
    ingredients: {
      type: [
        {
          _id: false,
          name: { type: String, required: true, trim: true, maxlength: 100 },
          quantity: { type: String, trim: true, maxlength: 60, default: '' }
        }
      ],
      validate: [(v) => v.length >= 1, 'Add at least one ingredient.']
    },
    instructions: {
      type: [{ type: String, trim: true, maxlength: 1000 }],
      validate: [(v) => v.length >= 1, 'Add at least one instruction step.']
    },
    preparationTime: { type: Number, required: true, min: 0, max: 1440 },
    cookingTime: { type: Number, required: true, min: 0, max: 1440 },
    servings: { type: Number, required: true, min: 1, max: 100 },
    difficulty: { type: String, required: true, enum: DIFFICULTIES },
    cuisine: { type: String, required: true, trim: true, maxlength: 50 },
    // Either an uploaded file name (stored in /uploads) or a bundled path starting with "/" (e.g. /images/seed/x.svg)
    image: { type: String, default: '' },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }], default: [] },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true } }
);

recipeSchema.index({ category: 1, createdAt: -1 });
recipeSchema.index({ recipeName: 1 });
recipeSchema.index({ cuisine: 1 });
recipeSchema.index({ 'ingredients.name': 1 });
recipeSchema.index({ tags: 1 });

recipeSchema.virtual('totalTime').get(function () {
  return (this.preparationTime || 0) + (this.cookingTime || 0);
});

recipeSchema.virtual('imageUrl').get(function () {
  if (this.image) return this.image.startsWith('/') ? this.image : `/uploads/${this.image}`;
  const slug = String(this.category || 'dinner').toLowerCase().replace(/[^a-z]+/g, '-');
  return `/images/default-${slug}.svg`;
});

module.exports = mongoose.model('Recipe', recipeSchema);
