const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getAnalytics,
    createProduct,
    updateProduct,
    deleteProduct,
    getUsers,
    getOrders,
    updateOrderStatus
} = require('../controllers/adminController');

router.use(protect);
router.use(authorize('admin'));

router.get('/analytics', getAnalytics);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/users', getUsers);
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;