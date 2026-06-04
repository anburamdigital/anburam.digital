// routes/audit.js — Free Digital Audit: Save lead + AI Report + Customer Email
const express = require('express');
const router = express.Router();
const https = require('https');
const Lead = require('../models/Lead');

// ── AI AUDIT REPORT via OpenRouter ───────────────────────────────────────────
async function generateAuditReport(data) {
  const firstName = data.name.split(' ')[0];
  const prompt = `You are a senior digital marketing consultant at Anburam.Digital, based in Coimbatore, Tamil Nadu.

A business owner submitted a free digital audit request. Write a warm, personalized audit report for them.

CUSTOMER DETAILS:
- First Name: ${firstName}
- Full Name: ${data.name}
- Business Type: ${data.businessType}
- City: ${data.city}
- Primary Goal: ${data.goal}
- Monthly Budget: ${data.budget}
- Preferred Contact: ${data.preferredContact}
- Notes: ${data.notes || 'None'}

Write the report using EXACTLY these 6 section headers on their own line, followed by the content:

GREETING
BUSINESS SNAPSHOT
YOUR DIGITAL AUDIT FINDINGS
TOP 3 RECOMMENDATIONS
WHAT YOU CAN EXPECT
NEXT STEP

STRICT RULES — follow all of these exactly:
1. NO markdown. Do not use **, *, #, ##, or any symbols for bold or headings. Plain text only.
2. Use the bullet character • (not - or *) for all bullet points.
3. For numbered lists write: 1. text (no bold, no symbols).
4. The NEXT STEP must include our real WhatsApp number: +91 97154 61981 — never use placeholder numbers.
5. Use the customer's first name (${firstName}) in the greeting.
6. Be specific to their business type (${data.businessType}) and city (${data.city}) — do not be generic.
7. Match recommendations to their budget (${data.budget}) — suggest affordable actions for low budgets.
8. Write like a real human consultant — warm, confident, conversational. No corporate jargon.
9. Total length: 300-400 words.
10. Each section header must appear on its own line with a blank line before the content.`;

  const models = [
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'openrouter/free',
  ];

  for (const model of models) {
    try {
      const payload = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.75,
      });

      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'openrouter.ai',
          path: '/api/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://anburam-digital.onrender.com',
            'X-Title': 'Anburam.Digital Audit',
            'Content-Length': Buffer.byteLength(payload),
          },
        }, res => {
          let d = '';
          res.on('data', chunk => d += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      if (result.status === 200 && result.data.choices?.[0]?.message?.content) {
        console.log(`✅ Audit AI success with: ${model}`);
        return result.data.choices[0].message.content;
      }
    } catch (e) {
      console.warn(`⚠️ Audit AI model ${model} failed: ${e.message}`);
    }
  }

  // Fallback static report if all models fail
  return `GREETING
Hi ${data.name.split(' ')[0]}, thank you for requesting your free digital audit from Anburam.Digital!

BUSINESS SNAPSHOT
As a ${data.businessType} business in ${data.city}, you're in a competitive but growing market. Tamil Nadu businesses in your sector are rapidly moving online, and there's a strong opportunity to stand out.

YOUR DIGITAL AUDIT FINDINGS
• Most local businesses lack a consistent social media presence
• Google Business Profile is either missing or not optimized
• No clear lead capture system on website or social pages
• Paid ads are either not running or not targeted correctly
• Follow-up with enquiries is manual and slow

TOP 3 RECOMMENDATIONS
1. Set up and optimize your Google Business Profile for local search visibility
2. Run targeted Meta ads focused on your city to generate quality leads
3. Create a simple WhatsApp-based follow-up system for new enquiries

WHAT YOU CAN EXPECT
30 days: Improved online visibility and first leads
60 days: Consistent enquiry flow from ads and organic
90 days: Measurable ROI and brand recognition in your area

NEXT STEP
WhatsApp us at +91 97154 61981 to discuss your custom plan. We'll review your current online presence and give you a detailed roadmap — free, no obligation.`;
}

// ── SEND AUDIT EMAIL TO CUSTOMER via Brevo ────────────────────────────────────
async function sendAuditEmail(data, reportText) {
  // Convert plain text report to styled HTML sections
  const sections = reportText.split('\n\n');
  let htmlSections = '';

  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const header = lines[0].trim();
    const bodyLines = lines.slice(1);

    const sectionHeaders = [
      'GREETING', 'BUSINESS SNAPSHOT', 'YOUR DIGITAL AUDIT FINDINGS',
      'TOP 3 RECOMMENDATIONS', 'WHAT YOU CAN EXPECT', 'NEXT STEP'
    ];

    if (sectionHeaders.includes(header)) {
      // Convert each line to styled HTML
      const formattedBody = bodyLines.map(line => {
        const t = line.trim();
        if (!t) return '';
        // Bullet point line
        if (t.startsWith('•')) {
          return `<div style="display:flex;gap:8px;margin:6px 0;"><span style="color:#a855f7;flex-shrink:0;">•</span><span>${t.slice(1).trim()}</span></div>`;
        }
        // Numbered list line
        const numMatch = t.match(/^(\d+)\. (.+)/);
        if (numMatch) {
          return `<div style="display:flex;gap:8px;margin:8px 0;"><span style="color:#a855f7;font-weight:700;flex-shrink:0;">${numMatch[1]}.</span><span>${numMatch[2]}</span></div>`;
        }
        // Regular line
        return `<p style="margin:6px 0;">${t}</p>`;
      }).join('');

      htmlSections += `
        <div style="margin-bottom:24px;">
          <div style="color:#a855f7;font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #7c3aed;padding-left:10px;">${header}</div>
          <div style="color:#e2e8f0;font-size:0.92rem;line-height:1.7;">${formattedBody}</div>
        </div>`;
    } else if (section.trim()) {
      // Regular paragraph (non-section content)
      htmlSections += `<div style="color:#e2e8f0;font-size:0.92rem;line-height:1.7;margin-bottom:16px;">${section.trim()}</div>`;
    }
  });

  const firstName = data.name.split(' ')[0];

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:12px;overflow:hidden;">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;">
      <div style="font-size:0.75rem;letter-spacing:0.15em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;">Anburam.Digital · Free Digital Audit</div>
      <h1 style="margin:0;font-size:1.5rem;color:#fff;line-height:1.3;">Your Personalized<br/>Digital Audit Report 🚀</h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">Prepared exclusively for ${data.name} · ${data.businessType} · ${data.city}</p>
    </div>

    <!-- REPORT BODY -->
    <div style="padding:32px;">
      ${htmlSections}
    </div>

    <!-- CTA SECTION -->
    <div style="padding:24px 32px;background:#111118;border-top:1px solid #1e1e2e;">
      <p style="margin:0 0 16px;font-size:0.85rem;color:#94a3b8;text-align:center;">Ready to grow your ${data.businessType} business in ${data.city}?</p>
      <div style="text-align:center;">
        <a href="https://wa.me/919715461981?text=Hi%20Anburam%2C%20I%20received%20my%20audit%20report%20and%20want%20to%20discuss%20next%20steps!" 
           style="display:inline-block;background:#25d366;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;margin-right:8px;">
          💬 WhatsApp Us
        </a>
        <a href="mailto:anburam.digital@gmail.com?subject=Audit%20Follow-up%20-%20${encodeURIComponent(data.name)}" 
           style="display:inline-block;background:#7c3aed;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;">
          📧 Email Us
        </a>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="padding:16px 32px;text-align:center;font-size:0.7rem;color:#475569;">
      Anburam.Digital · Coimbatore, Tamil Nadu · Grow Beyond Usual<br/>
      <span style="color:#334155;">+91 97154 61981 · anburam.digital@gmail.com</span>
    </div>

  </div>`;

  const payload = JSON.stringify({
    sender: { name: 'Anburam.Digital', email: 'anburam.digital@gmail.com' },
    to: [{ email: data.email, name: data.name }],
    subject: `📊 Your Free Digital Audit Report, ${firstName}! — Anburam.Digital`,
    htmlContent,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── NOTIFY YOURSELF (Telegram via n8n) ───────────────────────────────────────
async function notifyTelegram(data) {
  const payload = JSON.stringify({
    name: data.name,
    email: data.email,
    phone: data.phone || 'Not provided',
    service: data.goal,
    message: `Business: ${data.businessType} | City: ${data.city} | Budget: ${data.budget} | Contact: ${data.preferredContact} | Notes: ${data.notes || ''}`,
    source: 'free-audit',
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'n8n-5l8h.onrender.com',
      path: '/webhook/lead-alert',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => { resolve(res.statusCode); });
    req.on('error', () => resolve(0));
    req.write(payload);
    req.end();
  });
}

// ── POST /api/audit ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, businessType, city, phone, goal, budget, preferredContact, notes } = req.body;
    const name = `${firstName} ${lastName}`.trim();

    if (!name || !email || !businessType || !city) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    // 1. Save to MongoDB
    const lead = new Lead({
      name,
      email,
      phone: phone || '',
      service: goal || 'Free Audit',
      message: `Business: ${businessType} | City: ${city} | Budget: ${budget} | Contact: ${preferredContact} | Notes: ${notes || ''}`,
      source: 'free-audit',
    });
    await lead.save();
    console.log(`✅ Audit lead saved: ${name} (${email})`);

    // 2. Respond immediately so customer doesn't wait
    res.status(201).json({ success: true, message: 'Audit request received! Check your email shortly.' });

    // 3. Generate AI report + send email (background, non-blocking)
    const auditData = { name, email, businessType, city, phone, goal, budget, preferredContact, notes };

    generateAuditReport(auditData).then(report => {
      sendAuditEmail(auditData, report).then(status => {
        console.log(`📧 Audit email sent to ${email} (Brevo status: ${status})`);
      }).catch(err => {
        console.error('Audit email send failed:', err.message);
      });
    }).catch(err => {
      console.error('Audit AI report failed:', err.message);
    });

    // 4. Telegram alert to you (background)
    notifyTelegram(auditData).then(status => {
      console.log(`📱 Audit Telegram alert sent (status: ${status})`);
    }).catch(() => {});

  } catch (err) {
    console.error('Audit route error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
