const asyncHandler = require('express-async-handler');

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const [reviews] = await req.app.get('pool').query(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar, 
    a.name as admin_name, a.avatar as admin_avatar
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.admin_id = a.id
    WHERE r.product_id = ? AND r.status = 'approved'
    ORDER BY r.created_at DESC
  `, [req.params.productId]);

  res.json(reviews);
});

// @desc    Create a product review
// @route   POST /api/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;

  // Check if user has purchased the product
  const [hasPurchased] = await req.app.get('pool').query(`
    SELECT oi.id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
    LIMIT 1
  `, [req.user.id, productId]);

  if (hasPurchased.length === 0) {
    res.status(400);
    throw new Error('You can only review products you have purchased');
  }

  // Check if user already reviewed this product
  const [existingReview] = await req.app.get('pool').query(`
    SELECT id FROM reviews 
    WHERE user_id = ? AND product_id = ?
  `, [req.user.id, productId]);

  if (existingReview.length > 0) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  // Create review (initially pending)
  const [result] = await req.app.get('pool').query(`
    INSERT INTO reviews 
    (user_id, product_id, rating, comment, status)
    VALUES (?, ?, ?, ?, ?)
  `, [req.user.id, productId, rating, comment, 'pending']);

  const [newReview] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [result.insertId]);

  res.status(201).json(newReview[0]);
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (review owner or admin)
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  // Check if review exists and belongs to user
  const [review] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [req.params.id]);

  if (review.length === 0) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Only allow update if user is owner or admin
  if (review[0].user_id !== req.user.id && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized to update this review');
  }

  await req.app.get('pool').query(`
    UPDATE reviews 
    SET rating = ?, comment = ?, status = ?
    WHERE id = ?
  `, [rating, comment, req.user.isAdmin ? 'approved' : 'pending', req.params.id]);

  const [updatedReview] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [req.params.id]);

  res.json(updatedReview[0]);
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (review owner or admin)
const deleteReview = asyncHandler(async (req, res) => {
  // Check if review exists
  const [review] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [req.params.id]);

  if (review.length === 0) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Only allow delete if user is owner or admin
  if (review[0].user_id !== req.user.id && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized to delete this review');
  }

  await req.app.get('pool').query(`
    DELETE FROM reviews WHERE id = ?
  `, [req.params.id]);

  res.json({ message: 'Review removed' });
});

// @desc    Get pending reviews (for moderation)
// @route   GET /api/reviews/pending
// @access  Private/Admin
const getPendingReviews = asyncHandler(async (req, res) => {
  const [reviews] = await req.app.get('pool').query(`
    SELECT r.*, u.name as user_name, p.name as product_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN products p ON r.product_id = p.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `);

  res.json(reviews);
});

// @desc    Approve a review
// @route   PUT /api/reviews/:id/approve
// @access  Private/Admin
const approveReview = asyncHandler(async (req, res) => {
  const [result] = await req.app.get('pool').query(`
    UPDATE reviews 
    SET status = 'approved', admin_id = ?
    WHERE id = ? AND status = 'pending'
  `, [req.user.id, req.params.id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Review not found or already approved/rejected');
  }

  const [updatedReview] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [req.params.id]);

  res.json(updatedReview[0]);
});

// @desc    Reply to a review
// @route   POST /api/reviews/:id/reply
// @access  Private/Admin
const replyToReview = asyncHandler(async (req, res) => {
  const { reply } = req.body;

  const [result] = await req.app.get('pool').query(`
    UPDATE reviews 
    SET admin_reply = ?, admin_id = ?, replied_at = NOW()
    WHERE id = ? AND status = 'approved'
  `, [reply, req.user.id, req.params.id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Review not found or not approved');
  }

  const [updatedReview] = await req.app.get('pool').query(`
    SELECT * FROM reviews WHERE id = ?
  `, [req.params.id]);

  res.json(updatedReview[0]);
});

module.exports = {
  getProductReviews,
  createProductReview,
  updateReview,
  deleteReview,
  getPendingReviews,
  approveReview,
  replyToReview
};