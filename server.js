// server.js — Anburam.Digital
// Currently serves static index.html
// Future: add API routes, database, blog, etc.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check — used by cron-job.org to keep Render free tier alive
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Anburam.Digital running on port ${PORT}`);
});

// ─────────────────────────────────────────────
// FUTURE ROUTES TO ADD:
// ─────────────────────────────────────────────
// app.get('/api/leads', ...)        → fetch all leads
// app.post('/api/contact', ...)     → save contact form to DB
// app.get('/blog', ...)             → blog CMS
// app.get('/admin', ...)            → admin dashboard
// ─────────────────────────────────────────────
