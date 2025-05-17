const asyncHandler = require('express-async-handler');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const [categories] = await req.app.get('pool').query('SELECT * FROM categories');
  res.json(categories);
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = asyncHandler(async (req, res) => {
  const [rows] = await req.app.get('pool').query(
    'SELECT * FROM categories WHERE id = ?',
    [req.params.id]
  );
  
  if (rows.length > 0) {
    res.json(rows[0]);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  
  const [result] = await req.app.get('pool').query(
    'INSERT INTO categories (name, description, user_id) VALUES (?, ?, ?)',
    [name, description, req.user.id]
  );

  const [newCategory] = await req.app.get('pool').query(
    'SELECT * FROM categories WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json(newCategory[0]);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  await req.app.get('pool').query(
    'UPDATE categories SET name = ?, description = ? WHERE id = ?',
    [name, description, req.params.id]
  );

  const [updated] = await req.app.get('pool').query(
    'SELECT * FROM categories WHERE id = ?',
    [req.params.id]
  );

  if (updated.length > 0) {
    res.json(updated[0]);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const [result] = await req.app.get('pool').query(
    'DELETE FROM categories WHERE id = ?',
    [req.params.id]
  );

  if (result.affectedRows > 0) {
    res.json({ message: 'Category removed' });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};