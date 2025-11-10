// routes/payments.js

const express = require('express');
const router = express.Router();
const pc = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/auth');

// Updated to use the requested endpoint path and controller function name
router.post('/create-payment-intent', authenticate, authorize('retailer'), pc.createPaymentIntent);
router.post('/verify-payment', authenticate, pc.verifyPayment);

// You can set up a webhook later if needed for more reliability
// router.post('/webhook', express.raw({ type: 'application/json' }), pc.razorpayWebhook);

module.exports = router;