// routes/audit.js — Free Digital Audit: Save lead + AI Report + Customer Email
const express = require('express');
const router = express.Router();
const https = require('https');
const Lead = require('../models/Lead');

// ── AI AUDIT REPORT via OpenRouter ───────────────────────────────────────────
async function generateAuditReport(data) {
  const firstName = data.name.split(' ')[0];
  const prompt = `You are Anburam, a digital marketing consultant from Coimbatore, Tamil Nadu. You have helped 30+ local Tamil Nadu businesses get real leads online. You write like a human — direct, warm, confident. Not corporate.

A business owner just claimed their free digital audit from anburam.digital. Write their personalised audit report.

CUSTOMER DETAILS:
- First Name: ${firstName}
- Business Type: ${data.businessType}
- City: ${data.city}
- Primary Goal: ${data.goal}
- Monthly Budget: ${data.budget}
- Preferred Contact: ${data.preferredContact}
- Notes: ${data.notes || 'None'}

REPORT STRUCTURE — use these 6 headers exactly, each on its own line:

GREETING
BUSINESS SNAPSHOT
YOUR DIGITAL AUDIT FINDINGS
TOP 3 RECOMMENDATIONS
WHAT YOU CAN EXPECT
NEXT STEP

HOW TO WRITE EACH SECTION:

GREETING — 2 lines. Use ${firstName} by name. Acknowledge their specific business type in ${data.city}. Make them feel seen, not like a form submission.

BUSINESS SNAPSHOT — 3 lines. Talk about the real opportunity for their business type in Tamil Nadu right now. Mention the dream outcome — more customers, more calls, more revenue. Be specific to their city if possible. Make them feel the gap between where they are and where they could be.

YOUR DIGITAL AUDIT FINDINGS — 4 to 5 bullet points using •. Each point names a specific problem businesses like theirs face online. Frame each finding as a revenue leak — money they are losing right now because of this gap. Be specific to their business type (${data.businessType}), not generic.

TOP 3 RECOMMENDATIONS — 3 numbered items. Each must:
• Directly solve one of the findings above
• Be affordable and doable within their budget of ${data.budget}
• State the expected outcome, not just the action
• Be specific — not "run ads" but what kind of ad, targeting whom, with what message angle

WHAT YOU CAN EXPECT — 3 short lines for 30 days, 60 days, 90 days. Give realistic but motivating numbers. Tie results to their primary goal: ${data.goal}.

NEXT STEP — 2 lines max. One clear action. Include our WhatsApp number +91 97154 61981. Make it feel easy and low-risk — like the obvious next move, not a sales pitch.

STRICT RULES:
1. NO markdown — no **, *, ##, or any formatting symbols. Plain text only.
2. Bullets must use • character only.
3. Numbered lists: 1. 2. 3. — no bold, no symbols around them.
4. Never use placeholder numbers. Always use +91 97154 61981.
5. Never be generic. Every line should feel written for ${firstName}'s ${data.businessType} business in ${data.city}.
6. Write how a confident local expert talks — not how a chatbot writes.
7. Total: 350-420 words.`

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
  const fn = data.name.split(' ')[0];
  return `GREETING
${fn}, your audit request came through and I've done a quick review of what businesses like yours in ${data.city} are typically missing online. Here's what I found.

BUSINESS SNAPSHOT
${data.businessType} businesses in ${data.city} are sitting on a huge untapped opportunity right now. Most of your competitors have weak or zero online presence — which means the first one to fix that wins the majority of local customers searching online. Your goal of "${data.goal}" is 100% achievable within 90 days with the right system in place.

YOUR DIGITAL AUDIT FINDINGS
• Google Business Profile is incomplete or missing — you are invisible to customers searching "${data.businessType} near me" right now
• No consistent social media presence means potential customers check your page and leave with zero confidence in your business
• Website has no clear lead capture — visitors come and go without leaving their contact details
• Zero paid ad presence means competitors with even small budgets are taking your customers every day
• No automated follow-up system — enquiries are being lost because there is no instant response

TOP 3 RECOMMENDATIONS
1. Optimise your Google Business Profile this week — add photos, services, and a WhatsApp link. This alone can bring 5 to 10 new enquiries per month at zero cost
2. Run a hyper-local Meta ad campaign targeting ${data.city} with a budget matching your range of ${data.budget} — focused on one clear offer to get people to message you directly
3. Set up a WhatsApp auto-reply so every enquiry gets an instant response — most businesses lose leads simply because they reply too late

WHAT YOU CAN EXPECT
30 days: Google visibility improves, first leads start coming from ads and profile
60 days: Consistent 15 to 20 enquiries per month from combined organic and paid
90 days: Predictable lead flow, lower cost per lead, measurable growth toward your goal

NEXT STEP
Reply "AUDIT" on WhatsApp at +91 97154 61981 and I'll personally walk you through the exact first steps for your business — takes 15 minutes and costs you nothing.`;}

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
