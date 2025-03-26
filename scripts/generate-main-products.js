const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// MongoDB connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function generateMainProductsPage() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Get all products
        const products = await Product.find({}).sort('-price');

        // Create the HTML template
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EID-AL FITR COLLECTION - Habs Collection</title>
    <link rel="stylesheet" href="/css/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@200;300;400&display=swap" rel="stylesheet">
    <!-- Load API and Cart scripts early with defer attribute -->
    <script src="/scripts/api.js" defer></script>
    <script src="/scripts/cart.js" defer></script>
    <style>
        /* Essential styles not found in global CSS */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .product-card {
            position: relative;
            text-decoration: none;
            color: inherit;
        }
        
        .product-image {
            position: relative;
            width: 100%;
            aspect-ratio: 3/4;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.3s ease;
        }
        
        .product-image .hover-image {
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
        }
        
        .product-card:hover .hover-image {
            opacity: 1;
        }
        
        .product-info {
            text-align: center;
        }
        
        .product-info h3 {
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .product-info .price {
            font-weight: bold;
        }
        
        .collection-header {
            text-align: center;
            padding: 40px 20px;
        }
        
        .collection-header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .collection-header p {
            color: #666;
            max-width: 600px;
            margin: 0 auto;
        }
        
        /* Responsive grid */
        @media (max-width: 1024px) {
            .products-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 640px) {
            .products-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="announcement-bar">
        <p>FREE SHIPPING ON ORDERS OVER £300</p>
    </div>

    <nav class="navbar">
        <div class="nav-left">
            <a href="/products.html">EID-AL FITR COLLECTION</a>
        </div>
        <div class="nav-center">
            <a href="/" class="brand-logo">HABS COLLECTION</a>
        </div>
        <div class="nav-right">
            <a href="#search" class="nav-icon">Search</a>
            <a href="#account" class="nav-icon">Account</a>
            <a href="/cart.html" class="nav-icon">Cart (<span class="cart-count">0</span>)</a>
        </div>
        
        <div class="mobile-nav-right">
            <a href="#search" class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </a>
            <a href="#account" class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </a>
            <a href="/cart.html" class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span class="cart-count">0</span>
            </a>
        </div>

        <button class="mobile-menu-toggle" aria-label="Toggle Menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
    </nav>
    
    <!-- Mobile Menu -->
    <div class="mobile-menu-overlay"></div>
    <div class="mobile-menu">
        <button class="mobile-menu-close">&times;</button>
        <a href="/products.html">EID-AL FITR COLLECTION - Limited Edition</a>
        <a href="#search">Search</a>
        <a href="#account">Account</a>
        <a href="/cart.html">Cart (<span class="mobile-cart-count">0</span>)</a>
        <a href="/index.html" class="mobile-home-link">Home</a>
    </div>

    <main>
        <div class="collection-header">
            <h1>EID-AL FITR COLLECTION</h1>
            <p>Discover our exclusive EID-AL FITR 2025 limited collection, exquisite fabrics and detailed designs for the stand out woman.</p>
        </div>

        <div class="products-grid">
            ${products.map(product => {
                const isOutOfStock = isCompletelyOutOfStock(product);
                
                return `
                    <a href="/products/${product.slug}.html" class="product-card">
                        <div class="product-image">
                            <img src="${product.images.main}" alt="${product.name}" class="main-image">
                            <img src="${product.images.hover || product.images.gallery[0] || product.images.main}" alt="${product.name} Hover" class="hover-image">
                            ${isOutOfStock ? '<span class="out-of-stock-badge">Out of Stock</span>' : ''}
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <p class="price">£${product.price.toFixed(2)}</p>
                        </div>
                    </a>
                `;
            }).join('')}
        </div>
    </main>
    
    <!-- Footer -->
    <footer class="site-footer">
        <div class="footer-container">
            <div class="footer-grid">
                <div class="footer-section">
                    <h4>LATEST COLLECTION</h4>
                    <ul>
                        <li><a href="#abayas">ABAYAS</a></li>
                        <li><a href="#dresses">DRESSES</a></li>
                    </ul>
                </div>

                <div class="footer-section">
                    <h4>CUSTOMER SERVICE</h4>
                    <ul>
                        <li><a href="#contact">Contact Us</a></li>
                        <li><a href="#shipping">Shipping Information</a></li>
                        <li><a href="#returns">Returns & Exchanges</a></li>
                        <li><a href="#size-guide">Size Guide</a></li>
                    </ul>
                </div>

                <div class="footer-section">
                    <h4>ABOUT</h4>
                    <ul>
                        <li><a href="#story">Our Story</a></li>
                        <li><a href="#sustainability">Sustainability</a></li>
                        <li><a href="#stores">Stores</a></li>
                    </ul>
                </div>

                <div class="footer-section newsletter">
                    <h4>NEWSLETTER</h4>
                    <p>Subscribe to receive updates, access to exclusive deals, and more.</p>
                    <form class="newsletter-form">
                        <div class="input-group">
                            <input type="email" placeholder="Enter your email address" required>
                            <button type="submit">Subscribe</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="footer-left">
                    <p>© 2024 - HABS COLLECTION</p>
                </div>
                <div class="footer-right">
                    <div class="payment-methods">
                        <img src="/assets/images/payment/visa.png" alt="Visa">
                        <img src="/assets/images/payment/mastercard.png" alt="Mastercard">
                        <img src="/assets/images/payment/amex.png" alt="American Express">
                        <img src="/assets/images/payment/paypal.png" alt="PayPal">
                        <img src="/assets/images/payment/apple-pay.png" alt="Apple Pay">
                        <img src="/assets/images/payment/google-pay.png" alt="Google Pay">
                    </div>
                </div>
            </div>
        </div>
    </footer>
    
    <script>
        // Mobile menu functionality
        document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
            const mobileMenu = document.querySelector('.mobile-menu');
            const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
            const mobileMenuClose = document.querySelector('.mobile-menu-close');
            
            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', () => {
                    mobileMenu.classList.add('active');
                    mobileMenuOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                });
            }
            
            if (mobileMenuClose) {
                mobileMenuClose.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                    mobileMenuOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }
            
            if (mobileMenuOverlay) {
                mobileMenuOverlay.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                    mobileMenuOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }
            
            // Update cart count
            if (window.cart && typeof window.cart.updateCartCount === 'function') {
                window.cart.updateCartCount();
            }
        });
    </script>
</body>
</html>`;

        // Write the file
        const outputPath = path.join(__dirname, '..', 'products.html');
        fs.writeFileSync(outputPath, html);
        console.log('Generated main products page: products.html');

        process.exit(0);
    } catch (error) {
        console.error('Error generating main products page:', error);
        process.exit(1);
    }
}

// Check if all sizes are out of stock
const isCompletelyOutOfStock = product => {
    // If product has no sizes or stock, consider it available
    if (!product.sizes || !product.sizes.length || !product.stock) {
        return false;
    }
    
    // Check each size
    for (const size of product.sizes) {
        const stockLevel = product.stock.get ? product.stock.get(size) : product.stock[size];
        if (stockLevel && stockLevel > 0) {
            return false; // Found at least one size in stock
        }
    }
    
    // If we reached here, all sizes are out of stock
    return true;
};

// Run the generator
generateMainProductsPage(); 