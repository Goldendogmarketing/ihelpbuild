const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ── Leads ──

async function readLeads() {
  const data = await redis.get('leads');
  return data || [];
}

async function writeLeads(leads) {
  await redis.set('leads', JSON.stringify(leads));
}

async function createLead(data) {
  const leads = await readLeads();
  const lead = {
    id: uuidv4(),
    ...data,
    status: 'new',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.unshift(lead);
  await writeLeads(leads);
  return lead;
}

async function getAllLeads() {
  return readLeads();
}

async function getLeadById(id) {
  const leads = await readLeads();
  return leads.find(l => l.id === id) || null;
}

async function updateLead(id, updates) {
  const leads = await readLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeLeads(leads);
  return leads[idx];
}

async function addNote(id, note) {
  const leads = await readLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx].notes.push({
    id: uuidv4(),
    text: note,
    createdAt: new Date().toISOString(),
  });
  leads[idx].updatedAt = new Date().toISOString();
  await writeLeads(leads);
  return leads[idx];
}

async function deleteLead(id) {
  const leads = await readLeads();
  const filtered = leads.filter(l => l.id !== id);
  if (filtered.length === leads.length) return false;
  await writeLeads(filtered);
  return true;
}

// ── Contacts (subscribers, purchasers) ──

async function readContacts() {
  const data = await redis.get('contacts');
  return data || [];
}

async function writeContacts(contacts) {
  await redis.set('contacts', JSON.stringify(contacts));
}

async function createContact(data) {
  const contacts = await readContacts();
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
  await writeContacts(contacts);
  return contact;
}

async function getAllContacts(filters = {}) {
  let contacts = await readContacts();
  if (filters.type) contacts = contacts.filter(c => c.type === filters.type);
  if (filters.status) contacts = contacts.filter(c => c.status === filters.status);
  if (filters.source) contacts = contacts.filter(c => c.source === filters.source);
  return contacts;
}

async function getContactById(id) {
  const contacts = await readContacts();
  return contacts.find(c => c.id === id) || null;
}

async function getContactByEmail(email) {
  const contacts = await readContacts();
  return contacts.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
}

async function updateContact(id, updates) {
  const contacts = await readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeContacts(contacts);
  return contacts[idx];
}

async function addContactNote(id, note) {
  const contacts = await readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx].notes.push({
    id: uuidv4(),
    text: note,
    createdAt: new Date().toISOString(),
  });
  contacts[idx].updatedAt = new Date().toISOString();
  await writeContacts(contacts);
  return contacts[idx];
}

async function deleteContact(id) {
  const contacts = await readContacts();
  const filtered = contacts.filter(c => c.id !== id);
  if (filtered.length === contacts.length) return false;
  await writeContacts(filtered);
  return true;
}

async function getContactsDueForSequence(now) {
  const contacts = await readContacts();
  return contacts.filter(c =>
    c.sequenceState &&
    c.sequenceState.nextSendAt &&
    new Date(c.sequenceState.nextSendAt) <= new Date(now)
  );
}

async function getSequences() {
  const data = await redis.get('sequences');
  return data || {};
}

// ── Campaigns (email blasts) ──

async function readCampaigns() {
  const data = await redis.get('campaigns');
  return data || [];
}

async function writeCampaigns(campaigns) {
  await redis.set('campaigns', JSON.stringify(campaigns));
}

async function createCampaign(data) {
  const campaigns = await readCampaigns();
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
  await writeCampaigns(campaigns);
  return campaign;
}

async function getAllCampaigns() { return readCampaigns(); }

async function getCampaignById(id) {
  const campaigns = await readCampaigns();
  return campaigns.find(c => c.id === id) || null;
}

async function updateCampaign(id, updates) {
  const campaigns = await readCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeCampaigns(campaigns);
  return campaigns[idx];
}

async function deleteCampaign(id) {
  const campaigns = await readCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);
  if (filtered.length === campaigns.length) return false;
  await writeCampaigns(filtered);
  return true;
}

async function getFilteredRecipients(audience) {
  const contacts = await readContacts();
  const leads = await readLeads();
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

async function readCTAs() {
  const data = await redis.get('ctas');
  return data || [];
}

async function writeCTAs(ctas) {
  await redis.set('ctas', JSON.stringify(ctas));
}

async function createCTA(data) {
  const ctas = await readCTAs();
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
  await writeCTAs(ctas);
  return cta;
}

async function getAllCTAs() { return readCTAs(); }

async function getCTAById(id) {
  const ctas = await readCTAs();
  return ctas.find(c => c.id === id) || null;
}

async function updateCTA(id, updates) {
  const ctas = await readCTAs();
  const idx = ctas.findIndex(c => c.id === id);
  if (idx === -1) return null;
  ctas[idx] = { ...ctas[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeCTAs(ctas);
  return ctas[idx];
}

async function deleteCTA(id) {
  const ctas = await readCTAs();
  const filtered = ctas.filter(c => c.id !== id);
  if (filtered.length === ctas.length) return false;
  await writeCTAs(filtered);
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

async function getSettings() {
  try {
    const saved = await redis.get('settings');
    if (!saved) return { ...DEFAULT_SETTINGS };
    // Deep merge defaults with saved to handle new fields
    return deepMerge(DEFAULT_SETTINGS, saved);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function updateSettings(updates) {
  const current = await getSettings();
  const merged = deepMerge(current, updates);
  await redis.set('settings', JSON.stringify(merged));
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
