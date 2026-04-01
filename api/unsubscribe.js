const { getContactById, updateContact } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Support both GET (email link click) and POST
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).send(unsubPage('Missing subscriber ID.', true));
  }

  const contact = await getContactById(id);
  if (!contact) {
    return res.status(404).send(unsubPage('Subscriber not found.', true));
  }

  if (contact.status === 'unsubscribed') {
    return res.status(200).send(unsubPage('You are already unsubscribed.'));
  }

  // Unsubscribe: stop sequences and mark inactive
  await updateContact(id, {
    status: 'unsubscribed',
    sequenceState: null,
  });

  return res.status(200).send(unsubPage('You have been unsubscribed. You will no longer receive emails from us.'));
};

function unsubPage(message, isError = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribe — iHelpBuild</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #08080a; color: #f0ece4; font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .card { max-width: 440px; text-align: center; }
  .icon { font-size: 2.5rem; margin-bottom: 1.5rem; }
  h1 { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: ${isError ? '#f0ece4' : '#c8a97e'}; }
  p { color: #8a8690; font-size: 0.9rem; line-height: 1.7; margin-bottom: 2rem; }
  a { display: inline-block; padding: 0.8rem 2rem; border: 1px solid rgba(255,255,255,0.08); color: #f0ece4; text-decoration: none; font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; transition: all 0.3s; }
  a:hover { background: #c8a97e; color: #08080a; border-color: #c8a97e; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? '⚠' : '✓'}</div>
    <h1>${isError ? 'Oops' : 'Unsubscribed'}</h1>
    <p>${message}</p>
    <a href="/">Back to iHelpBuild</a>
  </div>
</body>
</html>`;
}
