const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { sendOrderConfirmation } = require('../utils/emailService');

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

        // Generate order ID
        const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Create new order
        const order = new Order({
            orderId,
            paymentIntentId,
            userId: req.session.userId,
            items,
            customer,
            total,
            status,
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