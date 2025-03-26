# HABS COLLECTION

A modern e-commerce website for HABS COLLECTION, featuring a curated selection of modest fashion.

## Features

- Responsive design for all devices
- Product catalog with filtering and search
- Shopping cart functionality
- Secure checkout process with Stripe integration
- User account management
- Order tracking
- Newsletter subscription

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Stripe API for payments
- MongoDB for database
- Node.js backend

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/habs-collection.git
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory based on the `.env.example` template and add your actual credentials:
```
MONGODB_URI=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_app_password
SESSION_SECRET=your_session_secret
NODE_ENV=production
```

4. Start the development server:
```bash
npm start
```

## Deployment

### Preparing for Deployment

1. Make sure all environment variables are set up on your hosting platform (not in the code)
2. Ensure sensitive credentials are not committed to the repository
3. Set the appropriate NODE_ENV value for your production environment

### Deploying to Hosting Platforms

#### Vercel
1. Connect your GitHub repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy with the Vercel CLI or through the dashboard

#### Heroku
1. Install the Heroku CLI
2. Login to Heroku: `heroku login`
3. Create a new Heroku app: `heroku create habs-collection`
4. Set environment variables: `heroku config:set MONGODB_URI=your_mongodb_uri`
5. Push to Heroku: `git push heroku main`

#### Netlify (for frontend)
1. Connect your GitHub repository to Netlify
2. Configure environment variables in the Netlify dashboard
3. Set up build commands and publish directory
4. Deploy through the Netlify dashboard

### Post-Deployment
1. Verify all functionality works in the production environment
2. Ensure all API calls are functioning correctly
3. Check payment processing with test transactions
4. Monitor for any errors or performance issues

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Your Name - [your.email@example.com](mailto:your.email@example.com)

Project Link: [https://github.com/yourusername/habs-collection](https://github.com/yourusername/habs-collection) 