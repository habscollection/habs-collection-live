const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { generateProductHTML } = require('./generate-product-pages');

// MongoDB connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function regeneratePages() {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('Connected to MongoDB');

        // Get all products
        const products = await Product.find({});
        console.log(`Found ${products.length} products`);

        // Create products directory if it doesn't exist
        const productsDir = path.join(__dirname, '..', 'products');
        if (!fs.existsSync(productsDir)) {
            fs.mkdirSync(productsDir, { recursive: true });
        }

        // Generate HTML for each product
        for (const product of products) {
            const html = await generateProductHTML(product);
            const filePath = path.join(productsDir, `${product.slug}.html`);
            fs.writeFileSync(filePath, html);
            console.log(`Generated page for ${product.name}`);
        }

        console.log('All product pages regenerated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error regenerating product pages:', error);
        process.exit(1);
    }
}

// Run the regeneration
regeneratePages();
