# Hypercubic project — Digital Twin prototype

Clickable website prototype for our class project: a retiring expert builds a digital twin of their knowledge (Creation focus), based on our Figma prototype frames and User Flow board.

## Website

Live: https://evaluglitched.github.io/hypercubic-project/ — see [PROTOTYPE_NOTES.md](PROTOTYPE_NOTES.md) for what's done and what still needs changes.

The site lives in [`docs/`](docs/) — plain HTML, CSS and JavaScript, no build step.

- `docs/index.html` — page shell
- `docs/styles.css` — design tokens and styles (from the Figma "Brand Directions" frame)
- `docs/app.js` — screens and flow logic
- `docs/data.js` — demo content (knowledge points, sources, chat answers). Edit this to change the story.

Open `#/map` on the site for a clickable map of every User Flow step.

### Run it locally

```bash
python3 -m http.server 4173 --directory docs
```

Then open http://localhost:4173.

## Other files

- `research/project-overview.md` — how Hypercubic works and our project brief


Put flows, Figma exports and research in their own folders at the top level (for example `flows/`, `prototype/`).
