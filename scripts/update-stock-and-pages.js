const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
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

async function updateStockAndPages() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Get the product to update (example: update by ID or slug)
        // Replace this with your actual product ID or query
        const productId = process.argv[2]; // Command line argument for product ID
        const size = process.argv[3];      // Command line argument for size
        const quantity = parseInt(process.argv[4] || "1"); // Command line argument for quantity (default 1)
        
        if (!productId || !size) {
            console.error('Usage: node update-stock-and-pages.js <productId> <size> [quantity]');
            process.exit(1);
        }

        console.log(`Updating stock for product ${productId}, size ${size}, quantity ${quantity}`);
        
        // Update the product stock
        const product = await Product.findById(productId);
        if (!product) {
            console.error(`Product with ID ${productId} not found`);
            process.exit(1);
        }

        // Get current stock level
        const currentStock = product.stock.get(size) || 0;
        console.log(`Current stock for size ${size}: ${currentStock}`);
        
        // Calculate new stock level (ensuring it doesn't go below 0)
        const newStock = Math.max(0, currentStock - quantity);
        console.log(`New stock for size ${size}: ${newStock}`);
        
        // Update stock in database
        product.stock.set(size, newStock);
        await product.save();
        console.log(`Stock updated successfully`);
        
        // Regenerate the product page
        const productsDir = path.join(__dirname, '..', 'products');
        if (!fs.existsSync(productsDir)) {
            fs.mkdirSync(productsDir, { recursive: true });
        }
        
        const html = await generateProductHTML(product);
        const filePath = path.join(productsDir, `${product.slug}.html`);
        fs.writeFileSync(filePath, html);
        console.log(`Regenerated page for ${product.name}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error updating stock and regenerating pages:', error);
        process.exit(1);
    }
}

// Run the updater if called directly
if (require.main === module) {
    updateStockAndPages();
}

module.exports = { updateStockAndPages }; 