const mongoose = require('mongoose');
require('dotenv').config();

async function dropIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the collection
        const collection = mongoose.connection.collection('products');
        
        // Drop the id_1 index
        await collection.dropIndex('id_1');
        console.log('Successfully dropped the id_1 index');

        process.exit(0);
    } catch (error) {
        console.error('Error dropping index:', error);
        process.exit(1);
    }
}

dropIndex(); 