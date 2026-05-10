const express = require('express');
const { authenticate } = require('../middleware/auth');
const Stripe = require('stripe');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();

// Initialize SDKs
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}



router.get('/plans', authenticate, async (req, res) => {
  try {
    const plans = await Plan.find({ active: true }).sort({ price: 1 });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { planId, provider } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const user = await User.findById(req.user._id);

    if (provider === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: plan.name,
                description: plan.description,
              },
              unit_amount: plan.price * 100, // Stripe expects amount in cents/paise
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan._id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        customer_email: user.email,
        metadata: {
          user_id: user._id,
          plan_id: plan._id.toString(),
        },
      });

      const payment = new Payment({
        user_id: user._id,
        plan_id: plan._id,
        amount: plan.price,
        currency: plan.currency,
        provider: 'stripe',
        provider_order_id: session.id,
      });
      await payment.save();

      res.json({ sessionId: session.id, url: session.url });
    } else if (provider === 'razorpay') {
      if (!razorpay) return res.status(500).json({ error: 'Razorpay not configured' });

      const options = {
        amount: plan.price * 100, // amount in smallest currency unit
        currency: plan.currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      const payment = new Payment({
        user_id: user._id,
        plan_id: plan._id,
        amount: plan.price,
        currency: plan.currency,
        provider: 'razorpay',
        provider_order_id: order.id,
      });
      await payment.save();

      res.json({ 
        orderId: order.id, 
        amount: order.amount, 
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } else {
      res.status(400).json({ error: 'Invalid provider' });
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify-razorpay', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is successful
      const payment = await Payment.findOne({ provider_order_id: razorpay_order_id });
      if (payment) {
        payment.status = 'completed';
        payment.provider_payment_id = razorpay_payment_id;
        payment.provider_signature = razorpay_signature;
        await payment.save();
      }

      // Update user plan
      const plan = await Plan.findById(plan_id);
      const user = await User.findById(req.user._id);
      user.plan_id = plan._id;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + plan.duration_days);
      user.plan_expiry = expiry;
      user.chats_used = 0; // reset
      await user.save();

      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});



router.post('/verify-stripe', authenticate, async (req, res) => {
    try {
        const { session_id, plan_id } = req.body;
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status === 'paid') {
            const payment = await Payment.findOne({ provider_order_id: session_id });
            if (payment && payment.status !== 'completed') {
                payment.status = 'completed';
                await payment.save();

                const plan = await Plan.findById(plan_id);
                const user = await User.findById(req.user._id);
                user.plan_id = plan._id;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + plan.duration_days);
                user.plan_expiry = expiry;
                user.chats_used = 0; // reset
                await user.save();
            }
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: 'Payment not completed' });
        }
    } catch(err) {
        res.status(500).json({ error: 'Stripe verification failed' });
    }
})

// Get user current plan
router.get('/my-plan', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('plan_id');
        res.json({ plan: user.plan_id, expiry: user.plan_expiry, chats_used: user.chats_used });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch plan info' });
    }
});

module.exports = router;
