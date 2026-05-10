const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  password_hash: { type: String, required: false },
  avatar_url: { type: String, default: null },
  provider: { type: String, default: 'email', enum: ['email', 'google', 'github'] },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  plan_id: { type: String, ref: 'Plan', default: null },
  plan_expiry: { type: Date, default: null },
  chats_used: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Update the updated_at timestamp before saving
userSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
