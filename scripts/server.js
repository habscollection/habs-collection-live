require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const nodemailer = require('nodemailer');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const { updateStockAndPages } = require('./update-stock-and-pages');
const fs = require('fs');

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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const cartRoutes = require('../routes/cart');
const orderRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payment');

// Use routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', paymentRoutes);

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

// Send order confirmation email
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
        
        // Get user or guest email
        const email = order.user ? 
            (await User.findById(order.user)).email : 
            order.shipping.email;
        
        // Format order items for email
        const itemsList = order.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} (${item.size})</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">£${item.price.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">£${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');
        
        // Email HTML content
        const mailOptions = {
            from: '"Habs Collection" <noreply@habscollection.com>',
            to: email,
            subject: `Your Habs Collection Order #${order._id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #000;">Order Confirmation</h1>
                    </div>
                    
                    <p>Dear ${order.shipping.firstName},</p>
                    
                    <p>Thank you for your order. We're pleased to confirm that your order has been received and is being processed.</p>
                    
                    <div style="margin: 30px 0; background: #f9f9f9; padding: 20px;">
                        <h2 style="margin-top: 0; color: #000;">Order Summary</h2>
                        <p><strong>Order Number:</strong> ${order._id}</p>
                        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr style="background: #eee;">
                                    <th style="padding: 10px; text-align: left;">Item</th>
                                    <th style="padding: 10px; text-align: left;">Qty</th>
                                    <th style="padding: 10px; text-align: left;">Price</th>
                                    <th style="padding: 10px; text-align: left;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsList}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                                    <td style="padding: 10px;">£${order.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
                                    <td style="padding: 10px;">${order.total > order.subtotal ? `£${(order.total - order.subtotal).toFixed(2)}` : 'FREE'}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                                    <td style="padding: 10px;"><strong>£${order.total.toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div style="margin: 30px 0;">
                        <h2 style="color: #000;">Shipping Information</h2>
                        <p>${order.shipping.firstName} ${order.shipping.lastName}</p>
                        <p>${order.shipping.address}</p>
                        <p>${order.shipping.city}, ${order.shipping.postcode}</p>
                        <p>${order.shipping.country}</p>
                    </div>
                    
                    <p>If you have any questions about your order, please contact our customer service team.</p>
                    
                    <p>Thank you for shopping with Habs Collection!</p>
                    
                    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
                        <p>© 2024 Habs Collection. All rights reserved.</p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
}

// Handle successful payment
app.post('/payment-success', async (req, res) => {
    const { paymentIntentId, orderId } = req.body;
    
    try {
        // Verify the payment was successful
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            // 1. Update database with order details
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            // Update order status and payment info
            order.payment.status = 'completed';
            order.payment.transactionId = paymentIntentId;
            order.status = 'processing';
            await order.save();
            
            // 2. Update inventory for each product and regenerate pages
            for (const item of order.items) {
                try {
                    // Update stock directly in the database
                    const product = await Product.findById(item.productId);
                    if (product) {
                        // Get current stock
                        const currentStock = product.stock.get(item.size) || 0;
                        // Update stock (ensure it doesn't go below 0)
                        const newStock = Math.max(0, currentStock - item.quantity);
                        product.stock.set(item.size, newStock);
                        await product.save();
                        
                        // Regenerate the product page
                        const productsDir = path.join(__dirname, '..', 'products');
                        if (!fs.existsSync(productsDir)) {
                            fs.mkdirSync(productsDir, { recursive: true });
                        }
                        
                        const { generateProductHTML } = require('./generate-product-pages');
                        const html = await generateProductHTML(product);
                        const filePath = path.join(productsDir, `${product.slug}.html`);
                        fs.writeFileSync(filePath, html);
                        console.log(`Regenerated page for ${product.name}`);
                    }
                } catch (stockError) {
                    console.error(`Failed to update stock for product ${item.productId}:`, stockError);
                    // Continue processing other items even if one fails
                }
            }
            
            // 3. Send confirmation email to customer
            await sendOrderConfirmation(order);
            
            res.json({ 
                success: true,
                redirectUrl: `/order-success.html?id=${orderId}`
            });
        } else {
            res.status(400).json({ error: 'Payment was not successful' });
        }
    } catch (error) {
        console.error('Error processing payment success:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test route for email
app.post('/api/test-email', async (req, res) => {
    try {
        const testOrder = {
            _id: 'TEST123',
            items: [{
                name: 'Test Product',
                size: 'M',
                quantity: 1,
                price: 29.99
            }],
            shipping: {
                firstName: 'Test',
                lastName: 'User',
                email: req.body.email || process.env.EMAIL_USER,
                address: '123 Test St',
                city: 'Test City',
                postcode: 'TE1 1ST',
                country: 'United Kingdom'
            },
            subtotal: 29.99,
            total: 34.99,
            createdAt: new Date()
        };

        await sendOrderConfirmation(testOrder);
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get product stock
app.get('/api/products/:id/stock', async (req, res) => {
    try {
        const { size } = req.query;
        const productId = req.params.id;
        
        console.log(`[DEBUG SERVER] Checking stock for product ID: ${productId}, size: ${size}`);
        
        if (!productId) {
            console.error('[DEBUG SERVER] Missing product ID');
            return res.status(400).json({ message: 'Missing product ID' });
        }
        
        if (!size) {
            console.error('[DEBUG SERVER] Missing size parameter');
            return res.status(400).json({ message: 'Missing size parameter' });
        }
        
        // Try to find the product by different ID fields
        let product = null;
        
        // First try by the id field
        console.log('[DEBUG SERVER] Trying to find product by id field');
        product = await Product.findOne({ id: productId });
        
        // If not found, try by MongoDB _id
        if (!product) {
            console.log('[DEBUG SERVER] Not found by id, trying by _id');
            try {
                if (mongoose.Types.ObjectId.isValid(productId)) {
                    product = await Product.findById(productId);
                    if (product) {
                        console.log('[DEBUG SERVER] Found by _id');
                    }
                } else {
                    console.log('[DEBUG SERVER] Invalid ObjectId format:', productId);
                }
            } catch (err) {
                console.error("[DEBUG SERVER] Error finding by _id:", err.message);
            }
        } else {
            console.log('[DEBUG SERVER] Found by id field');
        }
        
        // If still not found, try by slug as last resort
        if (!product) {
            console.log('[DEBUG SERVER] Not found by id or _id, trying by slug');
            product = await Product.findOne({ slug: productId });
            if (product) {
                console.log('[DEBUG SERVER] Found by slug');
            }
        }
        
        if (!product) {
            console.error(`[DEBUG SERVER] Product with ID ${productId} not found after all attempts`);
            return res.status(404).json({ 
                message: 'Product not found',
                productId: productId,
                searchMethods: ['id', '_id', 'slug']
            });
        }

        // Get the stock level from the product
        console.log('[DEBUG SERVER] Product found:', {
            id: product._id,
            customId: product.id,
            name: product.name,
            slug: product.slug
        });
        
        // Check if stock field exists and is valid
        if (!product.stock || typeof product.stock.get !== 'function') {
            console.error('[DEBUG SERVER] Invalid stock structure', product.stock);
            return res.status(500).json({ 
                message: 'Invalid stock structure',
                stockType: typeof product.stock
            });
        }
        
        const stockLevel = product.stock.get(size) || 0;
        console.log(`[DEBUG SERVER] Stock level for size ${size}: ${stockLevel}`);
        
        // Return the available stock
        res.json({ 
            availableStock: stockLevel,
            message: 'Stock retrieved successfully',
            productName: product.name
        });
    } catch (error) {
        console.error('[DEBUG SERVER] Error checking stock:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 