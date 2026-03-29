const { getCampaignById, updateCampaign, deleteCampaign } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  // GET — get single campaign
  if (req.method === 'GET') {
    const campaign = getCampaignById(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    return res.status(200).json({ campaign });
  }

  // PUT — update campaign
  if (req.method === 'PUT') {
    try {
      const updates = req.body;
      const campaign = updateCampaign(id, updates);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      return res.status(200).json({ campaign });
    } catch (err) {
      console.error('Update campaign error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE — delete campaign
  if (req.method === 'DELETE') {
    const success = deleteCampaign(id);
    if (!success) return res.status(404).json({ error: 'Campaign not found' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
