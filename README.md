# PawMatch 🐾

Thailand's premium AI-powered pet matching platform. Discover verified breeders, browse pedigreed pets, and find your perfect companion via the Pet Persona quiz.

## Project Structure

```
.
├── index.html              # Landing page (hero + AI quiz + breeders + pets + FAQ)
├── pets.html               # Browse pets marketplace with filters
├── breeders.html           # Verified breeder discovery
├── README.md
├── .gitignore
│
├── scripts/
│   └── auth.js             # Shared auth modal (sign in / signup / role picker)
│
├── assets/
│   ├── favicon.svg         # Tab icon + apple-touch-icon
│   └── logos/
│       ├── logo.svg              # Primary horizontal lockup
│       ├── logo-stacked.svg      # Stacked variant + OG image
│       ├── logo-icon.svg         # Icon only, full color
│       ├── logo-icon-mono.svg    # Icon only, single-fill (currentColor)
│       └── logo-reverse.svg      # Cream-on-dark for dark backgrounds
│
└── _archive/               # Older unrelated projects, kept for reference
    ├── BUG-35/
    ├── Learning/
    └── tiktok-content-studio/
```

## Brand System

- **Primary color** — Forest `#1F3A2C`
- **Accent (heart)** — Clay `#C2674A`
- **Background** — Cream `#FBF7F1`
- **Text** — Ink `#1A1714`
- **Wordmark** — Inter 800, tracking −1.8%
- **Display** — Fraunces serif (page headings only, not the brand wordmark)
- **Thai stack** — IBM Plex Sans Thai + Sarabun

## Features

- 🐕 **Browse pets** — 12 pedigreed pets with filters, search, sort, and pet detail modal
- 🌾 **Verified breeders** — 12 audited farms with badges, region/specialty filters
- ✨ **AI Pet Matching** — 12-question Pet Persona quiz with 6 archetypes
- 📸 **IG Story share** — Auto-generated Top-3-match card in watercolor style
- 🔐 **Auth flow** — Sign in / signup / role picker (Pet seeker vs. Breeder) with Google + LINE OAuth UI
- 🌐 **Bilingual** — Full EN / ไทย support, language preference synced via localStorage
- 📱 **Mobile-first** — Safe area padding, 44px tap targets, bottom-sheet modals

## Deployment

This is a fully static site (Tailwind CDN, no build step). Deploy by uploading the entire folder (excluding `_archive/`) to any static host:

- **Netlify Drop** — drag the folder to https://app.netlify.com/drop
- **GitHub Pages** — push to `main`, enable Pages
- **Vercel / Cloudflare Pages** — connect the repo
- **Railway** — needs a `package.json` with `serve -s . -l $PORT`

## Local Development

No build step needed. Open `index.html` directly, or serve locally:

```powershell
python -m http.server 8080
# or
npx serve -l 8080
```

Then open http://localhost:8080 in a browser. On phone (same Wi-Fi), use your PC's IP.

## What's Next (Pre-Launch Checklist)

See the planning notes — top priorities:
1. Backend (Supabase recommended) with the 12 core tables
2. Real auth (Google + LINE Login)
3. PDPA + Terms + Animal Welfare policy (Thai lawyer review)
4. 10–20 real verified breeders onboarded
5. Payment integration (Omise or 2C2P for Thai market)
6. OG image as PNG (currently SVG; regenerate at 1200×630 for social previews)
