const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
}

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

module.exports = { createLead, getAllLeads, getLeadById, updateLead, addNote, deleteLead };
