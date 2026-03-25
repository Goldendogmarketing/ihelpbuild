const { createLead, getAllLeads } = require('../lib/db');
const { sendNotification } = require('../lib/email');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST — create new lead
  if (req.method === 'POST') {
    try {
      const { name, email, phone, company, projectType, description, preferredDate, preferredTime, budget } = req.body;

      if (!name || !email || !projectType) {
        return res.status(400).json({ error: 'Name, email, and project type are required.' });
      }

      const lead = createLead({
        name: String(name).slice(0, 200),
        email: String(email).slice(0, 200),
        phone: phone ? String(phone).slice(0, 30) : '',
        company: company ? String(company).slice(0, 200) : '',
        projectType: String(projectType).slice(0, 100),
        description: description ? String(description).slice(0, 2000) : '',
        preferredDate: preferredDate ? String(preferredDate).slice(0, 20) : '',
        preferredTime: preferredTime ? String(preferredTime).slice(0, 20) : '',
        budget: budget ? String(budget).slice(0, 50) : '',
      });

      // Send email notification (non-blocking)
      sendNotification(lead).catch(err => console.error('Email failed:', err));

      return res.status(201).json({ success: true, lead: { id: lead.id } });
    } catch (err) {
      console.error('Create lead error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET — list all leads (admin only)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    const password = process.env.ADMIN_PASSWORD || 'admin';
    if (authHeader !== `Bearer ${password}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const leads = getAllLeads();
      return res.status(200).json({ leads });
    } catch (err) {
      console.error('Get leads error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
