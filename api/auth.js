module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  if (password === adminPassword) {
    return res.status(200).json({ success: true, token: adminPassword });
  }

  return res.status(401).json({ error: 'Invalid password' });
};
