const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', (req,res)=> res.json({ok:true})); // stateless
router.get('/me', authenticate, me);

module.exports = router;
