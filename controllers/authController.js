const { validationResult } = require('express-validator');
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const saltRounds = 10;

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      if (results.length > 0) return res.status(400).json({ message: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      db.query(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        (err, results) => {
          if (err) return res.status(500).json({ message: err.message });
          return res.status(201).json({ message: 'User registered successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.json({ message: 'Login successful', token });
  });
};

exports.forgotPassword = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(400).json({ message: 'Email not found' });

    const user = results[0];
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Click here to reset your password: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.json({ message: 'Password reset email sent' });
    });
  });
};

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, newPassword } = req.body;

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(400).json({ message: 'Invalid or expired token' });

    const userId = decoded.id;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId], (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Password reset successfully' });
    });
  });
};

exports.getProfile = (req, res) => {
  // req.user موجود من ميدلوير التحقق (authMiddleware)
  const userId = req.user.id;
  db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
};
