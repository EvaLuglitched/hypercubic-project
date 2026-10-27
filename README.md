# Hypercubic project — Digital Twin prototype

Clickable website prototype for our class project: a retiring expert builds a digital twin of their knowledge (Creation focus), based on our User Flow board, the Figma key frames (P1–P4) and the Brand Directions frame.

## Website

Live: https://evaluglitched.github.io/hypercubic-project/ (updates when `docs/` is pushed to GitHub). See [PROTOTYPE_NOTES.md](PROTOTYPE_NOTES.md) for what's in it, what's simulated, and how to run a usability session.

The site lives in [`docs/`](docs/): plain HTML, CSS and JavaScript modules, no build step.

- `docs/index.html` — page shell
- `docs/styles.css` — design tokens and styles (IBM Plex Sans / Mono, #F4F4F4, #E0E0E0, #141414, #FFFFFF)
- `docs/js/app.js` — router: which URL shows which screen
- `docs/js/views/` — one file per screen group: `auth` (sign up, log in, about you), `dashboard` (Home, Account, Settings, Help), `upload` (P1), `thinking`, `map` (P2–P4), `point` (knowledge point chat), `finish` (create twin → final validation → terms and royalties → publish)
- `docs/js/mindmap.js` — the zoomable mind map canvas
- `docs/js/tour.js` — first-time tutorial
- `docs/js/agent.js` — the simulated AI agents (where a real API would plug in)
- `docs/js/demo.js` — demo content: demo files, knowledge points, test questions. Edit this to change the story.
- `docs/js/store.js` — saved state (in the browser's localStorage)

### Run it locally

```bash
python3 -m http.server 4173 --directory docs
```

Then open http://localhost:4173. (Opening `index.html` directly from Finder won't work, because the JavaScript modules need a local server.)

## Other files

- `research/project-overview.md` — how Hypercubic works and our project brief
