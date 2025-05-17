const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // Add this line
const orderRoutes = require('./routes/orderRoutes'); // Add this line
const paymentRoutes = require('./routes/paymentRoutes'); // Add this line
const reviewRoutes = require('./routes/reviewRoutes'); // Add this line

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes); // Add this line
app.use('/api/orders', orderRoutes); // Add this line
app.use('/api/payment', paymentRoutes); // Add this line
app.use('/api/reviews', reviewRoutes); // Add this line


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});