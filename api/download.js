const fs = require('fs');
const path = require('path');

// Import the shared token store from verify-payment
// Note: In serverless environments, this in-memory store is best-effort.
// Tokens are shared when both functions execute in the same instance.
let downloadTokens;
try {
  downloadTokens = require('./verify-payment').downloadTokens;
} catch {
  downloadTokens = new Map();
}

const PRODUCT_FILES = {
  'cheatsheet-25': {
    filename: 'ai-cheat-sheet-25.pdf',
    downloadName: 'The_25_Prompt_AI_Cheat_Sheet.pdf',
    contentType: 'application/pdf',
  },
  'ebook-blueprint': {
    filename: 'ai-business-blueprint.pdf',
    downloadName: 'The_AI_Business_Blueprint.pdf',
    contentType: 'application/pdf',
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, product } = req.query || {};

    if (!token || !product) {
      return res.status(400).json({ error: 'Missing token or product parameter' });
    }

    // Validate token
    const tokenData = downloadTokens.get(token);

    if (!tokenData) {
      return res.status(403).json({
        error: 'Invalid or expired download link. Please contact support if you need a new link.',
      });
    }

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      downloadTokens.delete(token);
      return res.status(403).json({
        error: 'Download link has expired. Please contact support for a new link.',
      });
    }

    // Check if already used
    if (tokenData.used) {
      downloadTokens.delete(token);
      return res.status(403).json({
        error: 'This download link has already been used. Please contact support for a new link.',
      });
    }

    // Verify product matches
    if (tokenData.product !== product) {
      return res.status(403).json({ error: 'Invalid product for this download link.' });
    }

    const productFile = PRODUCT_FILES[product];
    if (!productFile) {
      return res.status(400).json({ error: 'Unknown product' });
    }

    // Resolve file path
    const filePath = path.join(process.cwd(), 'downloads', productFile.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'The product file is not available yet. We are preparing your download — please check back shortly or contact support.',
      });
    }

    // Mark token as used (one-time download)
    tokenData.used = true;
    downloadTokens.delete(token);

    // Serve the file
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', productFile.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${productFile.downloadName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.status(200).send(fileBuffer);
  } catch (err) {
    console.error('download error:', err);
    return res.status(500).json({ error: 'Download failed. Please try again.' });
  }
};
