// routes/contact.js — Save leads + Brevo email + Telegram (n8n) alert
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const https = require('https');
const Lead = require('../models/Lead');

// Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN,
    pass: process.env.BREVO_KEY,
  },
});

// Send email alert to Anburam
async function sendLeadAlert(lead) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:28px 32px;">
        <h1 style="margin:0;font-size:1.4rem;color:#fff;letter-spacing:0.05em;">🔔 New Lead — Anburam.Digital</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">Someone filled your contact form</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#a855f7;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;width:120px;">Name</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;font-size:0.95rem;font-weight:600;">${lead.name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#a855f7;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;"><a href="mailto:${lead.email}" style="color:#a855f7;">${lead.email}</a></td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#a855f7;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Phone</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${lead.phone || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#a855f7;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${lead.service || 'Not specified'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#a855f7;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;vertical-align:top;">Message</td>
            <td style="padding:10px 0;line-height:1.6;">${lead.message || 'No message'}</td>
          </tr>
        </table>
        <div style="margin-top:24px;display:flex;gap:12px;">
          <a href="mailto:${lead.email}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.85rem;letter-spacing:0.05em;">REPLY NOW</a>
          <a href="https://wa.me/91${lead.phone ? lead.phone.replace(/\D/g,'') : ''}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.85rem;letter-spacing:0.05em;">WHATSAPP</a>
          <a href="https://anburam-digital.onrender.com/admin" style="display:inline-block;background:#1e1e2e;color:#a855f7;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.85rem;letter-spacing:0.05em;border:1px solid #7c3aed;">VIEW ADMIN</a>
        </div>
      </div>
      <div style="padding:16px 32px;background:#111118;text-align:center;font-size:0.72rem;color:#64748b;">
        Anburam.Digital · Coimbatore, Tamil Nadu · Grow Beyond Usual
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: '"Anburam.Digital" <ac928a001@smtp-brevo.com>',
    to: 'anburam.digital@gmail.com',
    subject: `🔔 New Lead: ${lead.name} — ${lead.service || 'General Inquiry'}`,
    html,
  });
}

// Send Telegram alert via n8n webhook
async function sendTelegramAlert(lead) {
  const payload = JSON.stringify({
    name: lead.name,
    email: lead.email,
    phone: lead.phone || 'Not provided',
    service: lead.service || 'Not specified',
    message: lead.message || 'No message',
    source: lead.source || 'website',
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'n8n-5l8h.onrender.com',
      path: '/webhook/lead-alert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => { resolve(res.statusCode); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, service, message, source } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    // Save to MongoDB
    const lead = new Lead({ name, email, phone, service, message, source: source || 'website' });
    await lead.save();
    console.log(`✅ New lead saved: ${name} (${email})`);

    // Send Brevo email alert (non-blocking)
    sendLeadAlert(lead).then(() => {
      console.log(`📧 Email alert sent for: ${name}`);
    }).catch(err => {
      console.error('Email alert failed:', err.message);
    });

    // Send Telegram alert via n8n (non-blocking)
    sendTelegramAlert(lead).then(status => {
      console.log(`📱 Telegram alert sent for: ${name} (status: ${status})`);
    }).catch(err => {
      console.error('Telegram alert failed:', err.message);
    });

    res.status(201).json({ success: true, message: 'Thanks! We will contact you shortly.' });

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
