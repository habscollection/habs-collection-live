const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function checkStock() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all products or a specific product
        const productId = process.argv[2]; // Optional command line argument for product ID
        
        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                console.error(`Product with ID ${productId} not found`);
                process.exit(1);
            }
            
            console.log(`Product: ${product.name} (${product._id})`);
            console.log('Stock:');
            
            // Convert Map to object for pretty printing
            const stockObj = {};
            product.stock.forEach((value, key) => {
                stockObj[key] = value;
            });
            
            console.log(JSON.stringify(stockObj, null, 2));
        } else {
            // Get all products
            const products = await Product.find({});
            console.log(`Found ${products.length} products`);
            
            for (const product of products) {
                console.log(`\nProduct: ${product.name} (${product._id})`);
                console.log('Stock:');
                
                // Convert Map to object for pretty printing
                const stockObj = {};
                product.stock.forEach((value, key) => {
                    stockObj[key] = value;
                });
                
                console.log(JSON.stringify(stockObj, null, 2));
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking stock:', error);
        process.exit(1);
    }
}

checkStock(); 