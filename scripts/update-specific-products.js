const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function updateSpecificProducts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update Silk Satin Trench to use its main image as hover
        const silkSatinTrenchResult = await Product.updateOne(
            { slug: 'silk-satin-trench' },
            { 'images.hover': '/assets/images/products/silk-satin-trench.jpg' }
        );

        // Update Lightweight Maroon to use its main image as hover
        const lightweightMaroonResult = await Product.updateOne(
            { slug: 'lightweight-maroon' },
            { 'images.hover': '/assets/images/products/lightweight-maroon.jpg' }
        );

        console.log('Update results:');
        console.log('- Silk Satin Trench:', silkSatinTrenchResult.modifiedCount > 0 ? 'Updated' : 'No change');
        console.log('- Lightweight Maroon:', lightweightMaroonResult.modifiedCount > 0 ? 'Updated' : 'No change');

    } catch (error) {
        console.error('Error updating specific products:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

updateSpecificProducts(); 