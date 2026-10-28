// Demo story: Digital Product Design. Nothing here is real data.
// A design director's way of working, learned from files across three projects: Brewline (a café ordering
// app), Ledger (a banking dashboard for small shops) and Atlas (a museum guide app). Each knowledge point is
// one part of the process, written in general terms: a summary, the challenge, why it matters, how it's
// done and the solution. Examples show how each project did it. The five sections follow the UX workflow
// in order (clockwise on the mind map).
//
// Point fields: `projects` it was found in; `summary`, `challenge`, `why`, `how` (steps) and `solution`
// for the page; `figure` (see figures.js) and `examples`, placed with `at` (summary, challenge, why, how or
// solution); `gap` for a point that needs the expert: kind missing | differ | conflict, where it sits, the
// agent's note, its question and an example answer for testing. In TESTS, {name} becomes the expert's
// first name. Edit this file to change the story.

const FILES = [
  { name: 'brewline_product_brief.pdf', size: 1992294, type: 'PDF' },
  { name: 'brewline_research_synthesis.pdf', size: 6606028, type: 'PDF' },
  { name: 'brewline_figma_flows.pdf', size: 12373196, type: 'PDF' },
  { name: 'brewline_design_system.md', size: 59392, type: 'MD' },
  { name: 'brewline_usability_test_r2.docx', size: 880640, type: 'DOCX' },
  { name: 'ledger_case_study.pdf', size: 4718592, type: 'PDF' },
  { name: 'ledger_usability_report.docx', size: 643072, type: 'DOCX' },
  { name: 'atlas_case_study.pdf', size: 5872025, type: 'PDF' },
  { name: 'handover_call_0918.txt', size: 96256, type: 'TXT' },
];

const PROJECTS = [
  { id: 'brewline', name: 'Brewline', what: 'café ordering app' },
  { id: 'ledger', name: 'Ledger', what: 'banking dashboard for small shops' },
  { id: 'atlas', name: 'Atlas', what: 'museum guide app' },
];

const SECTIONS = [
  { id: 'strategy', title: '1. Value and strategy' },
  { id: 'research', title: '2. User research' },
  { id: 'structure', title: '3. Structure and flows' },
  { id: 'interface', title: '4. Interface design' },
  { id: 'ship', title: '5. Test and ship' },
];

// status: complete | missing (a gap the expert needs to fill) | conflict (projects or files differ)
const POINTS = [
  // ----- 1. Value and strategy -----
  {
    id: 'st-value', section: 'strategy', title: 'Value propositions', status: 'complete', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'Every product starts with a one-sentence value proposition: who it’s for, the job it does for them, and why it beats what they do today. It’s written before any screen is drawn, and every feature is checked against it.',
    challenge: 'Teams jump to features before they agree on who the product is for. Without one shared sentence, every stakeholder pulls the product in a different direction.',
    why: 'A clear value proposition makes scope decisions easy: if a feature doesn’t serve the promise, it waits. It also gives research a claim to test with real people.',
    how: [
      'Fill in a value proposition canvas: the customer’s jobs, pains and gains, then how the product relieves the pains and creates the gains.',
      'Write one sentence: for [who], [product] [does what], unlike [today’s alternative].',
      'Read it to five target customers before design starts. If they can’t say it back in their own words, rewrite it.',
      'Pin it at the top of every brief and design file.',
    ],
    solution: 'One sentence, tested with real customers and pinned at the top of every file. If a feature doesn’t serve it, the feature waits.',
    figure: {
      kind: 'table', at: 'how', caption: 'Brewline’s value proposition canvas, from the product brief.',
      head: ['Canvas', 'Brewline'],
      rows: [['Customer job', 'Get coffee on the way to work'], ['Pain', 'The line takes 10+ minutes at 7:45'], ['Gain', 'Coffee is ready when I walk in'], ['Pain reliever', 'Order ahead and pick a pickup time']],
    },
    examples: [
      { project: 'brewline', text: '“For commuters who buy coffee on the way to work, Brewline lets you order from your local café and pick it up in five minutes, without the line. Unlike chain apps, it works with independent cafés.”', source: 'brewline_product_brief.pdf · page 2' },
      { project: 'ledger', text: '“For owners of small shops, Ledger shows what money is coming in and going out this week, on one screen. Unlike a bank statement, it looks ahead, not back.”', source: 'ledger_case_study.pdf · page 3' },
      { project: 'atlas', text: '“For first-time visitors, Atlas plans a 90-minute route around what they care about. Unlike the printed map, it changes when a room gets crowded.”', source: 'atlas_case_study.pdf · page 2' },
    ],
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 2' }, { file: 'ledger_case_study.pdf', where: 'page 3' }, { file: 'atlas_case_study.pdf', where: 'page 2' }],
    links: ['st-segments', 'rs-problem'], keywords: ['value', 'proposition', 'promise', 'pitch', 'canvas', 'sentence', 'who'],
  },
  {
    id: 'st-segments', section: 'strategy', title: 'Target customers', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'Customers are defined by what they do, how often and in what situation, not by age or job title. When the person who uses the product isn’t the person who pays for it, design for both.',
    challenge: 'Broad segments like “young professionals” or “small businesses” don’t tell the team who to recruit or what to build first.',
    why: 'A definition based on behaviour doubles as the recruiting screener, and it shows who to say no to.',
    how: [
      'Describe each segment by a behaviour and how often it happens, like “buys coffee on the way to work at least three times a week”.',
      'Name who uses the product and who pays for it. They’re often different people.',
      'Size each segment roughly, and pick one to design for first.',
    ],
    solution: 'Segments are behaviours with a frequency. Design for the person who uses the product first, but never forget who pays.',
    examples: [
      { project: 'brewline', text: 'Commuters who buy coffee at the same café three or more times a week use the app. Owners of independent cafés with one to three shops pay for it: $49 a month, with no cut of each order.', source: 'brewline_product_brief.pdf · page 3' },
      { project: 'ledger', text: 'Shop owners with up to ten staff who check their balance every day. Their accountants log in too, so every screen had to make sense to both.', source: 'ledger_case_study.pdf · page 4' },
    ],
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 3' }, { file: 'ledger_case_study.pdf', where: 'page 4' }],
    links: ['rs-personas'], keywords: ['customers', 'target', 'segments', 'users', 'audience', 'pays', 'behaviour', 'behavior'],
  },
  {
    id: 'st-competitors', section: 'strategy', title: 'Competitor analysis', status: 'complete', projects: ['brewline', 'atlas'],
    summary: 'The competition is whatever people do today instead of using the product, not only products that look like it. Often the strongest competitor is a habit that costs nothing.',
    challenge: 'Feature comparison tables make teams copy competitors instead of finding the gap they could fill.',
    why: 'Knowing the real alternative tells you how much better the product has to be before people switch.',
    how: [
      'Watch or ask how people solve the problem today, including workarounds.',
      'Group the alternatives: direct competitors, indirect ones, and doing nothing.',
      'For each one, note what it costs people in time, money and effort.',
      'Write down the one thing the product will do better than all of them.',
    ],
    solution: 'Compare against what people really do today. If doing nothing is free and good enough, the product has to be clearly faster or easier.',
    examples: [
      { project: 'brewline', text: 'Chain apps only work in their own shops, and delivery apps take up to 30% of each order. The biggest competitor was the line itself, because it’s free.', source: 'brewline_product_brief.pdf · page 5' },
      { project: 'atlas', text: 'The free printed map and the audio guide. Visitors trusted the printed map, so Atlas kept a printable version of every route.', source: 'atlas_case_study.pdf · page 4' },
    ],
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 5' }, { file: 'atlas_case_study.pdf', where: 'page 4' }],
    links: ['st-value'], keywords: ['competitors', 'competition', 'competitor', 'alternatives', 'market', 'landscape'],
  },
  {
    id: 'st-metrics', section: 'strategy', title: 'Success metrics', status: 'missing', projects: ['brewline', 'ledger'],
    summary: 'Every project tracks several numbers after launch: downloads, sign-ups, how often people use it and ratings. Your files list them, but not which one decides whether a product is working.',
    why: 'When everything is measured, nothing guides decisions. One leading number tells the team what to fix next.',
    examples: [
      { project: 'brewline', text: 'The pilot tracked six numbers: downloads, sign-ups, orders per café, repeat orders, pickup wait time and app store rating.', source: 'brewline_product_brief.pdf · page 6' },
      { project: 'ledger', text: 'Ledger tracked weekly active owners and how often they sent a report to their accountant.', source: 'ledger_case_study.pdf · page 9' },
    ],
    gap: {
      kind: 'missing', at: 'solution',
      note: 'Your files list many numbers, but never say which one tells you a product is working.',
      ask: 'Which number do you watch first, and why that one?',
      example: 'Repeat use, not downloads. For Brewline that was the share of customers who ordered again within 14 days, and for Ledger the owners who came back every week. Downloads look great at launch, but only people coming back shows the product really saves them time.',
    },
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 6' }, { file: 'ledger_case_study.pdf', where: 'page 9' }, { file: 'handover_call_0918.txt', where: '04:10' }],
    links: ['sh-launch'], keywords: ['metrics', 'metric', 'success', 'kpi', 'measure', 'number', 'repeat', 'working', 'north', 'star'],
  },

  // ----- 2. User research -----
  {
    id: 'rs-recruit', section: 'research', title: 'Recruiting participants', status: 'missing', projects: ['brewline', 'atlas'],
    summary: 'Research runs on 8 to 15 interviews per project, plus watching people where the product will be used. Your files say who took part, but not how they were found or chosen.',
    why: 'The wrong participants give confident but useless answers. Recruiting decides the quality of everything that follows.',
    examples: [
      { project: 'brewline', text: '14 interviews, with 8 commuters and 6 café owners, plus two mornings watching the 7:30 rush in partner cafés.', source: 'brewline_research_synthesis.pdf · page 2' },
      { project: 'atlas', text: '10 first-time visitors interviewed at the museum entrance, and 4 visitors followed through the galleries.', source: 'atlas_case_study.pdf · page 5' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'None of your files explain how you find and screen participants.',
      ask: 'How do you recruit and screen participants, so you talk to the right people?',
      example: 'I recruit where the behaviour happens: a card on the counter of three partner cafés for Brewline, a desk at the museum entrance for Atlas, always with a small thank-you. Then I screen with two or three questions about the behaviour itself, like how often they buy coffee on the way to work. I never recruit friends or coworkers, because they’re too polite to criticize.',
    },
    sources: [{ file: 'brewline_research_synthesis.pdf', where: 'page 2' }, { file: 'atlas_case_study.pdf', where: 'page 5' }],
    links: ['rs-synthesis', 'sh-test'], keywords: ['recruit', 'recruiting', 'participants', 'screen', 'screener', 'find', 'interviews', 'incentive'],
  },
  {
    id: 'rs-synthesis', section: 'research', title: 'Affinity mapping', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'After the interviews, every observation goes on its own note, and the team groups the notes into themes together. The theme that came from the most people becomes the focus of the design.',
    challenge: 'Interview notes pile up fast, and the most memorable quote tends to win over the most common one.',
    why: 'Grouping raw notes together shows what many people said, not what one person said loudly. And the whole team owns the result.',
    how: [
      'Write one observation or quote per note, with the participant’s number.',
      'Group the notes in silence first, then name each group.',
      'Count how many participants each theme came from, and rank the themes.',
      'Turn the top theme into a problem statement.',
    ],
    solution: 'One note per observation, grouped together, ranked by how many people a theme came from, not by how memorable it was.',
    figure: {
      kind: 'bars', at: 'how', caption: 'Brewline: how many of the 14 participants raised each theme.',
      bars: [{ label: 'Order not ready', value: 11 }, { label: 'Pickup time', value: 9 }, { label: 'Price', value: 4 }, { label: 'Loyalty', value: 3 }], max: 14,
    },
    examples: [
      { project: 'brewline', text: 'Five themes came out of 14 interviews. The biggest: people didn’t trust that their coffee would be ready when they arrived.', source: 'brewline_research_synthesis.pdf · page 6' },
      { project: 'ledger', text: 'Owners didn’t want more charts. They wanted to know whether they could pay next week’s bills.', source: 'ledger_case_study.pdf · page 5' },
    ],
    sources: [{ file: 'brewline_research_synthesis.pdf', where: 'page 6' }, { file: 'ledger_case_study.pdf', where: 'page 5' }],
    links: ['rs-journey', 'rs-problem'], keywords: ['affinity', 'synthesis', 'themes', 'sticky', 'notes', 'insights', 'cluster'],
  },
  {
    id: 'rs-personas', section: 'research', title: 'Personas', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'Personas are short and built from research: a name, a situation, a goal and one quote from a real interview. They’re written to settle arguments, not to decorate a brief.',
    challenge: 'Made-up personas full of hobbies and favourite brands don’t help anyone decide anything.',
    why: 'A persona tied to a real situation lets the team ask “Would this work for her at 7:45?” instead of arguing about taste.',
    how: [
      'Start from the top research themes, not from demographics.',
      'Write one persona per segment: name, situation, goal and frustration.',
      'Add one real quote from an interview.',
      'Keep it to half a page, and retire it when new research says otherwise.',
    ],
    solution: 'Half a page each, built from research, with a real quote. Use them to settle decisions, and retire them when the research changes.',
    examples: [
      { project: 'brewline', text: 'Maya, 34, orders the same oat latte four mornings a week and has six minutes between her bus and her train. Theo, 52, owns two cafés and runs everything from his phone.', source: 'brewline_research_synthesis.pdf · pages 9–10' },
      { project: 'ledger', text: 'Priya runs a flower shop with four staff and checks her balance every morning before she opens.', source: 'ledger_case_study.pdf · page 6' },
    ],
    sources: [{ file: 'brewline_research_synthesis.pdf', where: 'pages 9–10' }, { file: 'ledger_case_study.pdf', where: 'page 6' }],
    links: ['st-segments', 'fl-order'], keywords: ['personas', 'persona', 'archetypes', 'users', 'quote'],
  },
  {
    id: 'rs-journey', section: 'research', title: 'Journey mapping', status: 'complete', projects: ['brewline', 'atlas'],
    summary: 'A journey map follows one person through the whole experience, stage by stage, including the parts outside the product. The lowest point on the map is where design starts.',
    challenge: 'Teams design the screens they own and miss the moments in between, where most of the frustration happens.',
    why: 'The map shows where the experience really breaks, which is often not inside the product at all.',
    how: [
      'List the stages from the person’s point of view, from what starts it to the end.',
      'For each stage, note what they do, think and feel, using quotes from research.',
      'Draw how they feel across the stages, and mark the lowest point.',
      'Start the design at the lowest point.',
    ],
    solution: 'Map the whole journey, including the parts outside the product, and design for the lowest point first.',
    figure: {
      kind: 'curve', at: 'how', caption: 'Brewline’s morning journey. The low point is pickup.',
      stages: ['Leave home', 'Decide', 'Order', 'Travel', 'Pick up'], values: [0.62, 0.72, 0.8, 0.55, 0.12], low: 4,
    },
    examples: [
      { project: 'brewline', text: 'Five stages: leave home, decide, order, travel and pick up. The low point was pickup. People couldn’t tell whether their order was ready, so they waited at the counter anyway.', source: 'brewline_research_synthesis.pdf · page 12' },
      { project: 'atlas', text: 'The low point was the first five minutes: visitors stood in the lobby, not knowing where to start.', source: 'atlas_case_study.pdf · page 7' },
    ],
    sources: [{ file: 'brewline_research_synthesis.pdf', where: 'page 12' }, { file: 'atlas_case_study.pdf', where: 'page 7' }],
    links: ['fl-busy'], keywords: ['journey', 'map', 'stages', 'pickup', 'emotions', 'low', 'point'],
  },
  {
    id: 'rs-problem', section: 'research', title: 'Problem statements', status: 'complete', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'After research and before any screens, the team agrees on one “How might we…” question. It names the person, the hardest moment and the outcome, and every design decision is checked against it.',
    challenge: 'Without one shared question, a team solves different problems at once, or jumps to a solution someone already had in mind.',
    why: 'The question keeps the work on the biggest research finding. It’s also how you say no to a good idea that solves a different problem.',
    how: [
      'Start from the top theme of the affinity map.',
      'Write it as “How might we [outcome] for [person], even when [hardest moment]?”',
      'Check it isn’t too broad (“improve coffee”) or too narrow (“add a ready button”).',
      'Agree on it with the team, then pin it above every design file.',
    ],
    solution: 'One “How might we…” question per project, with the hardest moment in it. If a design idea doesn’t answer the question, the idea waits.',
    figure: { kind: 'steps', at: 'how', caption: 'From research to one shared question.', items: ['Research themes', 'Top theme', 'How might we…', 'Team check', 'Pinned on every file'] },
    examples: [
      { project: 'brewline', text: '“How might we make picking up coffee faster than waiting in line, even at the busiest moment of the morning?”', source: 'brewline_research_synthesis.pdf · page 14' },
      { project: 'ledger', text: '“How might we show shop owners whether they can pay next week’s bills, in under ten seconds?”', source: 'ledger_case_study.pdf · page 7' },
      { project: 'atlas', text: '“How might we help first-time visitors start enjoying the museum within five minutes of arriving?”', source: 'atlas_case_study.pdf · page 8' },
    ],
    sources: [{ file: 'brewline_research_synthesis.pdf', where: 'page 14' }, { file: 'ledger_case_study.pdf', where: 'page 7' }, { file: 'atlas_case_study.pdf', where: 'page 8' }],
    links: ['st-value'], keywords: ['problem', 'statement', 'hmw', 'might', 'define', 'question', 'goal'],
  },

  // ----- 3. Structure and flows -----
  {
    id: 'fl-ia', section: 'structure', title: 'Information architecture', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'The structure comes from how people think about the content, tested with a card sort, not from the company’s departments. The most frequent task goes on the first screen.',
    challenge: 'Teams name sections after internal departments or the database, and then people can’t find anything.',
    why: 'If people can’t find a feature, it doesn’t exist for them. A card sort shows the structure they expect.',
    how: [
      'Put every piece of content and every task on a card.',
      'Run an open card sort with 12 to 15 target users.',
      'Build the navigation from their groups, in their words.',
      'Put the most frequent task on the first screen, one tap away.',
    ],
    solution: 'Let a card sort decide the structure, use people’s own words, and put the most frequent task on the first screen.',
    examples: [
      { project: 'brewline', text: 'Four tabs: Home, Menu, Orders and Account. In a card sort with 12 people, “Order my usual” ended up on Home instead of under Orders.', source: 'brewline_figma_flows.pdf · page 2' },
      { project: 'ledger', text: 'Owners grouped everything by “money in” and “money out”, not by account type, so the dashboard was split that way.', source: 'ledger_case_study.pdf · page 10' },
    ],
    sources: [{ file: 'brewline_figma_flows.pdf', where: 'page 2' }, { file: 'ledger_case_study.pdf', where: 'page 10' }],
    links: ['fl-order'], keywords: ['information', 'architecture', 'ia', 'sitemap', 'navigation', 'tabs', 'card', 'sort', 'structure'],
  },
  {
    id: 'fl-order', section: 'structure', title: 'Core task flows', status: 'complete', projects: ['brewline', 'atlas'],
    summary: 'The main task is mapped as a flow before any screen is drawn. Then every step that doesn’t help people finish is removed, and returning users get a shortcut.',
    challenge: 'Flows grow one “just in case” step at a time, and every extra step loses people.',
    why: 'The fewer steps it takes to finish the main task, the more people finish it. A shortcut keeps frequent tasks fast.',
    how: [
      'Write the task the way people say it, like “get my usual coffee”.',
      'Map every step, decision and error.',
      'Remove or merge the steps that don’t help people finish.',
      'Add a shortcut for people who come back.',
    ],
    solution: 'Map the flow first, cut every step that doesn’t help people finish, and give returning users a shortcut.',
    figure: { kind: 'steps', at: 'how', caption: 'Brewline’s order flow. “Order my usual” skips straight to Pay.', items: ['Choose café', 'Choose drinks', 'Pickup time', 'Pay'] },
    examples: [
      { project: 'brewline', text: 'Four steps: choose a café, choose drinks, choose a pickup time, then pay. Returning customers skip straight to paying with “Order my usual”.', source: 'brewline_figma_flows.pdf · page 5' },
      { project: 'atlas', text: 'Three steps to a route: pick your interests, say how much time you have, start walking. Returning visitors carry on where they stopped.', source: 'atlas_case_study.pdf · page 9' },
    ],
    sources: [{ file: 'brewline_figma_flows.pdf', where: 'page 5' }, { file: 'atlas_case_study.pdf', where: 'page 9' }],
    links: ['fl-mvp'], keywords: ['flow', 'flows', 'task', 'steps', 'order', 'shortcut', 'usual', 'reorder'],
  },
  {
    id: 'fl-mvp', section: 'structure', title: 'Scoping the first release', status: 'missing', projects: ['brewline', 'ledger'],
    summary: 'Every project cut its first version down to a fraction of the planned features. Your files show what shipped, but not how you decided what to cut.',
    why: 'A smaller first version ships sooner and shows what people really use, before the team builds everything else.',
    examples: [
      { project: 'brewline', text: 'The brief listed 11 features for version 1. The app shipped with 6.', source: 'brewline_product_brief.pdf · page 8' },
      { project: 'ledger', text: 'The first release had 4 of the 15 reports that were asked for.', source: 'ledger_case_study.pdf · page 11' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your files show what shipped, but not the rule you used to decide what to cut.',
      ask: 'How do you decide what goes into the first release and what waits?',
      example: 'I check every feature against the problem statement. If it doesn’t make the main task faster or easier, it waits for version 2. For Brewline that meant cutting loyalty points, tipping and group orders, and for Ledger 11 of the 15 reports. The hardest cuts are the ones sales wants, so I show them the problem statement, not my opinion.',
    },
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 8' }, { file: 'ledger_case_study.pdf', where: 'page 11' }, { file: 'handover_call_0918.txt', where: '11:30' }],
    links: ['st-metrics', 'fl-order'], keywords: ['mvp', 'scope', 'scoping', 'cut', 'features', 'version', 'release', 'prioritize', 'roadmap', 'v1'],
  },
  {
    id: 'fl-wireframes', section: 'structure', title: 'Wireframing', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'Design starts in low fidelity: grey boxes with real words, never placeholder text. Two or three layouts are tested on paper before anything is drawn in detail.',
    challenge: 'Polished mockups too early make people comment on colours instead of whether the layout works.',
    why: 'Cheap wireframes make it easy to throw ideas away, and real words show whether the content actually fits.',
    how: [
      'Sketch two or three different layouts for each key screen.',
      'Use real content, never lorem ipsum.',
      'Test the layouts on paper with five people.',
      'Only then draw the winning layout in Figma.',
    ],
    solution: 'Low fidelity, real words, several layouts, tested on paper before Figma.',
    examples: [
      { project: 'brewline', text: 'Three layouts for the menu screen were tested on paper with five people before anything was drawn in Figma.', source: 'brewline_figma_flows.pdf · pages 8–11' },
      { project: 'ledger', text: 'Two dashboard layouts were tested as printouts with shop owners at their own counters.', source: 'ledger_case_study.pdf · page 12' },
    ],
    sources: [{ file: 'brewline_figma_flows.pdf', where: 'pages 8–11' }, { file: 'ledger_case_study.pdf', where: 'page 12' }],
    links: ['ui-visual'], keywords: ['wireframes', 'wireframe', 'wireframing', 'fidelity', 'paper', 'sketches', 'layouts', 'lorem'],
  },
  {
    id: 'fl-busy', section: 'structure', title: 'Designing for the rush', status: 'missing', projects: ['brewline', 'atlas'],
    summary: 'Both projects have a moment when demand outruns what the service can deliver: the morning coffee rush, a crowded gallery. Your files describe it, but not what the product should do then.',
    why: 'People judge a product at its worst moment. A promise the service can’t keep breaks trust faster than an honest wait.',
    examples: [
      { project: 'brewline', text: 'At 8:00 on a Monday, one café had 23 open orders and one barista.', source: 'handover_call_0918.txt · 08:45' },
      { project: 'atlas', text: 'On free Sundays, the most popular room had a 25-minute wait.', source: 'atlas_case_study.pdf · page 13' },
    ],
    gap: {
      kind: 'missing', at: 'how', sketch: true,
      note: 'Your files describe the rush, but not what the product should do when the service can’t keep up.',
      ask: 'What should a product show when demand is higher than the service can handle? Sketch the screen with the pen if that’s easier.',
      example: 'Never promise what the service can’t keep. Brewline moves the earliest pickup time back when more than 15 orders are open, and says why: “Busy right now. Earliest pickup 8:25.” Atlas sends visitors around a crowded room instead of into the queue. Staff can always pause new orders.',
    },
    sources: [{ file: 'handover_call_0918.txt', where: '08:45' }, { file: 'atlas_case_study.pdf', where: 'page 13' }],
    links: ['fl-order', 'rs-journey'], keywords: ['busy', 'rush', 'capacity', 'crowded', 'peak', 'pause', 'late', 'delay', 'queue', 'demand'],
  },

  // ----- 4. Interface design -----
  {
    id: 'ui-visual', section: 'interface', title: 'Visual direction', status: 'complete', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'The visual direction comes from the situation people are in, not from trends: where they are, how much attention they have and what they’re holding. Large type and one colour for actions are the defaults.',
    challenge: 'Moodboards drift toward what looks good on a designer’s big screen, not what works in a café or a dim gallery.',
    why: 'People use these products while moving, distracted or in a hurry. A calm, readable interface is faster to use.',
    how: [
      'Write down the situation: light, distance, movement and attention.',
      'Choose one colour for actions, and keep everything else neutral.',
      'Size the type for reading at arm’s length.',
      'Use the client’s real photos, never stock.',
    ],
    solution: 'Design for the situation: one action colour, large type and real photos.',
    examples: [
      { project: 'brewline', text: 'Warm and calm: a cream background, one deep green for actions, photos of each café’s own drinks, and large type for reading while walking.', source: 'brewline_figma_flows.pdf · page 14' },
      { project: 'ledger', text: 'Plain and dense: a white background, one blue for actions, and numbers in a monospaced font so the columns line up.', source: 'ledger_case_study.pdf · page 14' },
      { project: 'atlas', text: 'Dark by default, because the galleries are dim and a bright screen distracts other visitors.', source: 'atlas_case_study.pdf · page 10' },
    ],
    sources: [{ file: 'brewline_figma_flows.pdf', where: 'page 14' }, { file: 'ledger_case_study.pdf', where: 'page 14' }, { file: 'atlas_case_study.pdf', where: 'page 10' }],
    links: ['ui-system'], keywords: ['visual', 'style', 'colour', 'color', 'brand', 'look', 'typography', 'type', 'photos', 'dark'],
  },
  {
    id: 'ui-system', section: 'interface', title: 'Design systems', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'Every product gets a small design system from the start: tokens for colour, type and spacing on an 8-point grid, and components with the same names in Figma and in code.',
    challenge: 'Without shared tokens, every screen drifts a little, and designers and engineers argue about pixels.',
    why: 'A shared system keeps screens consistent, speeds up design and handoff, and lets one change update everything.',
    how: [
      'Define tokens for colour, type and spacing on an 8-point grid.',
      'Build the components in one Figma library.',
      'Give each component the same name in code.',
      'Write down when to use each component, not only how it looks.',
    ],
    solution: 'Tokens first, one library, and the same names in Figma and in code.',
    examples: [
      { project: 'brewline', text: 'An 8-point grid with tokens for colour, type and spacing, in one Figma library with matching code components.', source: 'brewline_design_system.md · Foundations' },
      { project: 'ledger', text: 'The same token structure, with a denser spacing scale for tables.', source: 'ledger_case_study.pdf · page 15' },
    ],
    sources: [{ file: 'brewline_design_system.md', where: 'Foundations' }, { file: 'ledger_case_study.pdf', where: 'page 15' }],
    links: ['ui-targets', 'sh-handoff'], keywords: ['system', 'tokens', 'components', 'library', 'grid', 'spacing', 'figma'],
  },
  {
    id: 'ui-targets', section: 'interface', title: 'Tap target sizes', status: 'conflict', projects: ['brewline', 'ledger'],
    summary: 'The smallest size a button can be is a token in each project’s design system, so every screen uses the same one. But the minimum isn’t the same in every project.',
    why: 'Targets that are too small cause missed taps and mistakes, especially for people on the move or with limited dexterity.',
    figure: {
      kind: 'sizes', at: 'summary', caption: 'Each project’s smallest target, shown at real size.',
      items: [{ size: 44, unit: 'pt', label: 'Brewline · phone, on the move' }, { size: 32, unit: 'px', label: 'Ledger · desktop, with a mouse' }],
    },
    examples: [
      { project: 'brewline', at: 'summary', text: 'Every tap target is at least 44 by 44 points. In testing, three people missed the 32-pixel quantity buttons on the bus.', source: 'brewline_usability_test_r2.docx · finding 5' },
      { project: 'ledger', at: 'summary', text: 'Compact buttons are 32 pixels high, for the table filters and row actions.', source: 'ledger_case_study.pdf · page 15' },
    ],
    gap: {
      kind: 'differ', at: 'solution',
      note: 'Brewline’s smallest tap target is 44 points, and Ledger’s is 32 pixels. Your files don’t say why.',
      sides: [
        { source: 'Brewline · brewline_usability_test_r2.docx', claim: 'Every tap target is at least 44 by 44 points.' },
        { source: 'Ledger · ledger_case_study.pdf', claim: 'Compact buttons are 32 pixels high.' },
      ],
      ask: 'Add the reason, so your twin knows when each size applies.',
      example: 'It depends on how people use the product. Brewline is tapped with a thumb on a moving bus, so every target is at least 44 by 44 points. Ledger is used at a desk with a mouse, so 32 pixels is fine there. The icon can stay small, but its tap area can’t.',
    },
    sources: [{ file: 'brewline_design_system.md', where: 'Sizing' }, { file: 'brewline_usability_test_r2.docx', where: 'finding 5' }, { file: 'ledger_case_study.pdf', where: 'page 15' }],
    links: ['ui-a11y', 'ui-system'], keywords: ['tap', 'target', 'targets', 'touch', 'size', 'buttons', 'button', '44', '32', 'small', 'pixels'],
  },
  {
    id: 'ui-a11y', section: 'interface', title: 'Accessibility', status: 'complete', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'Every project meets WCAG 2.2 AA at least: readable contrast, layouts that work with large text, and every action available with a screen reader. Colour is never the only signal.',
    challenge: 'Accessibility is often left to the end, when fixing it means redesigning screens.',
    why: 'It’s the law in many places, and it makes the product better for everyone: in sunlight, one-handed or in a hurry.',
    how: [
      'Check that text contrast is at least 4.5 to 1 while designing.',
      'Test the layouts with text at 200%.',
      'Walk through every flow with VoiceOver and TalkBack before handoff.',
      'Pair every colour with a word or an icon.',
    ],
    solution: 'AA from the first wireframe, tested with real assistive technology before handoff.',
    examples: [
      { project: 'brewline', text: 'Order status always shows a word next to the colour: Ordered, Making, Ready.', source: 'brewline_design_system.md · Accessibility' },
      { project: 'ledger', text: 'Every chart has a table view, so screen reader users get the same numbers.', source: 'ledger_case_study.pdf · page 16' },
      { project: 'atlas', text: 'Every artwork has an audio description, and a route can be followed without looking at the screen.', source: 'atlas_case_study.pdf · page 11' },
    ],
    sources: [{ file: 'brewline_design_system.md', where: 'Accessibility' }, { file: 'ledger_case_study.pdf', where: 'page 16' }, { file: 'atlas_case_study.pdf', where: 'page 11' }],
    links: ['ui-targets'], keywords: ['accessibility', 'accessible', 'a11y', 'wcag', 'contrast', 'voiceover', 'talkback', 'screen', 'reader'],
  },
  {
    id: 'ui-prototype', section: 'interface', title: 'Prototyping', status: 'missing', projects: ['brewline', 'atlas'],
    summary: 'Each project tested its flows with clickable prototypes before building. Your files show the prototypes, but not when a design tool is enough and when you need a coded one.',
    examples: [
      { project: 'brewline', text: 'Four clickable Figma prototypes, one for each main flow.', source: 'brewline_figma_flows.pdf · page 20' },
      { project: 'atlas', text: 'A coded prototype of the route screen, tested in the galleries with real indoor positioning.', source: 'atlas_case_study.pdf · page 12' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your files don’t say when a design-tool prototype is enough and when you ask engineers for a coded one.',
      ask: 'When is a Figma prototype enough, and when do you ask for a coded one?',
      example: 'Figma is enough for layout and flow. I ask for a coded prototype when timing or real data matters, like Brewline’s “Your order is ready” countdown or where you are in Atlas’s galleries. A design tool can’t fake real waiting or real walking.',
    },
    sources: [{ file: 'brewline_figma_flows.pdf', where: 'page 20' }, { file: 'atlas_case_study.pdf', where: 'page 12' }],
    links: ['sh-test'], keywords: ['prototype', 'prototypes', 'prototyping', 'clickable', 'figma', 'coded', 'code', 'fidelity'],
  },

  // ----- 5. Test and ship -----
  {
    id: 'sh-test', section: 'ship', title: 'Usability testing', status: 'complete', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'Test with five to eight people from the target group, in the place where the product is really used, on their own devices. Give them three core tasks, and watch without helping.',
    challenge: 'Tests in a quiet room on a fast laptop miss what happens on a crowded bus or at a busy shop counter.',
    why: 'Testing in the real setting finds the problems that matter in real use, and scoring every round shows whether the design got better.',
    how: [
      'Recruit five to eight people who match the segment.',
      'Test where the product is really used, on their own devices.',
      'Give three core tasks, and don’t help.',
      'Score each round with the System Usability Scale, and compare the rounds.',
    ],
    solution: 'Five to eight real users, in the real setting, three tasks, and a score every round.',
    figure: { kind: 'bars', at: 'how', caption: 'Brewline’s average System Usability Scale score, out of 100, in rounds 1 and 2.', bars: [{ label: 'Round 1', value: 61 }, { label: 'Round 2', value: 74 }], max: 100 },
    examples: [
      { project: 'brewline', text: 'Eight people on their real morning commute: at the bus stop, on the bus and in the café.', source: 'brewline_usability_test_r2.docx · method' },
      { project: 'ledger', text: 'Six shop owners at their own counters, on their own laptops, during opening hours.', source: 'ledger_usability_report.docx · method' },
      { project: 'atlas', text: 'Seven first-time visitors walking a real route on a busy Saturday.', source: 'atlas_case_study.pdf · page 14' },
    ],
    sources: [{ file: 'brewline_usability_test_r2.docx', where: 'method' }, { file: 'ledger_usability_report.docx', where: 'method' }, { file: 'atlas_case_study.pdf', where: 'page 14' }],
    links: ['sh-prioritize'], keywords: ['usability', 'test', 'tests', 'testing', 'participants', 'tasks', 'sus', 'round', 'run'],
  },
  {
    id: 'sh-prioritize', section: 'ship', title: 'Prioritizing findings', status: 'missing', projects: ['brewline', 'ledger'],
    summary: 'Every test round finds more problems than the team can fix before launch. Each problem is rated by how severe it is and by how many people hit it.',
    figure: {
      kind: 'matrix', at: 'summary', caption: 'Brewline round 2: each problem by severity and by how many of the 8 participants hit it.',
      x: 'How many people hit it', y: 'Severity', corner: 'Fix first',
      items: [{ label: 'Missed pickup time', x: 0.62, y: 0.9 }, { label: 'Buttons too small', x: 0.38, y: 0.72 }, { label: '“Ready” read as “Paid”', x: 0.38, y: 0.5 }, { label: 'Couldn’t find oat milk', x: 0.25, y: 0.18 }],
    },
    examples: [
      { project: 'brewline', text: 'Round 2 found 14 problems. The worst: 5 of 8 people missed the pickup-time button.', source: 'brewline_usability_test_r2.docx · findings' },
      { project: 'ledger', text: 'Round 1 found 9 problems, 2 of them high severity.', source: 'ledger_usability_report.docx · findings' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your files rate every problem, but don’t say how you choose what gets fixed first.',
      ask: 'There isn’t time to fix everything before launch. How do you decide what gets fixed?',
      example: 'Severity first, then how many people hit it. Anything that stops someone from finishing the main task gets fixed before launch, even if only one person hit it. Then whatever most people struggled with. Cosmetic issues go to the backlog, and I re-test the fixes with three people.',
    },
    sources: [{ file: 'brewline_usability_test_r2.docx', where: 'findings' }, { file: 'ledger_usability_report.docx', where: 'findings' }],
    links: ['sh-test'], keywords: ['prioritize', 'prioritise', 'priority', 'findings', 'severity', 'fix', 'problems', 'issues', 'backlog'],
  },
  {
    id: 'sh-handoff', section: 'ship', title: 'Developer handoff', status: 'complete', projects: ['brewline', 'ledger'],
    summary: 'A design is ready for handoff when every state is drawn: default, loading, empty, error and disabled. The designer walks the engineers through it in person and stays involved while it’s built.',
    challenge: 'Handing over only the happy path leaves engineers to invent the error and empty states.',
    why: 'Drawing every state up front avoids rework, and keeps what gets built true to the design.',
    how: [
      'Draw every state of every screen: default, loading, empty, error and disabled.',
      'Link each screen to its ticket.',
      'Walk the engineers through the flow in a 30-minute call.',
      'Review the build together before it ships.',
    ],
    solution: 'Every state drawn, every screen linked to its ticket, and a walkthrough in person.',
    examples: [
      { project: 'brewline', text: 'Every screen was linked to its ticket, with a 30-minute walkthrough call for the engineers.', source: 'brewline_design_system.md · Handoff' },
      { project: 'ledger', text: 'Ledger added a sixth state, “stale data”, for when the bank feed is late.', source: 'ledger_case_study.pdf · page 17' },
    ],
    sources: [{ file: 'brewline_design_system.md', where: 'Handoff' }, { file: 'ledger_case_study.pdf', where: 'page 17' }, { file: 'handover_call_0918.txt', where: '15:20' }],
    links: ['ui-system'], keywords: ['handoff', 'hand-off', 'developers', 'engineers', 'specs', 'annotations', 'states', 'build'],
  },
  {
    id: 'sh-launch', section: 'ship', title: 'Launch and measure', status: 'complete', projects: ['brewline', 'atlas'],
    summary: 'Launch small, measure, then grow: a few places first, a weekly look at the number that matters, and a wider rollout only when it holds.',
    challenge: 'A big launch everywhere at once turns every problem into everyone’s problem.',
    why: 'Starting small limits the damage from surprises, and gives real data before the product grows.',
    how: [
      'Launch with a few friendly locations or customers first.',
      'Track the main number, plus anything that shows friction in real life.',
      'Review the numbers with the team every week.',
      'Roll out further only when the numbers hold.',
    ],
    solution: 'Start small, review every week, and grow when the numbers hold.',
    figure: { kind: 'steps', at: 'how', caption: 'Brewline’s rollout.', items: ['3 pilot cafés', 'Weekly review', '20 cafés'] },
    examples: [
      { project: 'brewline', text: 'Launched in 3 cafés, then 20. A dashboard tracked repeat orders, the time from order to pickup and orders cancelled at the counter, reviewed every Monday.', source: 'handover_call_0918.txt · 19:45' },
      { project: 'atlas', text: 'Launched on weekdays first, then at weekends once the routes held up with crowds.', source: 'atlas_case_study.pdf · page 15' },
    ],
    sources: [{ file: 'handover_call_0918.txt', where: '19:45' }, { file: 'atlas_case_study.pdf', where: 'page 15' }],
    links: ['st-metrics'], keywords: ['launch', 'release', 'measure', 'analytics', 'dashboard', 'rollout', 'data', 'pilot'],
  },
  {
    id: 'sh-mentor', section: 'ship', title: 'What new designers get wrong', status: 'missing', projects: ['brewline', 'ledger', 'atlas'],
    summary: 'Your handover call mentions mistakes new designers made on these projects, but never says what they were.',
    why: 'Newcomers tend to repeat the same mistakes. Naming them saves a project’s worth of rework.',
    gap: {
      kind: 'missing', at: 'solution',
      note: 'This is advice only you can give. Nothing in your files covers it.',
      ask: 'What mistake do new designers make most often, and what should they do instead?',
      example: 'They design for a quiet afternoon. The real test is the worst moment: 8 a.m. on a Monday at Brewline, payday at Ledger, a free Sunday at Atlas. Design for the rush first, then check that the quiet times still work.',
    },
    sources: [{ file: 'handover_call_0918.txt', where: '23:05' }],
    links: ['fl-busy', 'ui-targets'], keywords: ['new', 'designers', 'mistake', 'mistakes', 'wrong', 'junior', 'newcomers', 'advice'],
  },
];

// Final validation: the twin and the expert answer the same questions, then we compare.
const TESTS = [
  {
    id: 'q1', points: ['st-metrics'],
    question: 'A stakeholder asks which number shows that a new product is working. What do you tell them?',
    answer: 'Repeat use, not downloads: the share of people who come back, like Brewline customers ordering again within 14 days. Downloads look great at launch, but only people coming back shows the product saves them time.',
    partial: '{name}’s projects track several numbers, like downloads, sign-ups and repeat orders, but {name} hasn’t said which one matters most. Check with {name}.',
    keywords: ['repeat', 'downloads', 'back', 'use', 'again', 'come'],
    example: 'Repeat use. Downloads look good at launch, but people coming back is what shows it works.',
  },
  {
    id: 'q2', points: ['sh-prioritize'],
    question: 'Usability testing found 14 problems, and there’s one sprint left before launch. What gets fixed?',
    answer: 'Rate each problem by severity, then by how many people hit it. Anything that stops someone from finishing the main task gets fixed first, even if only one person hit it. Then whatever most people struggled with. Cosmetic issues go to the backlog, and the fixes are re-tested with three people.',
    partial: 'Probably the high-severity problems first. I can’t say how {name} decides beyond that, because {name} hasn’t confirmed it yet.',
    keywords: ['severity', 'finish', 'people', 'backlog', 'test', 'first'],
    example: 'Severity first: anything that stops people from finishing gets fixed. Then the problems most people hit. Cosmetic issues go to the backlog, and I re-test the fixes.',
  },
  {
    id: 'q3', points: ['ui-targets'],
    question: 'A developer asks if the buttons can be 32 pixels, so they fit. What do you say?',
    answer: 'It depends on how the product is used. On a phone, used on the move, every tap target is at least 44 by 44 points. At a desk with a mouse, like the Ledger dashboard, 32 pixels is fine. The icon can stay small, but the tap area can’t.',
    partial: 'My sources differ: Brewline uses 44 points and Ledger uses 32 pixels. Check with {name} which one applies here.',
    keywords: ['44', 'phone', 'mouse', 'desk', 'move', 'depends'],
    example: 'Depends where it’s used. On a phone people tap on the move, so 44 points minimum. At a desk with a mouse, 32 is fine.',
  },
];

// The demo account's published twin: the counter tablet the café staff use, from the Brewline project.
const COUNTER_SECTIONS = [
  { id: 'queue', title: 'Order queue' },
  { id: 'setup', title: 'Café setup' },
];

const COUNTER_POINTS = [
  ['queue', 'cc-card', 'Order card layout', 'One card per order: the pickup time in large type at the top, then the drinks, then the customer’s first name. Baristas read it from a metre away.', ['card', 'layout', 'queue', 'baristas', 'read']],
  ['queue', 'cc-ready', 'Marking an order ready', 'One large Ready button on each card. Swiping was tested and dropped, because wet hands set it off by accident.', ['ready', 'mark', 'button', 'swipe', 'baristas']],
  ['queue', 'cc-rush', 'Rush mode', 'When more than 15 orders are open, the tablet switches to a compact list and pushes new pickup times back automatically.', ['rush', 'busy', 'compact', 'mode', 'happens']],
  ['queue', 'cc-sound', 'Alerts and sounds', 'A new order plays one short chime. No repeating alarms: in the pilot, staff turned them off within a day.', ['sound', 'sounds', 'alert', 'alerts', 'chime', 'notification']],
  ['setup', 'cc-menu', 'Menu builder', 'Owners build the menu from photos of their own drinks. Every item needs a price and at least one size.', ['menu', 'builder', 'items', 'price', 'photos']],
  ['setup', 'cc-hours', 'Opening hours', 'Ordering closes 15 minutes before the café does, so late orders don’t keep staff after closing.', ['hours', 'opening', 'closing', 'close']],
  ['setup', 'cc-staff', 'Staff sign-in', 'Staff sign in with a four-digit code instead of a password, because the tablet is shared.', ['staff', 'sign', 'code', 'password', 'login']],
  ['setup', 'cc-onboard', 'Setting up a new café', 'A new café is set up in one 30-minute video call. The designer joins the first five calls after every new feature.', ['onboarding', 'setup', 'new', 'call', 'cafe']],
].map(([section, id, title, summary, keywords], i) => ({
  id, section, title, summary, keywords, status: 'complete',
  sources: [{ file: i % 2 ? 'pilot_notes.md' : 'counter_app_spec.pdf', where: i % 2 ? `week ${Math.ceil(i / 2)}` : `page ${i + 3}` }],
  links: [],
}));

export default {
  id: 'design',
  label: 'Digital Product Design',
  icon: 'frame',
  summary: 'How a design director works, from value proposition to launch, across three projects: a café ordering app, a banking dashboard and a museum guide.',
  twinName: 'Product Design Practice',
  newcomer: 'a new designer',
  roleExample: 'Lead product designer',
  uploadHint: 'Product briefs, research notes, Figma exports, design system docs, test reports and case studies, from as many projects as you like.',
  skills: ['UX research', 'Value propositions', 'Information architecture', 'Interaction design', 'Visual design', 'Design systems', 'Prototyping', 'Usability testing', 'Accessibility'],
  files: FILES,
  projects: PROJECTS,
  sections: SECTIONS,
  points: POINTS,
  tests: TESTS,
  // Example questions offered in "Try your twin".
  trySuggestions: [
    'How do you write a problem statement?',
    'How small can a button be?',
    'How do you run a usability test?',
  ],
  // The returning user behind "Use a demo account": the twin above in progress, plus one published twin.
  account: {
    user: { name: 'Lena Park', email: 'lena@fieldwork.example', role: 'Design director', company: 'Fieldwork Studio', years: '27', skills: ['UX research', 'Interaction design', 'Design systems', 'Usability testing'] },
    building: 'twin-design',
    published: {
      id: 'twin-counter',
      name: 'Café Counter App',
      files: [{ name: 'counter_app_spec.pdf', size: 2306867, type: 'PDF' }, { name: 'pilot_notes.md', size: 31744, type: 'MD' }],
      sections: COUNTER_SECTIONS,
      points: COUNTER_POINTS,
      suggestions: ['How do baristas mark an order ready?', 'What happens during a rush?', 'How do staff sign in?'],
      match: 91,
      terms: { access: 'partners', model: 'per-answer', rate: 0.25, credit: true, escalate: true, limits: '' },
      licensees: 3,
      monthly: [82, 109, 95], // answers per month, oldest first
    },
  },
};
