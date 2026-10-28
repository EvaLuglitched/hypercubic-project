# Prototype notes

Rebuilt from scratch on Oct 26 from the User Flow board, the Figma key frames (P1–P4) and the Brand Directions frame. The previous version is in the git history (commit `fd5c4b6`). Demo categories were added on Oct 27, and later that day knowledge points became document pages built from several projects.

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
   - Black circles are validated. A white circle with a dashed ring needs the expert, and a slow ripple draws the eye to it (it stops when Motion is set to reduced). A "!" means two files or two projects disagree.
   - Small grey dots around a circle are the projects that point was found in. The point's pop-up names them.
   - Zoomed out, outlines and lines keep their on-screen thickness, so the points, the centre circle and the lines stay crisp. Section names move to a spot where they don't cover a point.
   - The right panel shows the twin name, Sources (+), Progress, and **Tasks**. **Complete** is at the bottom right.
6. **First-time tour** (offered the first time a user opens a mind map): move around, the panel, **Choose a Task** (P4: blurred map with a dashed arrow), then it walks the user through one knowledge point: reading the page, answering the yellow note, commenting, and Validate.
7. **Knowledge point:** a full-screen page about one part of the process, like a Notion document (P4), not a chat.
   - Sections: **Summary, Challenge, Why, How, Solution**, written in general terms, not about one project. Examples from each project are folded under the part they show, and figures (process steps, bar charts, a journey curve, a priority matrix, sizes at real scale, tables, file excerpts) sit between the text.
   - Where the files say nothing, or two projects or files differ, the agent leaves a **yellow note**. The expert answers under it and presses ✓; the agent checks it and adds it to the page. When two files disagree, it asks **Keep my answer** or **Edit my answer**. **Use example answer** fills in an answer for testing.
   - **Select any text → Comment.** A few words on a few words replace the selection ("should be 48 points"), a question becomes a new note to answer, and anything else is added to the paragraph. Commented words stay underlined; click them to see the comment and **Resolve** it.
   - At the bottom: **Type** (edit the page in place), **Chat** and **Voice** (pop-up windows; what you say answers the open note, or goes where it fits), and **Pen** (sketch or highlight; the drawing goes into the page). **Validate** goes back to the mind map, focused on the point.
   - The left rail shows the outline, the section, the projects, the sources and related points. Connect to iPad and Next task were removed.
8. **Complete** → Create digital twin → **Final validation:** the expert and the twin answer the same questions, and the prototype shows a similarity score.
9. **Digital twin complete** → Try your twin / Terms and royalties / Edit knowledge → **Release / Publish** → **Live** (End).

## The demo stories

Each demo category is a made-up expert's files. The participant plays that expert and fills the gaps. Choose the one the participant can judge.

| | Digital Product Design | Mainframe Engineering |
|---|---|---|
| Expert | Design director at a studio (demo account: Lena Park) | Senior mainframe engineer (demo account: Robert Alvarez) |
| Projects | Brewline (café ordering app), Ledger (banking dashboard for small shops), Atlas (museum guide app) | Claims batch (nightly, CLMPROC), Billing batch (monthly, BILLRUN) |
| Twin | Product Design Practice: how she works, from value proposition to launch | Batch Systems Support: restarts, abends, month-end and who to call |
| Files | 9: Brewline brief, research synthesis, Figma flows, design system and usability test; Ledger case study and usability report; Atlas case study; a handover call | 5: claims system diagram, claims runbook, code walkthrough, billing runbook, interview transcript |
| Map | 5 sections in workflow order: 1. Value and strategy → 2. User research → 3. Structure and flows → 4. Interface design → 5. Test and ship | 4 sections: batch operations, debugging, code and data, people and process |
| Points | 24: 16 validated, 7 gaps, 1 where projects differ | 24: 15 validated, 7 gaps, 2 where files disagree |
| Differ or disagree | Tap target sizes (Brewline 44 pt, Ledger 32 px: why?) | Month-end edge cases, legacy rate tables |
| Gaps | Success metrics, recruiting participants, scoping the first release, designing for the rush, prototyping, prioritizing findings, what new designers get wrong | Restart procedure, why CLMPROC runs twice, S0C7 debugging, reading a dump, feed format, on-call handover, newcomer mistakes |

The first tour task is the first conflict: **Tap target sizes** in the design story, **Month-end edge cases** in the mainframe one.

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
  - Short answers get a follow-up. When two files disagree, the agent asks which to trust. Answers go into the page as written; comments replace words, add a sentence or become a new note, by simple rules. A real model would rewrite the page instead.
- **Uploads:** demo files map to the demo knowledge points. For your own `.md` or `.txt` files, the prototype reads the headings and the text under them and builds points from them. PDF and DOCX files only get generic points, because the prototype can't read them.
- **Voice:** no real recording. Stopping fills in a demo transcript, which the user can edit before adding it to the page.
- **Pen:** sketches are drawn in the browser and saved with the page.
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
- **Project filter on the map.** An idea, not built: pick one project to see only the points it supports.
- **Mobile.** Designed for desktop and iPad widths. It works on a phone, but the map is cramped.
- **Public repo.** The repo is public so GitHub Pages works. Don't commit participant names, recordings or other private data.
