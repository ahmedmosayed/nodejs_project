const db = require('../db');
const { body, validationResult } = require('express-validator');

// Get User Orders
exports.getUserOrders = (req, res) => {
  const userId = req.params.id;
  const query = `
    SELECT o.id AS order_id, o.created_at, p.id AS product_id, p.name, p.price, oi.quantity
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
};

// Validation rules for createOrder
exports.createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Order must include at least one item'),
  body('items.*.product_id').isInt({ gt: 0 }).withMessage('Each item must have a valid product_id'),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('Each item must have a quantity greater than zero'),
];

// Create Order
exports.createOrder = (req, res) => {
  const userId = req.params.id;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items } = req.body; 

  const orderQuery = 'INSERT INTO orders (user_id) VALUES (?)';
  db.query(orderQuery, [userId], (err, orderResult) => {
    if (err) return res.status(500).json({ error: 'Database error when creating order' });

    const orderId = orderResult.insertId;
    const orderItems = items.map(item => [orderId, item.product_id, item.quantity]);

    const itemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity) VALUES ?';
    db.query(itemsQuery, [orderItems], (err2) => {
      if (err2) return res.status(500).json({ error: 'Database error when inserting order items' });

      res.status(201).json({ message: 'Order created successfully', order_id: orderId });
    });
  });
};

// Get User Wishlist
exports.getUserWishlist = (req, res) => {
  const userId = req.params.id;
  const query = `
    SELECT p.id, p.name, p.price, p.image_url 
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
};

// Get User Profile
exports.getUserProfile = (req, res) => {
  const userId = req.params.id;
  db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
};

// Validation rules for updateUserProfile
exports.updateUserProfileValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email'),
];

// Update User Profile
exports.updateUserProfile = (req, res) => {
  const userId = req.params.id;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email } = req.body;

  db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Profile updated successfully' });
  });
};
