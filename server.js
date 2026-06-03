// server.js — Anburam.Digital
// Currently serves static index.html
// Future: add API routes, database, blog, etc.

const express = require('express');
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Anburam.Digital running on port ${PORT}`);

  // Keep-alive ping — prevents Render free tier spin-down (pings every 14 mins)
  setInterval(() => {
    https.get('https://anburam.digital.onrender.com', (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on('error', (e) => {
      console.log(`Ping error: ${e.message}`);
    });
  }, 840000); // 14 minutes
});

// ─────────────────────────────────────────────
// FUTURE ROUTES TO ADD:
// ─────────────────────────────────────────────
// app.get('/api/leads', ...)        → fetch all leads
// app.post('/api/contact', ...)     → save contact form to DB
// app.get('/blog', ...)             → blog CMS
// app.get('/admin', ...)            → admin dashboard
// ─────────────────────────────────────────────
