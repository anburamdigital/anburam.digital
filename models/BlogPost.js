// models/BlogPost.js — Blog CMS
const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt:   { type: String, trim: true },   // Short summary shown in listing
  content:   { type: String, required: true }, // Full HTML content
  category:  { type: String, trim: true },   // SEO, Social Media, Paid Ads, etc.
  tags:      [{ type: String }],
  published: { type: Boolean, default: false },
  coverImage:{ type: String },               // URL of cover image
}, { timestamps: true });

// Auto-generate slug from title if not provided
BlogPostSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
