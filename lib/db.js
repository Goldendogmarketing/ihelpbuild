const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SEQUENCES_FILE = path.join(DATA_DIR, 'sequences.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]', 'utf8');
}

// ── Leads (existing, unchanged) ──

function readLeads() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  ensureDataDir();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

function createLead(data) {
  const leads = readLeads();
  const lead = {
    id: uuidv4(),
    ...data,
    status: 'new',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.unshift(lead);
  writeLeads(leads);
  return lead;
}

function getAllLeads() {
  return readLeads();
}

function getLeadById(id) {
  return readLeads().find(l => l.id === id) || null;
}

function updateLead(id, updates) {
  const leads = readLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  writeLeads(leads);
  return leads[idx];
}

function addNote(id, note) {
  const leads = readLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx].notes.push({
    id: uuidv4(),
    text: note,
    createdAt: new Date().toISOString(),
  });
  leads[idx].updatedAt = new Date().toISOString();
  writeLeads(leads);
  return leads[idx];
}

function deleteLead(id) {
  const leads = readLeads();
  const filtered = leads.filter(l => l.id !== id);
  if (filtered.length === leads.length) return false;
  writeLeads(filtered);
  return true;
}

// ── Contacts (subscribers, purchasers) ──

function readContacts() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeContacts(contacts) {
  ensureDataDir();
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf8');
}

function createContact(data) {
  const contacts = readContacts();
  const contact = {
    id: uuidv4(),
    type: data.type || 'subscriber',
    email: data.email,
    name: data.name || '',
    phone: data.phone || '',
    tags: data.tags || [],
    status: data.status || 'active',
    source: data.source || 'direct',
    products: data.products || [],
    sequenceState: data.sequenceState || null,
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  contacts.unshift(contact);
  writeContacts(contacts);
  return contact;
}

function getAllContacts(filters = {}) {
  let contacts = readContacts();
  if (filters.type) contacts = contacts.filter(c => c.type === filters.type);
  if (filters.status) contacts = contacts.filter(c => c.status === filters.status);
  if (filters.source) contacts = contacts.filter(c => c.source === filters.source);
  return contacts;
}

function getContactById(id) {
  return readContacts().find(c => c.id === id) || null;
}

function getContactByEmail(email) {
  return readContacts().find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
}

function updateContact(id, updates) {
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...updates, updatedAt: new Date().toISOString() };
  writeContacts(contacts);
  return contacts[idx];
}

function addContactNote(id, note) {
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx].notes.push({
    id: uuidv4(),
    text: note,
    createdAt: new Date().toISOString(),
  });
  contacts[idx].updatedAt = new Date().toISOString();
  writeContacts(contacts);
  return contacts[idx];
}

function deleteContact(id) {
  const contacts = readContacts();
  const filtered = contacts.filter(c => c.id !== id);
  if (filtered.length === contacts.length) return false;
  writeContacts(filtered);
  return true;
}

function getContactsDueForSequence(now) {
  const contacts = readContacts();
  return contacts.filter(c =>
    c.sequenceState &&
    c.sequenceState.nextSendAt &&
    new Date(c.sequenceState.nextSendAt) <= new Date(now)
  );
}

function getSequences() {
  try {
    return JSON.parse(fs.readFileSync(SEQUENCES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = {
  // Leads (existing)
  createLead, getAllLeads, getLeadById, updateLead, addNote, deleteLead,
  // Contacts (new)
  createContact, getAllContacts, getContactById, getContactByEmail,
  updateContact, addContactNote, deleteContact, getContactsDueForSequence,
  getSequences,
};
