const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const mongoose = require('mongoose');

// GET /api/cart - Get all items in cart
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/cart - Getting cart items for user:', req.session.userId || 'guest');
        const cart = await Cart.findOne({ userId: req.session.userId || 'guest' });
        res.json(cart ? cart.items : []);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart items' });
    }
});

// POST /api/cart - Add item to cart
router.post('/', async (req, res) => {
    try {
        const { id, name, price, size, quantity, image } = req.body;
        console.log('POST /api/cart - Adding item:', { id, name, size, quantity });
        
        // Validate required fields
        if (!id || !name || !price || !size || !quantity || !image) {
            console.error('Missing required fields:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Find cart by user ID or use 'guest' if not logged in
        let cart = await Cart.findOne({ userId: req.session.userId || 'guest' });
        
        // If no cart exists, create a new one
        if (!cart) {
            console.log('Creating new cart for user:', req.session.userId || 'guest');
            cart = new Cart({
                userId: req.session.userId || 'guest',
                items: []
            });
        }
        
        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(item => 
            item.id === id && item.size === size
        );
        
        if (existingItemIndex > -1) {
            console.log('Item already exists in cart, updating quantity');
            // Update quantity of existing item
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            console.log('Adding new item to cart');
            // Add new item to cart
            cart.items.push({
                id,
                name,
                price,
                size,
                quantity,
                image
            });
        }
        
        // Save cart
        await cart.save();
        console.log('Cart saved successfully');
        
        res.status(201).json({ 
            success: true, 
            message: 'Item added to cart successfully',
            items: cart.items
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// PUT /api/cart/:id - Update cart item
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { size, quantity } = req.body;
        console.log(`PUT /api/cart/${id} - Updating item:`, { size, quantity });
        
        // Find cart by user ID or use 'guest' if not logged in
        const cart = await Cart.findOne({ userId: req.session.userId || 'guest' });
        
        if (!cart) {
            console.error('Cart not found');
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        // Find the item in the cart
        const itemIndex = cart.items.findIndex(item => 
            item.id === id && item.size === size
        );
        
        if (itemIndex === -1) {
            console.error('Item not found in cart');
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Update item quantity
        if (quantity) {
            cart.items[itemIndex].quantity = quantity;
        }
        
        // Save changes
        await cart.save();
        console.log('Cart updated successfully');
        
        res.json({ 
            success: true, 
            message: 'Cart item updated successfully',
            items: cart.items 
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
});

// DELETE /api/cart/:id - Remove item from cart
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { size } = req.body;
        console.log(`DELETE /api/cart/${id} - Removing item with size:`, size);
        
        // Find cart by user ID or use 'guest' if not logged in
        const cart = await Cart.findOne({ userId: req.session.userId || 'guest' });
        
        if (!cart) {
            console.error('Cart not found');
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        // Find item index
        const itemIndex = cart.items.findIndex(item => 
            item.id === id && item.size === size
        );
        
        if (itemIndex === -1) {
            console.error('Item not found in cart');
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
        
        // Save changes
        await cart.save();
        console.log('Item removed from cart successfully');
        
        res.json({ 
            success: true, 
            message: 'Item removed from cart successfully',
            items: cart.items 
        });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// GET /api/cart/total - Get cart total
router.get('/total', async (req, res) => {
    try {
        console.log('GET /api/cart/total - Calculating cart total');
        const cart = await Cart.findOne({ userId: req.session.userId || 'guest' });
        if (!cart) {
            return res.json({ subtotal: 0, shipping: 0, total: 0 });
        }

        let subtotal = cart.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Calculate shipping
        const freeShippingThreshold = 300;
        const shipping = subtotal >= freeShippingThreshold ? 0 : 10;
        const total = subtotal + shipping;

        console.log('Cart total calculated:', { subtotal, shipping, total });
        res.json({ subtotal, shipping, total });
    } catch (error) {
        console.error('Error calculating cart total:', error);
        res.status(500).json({ error: 'Failed to calculate cart total' });
    }
});

// DELETE /api/cart - Clear cart
router.delete('/', async (req, res) => {
    try {
        console.log('DELETE /api/cart - Clearing cart');
        await Cart.findOneAndDelete({ userId: req.session.userId || 'guest' });
        console.log('Cart cleared successfully');
        res.json({ success: true, message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = router; 