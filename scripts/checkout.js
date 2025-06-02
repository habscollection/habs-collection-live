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
        let stripe, elements, card;
        
        try {
            // Fetch Stripe publishable key from server
            async function initializeStripe() {
                try {
                    // First check if we have a key already set from the HTML
                    let stripePublishableKey = window.STRIPE_PUBLISHABLE_KEY;
                    
                    // If not set or is a placeholder, try to fetch from server
                    if (!stripePublishableKey || stripePublishableKey === 'pk_test_placeholder') {
                        console.log('[DEBUG CHECKOUT] Fetching Stripe key from server');
                        try {
                            const response = await fetch('/api/stripe/config');
                            if (response.ok) {
                                const data = await response.json();
                                stripePublishableKey = data.publishableKey;
                                console.log('[DEBUG CHECKOUT] Successfully fetched Stripe key from server');
                            } else {
                                console.error('[DEBUG CHECKOUT] Failed to fetch Stripe key:', response.status);
                            }
                        } catch (fetchError) {
                            console.error('[DEBUG CHECKOUT] Error fetching Stripe key:', fetchError);
                        }
                    }
                    
                    // Initialize Stripe if we have a valid key
                    if (stripePublishableKey && stripePublishableKey !== 'pk_test_placeholder' && !stripePublishableKey.includes('your_stripe_publishable_key')) {
                        stripe = Stripe(stripePublishableKey);
                        elements = stripe.elements();
                        card = elements.create('card', {
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
                        
                        console.log('[DEBUG CHECKOUT] Stripe initialized successfully');
                    } else {
                        console.warn('[DEBUG CHECKOUT] Stripe key is not configured properly');
                        document.getElementById('card-payment-form').innerHTML = `
                            <div class="alert" style="padding: 15px; background-color: #f8d7da; color: #721c24; border-radius: 4px; margin-bottom: 20px;">
                                <p style="margin: 0;">Stripe integration is not configured. Please configure your Stripe publishable key for production.</p>
                            </div>
                            <div class="form-field">
                                <label for="card-element">Card Details (Demo Mode)</label>
                                <div id="demo-card-element" class="stripe-element" style="border: 1px solid #e6e6e6; padding: 10px; border-radius: 4px; background: #f9f9f9;">
                                    <p style="margin: 0; color: #666;">Stripe payment is in demo mode.</p>
                                </div>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('[DEBUG CHECKOUT] Error initializing Stripe:', error);
                    throw error;
                }
            }
            
            // Call the async initialization function
            await initializeStripe();
            
        } catch (stripeError) {
            console.error('[DEBUG CHECKOUT] Error setting up Stripe:', stripeError);
            document.getElementById('card-payment-form').innerHTML = `
                <div class="alert" style="padding: 15px; background-color: #f8d7da; color: #721c24; border-radius: 4px; margin-bottom: 20px;">
                    <p style="margin: 0;">Error initializing payment system. Please try again later.</p>
                </div>
            `;
        }

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
            if (stepIndex === 1) { // Payment step
                // Only validate Stripe if it's properly initialized
                if (stripe && card) {
                    // Check if card details are empty
                    if (card._empty) {
                        isValid = false;
                        document.querySelector('.stripe-element').classList.add('error');
                    } else {
                        document.querySelector('.stripe-element').classList.remove('error');
                    }
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
                
                // Get fresh cart data from local storage first as fallback
                let cartItems = [];
                
                // Try getting from localStorage first
                try {
                    const localStorageCart = localStorage.getItem('cart');
                    if (localStorageCart) {
                        cartItems = JSON.parse(localStorageCart);
                        console.log('[DEBUG CHECKOUT] Cart items from localStorage:', cartItems);
                    }
                } catch (localStorageError) {
                    console.error('[DEBUG CHECKOUT] Error getting cart items from localStorage:', localStorageError);
                }
                
                // If localStorage didn't work, try from cart instance
                if (!cartItems || cartItems.length === 0) {
                    if (window.cart && window.cart.items && window.cart.items.length > 0) {
                        console.log('[DEBUG CHECKOUT] Using cart instance items');
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
                const shippingCost = 5;
                const total = subtotal + shippingCost;

                summaryItems.innerHTML = itemsHTML;
                orderItems.innerHTML = orderItemsHTML;
                subtotalElement.textContent = `£${subtotal.toFixed(2)}`;
                shippingElement.textContent = shippingCost === 0 ? 'FREE' : `£${shippingCost.toFixed(2)}`;
                totalElement.textContent = `£${total.toFixed(2)}`;
                totalElement.classList.add('order-summary-total');
                totalElement.dataset.total = total.toFixed(2);

                console.log('[DEBUG CHECKOUT] Order summary updated successfully');
                return { subtotal, shipping: shippingCost, total };
            } catch (error) {
                console.error('[DEBUG CHECKOUT] Error updating order summary:', error);
                alert('Failed to load cart data. Please try again.');
                window.location.href = 'cart.html';
            }
        }

async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate the current step
    if (!validateStep(currentStep)) {
        return;
    }

    const submitButton = document.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    try {
        // Prepare order data
        const formData = new FormData(checkoutForm);
        const orderData = {
            customer: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                city: formData.get('city'),
                postcode: formData.get('postcode'),
                country: formData.get('country')
            }
        };

        // Get cart total
        const cartTotal = document.querySelector('.order-summary-total').dataset.total;
        const amount = parseFloat(cartTotal);

        // Validate cart
        const cartItems = window.cart ? window.cart.items : JSON.parse(localStorage.getItem('cart') || '[]');
        if (!amount || amount <= 0 || !cartItems || cartItems.length === 0) {
            throw new Error('Invalid cart data');
        }

        // Create payment intent
        const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, orderData })
        });

        if (!paymentIntentResponse.ok) {
            const errorData = await paymentIntentResponse.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret } = await paymentIntentResponse.json();

        // Confirm card payment
        const paymentResult = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: card,
                billing_details: {
                    name: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
                    email: orderData.customer.email,
                    phone: orderData.customer.phone,
                    address: {
                        line1: orderData.customer.address,
                        city: orderData.customer.city,
                        postal_code: orderData.customer.postcode,
                        country: orderData.customer.country
                    }
                }
            }
        });

        // Handle payment result
        console.log('Payment result:', paymentResult);

        if (paymentResult.error) {
            // Payment failed
            console.error(`Payment failed: ${paymentResult.error.message}`);
            throw new Error(paymentResult.error.message || 'Payment failed. Please try again.');
        }

        if (paymentResult.paymentIntent && paymentResult.paymentIntent.status === 'succeeded') {
            // Payment succeeded, redirect to success page
            console.log('Payment succeeded, redirecting to success page');
            window.location.href = `payment-success.html?payment_intent=${paymentResult.paymentIntent.id}&payment_intent_client_secret=${clientSecret}`;
        } else if (paymentResult.paymentIntent && paymentResult.paymentIntent.status === 'processing') {
            // Payment is still processing
            console.warn('Payment is still processing. Please wait.');
            throw new Error('Payment is still processing. Please wait.');
        } else {
            // Any other status is considered a failure
            console.error(`Unexpected payment status: ${paymentResult.paymentIntent.status}`);
            throw new Error(`Payment failed with status: ${paymentResult.paymentIntent.status}. Please try again.`);
        }
    } catch (error) {
        console.error('[DEBUG CHECKOUT] Error processing order:', error);

        // Re-enable the submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';

        // Display error message to the user
        const errorElement = document.getElementById('card-errors') || document.createElement('div');
        errorElement.textContent = error.message || 'There was an error processing your payment. Please try again.';
        errorElement.style.color = '#dc3545';
        errorElement.style.marginTop = '10px';

        if (!document.getElementById('card-errors')) {
            cardPaymentForm.appendChild(errorElement);
        }
    }
}
        
        // Immediately initialize the checkout page
        initializeCheckout();
    } catch (error) {
        console.error('Error initializing checkout:', error);
        alert('Failed to initialize checkout. Please try again.');
        window.location.href = 'cart.html';
    }
}); 
