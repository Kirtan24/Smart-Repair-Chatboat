const express = require('express');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');

const router = express.Router();

// Simple admin middleware
const authorizeAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error authorizing admin' });
  }
};

// Apply auth and admin middleware to all routes
router.use(authenticate);

// === SEED ===
// Initial setup to make current user admin
router.post('/make-me-admin', async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        user.role = 'admin';
        await user.save();
        res.json({ message: "You are now an admin!" });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to make admin" });
    }
});

router.use(authorizeAdmin);

// === PLANS ===
// Get all plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create a plan
router.post('/plans', async (req, res) => {
  try {
    const { name, description, price, currency, duration_days, features, chat_limit, active } = req.body;
    const plan = new Plan({ name, description, price, currency, duration_days, features, chat_limit, active });
    await plan.save();
    res.status(201).json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update a plan
router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// === USERS ===
// Get users stats
router.get('/users/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({ plan_id: { $ne: null } });
    const freeUsers = totalUsers - paidUsers;
    res.json({ totalUsers, paidUsers, freeUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 }).populate('plan_id', 'name');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get recent payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ created_at: -1 }).limit(50).populate('user_id', 'name email').populate('plan_id', 'name');
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

module.exports = router;
