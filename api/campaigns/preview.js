const { getFilteredRecipients } = require('../../lib/db');

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
    const { audience } = req.body;
    const recipients = await getFilteredRecipients(audience || { type: 'all' });
    return res.status(200).json({
      count: recipients.length,
      recipients: recipients.slice(0, 50).map(r => ({
        email: r.email,
        name: r.name || '',
        status: r.status || '',
        type: r._isLead ? 'lead' : (r.type || ''),
      })),
    });
  } catch (err) {
    console.error('Preview audience error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
