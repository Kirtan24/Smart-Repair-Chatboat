const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const techniciansSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviews_count: { type: Number, default: 0 },
  phone: { type: String, required: true },
  email: { type: String, required: false },
  address: { type: String, required: false },
  availability: { type: String, default: 'available', enum: ['available', 'busy', 'offline'] },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

techniciansSchema.index({ location: '2dsphere' });
techniciansSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Technician', techniciansSchema);
