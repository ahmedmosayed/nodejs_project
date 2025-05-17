const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderReports
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrderById)
  .put(protect, admin, updateOrderStatus)
  .delete(protect, admin, deleteOrder);

router.route('/reports')
  .get(protect, admin, getOrderReports);

module.exports = router;