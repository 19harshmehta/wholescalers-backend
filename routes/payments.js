// routes/payments.js

const express = require('express');
const router = express.Router();
const pc = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/create-order', authenticate, authorize('retailer'), pc.createRazorpayOrder);
router.post('/verify-payment', authenticate, pc.verifyPayment);

// You can set up a webhook later if needed for more reliability
// router.post('/webhook', express.raw({ type: 'application/json' }), pc.razorpayWebhook);

module.exports = router;