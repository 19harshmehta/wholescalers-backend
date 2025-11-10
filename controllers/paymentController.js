// controllers/paymentController.js

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Renamed function to align with common API convention and user request
exports.createPaymentIntent = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        if (invoice.issuedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (invoice.status === 'paid') {
            return res.status(400).json({ error: 'Invoice is already paid' });
        }

        const options = {
            amount: invoice.amount * 100, // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: invoice.invoiceNumber,
        };

        const order = await instance.orders.create(options);
        
        // Save razorpay order id to our invoice
        invoice.razorpayOrderId = order.id;
        await invoice.save();

        // The keyId, amount, and orderId are what the frontend needs.
        // We add a URL structure as a conceptual 'paymentUrl' for your specific requirement.
        const razorpayCheckoutUrl = `https://checkout.razorpay.com/v1/checkout.js?key=${process.env.RAZORPAY_KEY_ID}&order_id=${order.id}`;


        res.json({
            // Your requested structure with explanatory values:
            "paymentUrl": razorpayCheckoutUrl,
            "orderId": order.id,

            // Other necessary values for the frontend to open the modal
            "keyId": process.env.RAZORPAY_KEY_ID,
            "amount": order.amount,
            "currency": order.currency
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Find the invoice associated with this order
    const invoice = await Invoice.findOne({ razorpayOrderId: razorpay_order_id });
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found for this order' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment is authentic
        invoice.status = 'paid';
        invoice.razorpayPaymentId = razorpay_payment_id;
        await invoice.save();
        res.json({ ok: true, msg: 'Payment verified and successful' });
    } else {
        res.status(400).json({ error: 'Payment verification failed' });
    }
};