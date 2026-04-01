const { getCTAById, updateCTA, deleteCTA } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    const cta = await getCTAById(id);
    if (!cta) return res.status(404).json({ error: 'CTA not found' });
    return res.status(200).json({ cta });
  }

  if (req.method === 'PUT') {
    try {
      const cta = await updateCTA(id, req.body);
      if (!cta) return res.status(404).json({ error: 'CTA not found' });
      return res.status(200).json({ cta });
    } catch (err) {
      console.error('Update CTA error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const success = await deleteCTA(id);
    if (!success) return res.status(404).json({ error: 'CTA not found' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
