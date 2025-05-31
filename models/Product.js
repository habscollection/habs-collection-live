const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    id: {
        type: String,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    reference: {
        type: String,
        required: true
    },
    images: {
        main: {
            type: String,
            required: true
        },
        hover: {
            type: String
        },
        gallery: [{
            type: String
        }]
    },
    sizes: [{
        type: String
    }],
    stock: {
        type: Map,
        of: Number,
        default: {}
    },
    // New fields for sale and sold out labels
    sale: {
        type: Boolean,
        default: false
    },
    soldOut: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Product', productSchema); 
