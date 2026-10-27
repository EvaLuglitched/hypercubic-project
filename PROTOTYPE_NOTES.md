# Prototype notes

Rebuilt from scratch on Oct 26 from the User Flow board, the Figma key frames (P1–P4) and the Brand Directions frame. The previous version is in the git history (commit `fd5c4b6`). Demo categories were added on Oct 27.

## The flow

1. **Sign up** (with consent) → **About you** (your field, job title, company, years, what you know best). Or **Log in**, or **Use a demo account** (choose a field first).
2. **Dashboard** (one level above the mind map, like Photoshop's home screen). The left panel has Home, Account, Settings and Help.
   - **Home:** every twin as a card (a snapshot of its mind map, status, sources and progress), three to a row, with search. A box with a **+** creates a new one.
   - **Account:** royalty totals at the top, then profile, how royalties work, payouts and monthly statements.
   - **Settings:** text size, contrast, motion, replay the tour, reset demo data.
   - **Help:** steps, map controls, FAQ.
3. **P1 Upload:** "Upload All Relevant Documents", Upload files / drag and drop, or **Use Demo Files**. Before any demo files load, a pop-up asks **which demo to explore**: Digital Product Design or Mainframe Engineering. It preselects the field from About you, and **Change** swaps the files.
4. **Thinking......:** the Knowledge agent reads each file, then the Validate agent runs the four checks from the flow.
5. **Mind map** (P2 zoomed out, P3 zoomed in): a canvas you can pan and zoom. It opens zoomed out so the whole map fits.
   - Black circles are validated. A dashed ring means the point needs the expert. A "!" means two files disagree.
   - The right panel shows the twin name, Sources (+), Progress, and **Tasks**. **Complete** is at the bottom right.
6. **First-time tour** (offered the first time a user opens a mind map): move around, the panel, **Choose a Task** (P4: blurred map with a dashed arrow), then it walks the user through completing and validating one knowledge point.
7. **Knowledge point:** full screen, like Claude or ChatGPT.
   - The agent says what it learned, shows the source passage, and asks about the gap or the conflict.
   - The expert answers by typing, by voice, by uploading a file, or by sketching with the pen. **Connect to iPad** is at the top right.
   - Conflicts get a clarifying question with **Override** or **Refine**, then a summary and **Validate**.
   - The right panel is an outline of the conversation.
8. **Complete** → Create digital twin → **Final validation:** the expert and the twin answer the same questions, and the prototype shows a similarity score.
9. **Digital twin complete** → Try your twin / Terms and royalties / Edit knowledge → **Release / Publish** → **Live** (End).

## The demo stories

Each demo category is a made-up expert's files. The participant plays that expert and fills the gaps. Choose the one the participant can judge.

| | Digital Product Design | Mainframe Engineering |
|---|---|---|
| Expert | Design director (demo account: Lena Park) | Senior mainframe engineer (demo account: Robert Alvarez) |
| Story | Brewline, a café order-ahead app, from value proposition to launch | A nightly COBOL claims batch system |
| Files | Product brief, research synthesis, Figma flows export, design system, usability test report, handover call transcript | System diagram, runbook, code walkthrough, interview transcript |
| Map | 5 sections in workflow order: 1. Value and strategy → 2. User research → 3. Structure and flows → 4. Interface design → 5. Test and ship | 4 sections: batch operations, debugging, code and data, people and process |
| Points | 25: 16 validated, 7 gaps, 2 conflicts | 24: 15 validated, 7 gaps, 2 conflicts |
| Conflicts | Guest checkout (usability test vs. product brief), tap target sizes (usability test vs. design system) | Month-end edge cases, legacy rate tables |
| Gaps | Success metrics, recruiting participants, what was cut from version 1, when the café is too busy, prototyping, prioritizing findings, what new designers get wrong | Restart procedure, why CLMPROC runs twice, S0C7 debugging, reading a dump, feed format, on-call handover, newcomer mistakes |

The first tour task is the first conflict: **Guest checkout** in the design story, **Month-end edge cases** in the mainframe one.

## Royalties (our wording and model)

- Each published twin earns a royalty every time it answers someone. Royalties continue after the expert retires, and the expert can withdraw the twin at any time.
- The expert picks a model per twin on **Terms and royalties**:
  - **Per answer:** $0.10–$1.00 per answer.
  - **License share:** 20% of the monthly license fee.
  - An estimate updates as they change the settings.
- The same page also covers who can use the twin (team, company, licensed partners), name credit on answers, letting people ask the expert directly, topics to avoid, and consent.
- All prices, fees and the demo account's earnings are placeholders for testing.

## What's simulated

- **AI agents:** scripted in `docs/js/agent.js`.
  - Each function takes plain data and returns plain data, so a real model API can replace it later. The top of that file says where.
  - Short answers get a follow-up question. Conflicts get a clarifying question. Summaries are built from the expert's own answers.
- **Uploads:** demo files map to the demo knowledge points. For your own `.md` or `.txt` files, the prototype reads the headings and the text under them and builds points from them. PDF and DOCX files only get generic points, because the prototype can't read them.
- **Voice:** no real recording. Stopping the recorder fills in a demo transcript, which the user can edit before sending.
- **iPad:** the pairing code is fake. Sketches are drawn in the browser.
- **Twin answers** in Try your twin come from matching keywords against validated points. They show sources, say "I don't know" instead of guessing, and offer to ask the expert.
- **Data:** saved in each browser's localStorage. One account per browser.

## Running a usability session

- **Before each participant:** Settings → **Reset demo data** (also linked at the bottom of the sign-up page).
- **To test the full flow:** sign up as a new user. The tour starts the first time they open a mind map. On About you, pick the participant's field, so the demo picker suggests the right story. Use Mainframe Engineering for engineers and Digital Product Design for designers.
- **To test a returning user:** Log in → **Use a demo account** → choose Lena (design) or Robert (mainframe). Each has one twin in progress and one published, with royalties.
- **"Use example answer" buttons:** they appear wherever the participant has to type knowledge, so non-mainframe participants can still finish tasks.
- **Accessibility settings:** Settings → Text size (Standard, Large, Extra large), Contrast, Motion. The map also works with the keyboard: Tab to a circle, Enter to open it, + and − to zoom, 0 to fit, arrow keys to move.

## Not decided yet

- **Product name and logo.** "Twin Studio" and the two-circle logo mark are placeholders.
- **From Scratch** (interview without files) is left out for now, as agreed.
- **Royalty numbers.** Rates and license fees need a real pricing decision.
- **Mobile.** Designed for desktop and iPad widths. It works on a phone, but the map is cramped.
- **Public repo.** The repo is public so GitHub Pages works. Don't commit participant names, recordings or other private data.
