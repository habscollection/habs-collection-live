// Checkout.js - Handles Stripe payment integration

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('[DEBUG CHECKOUT] Initializing checkout page');
        
        // Wait for API to be available
        let apiCheckAttempts = 0;
        const maxApiCheckAttempts = 5;
        
        while (!window.api && apiCheckAttempts < maxApiCheckAttempts) {
            console.log(`[DEBUG CHECKOUT] Waiting for API to be available (attempt ${apiCheckAttempts + 1}/${maxApiCheckAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 300));
            apiCheckAttempts++;
        }
        
        if (!window.api) {
            console.error('[DEBUG CHECKOUT] API not available after waiting, checkout functionality will be limited');
            alert('Error: Unable to connect to the server. Please try again later or contact support.');
            return;
        }

        // Ensure cart exists
        if (!window.cart) {
            console.log('[DEBUG CHECKOUT] Creating new Cart instance');
            window.cart = new Cart();
            await window.cart.init();
        } else {
            console.log('[DEBUG CHECKOUT] Cart instance already exists');
        }
        
        // Initialize Stripe
        const stripe = Stripe('pk_test_your_stripe_publishable_key');
        const elements = stripe.elements();
        const card = elements.create('card', {
            style: {
                base: {
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: '16px',
                    color: '#333',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#dc3545',
                    iconColor: '#dc3545'
                }
            }
        });

        // Mount the card element
        card.mount('#card-element');

        // Handle real-time validation errors
        card.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        // Get DOM elements
        const checkoutForm = document.getElementById('checkout-form');
        const formSections = document.querySelectorAll('.form-section');
        const steps = document.querySelectorAll('.step');
        const prevButton = document.querySelector('.btn-prev');
        const nextButton = document.querySelector('.btn-next');
        const submitButton = document.querySelector('.btn-submit');
        const cardPaymentForm = document.getElementById('card-payment-form');

        let currentStep = 0;

        // Initialize the checkout page
        function initializeCheckout() {
            console.log('[DEBUG CHECKOUT] Initializing checkout page UI');
            
            // Show first step
            showStep(currentStep);
            
            // Add event listeners
            prevButton.addEventListener('click', previousStep);
            nextButton.addEventListener('click', nextStep);
            checkoutForm.addEventListener('submit', handleSubmit);
            
            // Update order summary
            updateOrderSummary();
            
            console.log('[DEBUG CHECKOUT] Checkout page initialization complete');
        }

        // Show the specified step
        function showStep(stepIndex) {
            formSections.forEach((section, index) => {
                section.classList.toggle('active', index === stepIndex);
            });

            steps.forEach((step, index) => {
                step.classList.toggle('active', index === stepIndex);
            });

            // Update navigation buttons
            prevButton.disabled = stepIndex === 0;
            nextButton.style.display = stepIndex === formSections.length - 1 ? 'none' : 'block';
            submitButton.style.display = stepIndex === formSections.length - 1 ? 'block' : 'none';
        }

        // Validate the current step
        function validateStep(stepIndex) {
            const currentSection = formSections[stepIndex];
            const inputs = currentSection.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            });

            // Additional validation for payment step
            if (stepIndex === formSections.length - 1) {
                // Stripe Element validation
                if (card._empty) {
                    isValid = false;
                    document.querySelector('.stripe-element').classList.add('error');
                } else {
                    document.querySelector('.stripe-element').classList.remove('error');
                }
            }

            return isValid;
        }

        // Handle next button click
        function nextStep() {
            if (validateStep(currentStep)) {
                currentStep++;
                showStep(currentStep);
                window.scrollTo(0, 0);
            }
        }

        // Handle previous button click
        function previousStep() {
            currentStep--;
            showStep(currentStep);
            window.scrollTo(0, 0);
        }

        // Update order summary using Cart instance
        async function updateOrderSummary() {
            try {
                console.log('[DEBUG CHECKOUT] Updating order summary');
                
                // Get fresh cart data from database
                let cartItems = [];
                
                try {
                    cartItems = await window.api.getCartItems();
                    console.log('[DEBUG CHECKOUT] Cart items from API:', cartItems);
                } catch (apiError) {
                    console.error('[DEBUG CHECKOUT] Error getting cart items from API:', apiError);
                    
                    // Fall back to local cart if API fails
                    if (window.cart && window.cart.items) {
                        console.log('[DEBUG CHECKOUT] Falling back to local cart');
                        cartItems = window.cart.items;
                    }
                }
                
                // If cart is empty, redirect back to cart page
                if (!cartItems || cartItems.length === 0) {
                    console.warn('[DEBUG CHECKOUT] Cart is empty, redirecting to cart page');
                    window.location.href = 'cart.html';
                    return;
                }

                const summaryItems = document.getElementById('summary-items');
                const orderItems = document.getElementById('order-items');
                const subtotalElement = document.getElementById('summary-subtotal');
                const totalElement = document.getElementById('summary-total');
                const shippingElement = document.getElementById('summary-shipping');

                let subtotal = 0;
                let itemsHTML = '';
                let orderItemsHTML = '';

                cartItems.forEach(item => {
                    subtotal += item.price * item.quantity;
                    
                    const itemHTML = `
                        <div class="summary-item">
                            <img src="${item.image}" alt="${item.name}" class="summary-item-image">
                            <div class="summary-item-details">
                                <h3 class="summary-item-title">${item.name}</h3>
                                <p class="summary-item-variant">Size: ${item.size}</p>
                                <p class="summary-item-price">£${item.price.toFixed(2)} × ${item.quantity}</p>
                            </div>
                        </div>
                    `;
                    
                    itemsHTML += itemHTML;
                    orderItemsHTML += itemHTML;
                });

                // Calculate shipping
                const freeShippingThreshold = 300;
                const shippingCost = subtotal >= freeShippingThreshold ? 0 : 10;
                const total = subtotal + shippingCost;

                summaryItems.innerHTML = itemsHTML;
                orderItems.innerHTML = orderItemsHTML;
                subtotalElement.textContent = `£${subtotal.toFixed(2)}`;
                shippingElement.textContent = shippingCost === 0 ? 'FREE' : `£${shippingCost.toFixed(2)}`;
                totalElement.textContent = `£${total.toFixed(2)}`;

                console.log('[DEBUG CHECKOUT] Order summary updated successfully');
                return { subtotal, shipping: shippingCost, total };
            } catch (error) {
                console.error('[DEBUG CHECKOUT] Error updating order summary:', error);
                alert('Failed to load cart data. Please try again.');
                window.location.href = 'cart.html';
            }
        }

        // Handle form submission
        async function handleSubmit(e) {
            e.preventDefault();
            
            if (!validateStep(currentStep)) {
                return;
            }

            const submitButton = document.querySelector('.btn-submit');
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            try {
                const formData = new FormData(checkoutForm);

                // Get cart total from server or calculate locally
                let totalInfo;
                try {
                    console.log('[DEBUG CHECKOUT] Getting cart total from API');
                    totalInfo = await window.api.getCartTotal();
                } catch (totalError) {
                    console.error('[DEBUG CHECKOUT] Error getting cart total from API:', totalError);
                    
                    // Fall back to local calculation
                    console.log('[DEBUG CHECKOUT] Falling back to local total calculation');
                    if (window.cart) {
                        totalInfo = window.cart.calculateTotal();
                    } else {
                        throw new Error('Could not calculate order total');
                    }
                }

                const { total } = totalInfo;
                console.log('[DEBUG CHECKOUT] Order total:', total);

                // Create payment intent
                console.log('[DEBUG CHECKOUT] Creating payment intent');
                const { clientSecret } = await window.api.createPaymentIntent(total);

                // Confirm card payment
                console.log('[DEBUG CHECKOUT] Confirming card payment');
                const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: card,
                        billing_details: {
                            name: formData.get('firstName') + ' ' + formData.get('lastName'),
                            email: formData.get('email'),
                            phone: formData.get('phone'),
                            address: {
                                line1: formData.get('address'),
                                city: formData.get('city'),
                                postal_code: formData.get('postcode'),
                                country: formData.get('country')
                            }
                        }
                    }
                });

                if (error) {
                    console.error('[DEBUG CHECKOUT] Payment error:', error);
                    throw new Error(error.message);
                }

                if (paymentIntent.status === 'succeeded') {
                    console.log('[DEBUG CHECKOUT] Payment succeeded');
                    // Handle successful payment
                    await handlePaymentSuccess(paymentIntent.id);
                }
            } catch (error) {
                console.error('[DEBUG CHECKOUT] Form submission error:', error);
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Place Order';
            }
        }

        // Handle successful payment
        async function handlePaymentSuccess(paymentIntentId) {
            try {
                console.log('[DEBUG CHECKOUT] Processing successful payment:', paymentIntentId);
                const formData = new FormData(checkoutForm);
                
                // Get cart items
                let cartItems;
                try {
                    cartItems = await window.api.getCartItems(); // Get fresh cart data
                } catch (cartError) {
                    console.error('[DEBUG CHECKOUT] Error getting cart items from API:', cartError);
                    
                    // Fall back to local cart
                    if (window.cart && window.cart.items) {
                        cartItems = window.cart.items;
                    } else {
                        throw new Error('Could not retrieve cart items');
                    }
                }
                
                // Get cart total
                let totalInfo;
                try {
                    totalInfo = await window.api.getCartTotal();
                } catch (totalError) {
                    console.error('[DEBUG CHECKOUT] Error getting cart total from API:', totalError);
                    
                    // Fall back to local calculation
                    if (window.cart) {
                        totalInfo = window.cart.calculateTotal();
                    } else {
                        throw new Error('Could not calculate order total');
                    }
                }
                
                const { total } = totalInfo;

                const orderData = {
                    paymentIntentId,
                    items: cartItems,
                    customer: {
                        firstName: formData.get('firstName'),
                        lastName: formData.get('lastName'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        address: {
                            line1: formData.get('address'),
                            city: formData.get('city'),
                            postal_code: formData.get('postcode'),
                            country: formData.get('country')
                        }
                    },
                    total,
                    status: 'paid'
                };

                // Create order in MongoDB
                console.log('[DEBUG CHECKOUT] Creating order in database');
                const { orderId } = await window.api.createOrder(orderData);

                // Clear the cart
                try {
                    console.log('[DEBUG CHECKOUT] Clearing cart in database');
                    await window.api.clearCart();
                } catch (clearError) {
                    console.error('[DEBUG CHECKOUT] Error clearing cart in database:', clearError);
                    
                    // Fall back to clearing local cart
                    if (window.cart) {
                        window.cart.items = [];
                        try {
                            localStorage.removeItem('cart');
                        } catch (storageError) {
                            console.error('[DEBUG CHECKOUT] Error clearing localStorage cart:', storageError);
                        }
                    }
                }

                // Redirect to success page
                console.log('[DEBUG CHECKOUT] Order complete, redirecting to success page');
                window.location.href = `/order-success.html?orderId=${orderId}`;
            } catch (error) {
                console.error('[DEBUG CHECKOUT] Error processing order:', error);
                alert('Payment successful but failed to process order. Please contact support.');
            }
        }

        // Initialize checkout
        initializeCheckout();
    } catch (error) {
        console.error('Error initializing checkout:', error);
        alert('Failed to initialize checkout. Please try again.');
        window.location.href = 'cart.html';
    }
}); 