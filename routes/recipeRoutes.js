const router = require('express').Router();
const c = require('../controllers/recipeController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadImage } = require('../utils/upload');
const { validate, parseRecipeBody, recipeRules } = require('../middleware/validators');

router.get('/', c.list);
router.get('/:id', c.getOne);
router.post('/', requireAuth, uploadImage, parseRecipeBody, recipeRules, validate, c.create);
router.put('/:id', requireAuth, uploadImage, parseRecipeBody, recipeRules, validate, c.update);
router.delete('/:id', requireAuth, c.remove);

module.exports = router;
