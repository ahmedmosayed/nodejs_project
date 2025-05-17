const db = require('../db');

exports.listProducts = (req, res) => {
  const { category, minPrice, maxPrice, brand } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category_id = ?';  
    params.push(category);
  }

  if (brand) {
    query += ' AND brand = ?';
    params.push(brand);
  }

  if (minPrice) {
    query += ' AND price >= ?';
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(maxPrice);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.getProductDetails = (req, res) => {
  const productId = req.params.id;

  const productQuery = 'SELECT * FROM products WHERE id = ?';
  const reviewsQuery = `
    SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(productQuery, [productId], (err, productResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (productResults.length === 0) return res.status(404).json({ error: 'Product not found' });

    const product = productResults[0];

    db.query(reviewsQuery, [productId], (err2, reviewsResults) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...product, reviews: reviewsResults });
    });
  });
};
