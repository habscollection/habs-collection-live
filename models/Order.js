const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    paymentIntentId: {
        type: String,
        required: true
    },
    items: [{
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }],
    customer: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        address: {
            line1: String,
            city: String,
            postal_code: String,
            country: String
        }
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema); 