const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendOrderConfirmation } = require('../utils/emailService');
const mongoose = require('mongoose');

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
    try {
        const {
            paymentIntentId,
            items,
            customer,
            total,
            status
        } = req.body;

        // Verify payment intent exists and is succeeded
        if (paymentIntentId) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                
                if (paymentIntent.status !== 'succeeded') {
                    return res.status(400).json({ 
                        error: 'Payment has not been completed successfully',
                        paymentStatus: paymentIntent.status 
                    });
                }
                
                // Additional validation - check if the amount paid matches the order total
                const amountPaid = paymentIntent.amount / 100; // Convert from cents
                const orderTotal = parseFloat(total);
                
                // Allow for a small difference due to currency conversion/rounding
                const tolerance = 0.01;
                if (Math.abs(amountPaid - orderTotal) > tolerance) {
                    console.error(`Payment amount mismatch: Expected ${orderTotal}, got ${amountPaid}`);
                    return res.status(400).json({ 
                        error: 'Payment amount does not match order total',
                        expected: orderTotal,
                        actual: amountPaid
                    });
                }
                
                console.log(`Verified payment: ${paymentIntentId} with status: ${paymentIntent.status}`);
            } catch (stripeError) {
                console.error('Error verifying payment with Stripe:', stripeError);
                return res.status(400).json({ error: 'Could not verify payment with Stripe' });
            }
        } else {
            return res.status(400).json({ error: 'Payment intent ID is required' });
        }

        // Generate order ID
        const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Create payment object
        const payment = {
            method: 'card',
            transactionId: paymentIntentId,
            status: 'succeeded'
        };

        // Create shipping object from customer data
        const shipping = {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            postcode: customer.postcode,
            country: customer.country
        };

        // Calculate subtotal from items
        let subtotal = 0;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        // Create new order
        const order = new Order({
            orderId,
            paymentIntentId,
            userId: req.session.userId,
            items: items || [],
            shipping,
            payment,
            subtotal: subtotal || total,
            total: total,
            status: status || 'paid',
            createdAt: new Date()
        });

        // Save order to database
        await order.save();

        // Send order confirmation email
        try {
            await sendOrderConfirmation(order);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the order creation if email fails
        }

        res.json({ 
            success: true, 
            orderId: order.orderId,
            message: 'Order created successfully' 
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// GET /api/orders/verify/:id - Verify if an order exists and is paid
router.get('/verify/:id', async (req, res) => {
    try {
        let order;
        const id = req.params.id;
        
        // Try to find by MongoDB ObjectID first
        try {
            if (mongoose.Types.ObjectId.isValid(id)) {
                order = await Order.findById(id);
            }
        } catch (idError) {
            console.log('Not a valid ObjectId, trying orderId instead');
        }
        
        // If not found, try by custom orderId
        if (!order) {
            order = await Order.findOne({ orderId: id });
        }
        
        if (!order) {
            return res.status(404).json({ 
                valid: false,
                message: 'Order not found' 
            });
        }
        
        // Check if the order is in a paid/processing status
        const validStatuses = ['paid', 'processing', 'shipped', 'delivered'];
        const isValidStatus = validStatuses.includes(order.status);
        
        // Return both IDs to help debugging
        res.json({
            valid: isValidStatus,
            orderId: order.orderId,
            _id: order._id,
            status: order.status,
            message: isValidStatus ? 'Order is valid' : 'Order has not been paid'
        });
    } catch (error) {
        console.error('Error verifying order:', error);
        res.status(500).json({ 
            valid: false,
            error: error.message 
        });
    }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEST ROUTE - Create a test order and send confirmation email
router.post('/test-order', async (req, res) => {
    try {
        // Create a sample order
        const testOrder = {
            orderId: 'TEST-' + Date.now(),
            paymentIntentId: 'pi_test_' + Date.now(),
            items: [
                {
                    id: 'item1',
                    name: 'Classic Black Abaya',
                    price: 159.99,
                    quantity: 1,
                    size: 'M',
                    image: 'black-abaya.jpg'
                },
                {
                    id: 'item2',
                    name: 'Embroidered Dress',
                    price: 189.99,
                    quantity: 2,
                    size: 'L',
                    image: 'embroidered-dress.jpg'
                }
            ],
            customer: {
                firstName: 'Test',
                lastName: 'Customer',
                email: req.body.email || 'test@example.com', // Use provided email or default
                phone: '+44123456789',
                address: {
                    line1: '123 Test Street',
                    city: 'London',
                    postal_code: 'SW1A 1AA',
                    country: 'United Kingdom'
                }
            },
            subtotal: 539.97, // 159.99 + (189.99 * 2)
            total: 539.97, // Free shipping over £300
            status: 'processing',
            createdAt: new Date()
        };

        // Create and save the order
        const order = new Order(testOrder);
        await order.save();

        // Send confirmation email
        await sendOrderConfirmation(order);

        res.json({ 
            success: true, 
            message: 'Test order created and email sent',
            orderId: order.orderId,
            emailSentTo: order.customer.email
        });
    } catch (error) {
        console.error('Error creating test order:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 