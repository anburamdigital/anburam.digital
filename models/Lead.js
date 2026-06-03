// models/Lead.js — Contact form submissions & leads
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  phone:   { type: String, trim: true },
  service: { type: String, trim: true }, // Which service they're interested in
  message: { type: String, trim: true },
  source:  { type: String, default: 'website' }, // website / whatsapp / referral
  status:  { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new' },
  notes:   { type: String }, // Admin notes
}, { timestamps: true }); // adds createdAt, updatedAt automatically

module.exports = mongoose.model('Lead', LeadSchema);
