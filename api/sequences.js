const { getContactsDueForSequence, getSequences, updateContact } = require('../lib/db');
const { sendTemplateEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Only allow GET (Vercel Cron calls GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret if configured (Vercel sends this header)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();
    const dueContacts = getContactsDueForSequence(now);
    const sequences = getSequences();
    const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';

    let processed = 0;
    let errors = 0;

    for (const contact of dueContacts) {
      const { sequenceState } = contact;
      const sequence = sequences[sequenceState.sequenceId];

      if (!sequence) {
        // Unknown sequence — clear it
        updateContact(contact.id, { sequenceState: null });
        continue;
      }

      const step = sequence.steps[sequenceState.stepIndex];
      if (!step) {
        // No more steps — sequence complete
        updateContact(contact.id, { sequenceState: null });
        continue;
      }

      // Build template variables
      const vars = {
        name: contact.name,
        guideUrl: baseUrl + '/free-guide',
        cheatSheetUrl: baseUrl + '/products',
        ebookUrl: baseUrl + '/products',
        productsUrl: baseUrl + '/products',
        communityUrl: process.env.FACEBOOK_GROUP_URL || '#',
        lastProduct: contact.products?.length > 0 ? contact.products[contact.products.length - 1] : '',
        unsubscribeUrl: baseUrl + '/unsubscribe?id=' + contact.id,
      };

      try {
        await sendTemplateEmail(contact.email, step.templateId, vars);
        processed++;

        // Advance to next step or complete sequence
        const nextIndex = sequenceState.stepIndex + 1;
        const nextStep = sequence.steps[nextIndex];

        if (nextStep) {
          updateContact(contact.id, {
            sequenceState: {
              sequenceId: sequenceState.sequenceId,
              stepIndex: nextIndex,
              nextSendAt: new Date(Date.now() + nextStep.delay).toISOString(),
            },
          });
        } else {
          // Sequence complete
          updateContact(contact.id, { sequenceState: null });
        }
      } catch (err) {
        console.error(`Sequence email failed for ${contact.email}:`, err);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      errors,
      total: dueContacts.length,
    });
  } catch (err) {
    console.error('Sequence runner error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
