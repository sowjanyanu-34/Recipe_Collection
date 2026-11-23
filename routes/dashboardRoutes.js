const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/stats', requireAuth, c.stats);

module.exports = router;
