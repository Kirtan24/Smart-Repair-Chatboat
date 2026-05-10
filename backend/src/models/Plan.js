const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const planSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true }, // e.g. "Free", "Basic", "Pro"
  description: { type: String },
  price: { type: Number, required: true }, // Price in cents or paise depending on currency (for simplification, let's say base currency units, but Stripe/Razorpay use smallest currency unit)
  currency: { type: String, default: 'INR' },
  duration_days: { type: Number, required: true }, // E.g., 30 for monthly, 365 for yearly
  features: [{ type: String }],
  chat_limit: { type: Number, default: 50 }, // number of chats allowed per period
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

planSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Plan', planSchema);
