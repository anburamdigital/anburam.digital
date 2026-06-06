// server.js — Anburam.Digital Phase 2 + AI Chatbot
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ── SESSION ──────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'anburam-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// ── DATABASE ─────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── ROUTES ───────────────────────────────────────
app.use('/api/contact', require('./routes/contact'));
app.use('/api/audit',   require('./routes/audit'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/blog',    require('./routes/blog'));
app.use('/api/chat',    require('./routes/chat'));
app.use('/admin',       require('./routes/admin'));

// ── PAYMENT PAGE ─────────────────────────────────
app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/payment.html'));
});

// ── CHAT PAGE ─────────────────────────────────────
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/chat.html'));
});

// ── AUDIT PAGE ────────────────────────────────────
app.get('/audit', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── GOOGLE SEARCH CONSOLE VERIFICATION ───────────
app.get('/google9570acdcc5b9208f.html', (req, res) => {
  res.send('google-site-verification: google9570acdcc5b9208f.html');
});

// ── HEALTH CHECK ──────────────────────────────────
app.get('/ping', (req, res) => res.status(200).send('OK'));

// ── FRONTEND ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── START ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Anburam.Digital running on port ${PORT}`);
});
