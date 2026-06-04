// routes/chat.js — AI Chatbot via OpenRouter
const express = require('express');
const router = express.Router();
const https = require('https');
const Lead = require('../models/Lead');

const SYSTEM_PROMPT = `You are an AI assistant for Anburam.Digital, a digital marketing agency based in Coimbatore, Tamil Nadu, India. Your name is "Anbu AI".

ABOUT THE AGENCY:
- Brand: Anburam.Digital | Tagline: "Grow Beyond Usual"
- Owner: Anburam, freelance digital marketer from Coimbatore
- Target clients: Gyms, salons, restaurants, clinics, interior designers across Tamil Nadu
- Email: anburam.digital@gmail.com | WhatsApp: +91 97154 61981

SERVICES & PRICING (approximate):
1. Social Media Marketing — ₹8,000–₹15,000/month (Instagram, Facebook management, content creation)
2. SEO & Content — ₹6,000–₹12,000/month (keyword research, blog, on-page SEO)
3. Lead Generation — ₹10,000–₹20,000/month (Meta/Google ads for leads)
4. Paid Ads (Meta/Google) — ₹8,000–₹18,000/month + ad spend
5. Website Development — ₹15,000–₹40,000 one-time (landing pages, business websites)
6. AI Automation — ₹12,000–₹25,000 (n8n workflows, chatbots, CRM automation)

YOUR BEHAVIOR:
- Be friendly, professional, and conversational
- Respond in the same language the user writes in (Tamil or English)
- If user writes in Tamil, reply in Tamil. If English, reply in English.
- Keep responses concise (2-4 sentences max)
- After answering 2-3 questions, gently ask for their name, business type, and what service they're interested in
- If they share contact info, acknowledge it warmly
- Always end with a helpful next step (WhatsApp, free audit, etc.)
- Never make up prices — use the ranges above
- Be enthusiastic about helping Tamil Nadu businesses grow

LEAD QUALIFICATION (after 2-3 exchanges):
Ask: "நீங்கள் என்ன type of business நடத்துகிறீர்கள்? உங்கள் பெயர் என்ன?" (if Tamil)
Or: "May I know your name and what type of business you run?" (if English)

IMPORTANT: You represent a real business. Be honest, helpful, and professional.`;

// Model fallback list
const MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'openrouter/free',
];

// Call OpenRouter with a specific model
async function callOpenRouter(model, messages) {
  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10),
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://anburam-digital.onrender.com',
        'X-Title': 'Anburam.Digital Chatbot',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { messages, leadInfo } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array required.' });
    }

    // Try each model in order until one succeeds
    let reply = null;
    let lastError = null;

    for (const model of MODELS) {
      try {
        console.log(`🤖 Trying model: ${model}`);
        const response = await callOpenRouter(model, messages);

        if (response.status === 200 && response.data.choices?.[0]?.message?.content) {
          reply = response.data.choices[0].message.content;
          console.log(`✅ Success with model: ${model}`);
          break;
        } else {
          lastError = `Model ${model} failed: ${JSON.stringify(response.data)}`;
          console.warn(`⚠️ ${lastError}`);
        }
      } catch (e) {
        lastError = `Model ${model} error: ${e.message}`;
        console.warn(`⚠️ ${lastError}`);
      }
    }

    if (!reply) {
      throw new Error('All models failed. Last error: ' + lastError);
    }

    // Auto-save lead if contact info detected
    if (leadInfo && leadInfo.name && leadInfo.email) {
      try {
        const existing = await Lead.findOne({ email: leadInfo.email });
        if (!existing) {
          await Lead.create({
            name: leadInfo.name,
            email: leadInfo.email,
            phone: leadInfo.phone || '',
            service: leadInfo.service || 'Chatbot inquiry',
            message: `Chat inquiry: ${messages[messages.length-1]?.content || ''}`,
            source: 'chatbot',
          });
          console.log(`✅ Chat lead saved: ${leadInfo.name}`);
        }
      } catch (e) {
        console.error('Chat lead save error:', e.message);
      }
    }

    res.json({ success: true, reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, message: 'Chat unavailable. Please WhatsApp us!' });
  }
});

module.exports = router;
