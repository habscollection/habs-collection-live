require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('./database');
const Product = require('../models/Product');

const exportProducts = async () => {
    try {
        await connectDB();
        const products = await Product.find({}).lean();
        const outputPath = path.resolve(__dirname, '../data/products.json');
        fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
        console.log(`Products exported to ${outputPath}`);
        process.exit(0);
    } catch (error) {
        console.error('Error exporting products:', error);
        process.exit(1);
    }
};

exportProducts();
