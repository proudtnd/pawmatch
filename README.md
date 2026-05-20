# PawMatch 🐾

Thailand's premium AI-powered pet matching platform. Discover verified breeders, browse pedigreed pets, and find your perfect companion via the Pet Persona quiz.

## Project Structure

```
.
├── index.html              # Landing page (hero + AI quiz teaser + FAQ)
├── match.html              # AI Pet Matching quiz start + result
├── pets.html               # Pet marketplace (Coming Soon)
├── breeders.html           # Verified breeders (Coming Soon)
├── brand-export.html       # Brand asset generator (FB profile + cover)
├── README.md
├── .gitignore
│
├── scripts/
│   ├── auth.js             # Shared auth modal
│   └── supabase.js         # Supabase client + data helpers
│
├── assets/
│   ├── favicon.svg
│   └── logos/              # Heartpaw logo system (5 variants)
│
└── db/
    ├── schema.sql          # Postgres schema (14 tables + RLS)
    ├── seed.sql            # Bilingual breed catalog
    └── migrations/         # Incremental DB changes
```

## Brand System

- **Primary** — Forest `#1F3A2C`
- **Accent** — Clay `#C2674A`
- **Background** — Cream `#FBF7F1`
- **Wordmark** — Inter 800, tracking −1.8%
- **Display** — Fraunces serif
- **Thai stack** — IBM Plex Sans Thai + Sarabun

## Features

- ✨ **AI Pet Matching** — 12-question Pet Persona quiz with 6 archetypes
- 📸 **IG Story share** — Auto-generated Top-3-match card
- 🔐 **Google auth** via Supabase
- 🌐 **Bilingual** EN / ไทย throughout
- 📱 **Mobile-first** responsive design

## Local Development

No build step needed. Just open `index.html` in a browser, or serve locally:

```bash
python -m http.server 8080
# or
npx serve -l 8080
```

## Deployment

Fully static site. Deploy to any host that serves static files:

- **GitHub Pages** — enable in repo Settings → Pages
- **Netlify** — connect repo or drag-drop folder
- **Cloudflare Pages** — connect repo or use wrangler CLI
- **Vercel** — connect repo

## Tech Stack

- Plain HTML + Tailwind CSS (via CDN) + vanilla JS
- Supabase (Postgres + Auth + Storage)
- Hosted on a static CDN (no server-side rendering)
