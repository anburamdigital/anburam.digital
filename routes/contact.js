// routes/contact.js — Save leads from contact form
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// POST /api/contact — called from index.html contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const lead = new Lead({ name, email, phone, service, message });
    await lead.save();

    console.log(`✅ New lead saved: ${name} (${email})`);
    res.status(201).json({ success: true, message: 'Thanks! We will contact you shortly.' });

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
