const express = require('express');
const router = express.Router();
require('dotenv').config();

// Route to safely provide the Stripe publishable key to the client
router.get('/config', (req, res) => {
  // Only expose the publishable key, never the secret key
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

module.exports = router; 