const express = require('express');
const router = express.Router();
const pc = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, pc.list);
router.post('/', authenticate, authorize('wholesaler'), pc.create);
router.get('/:id', authenticate, pc.get);
router.put('/:id', authenticate, authorize('wholesaler'), pc.update);
router.delete('/:id', authenticate, authorize('wholesaler'), pc.remove);

module.exports = router;
