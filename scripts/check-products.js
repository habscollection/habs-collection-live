const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function checkProducts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all products
        const products = await Product.find({});
        console.log(`Found ${products.length} products\n`);

        // Display detailed information for each product
        products.forEach((product, index) => {
            console.log(`\n=== Product ${index + 1}: ${product.name} ===`);
            console.log(`ID: ${product._id}`);
            console.log(`Slug: ${product.slug}`);
            console.log(`Price: £${product.price.toFixed(2)}`);
            console.log(`Reference: ${product.reference}`);
            console.log(`Description: ${product.description}`);
            console.log('\nStock Levels:');
            
            // Convert stock Map to object for better display
            const stockObj = {};
            product.stock.forEach((value, key) => {
                stockObj[key] = value;
            });
            console.log(JSON.stringify(stockObj, null, 2));
            
            console.log('\nImages:');
            console.log(`Main: ${product.images.main}`);
            console.log(`Hover: ${product.images.hover || 'Not set'}`);
            console.log('Gallery:', product.images.gallery || []);
            
            console.log('\nSizes:', product.sizes);
            console.log('----------------------------------------');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking products:', error);
        process.exit(1);
    }
}

// Run the check
checkProducts();
