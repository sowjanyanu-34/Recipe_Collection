const router = require('express').Router();
const c = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate, registerRules, loginRules } = require('../middleware/validators');

router.post('/register', registerRules, validate, c.register);
router.post('/login', loginRules, validate, c.login);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);

module.exports = router;
