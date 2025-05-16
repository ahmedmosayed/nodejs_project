const express = require('express');
const app = express();
require('dotenv').config();


app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);


app.use('/api/auth', authRoutes);     
app.use('/api/users', userRoutes);    

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
