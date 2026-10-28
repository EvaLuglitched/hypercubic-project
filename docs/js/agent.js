// The AI agents, simulated.
//
// Everything here is scripted so the prototype works offline and behaves the same in every usability
// session. Each function takes plain data and returns plain data, so a real model can replace them later:
// for example, make answerNote() and applyComment() call your API with the knowledge point's page and the
// expert's words, and map the model's reply onto the same shapes ({ state, reply, add } and { mode, text, reply }).

import { CATEGORIES, categoryFor, clonePoint, projectName } from './demo.js';

export const AGENT_MODE = 'mock';

const DEMO_NAMES = new Set(CATEGORIES.flatMap((c) => c.files.map((f) => f.name)));
export const isDemoFile = (name) => DEMO_NAMES.has(name);

const STOP = new Set('a an and are as at be but by can do does for from how i if in into is it its me my no not of on or our so that the their them then there these they this to up was we what when where which who why will with you your do i\'m im should could would about have has had just get got been any some more most very also than out over'.split(' '));

export function tokenize(text) {
  // Accents are dropped first, so “café” and “cafe” are the same word.
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\-:.]+/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^[.:-]+|[.:-]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const fill = (text, name) => String(text || '').replace(/\{name\}/g, name);

// ---------- Reading files and building the mind map ----------

export function thinkingSteps(files) {
  return [
    ...files.map((f) => ({ agent: 'Knowledge agent', text: `Reading ${f.name}` })),
    { agent: 'Validate agent', text: 'Checking that each file fits the rest of your information' },
    { agent: 'Validate agent', text: 'Looking for things that don’t match between files' },
    { agent: 'Validate agent', text: 'Checking that every format is readable' },
    { agent: 'Validate agent', text: 'Checking that the steps and hand-offs make sense' },
    { agent: 'Knowledge agent', text: 'Building your mind map' },
  ];
}

const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'file';
const titleFromFile = (name) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

// Markdown headings (or short title-like lines in plain text), each with the text under it.
function partsFrom(text) {
  const lines = String(text || '').split(/\r?\n/);
  const parts = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) { current = { title: m[1].trim(), body: '' }; parts.push(current); } else if (current) current.body += ` ${line.trim()}`;
  }
  if (parts.length >= 2) return parts;
  return lines.map((l) => l.trim()).filter((l) => l.length > 3 && l.length < 60 && !/[.,;:]$/.test(l) && /^[A-Z0-9]/.test(l)).map((title) => ({ title, body: '' }));
}

function firstSentence(text) {
  const body = String(text || '').replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim();
  const m = body.match(/^(.{20,220}?[.!?])(\s|$)/);
  return m ? m[1] : body.slice(0, 180);
}

function pointsFromFile(file, section) {
  const base = titleFromFile(file.name);
  const parts = partsFrom(file.text).slice(0, 6);
  const list = parts.length >= 2 ? parts : [`What ${base} covers`, `Key steps in ${base}`, `Edge cases in ${base}`, `Who relies on ${base}`].map((title) => ({ title, body: '' }));
  return list.map((part, i) => {
    const said = firstSentence(part.body) || (i === 0 ? firstSentence(file.text) : '');
    return {
      id: `${section}-${i}`,
      section,
      title: part.title.length > 48 ? part.title.slice(0, 46) + '…' : part.title,
      status: i === 0 && said ? 'complete' : 'missing',
      // `placeholder` summaries are only shown on the map; they never go into what the twin knows.
      summary: said || `${file.name} mentions this, but doesn’t explain it.`,
      placeholder: !said,
      question: `What should someone know about “${part.title}” that isn’t written down in ${file.name}?`,
      sources: [{ file: file.name, where: parts.length >= 2 ? `“${part.title}”` : 'whole file' }],
      example: '',
      links: i > 0 ? [`${section}-0`] : [],
      keywords: tokenize(part.title),
    };
  });
}

// Turns uploaded files into sections and knowledge points, keeping what the twin already has.
export function buildKnowledge(files, existing = { sections: [], points: [] }) {
  const sections = existing.sections.map((s) => ({ ...s }));
  const points = existing.points.slice();
  const have = new Set(points.map((p) => p.id));

  const demoNames = new Set(files.filter((f) => isDemoFile(f.name)).map((f) => f.name));
  for (const c of CATEGORIES) {
    if (!c.files.some((f) => demoNames.has(f.name))) continue;
    for (const s of c.sections) if (!sections.some((x) => x.id === s.id)) sections.push({ ...s });
    for (const p of c.points) {
      if (have.has(p.id) || !p.sources.some((src) => demoNames.has(src.file))) continue;
      points.push(clonePoint(p));
      have.add(p.id);
    }
  }
  for (const file of files.filter((f) => !isDemoFile(f.name))) {
    const id = 'sec-' + slug(file.name);
    if (sections.some((s) => s.id === id)) continue;
    sections.push({ id, title: titleFromFile(file.name).slice(0, 32) });
    points.push(...pointsFromFile(file, id));
  }
  return { sections: sections.filter((s) => points.some((p) => p.section === s.id)), points };
}

// ---------- A knowledge point as a document ----------
//
// The page for a point reads like a document about one process: a summary, the challenge, why it matters,
// how it's done and the solution (the rule your twin will give). Examples from each project are folded
// under the part they illustrate. Where the files say nothing, or two projects or files differ, the agent
// leaves a yellow note for the expert to answer in place.

export const DOC_SECTIONS = [
  { key: 'summary', label: 'Summary' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'why', label: 'Why' },
  { key: 'how', label: 'How' },
  { key: 'solution', label: 'Solution' },
];
export const sectionLabel = (key) => (DOC_SECTIONS.find((s) => s.key === key) || DOC_SECTIONS[0]).label;

let seq = 0;
const bid = (prefix) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

export function sentence(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?)”"]$/.test(capped) ? capped : capped + '.';
}

// The notes the agent leaves on a point that isn't validated: what's missing, or what differs.
// Story points describe theirs in `gap`; older points and points from uploaded files are read from
// `question`, `example` and `conflict`.
export function gapsFor(point) {
  if (point.status === 'complete') return [];
  if (point.gap) return [{ kind: point.status === 'conflict' ? 'conflict' : 'missing', ...point.gap, at: point.gap.at || 'how' }];
  if (point.status === 'conflict' && point.conflict) {
    return [{ kind: 'conflict', at: 'solution', note: point.conflict.text, sides: point.conflict.sides, ask: point.question || 'Which one is right?', example: point.example || '' }];
  }
  return [{
    kind: 'missing', at: 'how',
    note: point.placeholder || !point.summary ? `Your files mention ${point.title}, but none of them explain it.` : 'Your files don’t say how this is done.',
    ask: point.question || `What should someone new know about ${point.title}?`,
    example: point.example || '',
    sketch: Boolean(point.sketch),
  }];
}

// Builds the page the first time a point is opened. It's then saved on the point, so answers,
// comments and edits stay.
export function buildPage(point) {
  const blocks = Object.fromEntries(DOC_SECTIONS.map((s) => [s.key, []]));
  const p = (text) => ({ id: bid('b'), t: 'p', text });
  if (point.summary && !point.placeholder) blocks.summary.push(p(point.summary));
  if (point.challenge) blocks.challenge.push(p(point.challenge));
  if (point.why) blocks.why.push(p(point.why));
  if (Array.isArray(point.how)) blocks.how.push({ id: bid('b'), t: 'steps', items: point.how.slice() });
  else if (point.how) blocks.how.push(p(point.how));
  if (point.solution) blocks.solution.push(p(point.solution));
  const gaps = gapsFor(point);
  const home = (at) => (at && blocks[at] ? at : blocks.how.length || gaps.some((g) => g.at === 'how') ? 'how' : 'summary');
  for (const f of [].concat(point.figure || [])) blocks[home(f.at)].push({ id: bid('b'), t: 'figure', fig: f });
  if (point.excerpt) blocks[home(gaps[0]?.at || 'summary')].push({ id: bid('b'), t: 'figure', fig: { kind: 'code', ...point.excerpt } });
  const groups = {};
  for (const ex of point.examples || []) (groups[home(ex.at)] = groups[home(ex.at)] || []).push(ex);
  for (const [at, items] of Object.entries(groups)) blocks[at].push({ id: bid('b'), t: 'examples', items });
  return {
    v: 1,
    blocks,
    notes: gaps.map((g) => ({ id: bid('n'), state: 'open', answer: '', tries: 0, ...g })),
    comments: [],
    changed: false,
  };
}

// The expert answered a note (typed, spoken, sent in the chat or sketched). Returns what happens next:
// 'more' asks for a fuller answer, 'clarify' asks which of two disagreeing files to trust, and 'done'
// says where the answer goes in the document.
export function answerNote(note, text, { kind = 'text' } = {}) {
  if (kind === 'sketch') {
    if (note.sketch) return { state: 'done', reply: 'Thanks for the sketch. It’s now part of this section.', add: null };
    return { state: 'more', reply: 'Thanks, I’ve added your sketch. Add a sentence or two as well, so your twin can explain it in words.' };
  }
  if (wordCount(text) < 4 && !note.tries) {
    return { state: 'more', reply: 'Could you say a little more? One or two full sentences help your twin explain this to someone new.' };
  }
  if (note.kind === 'conflict' && note.sides && note.sides[1] && !note.clarified) {
    const other = note.sides[1];
    return {
      state: 'clarify',
      reply: `Your answer doesn’t match ${other.source}, which says: “${other.claim}” Should your twin follow your answer?`,
      choices: [{ id: 'keep', label: 'Keep my answer' }, { id: 'edit', label: 'Edit my answer' }],
    };
  }
  const rule = note.kind === 'differ';
  return {
    state: 'done',
    reply: rule ? 'Added as a rule, so your twin knows when each approach applies.' : `Added to ${sectionLabel(note.at)}.`,
    add: { at: note.at, text: sentence(text), rule },
  };
}

// The expert commented on a passage they selected. "Should be …" or a few words on a few words replaces
// the selection; a question becomes a new note to answer; anything else is added to the paragraph.
export function applyComment(blockText, quote, comment) {
  const c = String(comment || '').trim();
  const explicit = c.match(/^(?:should be|change (?:it |this )?to|replace (?:it |this )?with|make it|instead:?)\s+(.+)$/i);
  const swap = explicit ? explicit[1].replace(/[.]$/, '') : (wordCount(c) <= 4 && wordCount(quote) <= 4 && !/\?$/.test(c) ? c.replace(/[.]$/, '') : null);
  if (swap && blockText.includes(quote)) {
    return { mode: 'replace', text: blockText.replace(quote, swap), inserted: swap, reply: `Changed “${quote}” to “${swap}”.` };
  }
  if (/\?$/.test(c)) {
    return { mode: 'ask', text: blockText, reply: 'Your files don’t answer that. I’ve added a note below, so you can answer it here.' };
  }
  const s = sentence(c);
  return { mode: 'add', text: `${blockText} ${s}`, inserted: s, reply: 'Updated. I added your comment to this paragraph.' };
}

// Where something said in the chat or the voice window belongs, when no note is waiting for an answer.
export function placeFor(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(because|so that|matters|important|reason)\b/.test(t)) return 'why';
  if (/\b(first|then|next|step|always|never|start|check)\b/.test(t)) return 'how';
  return 'summary';
}

// Plain text of a page, for what the twin knows once the point is validated.
export function pageText(page, keys = ['summary', 'how', 'solution']) {
  const parts = [];
  for (const key of keys) {
    for (const b of page.blocks[key] || []) {
      if (b.t === 'p') parts.push(b.text);
      if (b.t === 'steps') parts.push(b.items.map((s) => sentence(s)).join(' '));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ---------- Final validation and "Try your twin" ----------

export function similarity(expert, reference, keywords = []) {
  const a = new Set(tokenize(expert));
  if (!a.size) return 0;
  const b = new Set(tokenize(reference));
  const shared = [...a].filter((w) => b.has(w)).length;
  const jaccard = shared / new Set([...a, ...b]).size;
  const text = String(expert).toLowerCase();
  const kw = keywords.length ? keywords.filter((k) => text.includes(k.toLowerCase())).length / keywords.length : jaccard;
  return Math.round(Math.min(1, 0.7 * kw + 0.3 * Math.min(1, jaccard * 2.5)) * 100);
}

export function testQuestionsFor(twin) {
  const ids = new Set(twin.points.map((p) => p.id));
  const story = categoryFor(twin);
  const fromDemo = story ? story.tests.filter((q) => q.points.every((id) => ids.has(id))) : [];
  if (fromDemo.length) return fromDemo;
  // A twin built from the expert's own files: ask about its first few points.
  return twin.points.slice(0, 3).map((p, i) => ({
    id: `q${i + 1}`, points: [p.id],
    question: `Someone new asks you about “${p.title}”. What do you tell them?`,
    answer: p.final || p.summary,
    partial: `I only know part of this: ${p.summary}`,
    keywords: (p.keywords || tokenize(p.title)).slice(0, 5),
    example: p.final || p.summary,
  }));
}

// What the twin says for a test question, based on what has been validated.
export function twinTestAnswer(twin, q, name) {
  const points = q.points.map((id) => twin.points.find((p) => p.id === id)).filter(Boolean);
  const unsure = points.filter((p) => p.status !== 'complete');
  if (!points.length) return { text: 'I don’t have this in my knowledge yet.', caveat: true, unsure: [] };
  if (unsure.length) return { text: fill(q.partial, name), caveat: true, unsure: unsure.map((p) => p) };
  return { text: fill(q.answer, name), caveat: false, unsure: [] };
}

// Example questions for "Try your twin": the published demo twins and the demo stories bring their own.
export function trySuggestionsFor(twin) {
  if (twin.suggestions) return twin.suggestions;
  const story = categoryFor(twin);
  if (story) return story.trySuggestions;
  return twin.points.filter((p) => p.status === 'complete').slice(0, 3).map((p) => `What should I know about “${p.title}”?`);
}

// Answers a question in "Try your twin" from the twin's knowledge points, with citations.
export function askTwin(twin, question, name) {
  const words = tokenize(question);
  let best = null;
  let bestScore = 0;
  for (const p of twin.points) {
    const hay = new Set(tokenize([p.title, p.summary, p.final, ...(p.keywords || [])].join(' ')));
    let score = 0;
    for (const w of words) if (hay.has(w)) score += (p.keywords || []).includes(w) ? 2 : 1;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  if (!best || bestScore < 2) {
    return { unknown: true, text: `I don’t know. ${name} didn’t cover that in this twin, so I won’t guess.`, cites: [] };
  }
  // The general rule first, then one example from a project, the way the expert would explain it.
  const rule = best.status === 'complete'
    ? (best.final || best.solution || best.summary)
    : (best.summary && !best.placeholder ? best.summary : `${name} hasn’t explained this yet.`);
  const ex = (best.examples || [])[0];
  const text = ex ? `${rule}\n\nFor example, on ${projectName(twin, ex.project)}: ${ex.text}` : rule;
  return {
    text,
    point: best.title,
    cites: [...new Set((best.sources || []).map((s) => s.file))],
    caveat: best.status !== 'complete' ? `${name} hasn’t validated this part yet, so check it before you act.` : '',
  };
}
