const router = require('express').Router();
const c = require('../controllers/favoriteController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.get('/', c.list);
router.post('/:recipeId', c.add);
router.delete('/:recipeId', c.remove);

module.exports = router;
