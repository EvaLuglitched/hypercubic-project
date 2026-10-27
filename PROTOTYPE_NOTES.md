# Prototype notes

Live site: https://evaluglitched.github.io/hypercubic-project/ · Flow map: [`#/map`](https://evaluglitched.github.io/hypercubic-project/#/map)

## What was done

- Built a clickable website prototype in `docs/` (HTML/CSS/JS, no build step), hosted on GitHub Pages.
- Screens follow our Figma frames: Login / Registration, Dashboard / Add Knowledge, Desktop 2 (upload), Desktop 1 and 3 (mind map with the Twin Name / Sources / Progress panel), Knowledge Point complete vs. incomplete, and Components.
- Navigation follows our User Flow board end to end: registration or login → start session → upload, text input or from scratch → Knowledge Agent and Validate Agent checks → brain graph → edit knowledge points (type, voice an inconsistency, iPad sketch or photo, marking) → clarifying question with Refine or Override → Complete → create the digital twin → final validation (agent vs. user answer, similarity score) → terms and usage, test chat, edit → release → end.
- Added patterns from our literature review: consent at sign-up, an "AI" label on the twin, citations on every answer, caveats and "I don't know" answers, and flag / escalate to the expert.
- Added `#/map`, a clickable version of the user flow for jumping to any step during usability testing.
- Added our project overview to `research/project-overview.md`.

## Not confirmed / needs changes

- **Direction and topic.** The demo content (a senior mainframe engineer, claims batch system) is a placeholder chosen to fit Hypercubic. Change it in `docs/data.js` if we pick another direction (craft, design software, family history, personal work twin).
- **Focus.** The prototype assumes **Creation** (the expert builds the twin). The user side (Interaction) is only covered by the test chat.
- **Product name and logo.** "Twin Studio" and the logo mark are temporary.
- **Screens with no Figma design yet.** Digital Twin, Validation and Terms / Publish were built from the user flow in the same black-and-white style. The sticky note on the Dashboard frame says these tabs were still missing and asks to "add delight" to the dashboard. Both need design review.
- **Login page copy.** The Figma frame still had template text ("Whoa, new look", "How we keep your money safe"). It was replaced with our own copy, which needs review.
- **Brand.** Only the basic colors (off-white, black, white) and font (IBM Plex Sans) from "Brand Directions" were used. No final type scale or accent color yet.
- **Flow details to confirm:**
  - The flow map shows a third option next to "Enter to Use / Test" and "Set up terms and usage". It was read as "Edit".
  - In the flow, "Learn the tool" leads into "Start session". It's implemented as an optional 3-step tour.
  - "From scratch" currently jumps to one empty knowledge point. The interview-style experience isn't designed yet.
- **Fake behavior.** Nothing is real AI or a real backend:
  - Agent checks, conflicts and the similarity score are scripted.
  - Chat answers are canned.
  - Uploads only keep file names.
  - Progress is saved in each visitor's browser (use "Reset demo data" between test participants).
- **Mobile.** Designed for desktop (1440 wide). It works on phones, but the brain graph is cramped.
- **Public repo.** The repo is public so GitHub Pages works. Don't commit participant names, recordings or other private data.
