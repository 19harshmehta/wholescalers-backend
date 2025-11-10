const express = require('express');
const router = express.Router();
const ic = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/order/:orderId', authenticate, authorize(['wholesaler','admin']), ic.createForOrder);
router.get('/:id/pdf', authenticate, ic.downloadPdf);
router.get('/:id', authenticate, ic.get);
router.get('/', authenticate, authorize('retailer'), ic.listForRetailer);
router.get('/wholesaler', authenticate, authorize('wholesaler'), ic.listForWholesaler);


module.exports = router;