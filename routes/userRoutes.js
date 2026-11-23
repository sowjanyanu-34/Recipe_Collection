const router = require('express').Router();
const c = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate, profileRules } = require('../middleware/validators');

router.get('/profile', requireAuth, c.getProfile);
router.put('/profile', requireAuth, profileRules, validate, c.updateProfile);

module.exports = router;
