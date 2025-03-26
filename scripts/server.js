require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const { updateStockAndPages } = require('./update-stock-and-pages');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cartRoutes = require('../routes/cart');
const orderRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payment');
const authRoutes = require('../routes/auth');
const stripeConfigRoutes = require('../server/stripe-config');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Connect to MongoDB
connectDB();

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// Essential middleware
app.use(express.json());

// Add CORS headers to allow API requests from the frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).json({});
    }
    next();
});

// ===== API ROUTES - Register these BEFORE static file middleware =====
// Mount API route modules
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeConfigRoutes);

// Product routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product
app.get('/api/products/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product stock
app.put('/api/products/:id/stock', async (req, res) => {
    try {
        const { size, quantity } = req.body;
        const product = await Product.findOne({ id: req.params.id });
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if enough stock
        if (product.stock[size] < quantity) {
            return res.status(400).json({ message: 'Not enough stock' });
        }

        // Update stock
        product.stock[size] -= quantity;
        await product.save();

        res.json({ message: 'Stock updated', currentStock: product.stock[size] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new order
app.post('/api/orders', async (req, res) => {
    try {
        const { items, shipping, payment, subtotal, total, userId } = req.body;
        
        const orderData = {
            items,
            shipping,
            payment,
            subtotal,
            total
        };
        
        // If user is logged in, associate order with user
        if (userId) {
            orderData.user = userId;
        } else {
            // For guest checkout
            orderData.guestInfo = {
                firstName: shipping.firstName,
                lastName: shipping.lastName,
                email: shipping.email,
                phone: shipping.phone
            };
        }
        
        const order = new Order(orderData);
        await order.save();
        
        // If user is logged in, update their orders
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                $push: { orders: order._id }
            });
        }
        
        res.status(201).json({ orderId: order._id });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
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

// Create a payment intent
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Payment success webhook
app.post('/payment-success', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        
        // Update order status
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        order.status = 'paid';
        order.paymentDate = new Date();
        await order.save();
        
        // Send order confirmation email
        await sendOrderConfirmation(order);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Payment success webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test email
app.post('/api/test-email', async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.body.email || process.env.EMAIL_USER,
            subject: 'Test Email from Habs Collection',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #000;">Test Email</h1>
                    <p>This is a test email from the Habs Collection website.</p>
                    <p>If you received this, email functionality is working correctly.</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get product stock
app.get('/api/products/:id/stock', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ stock: product.stock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API error handler middleware
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ===== STATIC FILES - Served AFTER API routes =====
// Serve static files from the root directory, but exclude /api paths
app.use('/', (req, res, next) => {
    // Skip static file handling for API requests
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // For all other requests, try to serve static files
    express.static(path.join(__dirname, '../'))(req, res, next);
});

// ===== PAGE ROUTES - Serve HTML pages =====
// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '../account.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../signup.html'));
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// General error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Send order confirmation email function
async function sendOrderConfirmation(order) {
    try {
        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        // Fetch the complete order with potential updates from database
        const updatedOrder = await Order.findById(order._id);
        if (!updatedOrder) {
            throw new Error(`Order with ID ${order._id} not found in database`);
        }
        
        // Get user information if it's a registered user purchase
        let userInfo = null;
        if (updatedOrder.user) {
            userInfo = await User.findById(updatedOrder.user).select('-password');
        }
        
        // Determine which email to use
        const email = userInfo ? userInfo.email : updatedOrder.shipping.email;
        
        // Format order items for email
        const itemsList = updatedOrder.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center;">
                        <img src="${item.image}" alt="${item.name}" style="max-width: 60px; margin-right: 10px; border-radius: 4px;">
                        <div>
                            <div style="font-weight: bold;">${item.name}</div>
                            <div style="color: #666; font-size: 14px;">Size: ${item.size}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${item.price.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');
        
        // Format date properly
        const orderDate = new Date(updatedOrder.createdAt).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Get order status
        const orderStatus = updatedOrder.status ? updatedOrder.status.charAt(0).toUpperCase() + updatedOrder.status.slice(1) : 'Processing';
        
        // Email HTML content
        const mailOptions = {
            from: '"Habs Collection" <noreply@habscollection.com>',
            to: email,
            subject: `Your Habs Collection Order #${updatedOrder._id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #000;">Order Confirmation</h1>
                    </div>
                    
                    <p>Dear ${updatedOrder.shipping.firstName},</p>
                    
                    <p>Thank you for your order. We're pleased to confirm that your order has been received and is being processed.</p>
                    
                    <div style="margin: 30px 0; background: #f9f9f9; padding: 20px; border-radius: 8px;">
                        <h2 style="margin-top: 0; color: #000;">Order Summary</h2>
                        <p><strong>Order Number:</strong> ${updatedOrder._id}</p>
                        <p><strong>Order Date:</strong> ${orderDate}</p>
                        <p><strong>Order Status:</strong> <span style="color: #28a745;">${orderStatus}</span></p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr style="background: #eee;">
                                    <th style="padding: 10px; text-align: left;">Item</th>
                                    <th style="padding: 10px; text-align: center;">Qty</th>
                                    <th style="padding: 10px; text-align: right;">Price</th>
                                    <th style="padding: 10px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsList}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                                    <td style="padding: 10px; text-align: right;">£${updatedOrder.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
                                    <td style="padding: 10px; text-align: right;">${updatedOrder.total > updatedOrder.subtotal ? `£${(updatedOrder.total - updatedOrder.subtotal).toFixed(2)}` : '<span style="color: #28a745;">FREE</span>'}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                                    <td style="padding: 10px; text-align: right;"><strong>£${updatedOrder.total.toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div style="margin: 30px 0; background: #f9f9f9; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #000;">Shipping Information</h2>
                        <p><strong>${updatedOrder.shipping.firstName} ${updatedOrder.shipping.lastName}</strong></p>
                        <p>${updatedOrder.shipping.address}</p>
                        <p>${updatedOrder.shipping.city}, ${updatedOrder.shipping.postcode}</p>
                        <p>${updatedOrder.shipping.country}</p>
                        <p><strong>Contact:</strong> ${updatedOrder.shipping.phone || 'Not provided'}</p>
                    </div>
                    
                    <div style="margin: 30px 0; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #000;">Need Help?</h2>
                        <p>If you have any questions about your order, please contact our customer service team at <a href="mailto:support@habscollection.com" style="color: #007bff;">support@habscollection.com</a>.</p>
                        
                        <p>You can also track your order status by logging into your account on our website.</p>
                    </div>
                    
                    <p>Thank you for shopping with Habs Collection!</p>
                    
                    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
                        <p>© 2024 Habs Collection. All rights reserved.</p>
                        <p>This email was sent to ${email}. Please do not reply to this email.</p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
    }
}

const PORT = process.env.PORT || 5501;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 