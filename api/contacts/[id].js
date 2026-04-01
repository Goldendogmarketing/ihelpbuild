const { getContactById, updateContact, addContactNote, deleteContact } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check for all admin routes
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (authHeader !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  // GET — single contact
  if (req.method === 'GET') {
    const contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    return res.status(200).json({ contact });
  }

  // PUT — update contact
  if (req.method === 'PUT') {
    const { note, ...updates } = req.body;
    let contact;

    if (note) {
      contact = await addContactNote(id, String(note).slice(0, 2000));
    }

    const allowedUpdates = {};
    if (updates.status) allowedUpdates.status = String(updates.status).slice(0, 20);
    if (updates.type) allowedUpdates.type = String(updates.type).slice(0, 20);
    if (updates.name) allowedUpdates.name = String(updates.name).slice(0, 200);
    if (updates.phone) allowedUpdates.phone = String(updates.phone).slice(0, 30);
    if (updates.tags) allowedUpdates.tags = updates.tags;
    if (updates.products) allowedUpdates.products = updates.products;

    if (Object.keys(allowedUpdates).length > 0) {
      contact = await updateContact(id, allowedUpdates);
    }

    if (!contact) contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    return res.status(200).json({ contact });
  }

  // DELETE — remove contact
  if (req.method === 'DELETE') {
    const success = await deleteContact(id);
    if (!success) return res.status(404).json({ error: 'Contact not found' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
