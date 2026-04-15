const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const messageSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  conversation_id: { type: String, required: true },
  role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
  content: { type: String, required: true },
  input_type: { type: String, default: 'text', enum: ['text', 'voice', 'image'] },
  image_url: { type: String, default: null },
  audio_url: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  parent_id: { type: String, default: null },
  version: { type: Number, default: 1 },
  is_latest: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

messageSchema.index({ conversation_id: 1 });

module.exports = mongoose.model('Message', messageSchema);
