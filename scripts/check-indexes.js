const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function checkIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the collection
        const collection = mongoose.connection.collection('products');
        
        // Get indexes
        const indexes = await collection.indexes();
        console.log('Indexes on products collection:');
        console.log(JSON.stringify(indexes, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error checking indexes:', error);
        process.exit(1);
    }
}

checkIndexes(); 