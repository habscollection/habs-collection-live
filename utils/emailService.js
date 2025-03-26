const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

// Read and compile email template
const getEmailTemplate = async () => {
    const templatePath = path.join(__dirname, '../templates/order-confirmation-email.html');
    const source = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(source);
};

// Format order data for template
const formatOrderData = (order) => {
    return {
        firstName: order.customer.firstName,
        orderId: order._id,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        items: order.items.map(item => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            total: (item.price * item.quantity).toFixed(2)
        })),
        subtotal: order.subtotal.toFixed(2),
        shipping: order.total > order.subtotal ? `£${(order.total - order.subtotal).toFixed(2)}` : 'FREE',
        total: order.total.toFixed(2),
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        address: order.customer.address.line1,
        city: order.customer.address.city,
        postcode: order.customer.address.postal_code,
        country: order.customer.address.country,
        email: order.customer.email
    };
};

// Send order confirmation email
const sendOrderConfirmation = async (order) => {
    try {
        // Get email template
        const template = await getEmailTemplate();
        
        // Format order data
        const emailData = formatOrderData(order);
        
        // Generate HTML
        const html = template(emailData);
        
        // Create transporter
        const transporter = createTransporter();
        
        // Send email
        const mailOptions = {
            from: '"Habs Collection" <noreply@habscollection.com>',
            to: order.customer.email,
            subject: `Your Habs Collection Order #${order._id}`,
            html: html
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${order.customer.email}`);
        
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw error;
    }
};

module.exports = {
    sendOrderConfirmation
}; 