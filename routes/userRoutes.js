const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// Routes for User Orders
router.get('/:id/orders', authenticateToken, userController.getUserOrders);
router.post('/:id/orders', authenticateToken, userController.createOrder);

// Route for User Wishlist
router.get('/:id/wishlist', authenticateToken, userController.getUserWishlist);

// Routes for User Profile
router.get('/:id/profile', authenticateToken, userController.getUserProfile);
router.put('/:id/profile', authenticateToken, userController.updateUserProfile);

module.exports = router;
