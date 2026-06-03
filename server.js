// server.js — Anburam.Digital Phase 2
// Features: MongoDB leads, Admin panel, Blog CMS

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
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// ── DATABASE ─────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── ROUTES ───────────────────────────────────────
app.use('/api/contact', require('./routes/contact'));
app.use('/api/blog',    require('./routes/blog'));
app.use('/admin',       require('./routes/admin'));

// ── HEALTH CHECK (keep-alive for Render free tier) ──
app.get('/ping', (req, res) => res.status(200).send('OK'));

// ── FRONTEND ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── START ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Anburam.Digital running on port ${PORT}`);
});

// ─────────────────────────────────────────────────
// PHASE 3 ROUTES (future):
// ─────────────────────────────────────────────────
// app.use('/api/payments', require('./routes/payments'));
// app.use('/api/ai',       require('./routes/ai'));       ← Python FastAPI
// ─────────────────────────────────────────────────
