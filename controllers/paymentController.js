const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

// @desc    Create Stripe payment intent
// @route   POST /api/payment/stripe/create-payment-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: "usd",
    metadata: { integration_check: 'accept_a_payment', orderId },
  });

  // Update order with payment intent ID
  await req.app.get('pool').query(
    'UPDATE orders SET payment_intent_id = ? WHERE id = ?',
    [paymentIntent.id, orderId]
  );

  res.json({
    clientSecret: paymentIntent.client_secret
  });
});

// @desc    Handle Stripe webhook
// @route   POST /api/payment/stripe/webhook
// @access  Public
const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const pool = req.app.get('pool');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the payment_intent.succeeded event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Update order status
    await pool.query(
      'UPDATE orders SET status = "paid", payment_status = "completed" WHERE payment_intent_id = ?',
      [paymentIntent.id]
    );
  }

  res.json({ received: true });
});

// @desc    Create PayPal order
// @route   POST /api/payment/paypal/create-order
// @access  Private
const createPayPalOrder = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  try {
    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toString(),
            },
            reference_id: orderId.toString(),
          },
        ],
      },
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Update order with PayPal order ID
    await req.app.get('pool').query(
      'UPDATE orders SET paypal_order_id = ? WHERE id = ?',
      [response.data.id, orderId]
    );

    res.json(response.data);
  } catch (error) {
    console.error('PayPal create order error:', error.response.data);
    res.status(500);
    throw new Error('PayPal order creation failed');
  }
});

// @desc    Capture PayPal order
// @route   POST /api/payment/paypal/capture-order
// @access  Private
const capturePayPalOrder = asyncHandler(async (req, res) => {
  const { orderID } = req.body;
  const pool = req.app.get('pool');

  try {
    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Get the order ID from PayPal response
    const paypalOrderId = response.data.id;
    const referenceId = response.data.purchase_units[0].reference_id;

    // Update order status
    await pool.query(
      'UPDATE orders SET status = "paid", payment_status = "completed" WHERE paypal_order_id = ? OR id = ?',
      [paypalOrderId, referenceId]
    );

    res.json(response.data);
  } catch (error) {
    console.error('PayPal capture order error:', error.response.data);
    res.status(500);
    throw new Error('PayPal order capture failed');
  }
});

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
  createPayPalOrder,
  capturePayPalOrder
};