const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/create-payment-intent - Create Stripe payment intent
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: req.session.userId
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

module.exports = router; 