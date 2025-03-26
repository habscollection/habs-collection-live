const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    items: [{
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
cartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Cart', cartSchema); 