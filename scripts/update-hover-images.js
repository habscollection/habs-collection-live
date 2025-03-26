const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config();

async function updateHoverImages() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Fetch all products that have been migrated but don't have hover images
        const products = await Product.find({}).lean();
        console.log(`Found ${products.length} products to check`);

        let updatedCount = 0;
        
        // Update each product
        for (const product of products) {
            // Construct the hover image path with the correct naming convention
            const slug = product.slug;
            const hoverImagePath = `/assets/images/products/${slug}-hover.jpg`;
            
            // Update the product with the hover image
            await Product.updateOne(
                { _id: product._id },
                { 'images.hover': hoverImagePath }
            );
            
            updatedCount++;
        }
        
        console.log(`Updated ${updatedCount} products with hover images`);
    } catch (error) {
        console.error('Error updating hover images:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

updateHoverImages(); 