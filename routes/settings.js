const express = require('express');
const router = express.Router();
const sc = require('../controllers/settingsController');
const { authenticate } = require('../middlewares/auth');

router.get('/profile', authenticate, sc.getProfile);
router.put('/profile', authenticate, sc.updateProfile);
router.put('/password', authenticate, sc.changePassword);

module.exports = router;
