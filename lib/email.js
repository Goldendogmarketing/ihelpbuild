const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ── Existing: Admin notification for new consultation leads ──

async function sendNotification(lead) {
  const { NOTIFICATION_EMAIL, EMAIL_FROM_NAME, SMTP_USER } = process.env;
  const transporter = getTransporter();

  if (!transporter || !NOTIFICATION_EMAIL) {
    console.log('Email not configured — skipping notification. Set SMTP env vars to enable.');
    return false;
  }

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

// ── New: Template-based emails for sequences ──

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Your Free AI Prompts Are Here 🎯',
    html: (vars) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#c8a97e;font-size:28px;margin:0;">Welcome to iHelpBuild</h1>
          <p style="color:#8a8690;margin:8px 0 0;font-size:15px;">Your journey to a smarter business starts now</p>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Hey${vars.name ? ' ' + vars.name : ''},</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Thanks for grabbing the <strong style="color:#c8a97e;">10 Free AI Prompts</strong> that are helping business owners automate, scale, and save hours every week.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.guideUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;">Download Your Guide →</a>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Over the next few days, I'll share some insider tips on how to get the most out of these prompts — and show you what's possible when you go deeper.</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Talk soon,<br><strong style="color:#c8a97e;">The iHelpBuild Team</strong></p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;">You're receiving this because you signed up at ihelpbuild.com<br><a href="${vars.unsubscribeUrl || '#'}" style="color:#8a8690;">Unsubscribe</a></p>
        </div>
      </div>`,
  },

  'drip-1': {
    subject: 'The #1 prompt that saves business owners 5+ hours/week',
    html: (vars) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
        <h1 style="color:#c8a97e;font-size:24px;margin-bottom:24px;">The Power Prompt</h1>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Hey${vars.name ? ' ' + vars.name : ''},</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Yesterday you grabbed our free AI prompts. Today I want to show you the <strong style="color:#c8a97e;">single most powerful prompt</strong> from the collection — and how to use it.</p>
        <div style="margin:24px 0;padding:20px;background:#1a1a1f;border-left:3px solid #c8a97e;border-radius:4px;">
          <p style="color:#f0ece4;margin:0;line-height:1.7;font-size:15px;font-style:italic;">"Act as a business operations consultant. Analyze my current workflow for [YOUR PROCESS] and identify the top 3 bottlenecks. For each bottleneck, provide an automation solution I can implement this week."</p>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">This single prompt has helped our clients identify thousands in wasted time. But what if you had <strong>47 more</strong> like this, organized by business function?</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.cheatSheetUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;">Get the Full Cheat Sheet — $7 →</a>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Talk soon,<br><strong style="color:#c8a97e;">The iHelpBuild Team</strong></p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;"><a href="${vars.unsubscribeUrl || '#'}" style="color:#8a8690;">Unsubscribe</a></p>
        </div>
      </div>`,
  },

  'drip-2': {
    subject: 'From prompts to systems: the complete playbook',
    html: (vars) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
        <h1 style="color:#c8a97e;font-size:24px;margin-bottom:24px;">Ready to Go Deeper?</h1>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Hey${vars.name ? ' ' + vars.name : ''},</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Prompts are powerful. But building <strong style="color:#c8a97e;">complete AI-powered systems</strong> for your business? That's where the real transformation happens.</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Our comprehensive ebook covers:</p>
        <ul style="color:#f0ece4;line-height:2;font-size:15px;">
          <li>How to audit your business for AI opportunities</li>
          <li>Step-by-step automation blueprints</li>
          <li>Real case studies from businesses like yours</li>
          <li>The tech stack that actually works (no fluff)</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.ebookUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;">Get the Ebook — $27 →</a>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Talk soon,<br><strong style="color:#c8a97e;">The iHelpBuild Team</strong></p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;"><a href="${vars.unsubscribeUrl || '#'}" style="color:#8a8690;">Unsubscribe</a></p>
        </div>
      </div>`,
  },

  'purchase-confirm': {
    subject: 'Your purchase is confirmed ✓',
    html: (vars) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;width:60px;height:60px;background:#c8a97e;border-radius:50%;line-height:60px;font-size:28px;">✓</div>
          <h1 style="color:#c8a97e;font-size:28px;margin:16px 0 0;">Purchase Confirmed</h1>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Hey${vars.name ? ' ' + vars.name : ''},</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Thank you for purchasing <strong style="color:#c8a97e;">${vars.productName || 'your product'}</strong>. You made a great decision.</p>
        ${vars.downloadUrl ? `<div style="text-align:center;margin:32px 0;"><a href="${vars.downloadUrl}" style="display:inline-block;padding:14px 36px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;">Access Your Purchase →</a></div>` : ''}
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Want to connect with other business owners on the same journey? Join our free community:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${vars.communityUrl || '#'}" style="display:inline-block;padding:12px 28px;border:1px solid #c8a97e;color:#c8a97e;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Join the Community →</a>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Talk soon,<br><strong style="color:#c8a97e;">The iHelpBuild Team</strong></p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;"><a href="${vars.unsubscribeUrl || '#'}" style="color:#8a8690;">Unsubscribe</a></p>
        </div>
      </div>`,
  },

  'upsell-1': {
    subject: 'Want to go from DIY to done-with-you?',
    html: (vars) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ece4;padding:40px;border-radius:8px;">
        <h1 style="color:#c8a97e;font-size:24px;margin-bottom:24px;">Take It to the Next Level</h1>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Hey${vars.name ? ' ' + vars.name : ''},</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">You've taken the first step with <strong style="color:#c8a97e;">${vars.lastProduct || 'our resources'}</strong>. Now imagine having a guided path to implement everything — with expert support.</p>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Our course and masterclass options give you:</p>
        <ul style="color:#f0ece4;line-height:2;font-size:15px;">
          <li>Step-by-step video training</li>
          <li>Live Q&A sessions</li>
          <li>Implementation templates</li>
          <li>Direct access to our team</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.productsUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#c8a97e;color:#08080a;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;">View All Options →</a>
        </div>
        <p style="color:#f0ece4;line-height:1.7;font-size:15px;">Talk soon,<br><strong style="color:#c8a97e;">The iHelpBuild Team</strong></p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;"><a href="${vars.unsubscribeUrl || '#'}" style="color:#8a8690;">Unsubscribe</a></p>
        </div>
      </div>`,
  },
};

async function sendTemplateEmail(to, templateId, vars = {}) {
  const { EMAIL_FROM_NAME, SMTP_USER } = process.env;
  const transporter = getTransporter();

  if (!transporter) {
    console.log('Email not configured — skipping template email.');
    return false;
  }

  const template = EMAIL_TEMPLATES[templateId];
  if (!template) {
    console.error(`Unknown email template: ${templateId}`);
    return false;
  }

  await transporter.sendMail({
    from: `"${EMAIL_FROM_NAME || 'iHelpBuild'}" <${SMTP_USER}>`,
    to,
    subject: template.subject,
    html: template.html(vars),
  });

  return true;
}

module.exports = { sendNotification, sendTemplateEmail };
