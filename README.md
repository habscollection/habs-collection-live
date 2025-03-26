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
- Express.js server
- Apache web server (for production)

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

### AWS Lightsail Deployment

1. **Create an AWS Lightsail Instance**:
   - Choose a Linux/Unix platform with the LAMP stack blueprint
   - Select an appropriate instance plan
   - Create a static IP and attach it to your instance

2. **Access Your Instance**:
   - Connect to your instance using SSH
   - Navigate to the web directory: `cd /var/www/html`

3. **Clone Your Repository**:
   ```bash
   sudo git clone https://github.com/yourusername/habs-collection.git
   cd habs-collection
   ```

4. **Install Node.js and npm**:
   ```bash
   curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

5. **Install Dependencies**:
   ```bash
   npm install
   ```

6. **Set Up Environment Variables**:
   ```bash
   sudo nano .env
   ```
   Add your production environment variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   EMAIL_USER=your_email@example.com
   EMAIL_PASSWORD=your_email_app_password
   SESSION_SECRET=your_session_secret
   NODE_ENV=production
   PORT=5501
   ```

7. **Install PM2 to Manage Your Node.js Application**:
   ```bash
   sudo npm install -g pm2
   pm2 start scripts/server.js
   pm2 startup
   pm2 save
   ```

8. **Configure Apache**:
   - Enable required modules:
     ```bash
     sudo a2enmod proxy proxy_http rewrite
     ```
   
   - Create a new virtual host configuration:
     ```bash
     sudo nano /etc/apache2/sites-available/habs-collection.conf
     ```
     
   - Add the following configuration:
     ```apache
     <VirtualHost *:80>
         ServerAdmin webmaster@yourdomain.com
         ServerName yourdomain.com
         ServerAlias www.yourdomain.com
         DocumentRoot /var/www/html/habs-collection

         # Direct access to static files
         <Directory /var/www/html/habs-collection>
             Options Indexes FollowSymLinks
             AllowOverride All
             Require all granted
         </Directory>

         # Proxy API requests to Node.js server
         ProxyRequests Off
         ProxyPreserveHost On
         ProxyVia Full
         
         <Location /api>
             ProxyPass http://127.0.0.1:5501/api
             ProxyPassReverse http://127.0.0.1:5501/api
         </Location>
         
         <Location /create-payment-intent>
             ProxyPass http://127.0.0.1:5501/create-payment-intent
             ProxyPassReverse http://127.0.0.1:5501/create-payment-intent
         </Location>
         
         <Location /payment-success>
             ProxyPass http://127.0.0.1:5501/payment-success
             ProxyPassReverse http://127.0.0.1:5501/payment-success
         </Location>

         ErrorLog ${APACHE_LOG_DIR}/error.log
         CustomLog ${APACHE_LOG_DIR}/access.log combined
     </VirtualHost>
     ```

9. **Enable the Site and Restart Apache**:
   ```bash
   sudo a2ensite habs-collection.conf
   sudo a2dissite 000-default.conf
   sudo systemctl restart apache2
   ```

10. **Set Up SSL with Let's Encrypt** (optional but recommended):
    ```bash
    sudo apt-get install certbot python3-certbot-apache
    sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
    ```

11. **Update DNS Settings**:
    - Point your domain to the static IP of your Lightsail instance

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