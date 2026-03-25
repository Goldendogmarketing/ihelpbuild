const { getLeadById, updateLead, addNote, deleteLead } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check for all admin routes
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  // GET — single lead
  if (req.method === 'GET') {
    const lead = getLeadById(id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    return res.status(200).json({ lead });
  }

  // PUT — update lead
  if (req.method === 'PUT') {
    const { status, note, ...otherUpdates } = req.body;
    let lead;

    if (note) {
      lead = addNote(id, String(note).slice(0, 2000));
    }

    const allowedUpdates = {};
    if (status) allowedUpdates.status = String(status).slice(0, 20);
    if (otherUpdates.company) allowedUpdates.company = String(otherUpdates.company).slice(0, 200);
    if (otherUpdates.phone) allowedUpdates.phone = String(otherUpdates.phone).slice(0, 30);
    if (otherUpdates.preferredDate) allowedUpdates.preferredDate = String(otherUpdates.preferredDate).slice(0, 20);
    if (otherUpdates.preferredTime) allowedUpdates.preferredTime = String(otherUpdates.preferredTime).slice(0, 20);

    if (Object.keys(allowedUpdates).length > 0) {
      lead = updateLead(id, allowedUpdates);
    }

    if (!lead) {
      lead = getLeadById(id);
    }
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    return res.status(200).json({ lead });
  }

  // DELETE — remove lead
  if (req.method === 'DELETE') {
    const success = deleteLead(id);
    if (!success) return res.status(404).json({ error: 'Lead not found' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
