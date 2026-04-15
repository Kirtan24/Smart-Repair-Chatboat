const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const conversationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true },
  title: { type: String, default: 'New Conversation' },
  issue_type: { type: String, default: 'general' },
  status: { type: String, default: 'active', enum: ['active', 'resolved', 'archived'] },
  resolution_status: { type: String, default: 'in_progress' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

conversationSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
