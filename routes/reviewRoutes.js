const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createProductReview,
  updateReview,
  deleteReview,
  getPendingReviews,
  approveReview,
  replyToReview
} = require('../controllers/reviewController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Public routes
router.route('/product/:productId')
  .get(getProductReviews);

// User routes
router.route('/')
  .post(protect, createProductReview);

// Admin routes
router.route('/pending')
  .get(protect, admin, getPendingReviews);

router.route('/:id/approve')
  .put(protect, admin, approveReview);

router.route('/:id/reply')
  .post(protect, admin, replyToReview);

// Review owner or admin routes
router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;