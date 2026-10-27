// The AI agents, simulated.
//
// Everything here is scripted so the prototype works offline and behaves the same in every usability
// session. Each function takes plain data and returns plain data, so a real model can replace them later:
// for example, make respond() call your API with the knowledge point and the conversation so far, and map
// the model's reply onto the same message shapes ({ role, heading, text, kind, ... }).

import { CATEGORIES, categoryFor, clonePoint } from './demo.js';

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

// ---------- Conversation inside a knowledge point ----------

const cite = (s) => (s.where ? `${s.file} · ${s.where}` : s.file);

export function openingMessages(point) {
  const msgs = [];
  const cites = (point.sources || []).map(cite);
  if (point.summary && !point.placeholder) {
    msgs.push({ role: 'agent', heading: 'What I know', text: `Here’s what I learned about **${point.title}** from your files.\n\n${point.summary}`, cites });
  } else {
    msgs.push({ role: 'agent', heading: 'What I know', text: `Your files mention **${point.title}**, but none of them explain it. This is knowledge only you have.`, cites });
  }
  if (point.excerpt) {
    msgs.push({ role: 'agent', heading: `From ${point.excerpt.file}`, text: 'This is the part of your files I based it on.', excerpt: point.excerpt });
  }
  if (point.status === 'complete') {
    msgs.push({ role: 'agent', heading: 'Validated', kind: 'note', text: 'You’ve already validated this point. If something has changed, tell me and I’ll add it.' });
  } else if (point.status === 'conflict' && point.conflict) {
    msgs.push({ role: 'agent', heading: 'Conflict', kind: 'conflict', text: point.conflict.text, sides: point.conflict.sides, ask: point.question });
  } else {
    msgs.push({ role: 'agent', heading: 'Open question', kind: 'gap', text: point.question || `What should your twin know about ${point.title}?` });
  }
  return msgs;
}

const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

function sentence(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?)]$/.test(capped) ? capped : capped + '.';
}

export function summarize(point, conv) {
  const lines = [];
  if (point.summary && !point.placeholder) lines.push(point.summary);
  // A one- or two-word reply ("All four") adds nothing once a fuller answer exists.
  const full = conv.answers.filter((a) => wordCount(a) >= 4);
  for (const a of full.length ? full : conv.answers) {
    const s = sentence(a);
    if (s && !lines.includes(s)) lines.push(s);
  }
  if (conv.sketches) lines.push(`Your sketch is attached as a diagram (${conv.sketches} ${conv.sketches === 1 ? 'drawing' : 'drawings'}).`);
  if (conv.overrode && point.conflict) lines.push(`${point.conflict.sides[1].source} is out of date on this point.`);
  return { lines: lines.slice(-5), sources: (point.sources || []).map((s) => s.file) };
}

const ACKS = ['Thanks, that fills the gap.', 'Got it, that helps.', 'Thank you. That’s the part I was missing.'];

// The agent's reply to something the expert typed, said, sketched or uploaded.
// Returns { stage, messages, summary? }. Stages: asking → (clarify) → summary → done.
export function respond(point, conv, input, { name, kind = 'text' } = {}) {
  if (conv.stage === 'done') {
    return { stage: 'done', addition: true, messages: [{ role: 'agent', heading: 'Added', text: `Thanks, ${name}. I’ve added that to **${point.title}**. It stays validated.` }] };
  }
  if (kind === 'text' && conv.stage === 'asking' && wordCount(input) < 4 && conv.followups < 1) {
    return {
      stage: 'asking', followup: true,
      messages: [{ role: 'agent', heading: 'Follow-up', text: 'Could you say a little more? One or two full sentences help your twin explain this to someone new.' }],
    };
  }
  if (point.status === 'conflict' && point.conflict && conv.stage === 'asking' && !conv.clarified) {
    const other = point.conflict.sides[1];
    return {
      stage: 'clarify',
      messages: [{
        role: 'agent', heading: 'Clarifying question', kind: 'clarify',
        text: `Thanks. Your answer doesn’t match **${other.source}**, which says: “${other.claim}”\n\nShould your twin follow your answer, or do you want to change it?`,
        choices: [{ id: 'override', label: 'Override: keep my answer', primary: true }, { id: 'refine', label: 'Refine my answer' }],
      }],
    };
  }
  const summary = summarize(point, conv);
  const lead = kind === 'sketch' ? 'Thanks for the sketch. I’ll keep it with this point.' : ACKS[conv.answers.length % ACKS.length];
  return {
    stage: 'summary', summary,
    messages: [{ role: 'agent', heading: 'Summary', kind: 'summary', text: `${lead} Here’s what your twin will know. If it looks right, press **Validate**.`, summary }],
  };
}

// The expert pressed one of the buttons in a clarifying question or a summary.
export function choose(point, conv, choice) {
  if (choice === 'override') {
    conv.clarified = true;
    conv.overrode = true;
    const summary = summarize(point, conv);
    const other = point.conflict ? point.conflict.sides[1].source : 'the other source';
    return {
      stage: 'summary', summary,
      messages: [
        { role: 'agent', heading: 'Override', text: `Understood. Your twin will follow your answer and treat **${other}** as out of date for this point.` },
        { role: 'agent', heading: 'Summary', kind: 'summary', text: 'Here’s what your twin will know. If it looks right, press **Validate**.', summary },
      ],
    };
  }
  conv.clarified = true;
  return {
    stage: 'refining',
    messages: [{ role: 'agent', heading: 'Refine', text: choice === 'refine' ? 'Okay. Tell me what to change, and I’ll check it again.' : 'What should I change or add?' }],
  };
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
  const text = best.status === 'complete'
    ? (best.final || best.summary)
    : (best.summary && !best.placeholder ? best.summary : `${name} hasn’t explained this yet.`);
  return {
    text,
    point: best.title,
    cites: [...new Set((best.sources || []).map((s) => s.file))],
    caveat: best.status !== 'complete' ? `${name} hasn’t validated this part yet, so check it before you act.` : '',
  };
}
