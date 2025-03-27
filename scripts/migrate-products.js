require('dotenv').config();
const connectDB = require('./database');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Add graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Closing MongoDB connection and exiting...');
    await mongoose.connection.close();
    process.exit(0);
});

// Define all products with initial stock levels
const products = [
    {
        id: 1,
        name: "Printed Plush Green - Light",
        price: 130.00,
        description: "Elegant italian printed fabric, heavyweight satin-like feel, soft and breathable ",
        images: {
            main: "/assets/images/products/printed-plush-green.jpg",
            hover: "/assets/images/products/printed-plush-green-hover.jpg",
            gallery: [
                "/assets/images/products/printed-plush-green.jpg",
                "/assets/images/products/printed-plush-green-hover.jpg",
                "/assets/images/products/printed-plush-green-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 1,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Green",
        reference: "PPG-001",
        slug: "printed-plush-green"
    },
    {
        id: 2,
        name: "Printed Plush Green - Dark",
        price: 130.00,
        description: "Elegant italian printed fabric, heavyweight satin-like feel, soft and breathable ",
        images: {
            main: "/assets/images/products/printed-plush-green-dark.jpg",
            hover: "/assets/images/products/printed-plush-green-dark-hover.jpg",
            gallery: [
                "/assets/images/products/printed-plush-green-dark.jpg",
                "/assets/images/products/printed-plush-green-dark-hover.jpg",
                "/assets/images/products/printed-plush-green-dark-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 1,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Green",
        reference: "PPD-002",
        slug: "printed-plush-green-dark"
    },
    {
        id: 3,
        name: "Sovereign Yellow",
        price: 140.00,
        description: "Luxurious yellow abaya with intricate detailing",
        images: {
            main: "/assets/images/products/sovereign-yellow.jpg",
            hover: "/assets/images/products/sovereign-yellow-hover.jpg",
            gallery: [
                "/assets/images/products/sovereign-yellow.jpg",
                "/assets/images/products/sovereign-yellow-hover.jpg",
                "/assets/images/products/sovereign-yellow-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 0,
            "58": 2,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Yellow",
        reference: "SYA-003",
        slug: "sovereign-yellow"
    },
    {
        id: 4,
        name: "Lightweight Brown",
        price: 70.00,
        description: "Classical brown abaya with intricate detailing",
        images: {
            main: "/assets/images/products/lightweight-brown.jpg",
            hover: "/assets/images/products/lightweight-brown-hover.jpg",
            gallery: [
                "/assets/images/products/lightweight-brown.jpg",
                "/assets/images/products/lightweight-brown-hover.jpg",
                "/assets/images/products/lightweight-brown-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 2,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Brown",
        reference: "LBA-004",
        slug: "lightweight-brown"
    },
    {
        id: 5,
        name: "Black Aztec",
        price: 140,
        description: "Sophisticated structured black aztec abaya with subtle details",
        images: {
            main: "/assets/images/products/black-aztec.jpg",
            hover: "/assets/images/products/black-aztec-hover.jpg",
            gallery: [
                "/assets/images/products/black-aztec.jpg",
                "/assets/images/products/black-aztec-hover.jpg",
                "/assets/images/products/black-aztec-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 2,
            "56": 0,
            "58": 2,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Black",
        reference: "BAA-005",
        slug: "black-aztec"
    },
    {
        id: 6,
        name: "Princess Satin",
        price: 160.00,
        description: "Majestic pink satin abaya with gold thread embellishments",
        images: {
            main: "/assets/images/products/princess-satin.jpg",
            hover: "/assets/images/products/princess-satin-hover.jpg",
            gallery: [
                "/assets/images/products/princess-satin.jpg",
                "/assets/images/products/princess-satin-hover.jpg",
                "/assets/images/products/princess-satin-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Pink",
        reference: "PSA-006",
        slug: "princess-satin"
    },
    {
        id: 7,
        name: "Jacquard Gold with Collar",
        price: 130.00,
        description: "Luxurious gold jacquard abaya with handcrafted collar",
        images: {
            main: "/assets/images/products/jacquard-gold.jpg",
            hover: "/assets/images/products/jacquard-gold-hover.jpg",
            gallery: [
                "/assets/images/products/jacquard-gold.jpg",
                "/assets/images/products/jacquard-gold-hover.jpg",
                "/assets/images/products/jacquard-gold-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 0,
            "58": 1,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Gold",
        reference: "JGA-007",
        slug: "jacquard-gold"
    },
    {
        id: 8,
        name: "Jacquard Gold",
        price: 125.00,
        description: "Luxurious gold jacquard abaya without collar",
        images: {
            main: "/assets/images/products/jacquard-gold-no-collar.jpg",
            hover: "/assets/images/products/jacquard-gold-no-collar-hover.jpg",
            gallery: [
                "/assets/images/products/jacquard-gold-no-collar.jpg",
                "/assets/images/products/jacquard-gold-no-collar-hover.jpg",
                "/assets/images/products/jacquard-gold-no-collar-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 0,
            "58": 1,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Gold",
        reference: "JGN-008",
        slug: "jacquard-gold-no-collar"
    },
    {
        id: 9,
        name: "Silk Satin Trench",
        price: 130.00,
        description: "Trench style black satin abaya with pockets",
        images: {
            main: "/assets/images/products/silk-satin-trench.jpg",
            hover: "/assets/images/products/silk-satin-trench-hover.jpg",
            gallery: [
                "/assets/images/products/silk-satin-trench.jpg",
                "/assets/images/products/silk-satin-trench-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Black",
        reference: "SST-009",
        slug: "silk-satin-trench"
    },
    {
        id: 10,
        name: "Black Jacquard Aztec",
        price: 125.00,
        description: "Sophisticated structured black jacquardaztec abaya with subtle details",
        images: {
            main: "/assets/images/products/black-jacquard-aztec.jpg",
            hover: "/assets/images/products/black-jacquard-aztec-hover.jpg",
            gallery: [
                "/assets/images/products/black-jacquard-aztec.jpg",
                "/assets/images/products/black-jacquard-aztec-hover.jpg",
                "/assets/images/products/black-jacquard-aztec-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 0,
            "58": 0,
            "60": 1,
            "62": 0
        },
        category: "Abayas",
        color: "Black",
        reference: "BJA-010",
        slug: "black-jacquard-aztec"
    },
    {
        id: 11,
        name: "Velvet Black",
        price: 150.00,
        description: "Elegant and regal velvet black abaya with intricate detailing",
        images: {
            main: "/assets/images/products/velvet-black.jpg",
            hover: "/assets/images/products/velvet-black-hover.jpg",
            gallery: [
                "/assets/images/products/velvet-black.jpg",
                "/assets/images/products/velvet-black-hover.jpg",
                "/assets/images/products/velvet-black-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 2,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Black",
        reference: "VBA-011",
        slug: "velvet-black"
    },
    {
        id: 12,
        name: "Lightweight Maroon",
        price: 40.00,
        description: "Lightweight maroon 100% viscose abaya with slip dress",
        images: {
            main: "/assets/images/products/lightweight-maroon.jpg",
            hover: "/assets/images/products/lightweight-maroon-hover.jpg",
            gallery: [
                "/assets/images/products/lightweight-maroon.jpg",
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 2,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Maroon",
        reference: "LMA-012",
        slug: "lightweight-maroon"
    },
    {
        id: 13,
        name: "Lightweight Woven Pattern Brown",
        price: 30.00,
        description: "Lightweight, everyday abaya, soft and breathable",
        images: {
            main: "/assets/images/products/lightweight-woven-pattern-brown.jpg",
            hover: "/assets/images/products/lightweight-woven-pattern-brown-hover.jpg",
            gallery: [
                "/assets/images/products/lightweight-woven-pattern-brown.jpg",
                "/assets/images/products/lightweight-woven-pattern-brown-hover.jpg",
                "/assets/images/products/lightweight-woven-pattern-brown-back.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Brown",
        reference: "LWB-013",
        slug: "lightweight-woven-pattern-brown"
    },
    {
        id: 14,
        name: "Lightweight Woven Pattern Green",
        price: 30.00,
        description: "Lightweight, everyday abaya, soft and breathable",
        images: {
            main: "/assets/images/products/lightweight-woven-pattern-green.jpg",
            hover: "/assets/images/products/lightweight-woven-pattern-green-hover.jpg",
            gallery: [
                "/assets/images/products/lightweight-woven-pattern-green.jpg",
                "/assets/images/products/lightweight-woven-pattern-green-hover.jpg"
            ]
        },
        sizes: ["52", "54", "56", "58", "60", "62"],
        stock: {
            "52": 0,
            "54": 0,
            "56": 1,
            "58": 0,
            "60": 0,
            "62": 0
        },
        category: "Abayas",
        color: "Green",
        reference: "LWG-014",
        slug: "lightweight-woven-pattern-green"
    },
];

const migrateProducts = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        console.log('Connected to MongoDB...');
        
        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products...');
        
        // Make sure all products have a unique ID and validate required fields
        products.forEach((product, index) => {
            // Ensure each product has a unique ID
            product.id = (index + 1).toString(); // Convert to string to match schema
            
            // Ensure slug exists and is unique
            if (!product.slug) {
                product.slug = product.name.toLowerCase().replace(/\s+/g, '-');
            }
            
            // Validate required fields
            if (!product.name || !product.price || !product.description || !product.reference) {
                throw new Error(`Product ${product.id} is missing required fields`);
            }
            
            if (!product.images || !product.images.main) {
                throw new Error(`Product ${product.id} (${product.name}) is missing required image`);
            }
        });
        
        // Insert products
        const result = await Product.insertMany(products);
        console.log(`Successfully migrated ${result.length} products to MongoDB!`);
        console.log(`Database now contains ${result.length} products.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error migrating products:', error);
        process.exit(1);
    }
};

migrateProducts();

// Export products array for direct generation
module.exports = {
    products
}; 