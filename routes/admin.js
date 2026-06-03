// routes/admin.js — Password-protected admin panel
const express = require('express');
const router = express.Router();
const path = require('path');
const Lead = require('../models/Lead');
const BlogPost = require('../models/BlogPost');

// Simple session-based auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// GET /admin/login — login page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, '../views/admin-login.html'));
});

// POST /admin/login — authenticate
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Wrong password.' });
  }
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// GET /admin — dashboard
router.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

// ── LEADS API ──────────────────────────────────────

// GET /admin/api/leads
router.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// PATCH /admin/api/leads/:id — update status/notes
router.patch('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// DELETE /admin/api/leads/:id
router.delete('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── BLOG API ───────────────────────────────────────

// GET /admin/api/blog — all posts (including drafts)
router.get('/api/blog', requireAuth, async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// POST /admin/api/blog — create post
router.post('/api/blog', requireAuth, async (req, res) => {
  try {
    const post = new BlogPost(req.body);
    await post.save();
    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /admin/api/blog/:id — update post
router.patch('/api/blog/:id', requireAuth, async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// DELETE /admin/api/blog/:id
router.delete('/api/blog/:id', requireAuth, async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
