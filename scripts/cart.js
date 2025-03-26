// Cart Management
class Cart {
    constructor() {
        this.items = [];
        this.total = 0;
        this.shipping = 0;
        this.init();
        this.setupCartLinks();
        this.attachEventListeners();
        
        // Ensure window.cart always points to this instance
        window.cart = this;
    }

    async init() {
        try {
            console.log('[DEBUG] Initializing cart...');
            
            // Try to get cart from localStorage first (most reliable)
            try {
                const localCart = localStorage.getItem('cart');
                if (localCart) {
                    this.items = JSON.parse(localCart);
                    console.log('[DEBUG] Cart loaded from localStorage:', this.items);
                } else {
                    console.log('[DEBUG] No cart found in localStorage, using empty cart');
                    this.items = [];
                }
            } catch (storageError) {
                console.error('[DEBUG] Error loading cart from localStorage:', storageError);
                this.items = [];
            }
            
            // Update UI with cart contents
            this.updateCartDisplay();
            
            // If on cart page, explicitly render items to ensure they show up
            if (window.location.pathname.includes('cart.html')) {
                console.log('[DEBUG] On cart page, rendering cart items...');
                this.renderCartItems();
                
                // Enable/disable checkout button based on cart contents
                const checkoutButton = document.getElementById('checkout-button');
                if (checkoutButton) {
                    checkoutButton.disabled = this.items.length === 0;
                }
            }
        } catch (error) {
            console.error('[DEBUG] Error initializing cart:', error);
            // Fallback to empty cart
            this.items = [];
            this.updateCartDisplay();
        }
    }

    async addItem(product, size, quantity = 1) {
        try {
            console.log('[DEBUG] Add to cart started:', { product, size, quantity });
            
            // Create cart item object for local use
            const cartItem = {
                id: product.id || product._id,  // Ensure we have an ID
                name: product.name,
                price: product.price,
                size: size,
                quantity: quantity,
                image: product.images ? product.images.main : '/assets/images/placeholder.jpg'
            };
            
            // Check if item already exists in local cart first
            const existingItemIndex = this.items.findIndex(item => 
                item.id === cartItem.id && item.size === cartItem.size
            );
            
            if (existingItemIndex > -1) {
                // Update quantity if item exists locally
                console.log('[DEBUG] Item already exists in local cart, updating quantity');
                this.items[existingItemIndex].quantity += quantity;
            } else {
                // Only add to local array if we don't already have it
                console.log('[DEBUG] Item does not exist in local cart, adding new item');
                this.items.push(cartItem);
            }
            
            // Save cart to localStorage for persistence
            try {
                localStorage.setItem('cart', JSON.stringify(this.items));
                console.log('[DEBUG] Cart saved to localStorage');
            } catch (storageError) {
                console.error('[DEBUG] Error saving cart to localStorage:', storageError);
            }
            
            // Update UI
            this.updateCartDisplay();
            this.showNotification('Item added to cart', 'success');
            
            // Show cart lightbox
            const cartLightbox = document.querySelector('.cart-lightbox');
            if (cartLightbox) {
                console.log('[DEBUG] Showing cart lightbox');
                cartLightbox.classList.add('active');
                document.body.classList.add('cart-open');
            } else {
                console.error('[DEBUG] Cart lightbox element not found');
            }
            
            return true;
        } catch (error) {
            console.error('[DEBUG] Error adding item to cart:', error);
            // Show more detailed error message to help debugging
            const errorMessage = error.message || 'Unknown error';
            this.showNotification(`Failed to add item to cart: ${errorMessage}`, 'error');
            return false;
        }
    }

    async removeItem(productId, size) {
        try {
            console.log('[DEBUG] Removing item:', { productId, size });
            
            let apiSuccess = false;
            
            // Try to remove from server via API
            if (window.api) {
                try {
                    console.log('[DEBUG] Removing item via API');
                    await window.api.removeCartItem(productId, size);
                    
                    try {
                        // Refresh items from server
                        this.items = await window.api.getCartItems();
                        console.log('[DEBUG] Updated cart items from API after remove');
                        apiSuccess = true;
                    } catch (getError) {
                        console.error('[DEBUG] Error getting updated cart after remove:', getError);
                        // Will fall back to local update
                    }
                } catch (apiError) {
                    console.error('[DEBUG] API error when removing item:', apiError);
                    // Will fall back to local update
                }
            } else {
                console.warn('[DEBUG] API not available, using local cart for remove');
            }
            
            // If API failed or is not available, update local cart
            if (!apiSuccess) {
                console.log('[DEBUG] Using local cart fallback for remove');
                
                // Remove item from local cart
                this.items = this.items.filter(item => 
                    !(item.id === productId && item.size === size)
                );
                
                // Save to localStorage
                try {
                    localStorage.setItem('cart', JSON.stringify(this.items));
                    console.log('[DEBUG] Updated cart saved to localStorage after remove');
                } catch (storageError) {
                    console.error('[DEBUG] Error saving cart to localStorage after remove:', storageError);
                }
            }
            
            // Update UI
            this.updateCartDisplay();
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartItems();
            }
            
            this.showNotification('Item removed from cart', 'info');
            return true;
        } catch (error) {
            console.error('[DEBUG] Error removing item from cart:', error);
            this.showNotification('Failed to remove item from cart', 'error');
            return false;
        }
    }

    async updateQuantity(productId, size, newQuantity) {
        try {
            console.log('[DEBUG] Updating quantity:', { productId, size, newQuantity });
            
            if (newQuantity <= 0) {
                // If quantity is 0 or negative, remove the item
                return this.removeItem(productId, size);
            }
            
            let apiSuccess = false;
            
            // Try to update via API
            if (window.api) {
                try {
                    // Check stock availability
                    let stockAvailable = true;
                    try {
                        console.log('[DEBUG] Checking stock before quantity update');
                        const stockLevel = await window.api.checkStock(productId, size);
                        console.log(`[DEBUG] Stock level: ${stockLevel}, requested: ${newQuantity}`);
                        
                        if (stockLevel < newQuantity) {
                            console.warn(`[DEBUG] Not enough stock: ${stockLevel} available, ${newQuantity} requested`);
                            alert(`Sorry, we only have ${stockLevel} items in stock.`);
                            stockAvailable = false;
                        }
                    } catch (stockError) {
                        console.error('[DEBUG] Error checking stock:', stockError);
                        // Continue without stock check
                    }
                    
                    if (stockAvailable) {
                        // Update in database
                        await window.api.updateCartItem(productId, {
                            size,
                            quantity: newQuantity
                        });
                        
                        try {
                            // Refresh items from server
                            this.items = await window.api.getCartItems();
                            console.log('[DEBUG] Updated cart items from API after quantity update');
                            apiSuccess = true;
                        } catch (getError) {
                            console.error('[DEBUG] Error getting updated cart after quantity update:', getError);
                            // Will fall back to local update
                        }
                    } else {
                        return false; // Stock check failed
                    }
                } catch (apiError) {
                    console.error('[DEBUG] API error when updating quantity:', apiError);
                    // Will fall back to local update
                }
            } else {
                console.warn('[DEBUG] API not available, using local cart for quantity update');
            }
            
            // If API failed or is not available, update local cart
            if (!apiSuccess) {
                console.log('[DEBUG] Using local cart fallback for quantity update');
                
                // Find and update item in local cart
                const itemIndex = this.items.findIndex(item => 
                    item.id === productId && item.size === size
                );
                
                if (itemIndex > -1) {
                    this.items[itemIndex].quantity = newQuantity;
                    
                    // Save to localStorage
                    try {
                        localStorage.setItem('cart', JSON.stringify(this.items));
                        console.log('[DEBUG] Updated cart saved to localStorage after quantity update');
                    } catch (storageError) {
                        console.error('[DEBUG] Error saving cart to localStorage after quantity update:', storageError);
                    }
                } else {
                    console.warn('[DEBUG] Item not found in local cart for quantity update');
                    return false;
                }
            }
            
            // Update UI
            this.updateCartDisplay();
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartItems();
            }
            
            return true;
        } catch (error) {
            console.error('[DEBUG] Error updating quantity:', error);
            this.showNotification('Failed to update quantity', 'error');
            return false;
        }
    }

    setupCartLinks() {
        // Add click handlers to all cart links
        document.querySelectorAll('a[href="cart.html"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (window.location.pathname.endsWith('cart.html')) {
                    e.preventDefault(); // Don't navigate if already on cart page
                }
            });
        });
    }
 
    attachEventListeners() {
        // Attach event listeners for checkout buttons - using standardized class names
        const checkoutButtons = document.querySelectorAll('.checkout-button, .proceed-to-checkout');
        checkoutButtons.forEach(button => {
            button.addEventListener('click', () => this.proceedToCheckout());
        });
        
        // Attach event listeners for clear cart buttons
        const clearCartButtons = document.querySelectorAll('.clear-cart');
        clearCartButtons.forEach(button => {
            button.addEventListener('click', () => this.clearCart());
        });
        
        // Attach event listeners for continue shopping buttons
        const continueShoppingButtons = document.querySelectorAll('.continue-shopping');
        continueShoppingButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Close the cart lightbox if it's open
                const cartLightbox = document.querySelector('.cart-lightbox');
                if (cartLightbox && cartLightbox.classList.contains('active')) {
                    cartLightbox.classList.remove('active');
                    document.body.classList.remove('cart-open');
                }
                
                // Navigate to products page if not already there
                if (!window.location.pathname.includes('index.html') && !window.location.pathname.endsWith('/')) {
                    window.location.href = '/index.html';
                }
            });
        });
        
        // Listen for DOM changes to detect when we're on cart page
        if (window.location.pathname.includes('cart.html')) {
            const cartItemsContainer = document.getElementById('cart-items');
            if (cartItemsContainer) {
                this.renderCartItems();
                
                // Add event delegation for cart item controls
                cartItemsContainer.addEventListener('click', (e) => {
                    const target = e.target;
                    
                    // Handle quantity buttons
                    if (target.classList.contains('quantity-btn')) {
                        const cartItem = target.closest('.cart-item');
                        if (cartItem) {
                            const productId = cartItem.dataset.productId;
                            const size = cartItem.dataset.size;
                            const quantityEl = cartItem.querySelector('.quantity');
                            let quantity = parseInt(quantityEl.textContent);
                            
                            if (target.classList.contains('decrease')) {
                                if (quantity > 1) {
                                    this.updateQuantity(productId, size, quantity - 1);
                                }
                            } else if (target.classList.contains('increase')) {
                                this.updateQuantity(productId, size, quantity + 1);
                            }
                        }
                    }
                    
                    // Handle remove button
                    if (target.closest('.remove-item')) {
                        const cartItem = target.closest('.cart-item');
                        if (cartItem) {
                            const productId = cartItem.dataset.productId;
                            const size = cartItem.dataset.size;
                            this.removeItem(productId, size);
                        }
                    }
                });
            }
        }
    }
 
    calculateTotal() {
        this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        this.shipping = this.total >= 300 ? 0 : 15;
        return {
            subtotal: this.total,
            shipping: this.shipping,
            total: this.total + this.shipping
        };
    }
 
    showNotification(message, type = 'info') {
        console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
        
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.cart-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'cart-notification';
            document.body.appendChild(notification);
            
            // Add styles if they don't exist
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .cart-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 15px 20px;
                        border-radius: 4px;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        z-index: 10000;
                        opacity: 0;
                        transform: translateY(-10px);
                        transition: opacity 0.3s, transform 0.3s;
                        color: white;
                    }
                    .cart-notification.success {
                        background-color: #4caf50;
                    }
                    .cart-notification.error {
                        background-color: #f44336;
                    }
                    .cart-notification.info {
                        background-color: #2196f3;
                    }
                    .cart-notification.visible {
                        opacity: 1;
                        transform: translateY(0);
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Set notification content and style
        notification.textContent = message;
        notification.className = 'cart-notification ' + type;
        
        // Show notification
        setTimeout(() => notification.classList.add('visible'), 10);
        
        // Hide notification after delay
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Generate and render cart items
    renderCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;
        
        if (this.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-message">
                    <p>Your cart is empty</p>
                    <a href="/index.html" class="continue-shopping">Continue Shopping</a>
                </div>
            `;
        } else {
            let itemsHTML = '';
            
            this.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                
                itemsHTML += `
                    <div class="cart-item" data-product-id="${item.id}" data-size="${item.size}">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}">
                        </div>
                        <div class="cart-item-details">
                            <h3>${item.name}</h3>
                            <p class="item-size">Size: ${item.size}</p>
                            <p class="item-price">£${item.price.toFixed(2)}</p>
                            <div class="quantity-controls">
                                <button class="quantity-btn decrease">-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn increase">+</button>
                            </div>
                            <p class="item-total">Total: £${itemTotal.toFixed(2)}</p>
                        </div>
                        <button class="remove-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;
            });
            
            cartItemsContainer.innerHTML = itemsHTML;
        }
    }
 
    updateCartDisplay() {
        // Update cart count
        const cartCountElements = document.querySelectorAll('.cart-count');
        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        
        cartCountElements.forEach(cartCount => {
            if (cartCount) {
                cartCount.textContent = totalItems.toString();
                cartCount.style.display = totalItems > 0 ? 'block' : 'none';
            }
        });

        // Update mobile cart count too (in case it's different)
        const mobileCartCount = document.querySelector('.mobile-cart-count');
        if (mobileCartCount) {
            mobileCartCount.textContent = totalItems.toString();
        }

        // Update checkout button state if it exists
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = this.items.length === 0;
        }

        // Update cart lightbox items if it exists
        const cartItemsContainer = document.querySelector('.cart-items-container');
        if (cartItemsContainer) {
            let itemsHTML = '';
            
            if (this.items.length === 0) {
                itemsHTML = '<p class="empty-cart-message">Your cart is empty</p>';
            } else {
                // Clear existing items first to prevent duplicates
                cartItemsContainer.innerHTML = '';
                
                this.items.forEach(item => {
                    const itemTotal = item.price * item.quantity;
                    
                    itemsHTML += `
                        <div class="cart-product-preview">
                            <img src="${item.image}" alt="${item.name}">
                            <div class="cart-product-details">
                                <h4 class="cart-product-name">${item.name}</h4>
                                <p class="cart-product-info">Size: ${item.size}</p>
                                <p class="cart-product-info">Quantity: ${item.quantity}</p>
                                <p class="cart-product-price">£${(itemTotal).toFixed(2)}</p>
                            </div>
                        </div>
                    `;
                });
            }
            
            cartItemsContainer.innerHTML = itemsHTML;
        }
        
        // If on cart page, also update the subtotal, shipping, and total
        if (window.location.pathname.includes('cart.html')) {
            const subtotalElement = document.getElementById('subtotal');
            const shippingElement = document.getElementById('shipping');
            const totalElement = document.getElementById('total');
            
            if (subtotalElement && shippingElement && totalElement) {
                const totals = this.calculateTotal();
                subtotalElement.textContent = `£${totals.subtotal.toFixed(2)}`;
                shippingElement.textContent = totals.shipping === 0 ? 'FREE' : `£${totals.shipping.toFixed(2)}`;
                totalElement.textContent = `£${totals.total.toFixed(2)}`;
            }
            
            // Make sure to also render the cart items if we're on the cart page
            this.renderCartItems();
        }
    }
    
    // Method to handle proceeding to checkout
    proceedToCheckout() {
        console.log('[DEBUG] Proceeding to checkout...');
        
        // Check if cart is empty
        if (this.items.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            return;
        }
        
        // Navigate to checkout page
        window.location.href = '/checkout.html';
    }
    
    // Method to clear the cart
    clearCart() {
        console.log('[DEBUG] Clearing cart...');
        
        // Clear items array
        this.items = [];
        
        // Clear localStorage
        localStorage.removeItem('cart');
        
        // Update UI
        this.updateCartDisplay();
        this.showNotification('Cart cleared', 'info');
    }
}

// Initialize cart when the DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[DEBUG] DOM loaded, initializing cart');
    
    try {
        // Wait for API to be available
        let apiCheckAttempts = 0;
        const maxApiCheckAttempts = 5;
        
        while (!window.api && apiCheckAttempts < maxApiCheckAttempts) {
            console.log(`[DEBUG] Waiting for API to be available (attempt ${apiCheckAttempts + 1}/${maxApiCheckAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 300));
            apiCheckAttempts++;
        }
        
        if (!window.api) {
            console.error('[DEBUG] API not available after waiting, cart functionality will be limited');
        } else {
            console.log('[DEBUG] API available, proceeding with cart initialization');
        }
        
        // Only create a new cart instance if one doesn't already exist
        if (!window.cart) {
            console.log('[DEBUG] Creating new Cart instance');
            window.cart = new Cart();
        } else {
            console.log('[DEBUG] Cart instance already exists');
        }
    } catch (error) {
        console.error('[DEBUG] Error during cart initialization:', error);
    }
});