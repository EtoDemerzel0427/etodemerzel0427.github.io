# Weiran's Universe 🌌

A personal digital garden and portfolio built with **Astro** and **React**, featuring a dynamic multi-theme system ("Universes") and automated integrations.

## ✨ Key Features

- **Framework**: Built on [Astro](https://astro.build) v5, utilizing Islands Architecture for maximum performance.
- **Dynamic Themes**: Multiple immersive themes (Cyberpunk, Noir, Retro, Bauhaus, etc.) managed via `nanostores`.
- **Interactive UI**: Rich interactive components (Music Player, Bento Grid) powered by React.
- **Automated Scoreboard**: Football scores fetched automatically via GitHub Actions (no backend required).
- **Analytics**: Google Analytics 4 integrated via **Partytown** (running in a background worker thread for zero main-thread blocking).
- **SEO Optimized**: Static HTML generation with optimized meta tags.

## 🛠 Usage Guide

### 1. Configuration (`src/config.js`)
Most content can be updated without touching code. Edit `src/config.js` to change:
- **Profile Info**: Name, Bio, Location.
- **Status**: Current emoji and status text.
- **Now Playing**: Music configuration.
- **Social Links**: GitHub, LinkedIn, etc.
- **Google Analytics**: Update your Measurement ID.

### 2. Writing Blog Posts 📝
No need to manually create files. Use the included CLI tool:

```bash
# Usage: npm run new-post "Your Post Title"
npm run new-post "My Awesome Trip to Hawaii"
```

This will:
1.  Create a file: `src/content/posts/2025-12-15-my-awesome-trip-to-hawaii.md`
2.  Pre-fill the required Frontmatter (Title, Date, Tags, etc.)
3.  Just open the file and start writing Markdown!

### 3. Development
Run the local development server:

```bash
npm run dev
# Server starts at http://localhost:4321
```

### 4. Deployment 🚀
The site is deployed to **GitHub Pages** automatically via GitHub Actions.

- **Trigger**: Every push to the `main` branch.
- **Workflow**: `.github/workflows/deploy.yml` handles the build and deploy.

### 5. Automated Scores
The automatic scoreboard updater runs via `.github/workflows/update-scores.yml`.
- **Frequency**: Every hour.
- **Secrets Required**: `FCB_API_KEY` (Football Data API) and `PAT_KEY` (Personal Access Token) must be set in repository secrets.

## 📂 Project Structure

```
├── public/             # Static assets (images, fonts, scores.json)
├── scripts/            # Automation scripts (new-post.js, fetch-scores.cjs)
├── src/
│   ├── components/     # React components (Header, BentoGrid, Cards)
│   ├── content/        # Markdown blog posts
│   ├── layouts/        # Astro layouts (Layout.astro)
│   ├── pages/          # Astro routes
│   │   ├── blog/       # Blog routes (index, [...slug])
│   │   └── index.astro # Homepage
│   ├── stores/         # State management (nanostores)
│   ├── utils/          # Helper functions (theme, dates)
│   └── config.js       # Global configuration
├── astro.config.mjs    # Astro configuration
└── tailwind.config.mjs # Tailwind CSS configuration
```

## 🎨 Themes (Universes)
- **Default**: Clean, modern.
- **Cyberpunk**: Neon, glitch effects.
- **Noir**: Monochrome, film grain.
- **Retro**: 8-bit, pixel art style.
- **Bauhaus**: Geometric, bold colors.
- ...and more!

---
*Created by [Weiran Huang](https://github.com/EtoDemerzel0427)*
