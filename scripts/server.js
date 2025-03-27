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
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 10000, // Timeout connection after 10 seconds
            family: 4 // Use IPv4, skip trying IPv6
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Don't terminate the process on failed connection
        // Just log the error and continue
        console.log('Will retry connecting to MongoDB...');
        // Retry connection after delay
        setTimeout(connectDB, 5000);
    }
}

// Connect to MongoDB
connectDB();

// Monitor for disconnection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
    console.log('MongoDB connection error:', err);
});

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600, // Refresh session only once in 24 hours to reduce writes
        ttl: 14 * 24 * 60 * 60, // 14 days - session expiry
        autoRemove: 'native', // Use MongoDB TTL index
        mongoOptions: { useUnifiedTopology: true }, // Use same options
        collectionName: 'sessions',
        stringify: false // Don't stringify session data
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production' && (process.env.DISABLE_SECURE_COOKIE !== 'true'),
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
        sameSite: 'lax' // Provides some CSRF protection
    },
    name: 'habs.sid' // Custom cookie name instead of default
}));

// Essential middleware
app.use(express.json());

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Server is running properly'
  });
});

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

// Simple email test route that accepts a GET request
app.get('/api/test-email', async (req, res) => {
    console.log('GET Email test endpoint hit');
    try {
        const testEmail = req.query.email || process.env.EMAIL_USER;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true
        });
        
        // Verify SMTP connection works
        const verifyResult = await transporter.verify();
        console.log('SMTP connection verified:', verifyResult);
        
        const mailOptions = {
            from: `"Habs Collection Test" <${process.env.EMAIL_USER}>`,
            to: testEmail,
            subject: 'Email Test from Habs Collection',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #000;">Test Email</h1>
                    <p>This is a test email from the Habs Collection website.</p>
                    <p>If you received this, email functionality is working correctly.</p>
                    <p>Sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        };
        
        console.log('Sending test email to:', testEmail);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            details: {
                to: testEmail,
                messageId: info.messageId,
                response: info.response
            }
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

// Test email (POST route)
app.post('/api/test-email', async (req, res) => {
    console.log('POST Email test endpoint hit with data:', req.body);
    try {
        const testEmail = req.body.email || process.env.EMAIL_USER;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true
        });
        
        console.log('Email credentials:', {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD ? '***Password masked***' : 'No password set'
        });
        
        // Verify SMTP connection works
        await transporter.verify();
        
        const mailOptions = {
            from: `"Habs Collection" <${process.env.EMAIL_USER}>`,
            to: testEmail,
            subject: 'Test Email from Habs Collection (POST)',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #000;">Test Email (POST)</h1>
                    <p>This is a test email from the Habs Collection website.</p>
                    <p>If you received this, email functionality is working correctly.</p>
                    <p>Sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        };
        
        console.log('Sending test email to:', testEmail);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            messageId: info.messageId
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
    if (req.path.startsWith('/api') || 
        req.path === '/create-payment-intent' || 
        req.path === '/payment-success') {
        return next();
    }
    
    // Resolve the paths for both development and production environments
    let staticPath;
    if (process.env.NODE_ENV === 'production') {
        // Use absolute path in production (configurable via env)
        staticPath = process.env.STATIC_PATH || path.join(__dirname, '../');
    } else {
        // Development path
        staticPath = path.join(__dirname, '../');
    }
    
    console.log(`Serving static files from: ${staticPath}`);
    
    // For all other requests, try to serve static files
    express.static(staticPath, {
        etag: true,              // Enable ETags for caching
        lastModified: true,      // Set Last-Modified headers
        setHeaders: (res, path) => {
            // Add Cache-Control headers based on file type
            if (path.endsWith('.html')) {
                // Don't cache HTML files
                res.setHeader('Cache-Control', 'no-cache');
            } else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
                // Cache images for 1 month
                res.setHeader('Cache-Control', 'public, max-age=2592000');
            } else if (path.match(/\.(css|js)$/)) {
                // Cache CSS and JS for 1 week
                res.setHeader('Cache-Control', 'public, max-age=604800');
            }
        }
    })(req, res, next);
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
    
    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Something went wrong!';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = err.message || 'Validation error';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        errorMessage = 'Unauthorized access';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        errorMessage = err.message || 'Resource not found';
    }
    
    // Log additional request details in case of error
    console.error(`Error details: ${req.method} ${req.url}, User-Agent: ${req.get('User-Agent')}`);
    
    // Return appropriate response
    if (req.path.startsWith('/api') || req.xhr) {
        // API/XHR request - return JSON error
        return res.status(statusCode).json({
            error: errorMessage,
            status: statusCode,
            path: req.path,
            timestamp: new Date().toISOString()
        });
    } else {
        // Regular request - render error page or redirect to error page
        // For simplicity, sending error in HTML format
        return res.status(statusCode).send(`
            <html>
                <head><title>Error - ${statusCode}</title></head>
                <body>
                    <h1>Error</h1>
                    <p>${errorMessage}</p>
                    <a href="/">Return to homepage</a>
                </body>
            </html>
        `);
    }
});

// Send order confirmation email function
async function sendOrderConfirmation(order) {
    console.log('Sending order confirmation email for order:', order._id);
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
            },
            debug: true,
            logger: true
        });
        
        // Verify transporter configuration
        await transporter.verify();
        console.log('SMTP connection verified successfully');
        
        // Fetch the complete order with potential updates from database
        const updatedOrder = await Order.findById(order._id);
        if (!updatedOrder) {
            throw new Error(`Order with ID ${order._id} not found in database`);
        }
        
        console.log('Found order in database:', updatedOrder._id);
        
        // Get user information if it's a registered user purchase
        let userInfo = null;
        if (updatedOrder.user) {
            userInfo = await User.findById(updatedOrder.user).select('-password');
            console.log('Found user:', userInfo ? userInfo._id : 'None');
        }
        
        // Determine which email to use
        const email = userInfo ? userInfo.email : updatedOrder.shipping.email;
        console.log('Sending confirmation to email:', email);
        
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
            from: `"Habs Collection" <${process.env.EMAIL_USER}>`,
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
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${email}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        console.error('Error stack:', error.stack);
        return { success: false, error: error.message };
    }
}

const PORT = process.env.PORT || 5501;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 

// Add additional startup diagnostics
const startupInfo = {
  node_version: process.version,
  environment: process.env.NODE_ENV || 'development',
  port: PORT,
  hostname: require('os').hostname(),
  platform: process.platform,
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  mongo_uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.split('@')[1] : 'Not configured', // Hide credentials
  api_paths: ['/api/products', '/api/orders', '/api/auth', '/api/cart', '/api/stripe', '/create-payment-intent', '/payment-success']
};

console.log('Server startup complete with configuration:', startupInfo);
console.log(`API is available at http://localhost:${PORT}/api`);
console.log(`Health check endpoint: http://localhost:${PORT}/health`);

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  // Exit with error
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  // Exit with error
  process.exit(1);
}); 