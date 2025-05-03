const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/create-payment-intent - Create Stripe payment intent
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, orderData } = req.body;

        if (!amount || isNaN(parseFloat(amount))) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Prepare metadata for the payment intent
        const metadata = {
            userId: req.session.userId || 'guest'
        };

        if (orderData && orderData.customer) {
            metadata.customerFirstName = orderData.customer.firstName;
            metadata.customerLastName = orderData.customer.lastName;
            metadata.customerEmail = orderData.customer.email;
            metadata.customerPhone = orderData.customer.phone;
            metadata.customerAddress = orderData.customer.address;
            metadata.customerCity = orderData.customer.city;
            metadata.customerPostcode = orderData.customer.postcode;
            metadata.customerCountry = orderData.customer.country;
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(amount) * 100), // Convert to cents
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: metadata
        });

        // Log the creation for debugging
        console.log(`Created payment intent ${paymentIntent.id} for amount ${amount} GBP`);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment intent: ' + error.message });
    }
});

// POST /api/verify-payment - Verify payment status with Stripe
router.post('/verify-payment', async (req, res) => {
    try {
        const { payment_intent } = req.body;

        if (!payment_intent) {
            return res.status(400).json({ 
                verified: false, 
                error: 'Payment intent ID is required' 
            });
        }

        // Retrieve the payment intent directly from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

        // Log the verification for debugging
        console.log(`Verifying payment intent ${payment_intent}, status: ${paymentIntent.status}, userId: ${paymentIntent.metadata.userId || 'unknown'}`);
        
        // Verified only if the status is 'succeeded'
        const isVerified = paymentIntent.status === 'succeeded';

        res.json({
            verified: isVerified,
            status: paymentIntent.status,
            message: isVerified ? 'Payment verified' : `Payment not verified: status is ${paymentIntent.status}`
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ 
            verified: false, 
            error: 'Failed to verify payment: ' + error.message 
        });
    }
});

module.exports = router; 
