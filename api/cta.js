const { getAllCTAs, createCTA } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Public GET (for frontend to fetch active CTAs)
  if (req.method === 'GET') {
    try {
      const isAdmin = req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD || 'admin'}`;
      let ctas = getAllCTAs();
      if (!isAdmin) {
        ctas = ctas.filter(c => c.active);
      }
      return res.status(200).json({ ctas });
    } catch (err) {
      console.error('Get CTAs error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Auth required for POST
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST — create new CTA
  if (req.method === 'POST') {
    try {
      const cta = createCTA(req.body);
      return res.status(201).json({ cta });
    } catch (err) {
      console.error('Create CTA error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
