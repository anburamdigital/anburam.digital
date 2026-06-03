# Anburam.Digital 🚀
> **Grow Beyond Usual** — Tamil Nadu's Digital Growth Agency

Live: [anburam-digital.onrender.com](https://anburam-digital.onrender.com)

---

## Project Structure

```
anburam.digital/
├── index.html              → Main website (all-in-one HTML)
├── server.js               → Express Node.js server (Phase 2)
├── package.json            → Node.js config
├── .gitignore              → Ignores .env and node_modules
├── README.md               → This file
│
├── models/
│   ├── Lead.js             → Contact form leads (MongoDB)
│   └── BlogPost.js         → Blog CMS posts (MongoDB)
│
├── routes/
│   ├── contact.js          → POST /api/contact
│   ├── admin.js            → /admin (password protected)
│   └── blog.js             → GET /api/blog
│
└── views/
    ├── admin.html          → Admin dashboard
    └── admin-login.html    → Admin login page
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, JavaScript (single file) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (M0 Free) |
| Hosting | Render (Web Service, Free tier) |
| Auth | express-session (password protected admin) |

---

## Pages & Endpoints

| URL | Description |
|---|---|
| `/` | Main website |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard (leads + blog) |
| `/api/contact` | POST — save contact form leads |
| `/api/blog` | GET — public blog posts |
| `/ping` | Health check (keep-alive) |

---

## Environment Variables (set in Render)

```
MONGODB_URI      → MongoDB Atlas connection string
ADMIN_PASSWORD   → Admin panel password
SESSION_SECRET   → Session encryption key
```

> ⚠️ Never commit `.env` to GitHub. Set all secrets in Render dashboard.

---

## Services Offered

- Social Media Marketing
- SEO & Content
- Lead Generation
- Paid Ads (Meta / Google)
- Website Development
- AI Automation

---

## Roadmap

- [x] Phase 1 — Static website deployed on Render
- [x] Phase 2 — Node.js + MongoDB + Admin panel + Blog CMS
- [ ] Phase 3 — Python FastAPI + AI automation + Payments

---

## Contact

- 📧 anburam.digital@gmail.com
- 📱 WhatsApp: +91 97154 61981
- 📍 Coimbatore, Tamil Nadu
