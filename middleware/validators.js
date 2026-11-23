const { body, validationResult } = require('express-validator');
const { CATEGORIES, DIFFICULTIES } = require('../config/constants');
const { removeUpload } = require('../utils/files');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  if (req.file) removeUpload(req.file.filename);
  const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ success: false, message: errors[0].message, errors });
};

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').isLength({ max: 120 }).normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match.')
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty().withMessage('Enter your password.')
];

const profileRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false }),
  body('newPassword')
    .optional({ values: 'falsy' })
    .isLength({ min: 8, max: 72 }).withMessage('New password must be 8–72 characters.')
    .matches(/[A-Za-z]/).withMessage('New password must contain at least one letter.')
    .matches(/\d/).withMessage('New password must contain at least one number.'),
  body('confirmNewPassword').custom((v, { req }) => !req.body.newPassword || v === req.body.newPassword).withMessage('New passwords do not match.')
];

// Runs after multer: multipart fields arrive as strings, so normalise them into proper types.
function parseRecipeBody(req, res, next) {
  const b = req.body || {};
  const parseJson = (v) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (e) { return undefined; }
  };
  let ingredients = parseJson(b.ingredients);
  let instructions = parseJson(b.instructions);
  let tags = b.tags;
  if (typeof tags === 'string') {
    const parsed = parseJson(tags);
    tags = Array.isArray(parsed) ? parsed : tags.split(',');
  }
  b.ingredients = Array.isArray(ingredients)
    ? ingredients
        .map((i) => ({ name: String((i && i.name) || '').trim(), quantity: String((i && i.quantity) || '').trim() }))
        .filter((i) => i.name)
    : [];
  b.instructions = Array.isArray(instructions) ? instructions.map((s) => String(s || '').trim()).filter(Boolean) : [];
  b.tags = Array.isArray(tags)
    ? [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 10)
    : [];
  req.body = b;
  next();
}

const recipeRules = [
  body('recipeName').trim().isLength({ min: 2, max: 100 }).withMessage('Recipe name must be 2–100 characters.'),
  body('description').trim().isLength({ min: 10, max: 600 }).withMessage('Description must be 10–600 characters.'),
  body('category').isIn(CATEGORIES).withMessage('Choose a valid category.'),
  body('difficulty').isIn(DIFFICULTIES).withMessage('Choose a valid difficulty.'),
  body('cuisine').trim().isLength({ min: 2, max: 50 }).withMessage('Cuisine must be 2–50 characters.'),
  body('preparationTime').isInt({ min: 0, max: 1440 }).withMessage('Preparation time must be 0–1440 minutes.').toInt(),
  body('cookingTime').isInt({ min: 0, max: 1440 }).withMessage('Cooking time must be 0–1440 minutes.').toInt(),
  body('servings').isInt({ min: 1, max: 100 }).withMessage('Servings must be between 1 and 100.').toInt(),
  body('ingredients').isArray({ min: 1, max: 60 }).withMessage('Add at least one ingredient (up to 60).'),
  body('ingredients.*.name').isLength({ max: 100 }).withMessage('Ingredient names must be under 100 characters.'),
  body('ingredients.*.quantity').isLength({ max: 60 }).withMessage('Ingredient quantities must be under 60 characters.'),
  body('instructions').isArray({ min: 1, max: 60 }).withMessage('Add at least one instruction step (up to 60).'),
  body('instructions.*').isLength({ max: 1000 }).withMessage('Each step must be under 1000 characters.')
];

module.exports = { validate, registerRules, loginRules, profileRules, parseRecipeBody, recipeRules };
