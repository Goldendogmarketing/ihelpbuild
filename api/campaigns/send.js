const { getCampaignById, updateCampaign, getFilteredRecipients } = require('../../lib/db');
const { sendBlastEmail } = require('../../lib/email');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const campaign = getCampaignById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sending') return res.status(409).json({ error: 'Campaign is already sending' });
    if (!campaign.subject || !campaign.body) {
      return res.status(400).json({ error: 'Campaign must have a subject and body' });
    }

    // Get filtered recipients
    const recipients = getFilteredRecipients(campaign.audience || { type: 'all' });
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients match the selected audience filter' });
    }

    // Mark as sending
    updateCampaign(campaignId, { status: 'sending' });

    let sentCount = 0;
    let failCount = 0;
    const recipientEmails = [];

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

        await sendBlastEmail(
          recipient.email,
          campaign.subject,
          campaign.body,
          { name: recipient.name || '', unsubscribeUrl }
        );
        sentCount++;
        recipientEmails.push(recipient.email);
      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err.message);
        failCount++;
      }
    }

    // Update campaign with results
    const updated = updateCampaign(campaignId, {
      status: 'sent',
      sentCount,
      failCount,
      recipients: recipientEmails,
      sentAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      campaign: updated,
      summary: { total: recipients.length, sent: sentCount, failed: failCount },
    });
  } catch (err) {
    console.error('Send campaign error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
