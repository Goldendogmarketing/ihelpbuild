const nodemailer = require('nodemailer');

async function sendNotification(lead) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFICATION_EMAIL, EMAIL_FROM_NAME } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFICATION_EMAIL) {
    console.log('Email not configured — skipping notification. Set SMTP env vars to enable.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
      <h1 style="color:#c8a97e;font-size:24px;margin-bottom:24px;">New Consultation Request</h1>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#8a8690;width:140px;">Name</td><td style="padding:8px 0;color:#f0ece4;">${lead.name}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Email</td><td style="padding:8px 0;color:#f0ece4;">${lead.email}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Phone</td><td style="padding:8px 0;color:#f0ece4;">${lead.phone || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Company</td><td style="padding:8px 0;color:#f0ece4;">${lead.company || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Project Type</td><td style="padding:8px 0;color:#f0ece4;">${lead.projectType}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Budget</td><td style="padding:8px 0;color:#f0ece4;">${lead.budget}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Preferred Date</td><td style="padding:8px 0;color:#f0ece4;">${lead.preferredDate}</td></tr>
        <tr><td style="padding:8px 0;color:#8a8690;">Preferred Time</td><td style="padding:8px 0;color:#f0ece4;">${lead.preferredTime}</td></tr>
      </table>
      ${lead.description ? `<div style="margin-top:20px;padding:16px;background:#1a1a1f;border-radius:6px;"><p style="color:#8a8690;margin:0 0 8px;font-size:13px;">PROJECT DETAILS</p><p style="color:#f0ece4;margin:0;line-height:1.6;">${lead.description}</p></div>` : ''}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #2a2a30;">
        <a href="${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/admin" style="display:inline-block;padding:10px 24px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;">View in CRM →</a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${EMAIL_FROM_NAME || 'iHelpBuild'}" <${SMTP_USER}>`,
    to: NOTIFICATION_EMAIL,
    subject: `New Lead: ${lead.name} — ${lead.projectType}`,
    html,
  });

  return true;
}

module.exports = { sendNotification };
