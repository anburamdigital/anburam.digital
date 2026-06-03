// routes/blog.js — Public blog API
const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');

// GET /api/blog — list all published posts
router.get('/', async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true })
      .select('title slug excerpt category tags coverImage createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching posts.' });
  }
});

// GET /api/blog/:slug — single post
router.get('/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching post.' });
  }
});

module.exports = router;
