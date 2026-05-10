const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { generateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// ── Register ──────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = new User({
        email,
        name,
        password_hash: passwordHash,
        provider: 'email',
      });

      await user.save();

      const userData = { _id: user._id, email: user.email, name: user.name, role: user.role };
      const token = generateToken(userData);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: userData,
      });
    } catch (err) {
      console.error('[ERROR] Register error:', err);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
);

// ── Login ─────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email or password format' });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.provider !== 'email' || !user.password_hash) {
        return res.status(401).json({ error: 'Please login with your original method' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({ _id: user._id, email: user.email, name: user.name, role: user.role });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        token,
        user: { _id: user._id, email: user.email, name: user.name, avatar_url: user.avatar_url, role: user.role },
      });
    } catch (err) {
      console.error('[ERROR] Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('_id email name avatar_url role created_at');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('[ERROR] Failed to fetch user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
