const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  'cheatsheet-25': {
    name: 'The 25-Prompt AI Cheat Sheet',
    price: 700, // in cents
    currency: 'usd',
  },
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product, email, name } = req.body || {};

    // Validate input
    if (!product || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields: product, email, name' });
    }

    const productConfig = PRODUCTS[product];
    if (!productConfig) {
      return res.status(400).json({ error: 'Invalid product' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (name.trim().length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: productConfig.price,
      currency: productConfig.currency,
      metadata: {
        product,
        productName: productConfig.name,
        customerEmail: email,
        customerName: name,
      },
      receipt_email: email,
      description: productConfig.name,
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('create-checkout error:', err);
    return res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
};
