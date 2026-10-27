// Demo story: Digital Product Design. Nothing here is real data.
// A design director captures how Brewline, a café order-ahead app, was designed: from the value
// proposition to launch. The five sections follow the UX workflow in order (clockwise on the mind map).
// Edit this file to change the story. In TESTS, {name} becomes the expert's first name.

const FILES = [
  { name: 'brewline_product_brief.pdf', size: 1992294, type: 'PDF' },
  { name: 'research_synthesis.pdf', size: 6606028, type: 'PDF' },
  { name: 'figma_flows_export.pdf', size: 12373196, type: 'PDF' },
  { name: 'design_system.md', size: 59392, type: 'MD' },
  { name: 'usability_test_round2.docx', size: 880640, type: 'DOCX' },
  { name: 'handover_call_0918.txt', size: 96256, type: 'TXT' },
];

const SECTIONS = [
  { id: 'strategy', title: '1. Value and strategy' },
  { id: 'research', title: '2. User research' },
  { id: 'structure', title: '3. Structure and flows' },
  { id: 'interface', title: '4. Interface design' },
  { id: 'ship', title: '5. Test and ship' },
];

// Lines up the columns of the file excerpts below, which are shown in a monospace font.
const table = (rows, widths) => rows
  .map((row) => row.map((cell, i) => (i < widths.length ? cell.padEnd(widths[i]) : cell)).join('').trimEnd())
  .join('\n');

// status: complete | missing (a gap the expert needs to fill) | conflict (two sources disagree)
const POINTS = [
  // ----- 1. Value and strategy -----
  {
    id: 'st-value', section: 'strategy', title: 'Value proposition', status: 'complete',
    summary: 'For commuters who buy coffee on the way to work, Brewline lets you order from your local café and pick it up in five minutes, without the line. Unlike chain apps, it works with independent cafés.',
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 2' }, { file: 'handover_call_0918.txt', where: '02:15' }],
    excerpt: {
      file: 'brewline_product_brief.pdf', where: 'page 2, value proposition canvas', lang: 'Canvas',
      code: table([
        ['CUSTOMER JOBS', 'Get coffee on the way to work'],
        ['PAINS', 'The line takes 10+ minutes at 7:45'],
        ['', '“I miss my train if the line is long”'],
        ['GAINS', 'Coffee is ready when I walk in'],
        ['PAIN RELIEVERS', 'Order ahead, pick a pickup time'],
        ['GAIN CREATORS', '“Order my usual” in one tap'],
      ], [17]),
    },
    links: ['st-segments', 'rs-problem'], keywords: ['value', 'proposition', 'promise', 'pitch', 'brewline', 'canvas', 'line'],
  },
  {
    id: 'st-segments', section: 'strategy', title: 'Target customers', status: 'complete',
    summary: 'Two groups. Commuters who buy coffee at the same café at least three times a week use the app. Owners of independent cafés with one to three shops pay for it: a flat $49 a month, with no cut of each order.',
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 3' }],
    links: ['rs-personas'], keywords: ['customers', 'target', 'segments', 'users', 'owners', 'commuters', 'audience', 'pays', 'price'],
  },
  {
    id: 'st-competitors', section: 'strategy', title: 'Competitors', status: 'complete',
    summary: 'Chain coffee apps are fast, but they only work in their own shops. Delivery apps take up to 30% of each order, which small cafés can’t afford. The biggest competitor is the line itself, because it costs nothing.',
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 5' }],
    links: ['st-value'], keywords: ['competitors', 'competition', 'chain', 'delivery', 'alternatives', 'market', 'landscape'],
  },
  {
    id: 'st-metrics', section: 'strategy', title: 'Success metrics', status: 'missing',
    summary: 'The brief lists six metrics for the pilot: downloads, sign-ups, orders per café, repeat orders, pickup wait time and app store rating.',
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 6' }, { file: 'handover_call_0918.txt', where: '04:10' }],
    question: 'Your brief lists six metrics, but not which one matters most. Which number tells you Brewline is working, and why that one?',
    example: 'Repeat orders: the share of customers who order again within 14 days. Downloads looked great in the pilot, but only repeat orders show that picking up really was faster than the line.',
    links: ['sh-launch'], keywords: ['metrics', 'metric', 'success', 'kpi', 'measure', 'number', 'repeat', 'working', 'north', 'star'],
  },

  // ----- 2. User research -----
  {
    id: 'rs-recruit', section: 'research', title: 'Recruiting participants', status: 'missing',
    summary: 'The research had 14 interviews, with 8 commuters and 6 café owners, plus two mornings watching the 7:30 rush in partner cafés.',
    sources: [{ file: 'research_synthesis.pdf', where: 'page 2' }],
    question: 'The synthesis doesn’t say how you found these people. How do you recruit and screen participants, so you talk to the right ones?',
    example: 'I leave a card on the counter of three partner cafés: a free coffee for 30 minutes of their time. Then I screen by phone. They must buy coffee on the way to work at least three times a week. I never recruit friends or coworkers, because they’re too polite to criticize.',
    links: ['rs-synthesis', 'sh-test'], keywords: ['recruit', 'recruiting', 'participants', 'screen', 'screener', 'find', 'interviews', 'incentive'],
  },
  {
    id: 'rs-synthesis', section: 'research', title: 'Affinity mapping', status: 'complete',
    summary: 'Every quote from the interviews went on a sticky note, and the team grouped them in FigJam. Five themes came out. The biggest one: people don’t trust that their coffee will be ready when they arrive.',
    sources: [{ file: 'research_synthesis.pdf', where: 'page 6' }],
    links: ['rs-journey', 'rs-problem'], keywords: ['affinity', 'synthesis', 'themes', 'sticky', 'insights', 'figjam', 'trust'],
  },
  {
    id: 'rs-personas', section: 'research', title: 'Personas', status: 'complete',
    summary: 'Maya, 34, is a commuter. She orders the same oat latte four mornings a week and has six minutes between her bus and her train. Theo, 52, owns two cafés and runs everything from his phone, between customers.',
    sources: [{ file: 'research_synthesis.pdf', where: 'pages 9–10' }],
    links: ['st-segments', 'fl-order'], keywords: ['personas', 'persona', 'maya', 'theo', 'users', 'archetypes'],
  },
  {
    id: 'rs-journey', section: 'research', title: 'Morning journey map', status: 'complete',
    summary: 'The morning journey has five stages: leave home, decide, order, travel and pick up. The low point is pickup. People can’t tell whether their order is ready, so they wait at the counter anyway.',
    sources: [{ file: 'research_synthesis.pdf', where: 'page 12' }],
    links: ['fl-busy'], keywords: ['journey', 'map', 'stages', 'morning', 'pickup', 'emotions', 'low'],
  },
  {
    id: 'rs-problem', section: 'research', title: 'Problem statement', status: 'complete',
    summary: 'How might we make picking up coffee faster than waiting in line, even at the busiest moment of the morning? Every design decision is checked against this question.',
    sources: [{ file: 'research_synthesis.pdf', where: 'page 14' }],
    links: ['st-value'], keywords: ['problem', 'statement', 'hmw', 'might', 'define', 'question', 'goal'],
  },

  // ----- 3. Structure and flows -----
  {
    id: 'fl-ia', section: 'structure', title: 'Information architecture', status: 'complete',
    summary: 'Four tabs: Home, Menu, Orders and Account. In a card sort with 12 people, “Order my usual” ended up on Home instead of under Orders, so it’s the first thing you see.',
    sources: [{ file: 'figma_flows_export.pdf', where: 'page 2, sitemap' }],
    links: ['fl-order'], keywords: ['information', 'architecture', 'ia', 'sitemap', 'navigation', 'tabs', 'card', 'sort', 'structure'],
  },
  {
    id: 'fl-order', section: 'structure', title: 'Order flow', status: 'complete',
    summary: 'Four steps: choose a café, choose drinks, choose a pickup time, then pay. Returning customers can skip straight to paying with “Order my usual”.',
    sources: [{ file: 'figma_flows_export.pdf', where: 'page 5, user flow' }],
    links: ['fl-checkout'], keywords: ['flow', 'order', 'ordering', 'steps', 'pickup', 'time', 'usual', 'reorder'],
  },
  {
    id: 'fl-checkout', section: 'structure', title: 'Guest checkout', status: 'conflict',
    summary: 'Checkout is the last step of the order flow. Customers pay with Apple Pay, Google Pay or a card.',
    sources: [{ file: 'usability_test_round2.docx', where: 'finding 1' }, { file: 'brewline_product_brief.pdf', where: 'page 4' }],
    excerpt: {
      file: 'usability_test_round2.docx', where: 'finding 1', lang: 'Finding',
      code: 'Finding 1 · Severity: high\n6 of 8 first-time participants left at “Create account”.\nP4: “I just want a coffee, not a relationship.”\nRecommendation: let guests order, and offer an\naccount after their first pickup.',
    },
    conflict: {
      text: 'Your usability test and your product brief disagree about when customers create an account.',
      sides: [
        { source: 'usability_test_round2.docx', claim: 'Six of eight first-time participants gave up at the sign-up screen. Let people order as guests.' },
        { source: 'brewline_product_brief.pdf', claim: 'Every customer creates an account before their first order, for the loyalty program.' },
      ],
    },
    question: 'Should first-time customers have to create an account before they can order?',
    example: 'First-time customers order as guests, and we offer to save their details after their first pickup. A sign-up screen lost us six of eight first orders in testing. The brief was written before we tested it.',
    links: ['fl-order', 'sh-prioritize'], keywords: ['guest', 'guests', 'checkout', 'account', 'sign', 'signup', 'without', 'login', 'register', 'pay'],
  },
  {
    id: 'fl-mvp', section: 'structure', title: 'What we cut from version 1', status: 'missing',
    summary: 'The brief lists 11 features for version 1. The app shipped with 6.',
    sources: [{ file: 'brewline_product_brief.pdf', where: 'page 8' }, { file: 'handover_call_0918.txt', where: '11:30' }],
    question: 'What did you cut from version 1, and how did you decide?',
    example: 'We cut loyalty points, tipping, group orders, dark mode and the café map. If a feature didn’t make the morning pickup faster, it waited for version 2. Loyalty was the hardest cut, because sales wanted it.',
    links: ['st-metrics', 'fl-checkout'], keywords: ['mvp', 'scope', 'cut', 'features', 'version', 'prioritize', 'roadmap', 'v1'],
  },
  {
    id: 'fl-wireframes', section: 'structure', title: 'Wireframes', status: 'complete',
    summary: 'Low fidelity first: grey boxes with real words, never lorem ipsum. Three layouts for the menu screen were tested on paper with five people before anything was drawn in Figma.',
    sources: [{ file: 'figma_flows_export.pdf', where: 'pages 8–11' }],
    links: ['ui-visual'], keywords: ['wireframes', 'wireframe', 'fidelity', 'paper', 'sketches', 'layouts', 'lorem'],
  },
  {
    id: 'fl-busy', section: 'structure', title: 'When the café is too busy', status: 'missing',
    summary: '',
    sources: [{ file: 'handover_call_0918.txt', where: '08:45' }],
    question: 'What should the app show when a café is too busy to have an order ready on time? Sketch the screen with the pen if that’s easier.',
    example: 'Never promise a time the café can’t keep. When more than 15 orders are open, the app moves the earliest pickup time back and says why: “Busy right now. Earliest pickup 8:25.” Staff can also pause new orders from the counter tablet.',
    links: ['fl-order', 'rs-journey'], keywords: ['busy', 'rush', 'capacity', 'full', 'edge', 'pause', 'late', 'delay', 'queue'],
  },

  // ----- 4. Interface design -----
  {
    id: 'ui-visual', section: 'interface', title: 'Visual direction', status: 'complete',
    summary: 'Warm and calm, not techy: a cream background, one deep green for actions, and photos of each café’s own drinks. The type is large, because people read the app while walking.',
    sources: [{ file: 'figma_flows_export.pdf', where: 'page 14' }, { file: 'design_system.md', where: 'Colour' }],
    links: ['ui-system'], keywords: ['visual', 'style', 'colour', 'color', 'colours', 'brand', 'look', 'typography', 'type', 'photos'],
  },
  {
    id: 'ui-system', section: 'interface', title: 'Design system', status: 'complete',
    summary: 'Built on an 8-point grid, with tokens for colour, type and spacing. The components live in one Figma library, and each one has a code component with the same name.',
    sources: [{ file: 'design_system.md', where: 'Foundations' }],
    links: ['ui-targets', 'sh-handoff'], keywords: ['system', 'tokens', 'components', 'library', 'grid', 'spacing', 'figma'],
  },
  {
    id: 'ui-targets', section: 'interface', title: 'Tap target sizes', status: 'conflict',
    summary: 'Button and tap target sizes are tokens in the design system, so every screen uses the same ones.',
    sources: [{ file: 'design_system.md', where: 'Sizing' }, { file: 'usability_test_round2.docx', where: 'finding 5' }],
    excerpt: {
      file: 'design_system.md', where: 'Sizing tokens', lang: 'CSS',
      code: '/* Sizing */\n--tap-min:        44px;\n--btn-height:     48px;\n--btn-height-sm:  32px;  /* quantity stepper, menu filters */',
    },
    conflict: {
      text: 'Your usability test and your design system disagree about how small a button can be.',
      sides: [
        { source: 'usability_test_round2.docx', claim: 'Three participants missed the 32-pixel quantity buttons on the bus. Every tap target should be at least 44 by 44 points.' },
        { source: 'design_system.md', claim: 'Compact buttons are 32 pixels high, for the quantity stepper and the menu filters.' },
      ],
    },
    question: 'What’s the smallest tap target allowed in the customer app?',
    example: 'Every tap target in the customer app is at least 44 by 44 points, because people tap while walking or on a bus. The 32-pixel size is only for the café dashboard on a desktop, where people use a mouse. The icon can stay small, but its tap area can’t.',
    links: ['ui-a11y', 'ui-system'], keywords: ['tap', 'target', 'targets', 'touch', 'size', 'buttons', 'button', '44', '32', 'small', 'pixels'],
  },
  {
    id: 'ui-a11y', section: 'interface', title: 'Accessibility', status: 'complete',
    summary: 'Every screen meets WCAG 2.2 AA: text contrast of at least 4.5 to 1, layouts that still work with text at 200%, and every action available with VoiceOver and TalkBack. Colour is never the only way to show an order’s status.',
    sources: [{ file: 'design_system.md', where: 'Accessibility' }],
    links: ['ui-targets'], keywords: ['accessibility', 'accessible', 'a11y', 'wcag', 'contrast', 'voiceover', 'talkback', 'screen', 'reader'],
  },
  {
    id: 'ui-prototype', section: 'interface', title: 'Prototyping', status: 'missing',
    summary: 'Your Figma file has four clickable prototypes, one for each main flow.',
    sources: [{ file: 'figma_flows_export.pdf', where: 'page 20' }],
    question: 'When is a Figma prototype enough, and when do you ask an engineer to build a coded one?',
    example: 'Figma is enough for layout and flow. I ask for a coded prototype when timing matters, like the “Your order is ready” notification and the pickup countdown, because Figma can’t fake real waiting.',
    links: ['sh-test'], keywords: ['prototype', 'prototypes', 'prototyping', 'clickable', 'figma', 'coded', 'code', 'fidelity'],
  },

  // ----- 5. Test and ship -----
  {
    id: 'sh-test', section: 'ship', title: 'Usability testing', status: 'complete',
    summary: 'Round 2 had eight participants on their real morning commute, using their own phones at the bus stop, on the bus and in the café. Three tasks: order your usual drink, change the pickup time, and check whether the order is ready. The average System Usability Scale score rose from 61 in round 1 to 74.',
    sources: [{ file: 'usability_test_round2.docx', where: 'method' }],
    links: ['sh-prioritize'], keywords: ['usability', 'test', 'tests', 'testing', 'participants', 'tasks', 'sus', 'round', 'run'],
  },
  {
    id: 'sh-prioritize', section: 'ship', title: 'Prioritizing findings', status: 'missing',
    summary: 'Round 2 found 14 usability problems, each rated low, medium or high.',
    sources: [{ file: 'usability_test_round2.docx', where: 'findings summary' }],
    excerpt: {
      file: 'usability_test_round2.docx', where: 'findings summary', lang: 'Table',
      code: `${table([
        ['#', 'Finding', 'Seen by', 'Severity'],
        ['1', 'Left at “Create account”', '6 of 8', 'High'],
        ['2', 'Missed the pickup-time button', '5 of 8', 'High'],
        ['3', 'Thought “Ready” meant “Paid”', '3 of 8', 'Medium'],
        ['4', 'Couldn’t find oat milk', '2 of 8', 'Low'],
      ], [3, 32, 9])}\n   … and 10 more`,
    },
    question: 'There isn’t time to fix all 14 problems before launch. How do you decide which ones get fixed?',
    example: 'Severity first, then how many people hit it. Anything that stops someone from finishing an order gets fixed before launch, even if only one person hit it. Next comes whatever most participants struggled with. Cosmetic issues go to the backlog, and I re-test the fixes with three people.',
    links: ['sh-test', 'fl-checkout'], keywords: ['prioritize', 'prioritise', 'priority', 'findings', 'severity', 'fix', 'problems', 'issues', 'backlog'],
  },
  {
    id: 'sh-handoff', section: 'ship', title: 'Developer handoff', status: 'complete',
    summary: 'A design is ready for handoff when every state is drawn: default, loading, empty, error and disabled. Each screen links to its ticket, and the designer walks the engineers through the flow in a 30-minute call.',
    sources: [{ file: 'design_system.md', where: 'Handoff' }, { file: 'handover_call_0918.txt', where: '15:20' }],
    links: ['ui-system'], keywords: ['handoff', 'hand-off', 'developers', 'engineers', 'specs', 'annotations', 'ready', 'states', 'build'],
  },
  {
    id: 'sh-launch', section: 'ship', title: 'Launch and measure', status: 'complete',
    summary: 'Brewline launched in 3 cafés first, then 20. A dashboard tracks repeat orders, the time from order to pickup, and orders cancelled at the counter. The team reviews it every Monday.',
    sources: [{ file: 'handover_call_0918.txt', where: '19:45' }],
    links: ['st-metrics'], keywords: ['launch', 'release', 'measure', 'analytics', 'dashboard', 'rollout', 'data', 'monday'],
  },
  {
    id: 'sh-mentor', section: 'ship', title: 'What new designers get wrong', status: 'missing',
    summary: '',
    sources: [{ file: 'handover_call_0918.txt', where: '23:05' }],
    question: 'What mistake do new designers make most often on this product?',
    example: 'They design for a quiet Tuesday afternoon. The real test is 8 a.m. on a Monday: twenty orders waiting, one barista, and a customer holding a bus rail with one hand. Design for the rush.',
    links: ['fl-busy', 'ui-targets'], keywords: ['new', 'designers', 'mistake', 'mistakes', 'wrong', 'junior', 'newcomers', 'advice'],
  },
];

// Final validation: the twin and the expert answer the same questions, then we compare.
const TESTS = [
  {
    id: 'q1', points: ['fl-checkout'],
    question: 'Your product manager wants every customer to create an account before their first order. What do you tell them?',
    answer: 'Let first-time customers order as guests, and offer to save their details after their first pickup. In testing, the sign-up screen lost six of eight first orders. The product brief says otherwise, but it was written before we tested.',
    partial: 'My sources disagree. The product brief says customers sign up first, but the usability test says guests should be able to order. Check with {name} before you decide.',
    keywords: ['guest', 'after', 'first', 'account', 'test', 'order'],
    example: 'Let them order as guests, and offer an account after their first pickup. A sign-up screen lost most first orders in our test.',
  },
  {
    id: 'q2', points: ['sh-prioritize'],
    question: 'Usability testing found 14 problems, and there’s one sprint left before launch. What gets fixed?',
    answer: 'Rate each problem by severity, then by how many participants hit it. Anything that stops someone from finishing an order gets fixed first, even if only one person hit it. Then whatever most participants struggled with. Cosmetic issues go to the backlog, and the fixes are re-tested with three people.',
    partial: 'Probably the high-severity problems first. I can’t say how {name} decides beyond that, because {name} hasn’t confirmed it yet.',
    keywords: ['severity', 'order', 'participants', 'backlog', 'test', 'first'],
    example: 'Severity first: anything that stops people from finishing an order gets fixed. Then the problems most participants hit. Cosmetic issues go to the backlog, and I re-test the fixes.',
  },
  {
    id: 'q3', points: ['ui-targets'],
    question: 'A developer asks if the quantity buttons can be 32 pixels, so they fit on the menu card. What do you say?',
    answer: 'No. Every tap target in the customer app is at least 44 by 44 points, because people order while walking or on a bus. The 32-pixel size is only for the café dashboard on a desktop. The icon can stay small, but its tap area can’t.',
    partial: 'My sources disagree. The design system allows 32 pixels, but the usability test asks for 44. Check with {name} before you build it.',
    keywords: ['44', 'tap', 'bus', 'desktop', 'area', 'small'],
    example: 'No, 44 by 44 points minimum, because people tap these on a moving bus. 32 is only for the desktop dashboard. The icon can stay small, but the tap area can’t.',
  },
];

// The demo account's published twin: the counter tablet the café staff use.
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
  summary: 'How a design director took a café order-ahead app from its value proposition to launch.',
  twinName: 'Brewline App Design',
  newcomer: 'a new designer',
  roleExample: 'Lead product designer',
  uploadHint: 'Product briefs, research notes, Figma exports, design system docs, test reports, meeting transcripts.',
  skills: ['UX research', 'Value propositions', 'Information architecture', 'Interaction design', 'Visual design', 'Design systems', 'Prototyping', 'Usability testing', 'Accessibility'],
  files: FILES,
  sections: SECTIONS,
  points: POINTS,
  tests: TESTS,
  // Example questions offered in "Try your twin".
  trySuggestions: [
    'What is Brewline’s value proposition?',
    'Can customers order without an account?',
    'How do we run usability tests here?',
  ],
  // The returning user behind "Use a demo account": the twin above in progress, plus one published twin.
  account: {
    user: { name: 'Lena Park', email: 'lena@brewline.example', role: 'Design director', company: 'Brewline', years: '27', skills: ['UX research', 'Interaction design', 'Design systems', 'Usability testing'] },
    building: 'twin-brewline',
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
