const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SEQUENCES_FILE = path.join(DATA_DIR, 'sequences.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const CTA_FILE = path.join(DATA_DIR, 'cta.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]', 'utf8');
  if (!fs.existsSync(CAMPAIGNS_FILE)) fs.writeFileSync(CAMPAIGNS_FILE, '[]', 'utf8');
  if (!fs.existsSync(CTA_FILE)) fs.writeFileSync(CTA_FILE, '[]', 'utf8');
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

// ── Campaigns (email blasts) ──

function readCampaigns() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8')); } catch { return []; }
}

function writeCampaigns(campaigns) {
  ensureDataDir();
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), 'utf8');
}

function createCampaign(data) {
  const campaigns = readCampaigns();
  const campaign = {
    id: uuidv4(),
    name: data.name || 'Untitled Campaign',
    subject: data.subject || '',
    body: data.body || '',
    status: 'draft',
    audience: data.audience || { type: 'all' },
    sentCount: 0,
    failCount: 0,
    recipients: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: null,
  };
  campaigns.unshift(campaign);
  writeCampaigns(campaigns);
  return campaign;
}

function getAllCampaigns() { return readCampaigns(); }

function getCampaignById(id) {
  return readCampaigns().find(c => c.id === id) || null;
}

function updateCampaign(id, updates) {
  const campaigns = readCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCampaigns(campaigns);
  return campaigns[idx];
}

function deleteCampaign(id) {
  const campaigns = readCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);
  if (filtered.length === campaigns.length) return false;
  writeCampaigns(filtered);
  return true;
}

function getFilteredRecipients(audience) {
  const contacts = readContacts();
  const leads = readLeads();
  let recipients = [];

  const type = audience.type || 'all';
  const warmth = audience.warmth || 'all';
  const tag = audience.tag || '';

  if (type === 'all' || type === 'subscribers') {
    recipients = recipients.concat(contacts.filter(c => type === 'all' || c.type === 'subscriber'));
  }
  if (type === 'all' || type === 'purchasers') {
    recipients = recipients.concat(contacts.filter(c => c.type === 'purchaser'));
  }
  if (type === 'all' || type === 'leads') {
    recipients = recipients.concat(leads.map(l => ({ ...l, _isLead: true })));
  }

  // Remove duplicates by email
  const seen = new Set();
  recipients = recipients.filter(r => {
    const email = (r.email || '').toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  // Filter out unsubscribed
  recipients = recipients.filter(r => r.status !== 'unsubscribed');

  // Warmth filter
  if (warmth === 'hot') {
    recipients = recipients.filter(r =>
      ['engaged', 'converted', 'qualified', 'proposal', 'won', 'vip'].includes(r.status)
    );
  } else if (warmth === 'warm') {
    recipients = recipients.filter(r =>
      ['active', 'contacted'].includes(r.status)
    );
  } else if (warmth === 'cold') {
    recipients = recipients.filter(r =>
      ['new', 'lost', 'churned'].includes(r.status)
    );
  } else if (warmth === 'new') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    recipients = recipients.filter(r => r.createdAt >= sevenDaysAgo);
  }

  // Tag filter
  if (tag) {
    recipients = recipients.filter(r => r.tags && r.tags.includes(tag));
  }

  return recipients;
}

// ── CTAs (Call-to-Action management) ──

function readCTAs() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(CTA_FILE, 'utf8')); } catch { return []; }
}

function writeCTAs(ctas) {
  ensureDataDir();
  fs.writeFileSync(CTA_FILE, JSON.stringify(ctas, null, 2), 'utf8');
}

function createCTA(data) {
  const ctas = readCTAs();
  const cta = {
    id: uuidv4(),
    name: data.name || 'Untitled CTA',
    type: data.type || 'banner',
    title: data.title || '',
    subtitle: data.subtitle || '',
    buttonText: data.buttonText || 'Learn More',
    buttonUrl: data.buttonUrl || '#',
    backgroundColor: data.backgroundColor || '#c8a97e',
    textColor: data.textColor || '#08080a',
    active: data.active !== undefined ? data.active : true,
    placement: data.placement || 'all-pages',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ctas.unshift(cta);
  writeCTAs(ctas);
  return cta;
}

function getAllCTAs() { return readCTAs(); }

function getCTAById(id) {
  return readCTAs().find(c => c.id === id) || null;
}

function updateCTA(id, updates) {
  const ctas = readCTAs();
  const idx = ctas.findIndex(c => c.id === id);
  if (idx === -1) return null;
  ctas[idx] = { ...ctas[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCTAs(ctas);
  return ctas[idx];
}

function deleteCTA(id) {
  const ctas = readCTAs();
  const filtered = ctas.filter(c => c.id !== id);
  if (filtered.length === ctas.length) return false;
  writeCTAs(filtered);
  return true;
}

// ── Site Settings ──

const DEFAULT_SETTINGS = {
  // Lead Magnet Popup
  popup: {
    enabled: true,
    delaySeconds: 7,
    scrollTriggerPercent: 50,
    headline: 'Get 10 Free <em style="font-family:var(--font-display);color:var(--color-accent);">AI Prompts</em>',
    body: 'Join 500+ business owners using AI to automate, scale, and save 10+ hours every week. Delivered instantly to your inbox.',
    buttonText: 'Get Free Access',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'Your email',
    downloadUrl: '/downloads/ai-cheat-sheet-free.pdf',
  },
  // Cheat Sheet CTA Section
  cheatsheet: {
    enabled: true,
    badge: 'Free Resource',
    headline: 'Stop Talking to AI<br>Like a <span class="cheatsheet-headline-accent">Search Engine</span>',
    subtitle: 'Get the 10 prompts that turn ChatGPT, Claude, and Gemini into your most productive team member — not just another Google.',
    buttonText: 'GET THE CHEAT SHEET',
    chips: ['#1 The Role Setter', '#3 The Reverse Prompt', '#7 The SOPs Builder'],
    trustItems: ['No spam, ever', 'Unsubscribe anytime', 'Instant download'],
  },
  // Hero Section CTAs
  hero: {
    primaryButtonText: 'Start Your Project',
    primaryButtonAction: 'consultation',
    secondaryButtonText: 'Explore Services',
    secondaryButtonAction: 'scroll-capabilities',
  },
  // Bottom CTA Section
  bottomCta: {
    headline: 'Ready to build<br>something <em>extraordinary?</em>',
    body: "Whether you have a clear vision or just a spark of an idea — let's talk. Every great system starts with a conversation.",
    buttonText: 'Schedule Your Consultation',
  },
  // Nav CTA
  navCta: {
    buttonText: 'Book a Call',
    buttonAction: 'consultation',
  },
};

function getSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    // Deep merge defaults with saved to handle new fields
    return deepMerge(DEFAULT_SETTINGS, saved);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function updateSettings(updates) {
  const current = getSettings();
  const merged = deepMerge(current, updates);
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = {
  // Leads
  createLead, getAllLeads, getLeadById, updateLead, addNote, deleteLead,
  // Contacts
  createContact, getAllContacts, getContactById, getContactByEmail,
  updateContact, addContactNote, deleteContact, getContactsDueForSequence,
  getSequences,
  // Campaigns
  createCampaign, getAllCampaigns, getCampaignById, updateCampaign, deleteCampaign,
  getFilteredRecipients,
  // CTAs
  createCTA, getAllCTAs, getCTAById, updateCTA, deleteCTA,
  // Settings
  getSettings, updateSettings,
};
