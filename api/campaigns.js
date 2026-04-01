const { getAllCampaigns, createCampaign } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET — list all campaigns
  if (req.method === 'GET') {
    try {
      const campaigns = await getAllCampaigns();
      return res.status(200).json({ campaigns });
    } catch (err) {
      console.error('Get campaigns error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST — create new campaign
  if (req.method === 'POST') {
    try {
      const { name, subject, body, audience } = req.body;
      if (!name || !subject) {
        return res.status(400).json({ error: 'Name and subject are required' });
      }
      const campaign = await createCampaign({ name, subject, body, audience });
      return res.status(201).json({ campaign });
    } catch (err) {
      console.error('Create campaign error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
