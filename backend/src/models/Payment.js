const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, ref: 'User' },
  plan_id: { type: String, required: true, ref: 'Plan' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
  provider_order_id: { type: String }, // Razorpay order id or Stripe payment intent id
  provider_payment_id: { type: String },
  provider_signature: { type: String }, // specific to razorpay verification
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

paymentSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
