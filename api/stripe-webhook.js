const { getContactByEmail, createContact, updateContact, getSequences } = require('../lib/db');
const { sendTemplateEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Stripe webhook signature if secret is configured
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    if (webhookSecret && sig) {
      // Dynamic import to avoid requiring stripe when not configured
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const rawBody = req.body;
      event = stripe.webhooks.constructEvent(
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        sig,
        webhookSecret
      );
    } else {
      // Development mode — trust the payload
      event = req.body;
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
      const name = session.customer_details?.name || '';
      const productName = session.metadata?.product || 'Unknown Product';
      const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0';

      if (!email) {
        console.error('Stripe webhook: no email in session');
        return res.status(200).json({ received: true });
      }

      // Check if contact exists
      const existing = await getContactByEmail(email);

      if (existing) {
        // Upgrade to purchaser, add product
        const products = existing.products || [];
        if (!products.includes(productName)) products.push(productName);

        await updateContact(existing.id, {
          type: 'purchaser',
          name: name || existing.name,
          products,
          status: 'active',
        });

        // Start purchaser upsell sequence
        await enrollInUpsellSequence(existing.id, email, name, productName);
      } else {
        // Create new purchaser contact
        const sequences = await getSequences();
        const upsellSeq = sequences['purchaser-upsell'];
        let sequenceState = null;

        if (upsellSeq && upsellSeq.steps.length > 0) {
          sequenceState = {
            sequenceId: 'purchaser-upsell',
            stepIndex: 0,
            nextSendAt: new Date().toISOString(),
          };
        }

        const contact = await createContact({
          type: 'purchaser',
          email,
          name,
          source: 'stripe',
          tags: ['stripe', productName],
          products: [productName],
          sequenceState,
        });

        await enrollInUpsellSequence(contact.id, email, name, productName);
      }

      console.log(`Stripe: processed purchase of ${productName} by ${email}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return res.status(400).json({ error: 'Webhook error' });
  }
};

async function enrollInUpsellSequence(contactId, email, name, productName) {
  const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';

  // Map product names to download URLs
  // TODO: Replace with hosted URLs for paid products when ready
  const downloadUrls = {
    'AI Cheat Sheet': baseUrl + '/downloads/ai-cheat-sheet-25.pdf',
    'AI Business Blueprint': baseUrl + '/downloads/ai-business-blueprint.pdf',
  };

  // Send purchase confirmation immediately
  sendTemplateEmail(email, 'purchase-confirm', {
    name,
    productName,
    downloadUrl: downloadUrls[productName] || baseUrl + '/products',
    communityUrl: process.env.FACEBOOK_GROUP_URL || '#',
    unsubscribeUrl: baseUrl + '/unsubscribe?id=' + contactId,
  }).catch(err => console.error('Purchase confirm email failed:', err));

  // Set up upsell sequence (step 1 = upsell, sent after delay)
  const sequences = await getSequences();
  const upsellSeq = sequences['purchaser-upsell'];
  if (upsellSeq && upsellSeq.steps.length > 1) {
    await updateContact(contactId, {
      sequenceState: {
        sequenceId: 'purchaser-upsell',
        stepIndex: 1,
        nextSendAt: new Date(Date.now() + upsellSeq.steps[1].delay).toISOString(),
      },
    });
  }
}
