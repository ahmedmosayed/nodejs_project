const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  handleStripeWebhook,
  createPayPalOrder,
  capturePayPalOrder
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Stripe routes
router.post('/stripe/create-payment-intent', protect, createPaymentIntent);
router.post('/stripe/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

// PayPal routes
router.post('/paypal/create-order', protect, createPayPalOrder);
router.post('/paypal/capture-order', protect, capturePayPalOrder);

module.exports = router;