# Prototype notes

Rebuilt from scratch on Oct 26 from the User Flow board, the Figma key frames (P1–P4) and the Brand Directions frame. The previous version is in the git history (commit `fd5c4b6`).

## The flow

1. **Sign up** (with consent) → **About you** (job title, company, years, systems you know). Or **Log in**, or **Use the demo account**.
2. **Dashboard** (one level above the mind map, like Photoshop's home screen). The left panel has Home, Account, Settings and Help.
   - **Home:** royalty totals and every twin, plus a box with a **+** to create a new one.
   - **Account:** profile, royalties, payouts and monthly statements.
   - **Settings:** text size, contrast, motion, replay the tour, reset demo data.
   - **Help:** steps, map controls, FAQ.
3. **P1 Upload:** "Upload All Relevant Documents", Upload files / drag and drop, or **Use Demo Files**.
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
- **To test the full flow:** sign up as a new user. The tour starts the first time they open a mind map.
- **To test a returning user:** Log in → **Use the demo account**. Robert has one twin in progress and one published, with royalties.
- **"Use example answer" buttons:** they appear wherever the participant has to type knowledge, so non-mainframe participants can still finish tasks.
- **Accessibility settings:** Settings → Text size (Standard, Large, Extra large), Contrast, Motion. The map also works with the keyboard: Tab to a circle, Enter to open it, + and − to zoom, 0 to fit, arrow keys to move.

## Not decided yet

- **Product name and logo.** "Twin Studio" and the two-circle logo mark are placeholders.
- **From Scratch** (interview without files) is left out for now, as agreed.
- **Royalty numbers.** Rates and license fees need a real pricing decision.
- **Mobile.** Designed for desktop and iPad widths. It works on a phone, but the map is cramped.
- **Public repo.** The repo is public so GitHub Pages works. Don't commit participant names, recordings or other private data.
