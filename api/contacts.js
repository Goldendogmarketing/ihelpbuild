const { getAllContacts, getContactById, updateContact, addContactNote, deleteContact } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check for all routes
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET — list contacts with optional filters
  if (req.method === 'GET') {
    try {
      const { type, status, source } = req.query;
      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (source) filters.source = source;

      const contacts = getAllContacts(filters);
      return res.status(200).json({ contacts });
    } catch (err) {
      console.error('Get contacts error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
