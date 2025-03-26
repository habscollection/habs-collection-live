# Deployment Checklist for HABS COLLECTION

## Pre-Deployment

- [x] Update package.json with correct start scripts
- [x] Create/update .env.example file with all required variables
- [x] Configure .htaccess for URL rewriting
- [x] Add deployment instructions to README.md
- [x] Move API routes before static file middleware in server.js
- [x] Add proper CORS headers for API requests
- [ ] Commit all necessary files to Git repository
- [ ] Push to GitHub repository

## AWS Lightsail Setup

- [ ] Create AWS Lightsail instance with LAMP stack
- [ ] Set up static IP and DNS
- [ ] Connect via SSH
- [ ] Install Node.js and npm
- [ ] Clone repository from GitHub
- [ ] Install project dependencies
- [ ] Create .env file with production credentials
- [ ] Install PM2 to manage Node.js application
- [ ] Start application with PM2
- [ ] Configure Apache as proxy for API endpoints
- [ ] Enable required Apache modules (rewrite, proxy, proxy_http)
- [ ] Set up virtual host configuration
- [ ] Restart Apache service
- [ ] Set up SSL certificate with Let's Encrypt (recommended)

## Post-Deployment Testing

- [ ] Verify HTTPS is working correctly
- [ ] Test clean URLs (no .html extension)
- [ ] Test user signup/login
- [ ] Test product browsing and filtering
- [ ] Test adding items to cart
- [ ] Test checkout process with Stripe test cards
- [ ] Test order confirmation emails
- [ ] Verify mobile responsiveness
- [ ] Check page loading performance

## Security Checks

- [ ] Ensure .env file is properly secured (600 permissions)
- [ ] Verify MongoDB connection is using TLS
- [ ] Check Stripe is configured for production
- [ ] Verify proper HTTP security headers are set
- [ ] Ensure error pages do not expose sensitive information

## Monitoring Setup

- [ ] Configure PM2 for process monitoring
- [ ] Set up application logging
- [ ] Configure error notifications
- [ ] Implement server performance monitoring
- [ ] Set up backup procedures for critical data

## Documentation

- [ ] Document deployment configuration
- [ ] Document server specifications
- [ ] Create procedure for updates and hotfixes
- [ ] Document rollback procedures
- [ ] Create maintenance guide for non-technical users 