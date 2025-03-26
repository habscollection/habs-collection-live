const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

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

async function fixProductIds() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        console.log('Fixing product IDs...');
        
        // Get all products
        const products = await Product.find({});
        console.log(`Found ${products.length} products`);
        
        let updatedCount = 0;
        
        // Ensure each product has an ID field (use _id if not set)
        for (const product of products) {
            if (!product.id) {
                console.log(`Setting ID for product: ${product.name}`);
                product.id = product._id.toString();
                await product.save();
                updatedCount++;
            }
        }
        
        console.log(`Updated ${updatedCount} products with missing IDs`);
        console.log('Product ID fixing completed');
        
        // Create an index on the id field if it doesn't exist
        await Product.collection.createIndex({ id: 1 });
        console.log('Ensured index on id field exists');
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing product IDs:', error);
        process.exit(1);
    }
}

// Run the fixer
fixProductIds(); 