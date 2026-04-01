const { createContact, getContactByEmail, updateContact, getAllContacts, getSequences } = require('../lib/db');
const { sendTemplateEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST — new subscriber (public)
  if (req.method === 'POST') {
    try {
      const { email, name, source } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const sanitizedEmail = String(email).slice(0, 200).trim().toLowerCase();
      const sanitizedName = name ? String(name).slice(0, 200).trim() : '';
      const sanitizedSource = source ? String(source).slice(0, 50) : 'direct';

      // Deduplicate by email
      const existing = await getContactByEmail(sanitizedEmail);
      if (existing) {
        // Already in system — update source tag if different, but don't create duplicate
        if (!existing.tags.includes(sanitizedSource)) {
          await updateContact(existing.id, {
            tags: [...existing.tags, sanitizedSource],
          });
        }
        return res.status(200).json({ success: true, existing: true });
      }

      // Enroll in welcome sequence
      const sequences = await getSequences();
      const welcomeSeq = sequences['subscriber-welcome'];
      let sequenceState = null;

      if (welcomeSeq && welcomeSeq.steps.length > 0) {
        sequenceState = {
          sequenceId: 'subscriber-welcome',
          stepIndex: 0,
          nextSendAt: new Date().toISOString(), // Send first email immediately
        };
      }

      const contact = await createContact({
        type: 'subscriber',
        email: sanitizedEmail,
        name: sanitizedName,
        source: sanitizedSource,
        tags: [sanitizedSource],
        sequenceState,
      });

      // Send welcome email immediately (non-blocking)
      if (welcomeSeq) {
        const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
        const vars = {
          name: sanitizedName,
          guideUrl: baseUrl + '/downloads/ai-cheat-sheet-free.pdf',
          unsubscribeUrl: baseUrl + '/unsubscribe?id=' + contact.id,
        };
        sendTemplateEmail(sanitizedEmail, 'welcome', vars).catch(err =>
          console.error('Welcome email failed:', err)
        );

        // Advance sequence to step 1
        const nextStep = welcomeSeq.steps[1];
        if (nextStep) {
          await updateContact(contact.id, {
            sequenceState: {
              sequenceId: 'subscriber-welcome',
              stepIndex: 1,
              nextSendAt: new Date(Date.now() + nextStep.delay).toISOString(),
            },
          });
        } else {
          await updateContact(contact.id, { sequenceState: null });
        }
      }

      return res.status(201).json({ success: true, contact: { id: contact.id } });
    } catch (err) {
      console.error('Create subscriber error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET — list subscribers (admin only)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    const password = process.env.ADMIN_PASSWORD || 'admin';
    if (authHeader !== `Bearer ${password}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const subscribers = await getAllContacts({ type: 'subscriber' });
      return res.status(200).json({ subscribers });
    } catch (err) {
      console.error('Get subscribers error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
