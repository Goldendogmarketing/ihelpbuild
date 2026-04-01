const { getSettings, updateSettings } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET is public (frontend needs settings to render CTAs)
  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      return res.status(200).json({ settings });
    } catch (err) {
      console.error('Get settings error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT requires auth (admin only)
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'PUT') {
    try {
      const settings = await updateSettings(req.body);
      return res.status(200).json({ settings });
    } catch (err) {
      console.error('Update settings error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
