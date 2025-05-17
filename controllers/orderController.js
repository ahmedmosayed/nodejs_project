const asyncHandler = require('express-async-handler');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { 
    orderItems, 
    shippingAddress, 
    paymentMethod, 
    itemsPrice, 
    taxPrice, 
    shippingPrice, 
    totalPrice 
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  const pool = req.app.get('pool');
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Create order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, 
        shipping_address, 
        payment_method, 
        items_price, 
        tax_price, 
        shipping_price, 
        total_price,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        JSON.stringify(shippingAddress),
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        'pending'
      ]
    );

    const orderId = orderResult.insertId;

    // Add order items
    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          name,
          qty,
          price,
          image
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product,
          item.name,
          item.qty,
          item.price,
          item.image
        ]
      );

      // Update product stock
      await connection.query(
        'UPDATE products SET count_in_stock = count_in_stock - ? WHERE id = ?',
        [item.qty, item.product]
      );
    }

    await connection.commit();

    const [newOrder] = await pool.query(
      `SELECT o.*, 
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'product_id', oi.product_id,
          'name', oi.name,
          'qty', oi.qty,
          'price', oi.price,
          'image', oi.image
        )
      ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id`,
      [orderId]
    );

    res.status(201).json(newOrder[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500);
    throw new Error('Order creation failed');
  } finally {
    connection.release();
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const [order] = await req.app.get('pool').query(
    `SELECT o.*, 
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'product_id', oi.product_id,
        'name', oi.name,
        'qty', oi.qty,
        'price', oi.price,
        'image', oi.image
      )
    ) as order_items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = ?
    GROUP BY o.id`,
    [req.params.id]
  );

  if (order.length > 0) {
    // Convert shipping_address from JSON string to object
    order[0].shipping_address = JSON.parse(order[0].shipping_address);
    res.json(order[0]);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const [orders] = await req.app.get('pool').query(
    `SELECT o.*, 
    u.name as user_name,
    u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC`
  );

  // Parse shipping_address for each order
  const parsedOrders = orders.map(order => ({
    ...order,
    shipping_address: JSON.parse(order.shipping_address)
  }));

  res.json(parsedOrders);
});

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const [result] = await req.app.get('pool').query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, req.params.id]
  );

  if (result.affectedRows > 0) {
    const [updatedOrder] = await req.app.get('pool').query(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );
    res.json(updatedOrder[0]);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
  const [result] = await req.app.get('pool').query(
    'DELETE FROM orders WHERE id = ?',
    [req.params.id]
  );

  if (result.affectedRows > 0) {
    res.json({ message: 'Order removed' });
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get order reports
// @route   GET /api/orders/reports
// @access  Private/Admin
const getOrderReports = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  let query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_orders,
      SUM(total_price) as total_sales,
      status
    FROM orders
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(created_at), status ORDER BY date DESC';

  const [reports] = await req.app.get('pool').query(query, params);
  res.json(reports);
});



// @desc    Verify order payment
// @route   GET /api/orders/:id/verify
// @access  Private
const verifyOrderPayment = asyncHandler(async (req, res) => {
  const [order] = await req.app.get('pool').query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (order.length === 0) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order[0].payment_status !== 'completed') {
    res.status(400);
    throw new Error('Payment not completed');
  }

  res.json({ verified: true, order: order[0] });
});



module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderReports,
  verifyOrderPayment
};