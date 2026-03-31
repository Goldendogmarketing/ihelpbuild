const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const { getContactByEmail, createContact, updateContact, getSequences } = require('../lib/db');

// In-memory token store with 10-minute expiry
// Note: In a serverless environment each invocation may run on a different instance,
// so this is best-effort. For production, use a database or Redis.
const downloadTokens = new Map();

const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of downloadTokens) {
    if (now > data.expiresAt) {
      downloadTokens.delete(token);
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentIntentId } = req.body || {};

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment has not succeeded. Status: ' + paymentIntent.status,
      });
    }

    // Generate download token
    cleanExpiredTokens();
    const downloadToken = uuidv4();
    const product = paymentIntent.metadata.product || 'cheatsheet-25';

    downloadTokens.set(downloadToken, {
      product,
      paymentIntentId,
      expiresAt: Date.now() + TOKEN_EXPIRY_MS,
      used: false,
    });

    // Create/update contact in CRM (same pattern as stripe-webhook.js)
    const email = (paymentIntent.metadata.customerEmail || paymentIntent.receipt_email || '').toLowerCase();
    const name = paymentIntent.metadata.customerName || '';
    const productName = paymentIntent.metadata.productName || 'AI Cheat Sheet';

    if (email) {
      try {
        const existing = getContactByEmail(email);

        if (existing) {
          const products = existing.products || [];
          if (!products.includes(productName)) products.push(productName);

          updateContact(existing.id, {
            type: 'purchaser',
            name: name || existing.name,
            products,
            status: 'active',
          });
        } else {
          const sequences = getSequences();
          const upsellSeq = sequences['purchaser-upsell'];
          let sequenceState = null;

          if (upsellSeq && upsellSeq.steps && upsellSeq.steps.length > 0) {
            sequenceState = {
              sequenceId: 'purchaser-upsell',
              stepIndex: 0,
              nextSendAt: new Date().toISOString(),
            };
          }

          createContact({
            type: 'purchaser',
            email,
            name,
            source: 'checkout',
            tags: ['checkout', productName],
            products: [productName],
            sequenceState,
          });
        }
      } catch (dbErr) {
        // Don't fail the payment verification if CRM update fails
        console.error('CRM update error:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      downloadToken,
    });
  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
};

// Export the token store so download.js can access it
module.exports.downloadTokens = downloadTokens;
