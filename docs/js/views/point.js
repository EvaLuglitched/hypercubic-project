// A knowledge point as a document, like a Notion page. It shows the process the twin learned: a summary,
// the challenge, why it matters, how it's done and the solution, with examples from each project folded
// underneath. Yellow notes from the agent mark what the files don't say, or where projects or files differ;
// the expert answers right under a note and presses ✓. Select any text to comment on it, and the agent
// updates the page. The floating toolbar has other ways to add to it: Type, Chat, Voice, and Pen, which marks
// up the page for the agent to read. Validate, top right, goes back to the mind map, focused on this point.
import { esc, icon, dialog, go, toast, sleep, reducedMotion, focusHeading } from '../ui.js';
import { getTwin, updateTwin } from '../store.js';
import { DOC_SECTIONS, sectionLabel, buildPage, answerNote, applyComment, placeFor, pageText, sentence } from '../agent.js';
import { projectsFor } from '../demo.js';
import { figureHTML } from '../figures.js';
import * as tour from '../tour.js';

const STATUS = { complete: 'Validated', missing: 'Needs you', conflict: 'Sources disagree' };
const NOTE_LABEL = { missing: 'Missing from your files.', differ: 'Your projects differ.', conflict: 'Your files disagree.' };
const clone = (x) => JSON.parse(JSON.stringify(x));
const nid = (prefix = 'b') => `${prefix}${Math.random().toString(36).slice(2, 9)}`;
const toolHTML = (tool, label, glyph, attrs = '') => `<button type="button" class="kp-tool" data-tool="${tool}"${attrs}>${icon(glyph, { size: 22 })}<span class="kp-tool-label">${label}</span></button>`;
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const listed = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

// ---------- Pen marks: what they look like and what they mean ----------
const MARKER = '#ffd84a'; // --marker in styles.css
const MARKER_W = 18;

// What each kind of mark tells the agent, shown above the pen tools.
const GLYPHS = {
  strike: '<rect class="g-text" x="3" y="4" width="20" height="7" rx="1.5"/><path class="g-ink" d="M1 7.5h24"/>',
  underline: '<rect class="g-text" x="3" y="2" width="20" height="7" rx="1.5"/><path class="g-ink" d="M2 13h22"/>',
  highlight: '<rect class="g-hl" x="0" y="2" width="26" height="11" rx="2"/><rect class="g-text" x="3" y="4" width="20" height="7" rx="1.5"/>',
  circle: '<rect class="g-text" x="6" y="4.5" width="14" height="6" rx="1.5"/><ellipse class="g-ink" cx="13" cy="7.5" rx="12" ry="6.5"/>',
  sketch: '<path class="g-ink" d="M1.5 11.5c2.5-6 5-7 7-2.5s4.5 4.5 6.5 0 5-6 9.5-3"/>',
};
const PEN_HINT = [['strike', 'Cross out: remove'], ['underline', 'Underline: stress'], ['highlight', 'Marker: key point'], ['circle', 'Circle: ask'], ['sketch', 'Draw: sketch']]
  .map(([k, label]) => `<span><svg class="ink-glyph" width="26" height="15" viewBox="0 0 26 15" aria-hidden="true">${GLYPHS[k]}</svg>${label}</span>`).join('');

// A smooth path through the points of a mark.
function pathD(pts) {
  const f = (n) => Math.round(n * 10) / 10;
  if (pts.length < 3) {
    const [a, b = a] = pts;
    return `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [x, y] = pts[i];
    d += `Q${f(x)} ${f(y)} ${f((x + pts[i + 1][0]) / 2)} ${f((y + pts[i + 1][1]) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${f(last[0])} ${f(last[1])}`;
}

function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// How far a point is from a mark.
function distToLine(p, pts) {
  if (pts.length < 2) return Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
  let best = Infinity;
  for (let i = 1; i < pts.length; i += 1) best = Math.min(best, segDist(p, pts[i - 1], pts[i]));
  return best;
}

// Whether a point is inside a loop drawn around it.
function inPolygon(p, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const unionBox = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

// What a mark is from its shape: the marker highlights, a closed loop is a circle, a flat stroke is a line
// (through words or under them), a dense back-and-forth is a scribble, and anything else is a drawing.
function shapeOf(s) {
  const xs = s.points.map((p) => p[0]);
  const ys = s.points.map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const size = Math.max(w, h);
  let length = 0;
  for (let i = 1; i < s.points.length; i += 1) length += Math.hypot(s.points[i][0] - s.points[i - 1][0], s.points[i][1] - s.points[i - 1][1]);
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const gap = Math.hypot(last[0] - first[0], last[1] - first[1]);
  let kind = 'sketch';
  if (s.tool === 'marker') kind = 'highlight';
  else if (w >= 14 && h >= 14 && gap < Math.max(18, 0.35 * size) && length > 1.8 * size) kind = 'circle';
  else if (w >= 12 && h <= Math.max(10, 0.25 * w)) kind = 'line';
  else if (w >= 12 && length > 3 * (w + h)) kind = 'scribble';
  // The box includes the width of the line.
  const pad = s.tool === 'marker' ? MARKER_W / 2 : 2;
  return { kind, length, box: { x0: box.x0 - pad, x1: box.x1 + pad, y0: box.y0 - pad, y1: box.y1 + pad } };
}

// Marks close to each other, in groups.
function groupNear(items, gap = 40) {
  const near = (a, b) => a.x0 - gap < b.x1 && b.x0 - gap < a.x1 && a.y0 - gap < b.y1 && b.y0 - gap < a.y1;
  const groups = [];
  for (const it of items) {
    let g = { items: [it], box: { ...it.box } };
    // Joining one group can bring this one near another, so it keeps going until nothing else is near.
    for (let other = groups.find((x) => near(x.box, g.box)); other; other = groups.find((x) => near(x.box, g.box))) {
      groups.splice(groups.indexOf(other), 1);
      g = { items: [...other.items, ...g.items], box: unionBox(other.box, g.box) };
    }
    groups.push(g);
  }
  return groups;
}

// A drawing as an image for the page: an SVG cropped to its marks, on white.
function sketchSrc(list, box) {
  const pad = 12;
  const x = Math.floor(box.x0 - pad);
  const y = Math.floor(box.y0 - pad);
  const w = Math.ceil(box.x1 - box.x0 + pad * 2);
  const h = Math.ceil(box.y1 - box.y0 + pad * 2);
  const paths = list.map((s) => (s.tool === 'marker'
    ? `<path d="${pathD(s.points)}" fill="none" stroke="${MARKER}" stroke-width="${MARKER_W}" stroke-linecap="round" stroke-linejoin="round" style="mix-blend-mode:multiply"/>`
    : `<path d="${pathD(s.points)}" fill="none" stroke="#141414" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Overlapping or touching [start, end) ranges, joined.
function mergeRanges(ranges) {
  const out = [];
  for (const [a, z] of ranges.slice().sort((p, q) => p[0] - q[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], z); else out.push([a, z]);
  }
  return out;
}

// Text with words taken out: no double spaces or spaces before punctuation, and it still starts with a
// capital and ends with a full stop if it did before.
function tidy(text, before) {
  let t = text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').replace(/^[\s,;:.]+/, '').trim();
  if (!t) return '';
  if (/^[A-Z]/.test(before)) t = t[0].toUpperCase() + t.slice(1);
  if (/[.!?]$/.test(before) && !/[.!?]$/.test(t)) t = `${t.replace(/[,;:]$/, '')}.`;
  return t;
}

// The nearest place a passage appears to where it was, or its first place when that isn't known.
function locate(text, quote, pos) {
  if (pos === undefined || pos === null) return text.indexOf(quote);
  let best = -1;
  for (let i = text.indexOf(quote); i >= 0; i = text.indexOf(quote, i + 1)) if (best < 0 || Math.abs(i - pos) < Math.abs(best - pos)) best = i;
  return best;
}

export function render(root, { id, pid }) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return; }
  const point = twin.points.find((p) => p.id === pid);
  if (!point) { location.replace(`#/twin/${id}/map`); return; }
  const section = twin.sections.find((s) => s.id === point.section) || { title: '' };
  const projects = projectsFor(twin);
  const project = (key) => projects.find((x) => x.id === key) || { id: key, name: key, what: '' };
  // Built the first time the point is opened, and saved with the twin once something changes.
  const page = point.page ? clone(point.page) : buildPage(point);
  page.marks = page.marks || []; // pages saved before the pen could mark them
  const fresh = new Set(); // blocks that just changed, flashed once
  let status = point.status;
  let editing = false;
  let destroyed = false;
  let picked = null; // the passage selected for a comment: { block, item, quote }
  let recorder = null;

  root.innerHTML = `
  <div class="point-screen kp-screen">
    <header class="point-top">
      <a class="icon-btn" href="#/twin/${id}/map" aria-label="Back to the mind map">${icon('arrowLeft')}</a>
      <div class="point-titles">
        <span class="point-crumb">${esc(twin.name)} / ${esc(section.title)}</span>
        <h1 class="point-title">${esc(point.title)}</h1>
      </div>
      <div class="point-top-actions">
        <button type="button" class="btn btn-sm rail-toggle" id="rail-toggle" aria-expanded="false" aria-controls="kp-rail">${icon('outline', { size: 18 })} Outline</button>
        <span class="status-pill" id="status-pill"></span>
        <p class="validate-hint" id="validate-hint" aria-live="polite"></p>
        <button type="button" class="btn btn-primary btn-sm kp-validate-btn" id="validate-btn" aria-describedby="validate-hint">Validate</button>
      </div>
    </header>
    <div class="kp-body">
      <nav class="kp-rail" id="kp-rail" aria-label="About this page"></nav>
      <main class="kp-main" id="main">
        <div class="kp-scroll" id="kp-scroll">
          <div class="kp-sheet" id="kp-sheet">
            <article class="kp-doc" id="kp-doc" aria-label="${esc(point.title)}"></article>
            <svg class="kp-ink" id="kp-ink" aria-hidden="true"></svg>
          </div>
          <div class="kp-dock">
            <p class="kp-pen-hint" id="pen-hint" aria-live="polite" hidden></p>
            <div class="kp-tools" id="kp-tools" role="toolbar" aria-label="Ways to add to this page">
              ${toolHTML('type', 'Type', 'type', ' aria-pressed="false"')}
              ${toolHTML('chat', 'Chat', 'chat', ' aria-expanded="false" aria-controls="chat-pop"')}
              ${toolHTML('voice', 'Voice', 'mic', ' aria-expanded="false" aria-controls="voice-pop"')}
              ${toolHTML('pen', 'Pen', 'pen')}
            </div>
            <div class="kp-tools" id="pen-tools" role="toolbar" aria-label="Pen" hidden>
              <button type="button" class="kp-tool" data-pen="back">${icon('arrowLeft', { size: 22 })}<span class="kp-tool-label">Back</span></button>
              <span class="kp-tool-sep" aria-hidden="true"></span>
              <button type="button" class="kp-tool" data-pen="pen" aria-pressed="true">${icon('pen', { size: 22 })}<span class="kp-tool-label">Pen</span></button>
              <button type="button" class="kp-tool" data-pen="marker" aria-pressed="false">${icon('marker', { size: 22 })}<span class="kp-tool-label">Marker</span></button>
              <button type="button" class="kp-tool" data-pen="eraser" aria-pressed="false">${icon('eraser', { size: 22 })}<span class="kp-tool-label">Eraser</span></button>
              <button type="button" class="kp-tool" data-pen="undo" disabled>${icon('undo', { size: 22 })}<span class="kp-tool-label">Undo</span></button>
              <span class="kp-tool-sep" aria-hidden="true"></span>
              <button type="button" class="kp-tool kp-tool-apply" data-pen="apply" disabled aria-label="Done: the agent reads your marks and updates the page">${icon('check', { size: 24 })}<span class="kp-tool-label">Done</span></button>
            </div>
          </div>
        </div>
      </main>
    </div>
    <button type="button" class="kp-comment-btn" id="comment-btn" hidden>${icon('chat', { size: 16 })} Comment</button>
    <section class="kp-pop kp-comment-pop" id="comment-pop" hidden aria-label="Comment"></section>
    <section class="kp-pop kp-chat" id="chat-pop" hidden aria-labelledby="chat-h">
      <header class="kp-pop-head"><h2 id="chat-h">Chat with the twin agent</h2><button type="button" class="icon-btn icon-btn-sm icon-btn-plain" data-close="chat" aria-label="Close the chat">${icon('close', { size: 18 })}</button></header>
      <div class="kp-chat-log" id="chat-log" role="log" aria-live="polite"></div>
      <form class="kp-chat-form" id="chat-form">
        <label class="sr-only" for="chat-input">Message to the twin agent</label>
        <textarea id="chat-input" rows="2" placeholder="Tell the agent what to add or change…"></textarea>
        <button type="submit" class="icon-btn icon-btn-dark" aria-label="Send">${icon('send')}</button>
      </form>
    </section>
    <section class="kp-pop kp-voice" id="voice-pop" hidden aria-labelledby="voice-h">
      <header class="kp-pop-head"><h2 id="voice-h">Talk to the twin agent</h2><button type="button" class="icon-btn icon-btn-sm icon-btn-plain" data-close="voice" aria-label="Close the voice window">${icon('close', { size: 18 })}</button></header>
      <div class="kp-voice-body" id="voice-body"></div>
    </section>
  </div>`;

  const $ = (sel) => root.querySelector(sel);
  const docEl = $('#kp-doc');
  const scroller = $('#kp-scroll');
  const validateBtn = $('#validate-btn');

  // ---------- page data ----------
  const openNotes = () => page.notes.filter((n) => n.state !== 'done');
  const allBlocks = () => DOC_SECTIONS.flatMap((s) => page.blocks[s.key].map((b) => ({ b, at: s.key })));
  const findBlock = (bid) => allBlocks().find((x) => x.b.id === bid) || null;

  function save(extra) {
    inkReport = null; // Undo only reaches back to the last change, when the pen made it
    updateTwin(id, (t) => {
      const p = t.points.find((x) => x.id === pid);
      p.page = clone(page);
      if (extra) extra(p);
    });
  }

  // ---------- rendering ----------
  // Passages someone commented on are underlined, and the comment opens when you click them. Passages
  // stressed with the pen are bold, and highlighted ones (key points) are yellow. They can overlap.
  function marked(text, block, item = null) {
    if (editing) return esc(text);
    const spans = [];
    const mine = (x) => x.block === block && (x.item ?? null) === item && x.quote;
    for (const c of page.comments.filter(mine)) {
      const start = text.indexOf(c.quote);
      if (start >= 0) spans.push({ kind: 'comment', c, start, end: start + c.quote.length });
    }
    for (const m of page.marks.filter(mine)) {
      const start = locate(text, m.quote, m.pos);
      if (start >= 0) spans.push({ kind: m.kind, start, end: start + m.quote.length });
    }
    if (!spans.length) return esc(text);
    const cuts = [...new Set([0, text.length, ...spans.flatMap((s) => [s.start, s.end])])].sort((a, b) => a - b);
    let html = '';
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const on = spans.filter((s) => s.start <= cuts[i] && s.end >= cuts[i + 1]);
      let part = esc(text.slice(cuts[i], cuts[i + 1]));
      if (on.some((s) => s.kind === 'highlight')) part = `<span class="kp-hl" title="Key point: your twin brings it up first">${part}</span>`;
      if (on.some((s) => s.kind === 'stress')) part = `<strong class="kp-stress">${part}</strong>`;
      const c = on.find((s) => s.kind === 'comment')?.c;
      if (c) part = `<mark class="kp-mark" data-comment="${c.id}" tabindex="0" role="button" aria-label="Commented: ${esc(c.text)}">${part}</mark>`;
      html += part;
    }
    return html;
  }

  function editable(key) {
    return editing ? ` contenteditable="true" spellcheck="true" data-edit="${key}"` : '';
  }

  function blockHTML(b) {
    const flash = fresh.has(b.id) ? ' is-new' : '';
    if (b.t === 'p') {
      const by = b.by === 'expert' ? (b.rule ? ' is-rule' : ' is-added') : '';
      const label = b.rule ? ` data-label="${esc(b.ruleLabel || 'Rule · when projects differ')}"` : '';
      return `<p class="kp-p${by}${flash}"${label} data-block="${b.id}" data-text="${b.id}"${editable(b.id)}>${marked(b.text, b.id)}</p>`;
    }
    if (b.t === 'steps') {
      return `<ol class="kp-steps${flash}" data-block="${b.id}">${b.items.map((s, i) => `<li data-text="${b.id}:${i}"${editable(`${b.id}:${i}`)}>${marked(s, b.id, i)}</li>`).join('')}</ol>`;
    }
    if (b.t === 'figure') return figureHTML(b.fig).replace('<figure ', `<figure data-block="${b.id}" `);
    if (b.t === 'sketch') return `<figure class="kp-fig kp-sketch${flash}" data-block="${b.id}"><img src="${esc(b.src)}" alt="Your sketch"><figcaption>Your sketch</figcaption></figure>`;
    if (b.t === 'examples') {
      const n = b.items.length;
      return `<details class="kp-examples" data-block="${b.id}">
        <summary>${icon('chevronRight', { size: 16 })}<span>${n === 1 ? 'Example' : `Examples from ${n} projects`}</span></summary>
        <ol>${b.items.map((ex) => {
          const pr = project(ex.project);
          return `<li><p class="kp-ex-project"><span class="proj-dot" aria-hidden="true"></span>${esc(pr.name)}${pr.what ? `<span class="kp-ex-what"> · ${esc(pr.what)}</span>` : ''}</p>
            <p class="kp-ex-text">${esc(ex.text)}</p>${ex.source ? `<span class="cite">${icon('file', { size: 14 })}${esc(ex.source)}</span>` : ''}</li>`;
        }).join('')}</ol>
      </details>`;
    }
    return '';
  }

  function noteHTML(n) {
    const sides = n.sides && n.sides.length ? `<div class="kp-sides">${n.sides.map((s) => `<blockquote><p>“${esc(s.claim)}”</p><cite>${esc(s.source)}</cite></blockquote>`).join('')}</div>` : '';
    let foot;
    if (n.state === 'checking') {
      foot = '<p class="kp-checking"><span class="typing" aria-hidden="true"><span></span><span></span><span></span></span>Checking it against the rest of your files…</p>';
    } else if (n.state === 'clarify') {
      foot = `<div class="choices">${n.choices.map((c) => `<button type="button" class="btn btn-sm${c.id === 'keep' ? ' btn-primary' : ''}" data-clarify="${n.id}:${c.id}">${esc(c.label)}</button>`).join('')}</div>`;
    } else {
      foot = `<form class="kp-answer" data-answer="${n.id}">
          <label class="sr-only" for="ans-${n.id}">Your answer</label>
          <textarea id="ans-${n.id}" rows="2" placeholder="Type your answer here…">${esc(n.draft || '')}</textarea>
          <button type="submit" class="kp-check" aria-label="Add your answer to the page">${icon('check', { size: 20 })}</button>
        </form>
        ${n.example ? `<p class="kp-try">Testing the prototype? <button type="button" class="link-btn" data-example="${n.id}">Use example answer</button></p>` : ''}`;
    }
    return `<div class="kp-note" id="note-${n.id}" role="group" aria-label="Note from the twin agent">
      <p><strong>${esc(n.label || NOTE_LABEL[n.kind] || 'Note.')}</strong> ${esc(n.note)}</p>
      ${sides}
      <p class="kp-note-ask">${esc(n.ask)}</p>
      ${n.reply && n.state !== 'checking' ? `<p class="kp-note-reply">${icon('chat', { size: 14 })} ${esc(n.reply)}</p>` : ''}
      ${foot}
    </div>`;
  }

  function sectionHTML(s) {
    const blocks = page.blocks[s.key];
    const notes = page.notes.filter((n) => n.at === s.key && n.state !== 'done');
    if (!blocks.length && !notes.length) return '';
    return `<section class="kp-sec" id="sec-${s.key}" aria-labelledby="h-${s.key}">
      <h2 id="h-${s.key}">${s.label}</h2>
      ${blocks.map(blockHTML).join('')}
      ${notes.map(noteHTML).join('')}
    </section>`;
  }

  function leadHTML() {
    const open = openNotes();
    if (editing) return `<div class="kp-lead is-editing">${icon('type', { size: 18 })}<span>You’re editing the page. Click any text to change it.</span><button type="button" class="btn btn-sm btn-primary" data-done-editing>Done</button></div>`;
    // What the agent made of the last pen marks, until the next change.
    const report = inkReport ? `<div class="kp-lead is-report">${icon('pen', { size: 18 })}<span>${esc(inkReport.text)}</span><button type="button" class="link-btn" data-undo-ink>Undo</button></div>` : '';
    if (open.length) {
      return `${report}<div class="kp-lead">${icon('chat', { size: 18 })}<span>The twin agent left ${open.length === 1 ? 'a note' : `${open.length} notes`} on this page. Answer ${open.length === 1 ? 'it' : 'them'}, then press Validate.</span><button type="button" class="link-btn" data-goto-note>Go to the note</button></div>`;
    }
    return `${report}<div class="kp-lead">${icon('check', { size: 18 })}<span>${status === 'complete' && !page.changed ? 'Validated.' : 'No notes left.'} Select any text to comment on it.</span></div>`;
  }

  function drawDoc() {
    syncDrafts();
    docEl.innerHTML = leadHTML() + DOC_SECTIONS.map(sectionHTML).join('');
    fresh.clear();
    docEl.querySelectorAll('[data-answer] textarea').forEach(fit);
    markCurrent();
  }

  // Answer boxes grow with what's typed in them.
  function fit(ta) {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight + 4, 280)}px`;
  }

  function drawRail() {
    const t = getTwin(id);
    const p = t.points.find((x) => x.id === pid);
    const present = DOC_SECTIONS.filter((s) => page.blocks[s.key].length || page.notes.some((n) => n.at === s.key && n.state !== 'done'));
    const related = (p.links || []).map((l) => t.points.find((x) => x.id === l)).filter(Boolean);
    const mine = (p.projects || []).map(project);
    $('#kp-rail').innerHTML = `
      <div class="kp-rail-group">
        <h2 class="kp-rail-title">Outline</h2>
        <ol class="kp-toc">${present.map((s) => `<li><button type="button" data-toc="${s.key}">${s.label}${page.notes.some((n) => n.at === s.key && n.state !== 'done') ? '<span class="dot-mini is-gap" aria-label="needs you"></span>' : ''}</button></li>`).join('')}</ol>
      </div>
      <div class="kp-rail-group"><h2 class="kp-rail-title">Section</h2><p class="kp-rail-text">${esc(section.title)}</p></div>
      ${mine.length ? `<div class="kp-rail-group"><h2 class="kp-rail-title">Projects</h2><ul class="kp-projects">${mine.map((pr) => `<li><span class="proj-dot" aria-hidden="true"></span>${esc(pr.name)}</li>`).join('')}</ul></div>` : ''}
      <details class="kp-rail-group kp-sources" open>
        <summary><h2 class="kp-rail-title">Sources</h2>${icon('chevronRight', { size: 16 })}</summary>
        <ul>${(p.sources || []).map((s) => `<li>${icon('file', { size: 14 })}<span>${esc(s.file).replace(/_/g, '_<wbr>')}${s.where ? `<span class="muted"> · ${esc(s.where)}</span>` : ''}</span></li>`).join('') || '<li class="muted">None yet</li>'}</ul>
      </details>
      ${related.length ? `<div class="kp-rail-group"><h2 class="kp-rail-title">Related points</h2><ul class="kp-related">${related.map((r) => `<li><a href="#/twin/${id}/point/${encodeURIComponent(r.id)}"><span class="dot-mini ${r.status === 'complete' ? 'is-done' : 'is-gap'}" aria-hidden="true"></span>${esc(r.title)}</a></li>`).join('')}</ul></div>` : ''}`;
    // A validated point with a new note on it needs the expert again.
    const shown = status === 'complete' && openNotes().length ? 'missing' : status;
    const pill = $('#status-pill');
    pill.className = `status-pill status-${shown}`;
    pill.textContent = STATUS[shown];
    markCurrent();
  }

  function drawControls() {
    const open = openNotes().length;
    const needs = status !== 'complete' || page.changed;
    validateBtn.disabled = Boolean(open) || editing || inking;
    validateBtn.innerHTML = needs ? 'Validate' : `${icon('map', { size: 18 })} Back to the map`;
    $('#validate-hint').textContent = editing ? 'Press Done to finish editing.'
      : inking ? 'Press Done to apply your marks, or Back.'
        : open ? `${open === 1 ? 'One note still needs' : `${open} notes still need`} you.`
          : needs ? 'Check the page. If it’s right, press Validate.' : '';
    $('[data-tool="type"]').setAttribute('aria-pressed', String(editing));
  }

  function draw() {
    drawDoc();
    drawRail();
    drawControls();
  }

  // Keeps typed answers when the page redraws.
  function syncDrafts() {
    docEl.querySelectorAll('[data-answer] textarea').forEach((ta) => {
      const n = page.notes.find((x) => `ans-${x.id}` === ta.id);
      if (n) n.draft = ta.value;
    });
  }

  // The outline marks the section at the top of the page; at the very end, the last one.
  function markCurrent() {
    const secs = [...docEl.querySelectorAll('.kp-sec')];
    if (!secs.length) return;
    const line = scroller.getBoundingClientRect().top + 96;
    let current = secs[0];
    for (const s of secs) if (s.getBoundingClientRect().top <= line) current = s;
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) current = secs[secs.length - 1];
    const key = current.id.replace('sec-', '');
    root.querySelectorAll('[data-toc]').forEach((b) => b.classList.toggle('is-current', b.dataset.toc === key));
  }

  function reveal(el, block = 'center') {
    if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block });
  }

  // ---------- notes ----------
  async function answer(note, text, kind = 'text') {
    const value = String(text || '').trim();
    if (kind === 'text' && !value) { $(`#ans-${note.id}`)?.focus(); return null; }
    tour.clear();
    note.draft = value;
    note.state = 'checking';
    drawDoc();
    await sleep(reducedMotion() ? 150 : 900);
    if (destroyed) return null;
    const res = note.target ? answerMark(note, value) : answerNote(note, value, { kind });
    note.tries += 1;
    note.reply = res.reply;
    if (res.state === 'clarify') { note.state = 'clarify'; note.choices = res.choices; } else if (res.state === 'done') finish(note, res, value);
    else note.state = 'open';
    page.changed = true;
    save();
    draw();
    const el = note.state === 'done' ? docEl.querySelector('.is-new') : $(`#note-${note.id}`);
    reveal(el);
    if (note.state === 'open') $(`#ans-${note.id}`)?.focus({ preventScroll: true });
    tourCheck();
    return res;
  }

  function finish(note, res, value) {
    note.state = 'done';
    note.answer = value;
    note.draft = '';
    if (res.add) {
      const b = { id: nid(), t: 'p', text: res.add.text, by: 'expert', rule: res.add.rule || undefined, ruleLabel: note.ruleLabel };
      page.blocks[res.add.at].push(b);
      fresh.add(b.id);
      if (note.kind === 'conflict' && note.sides && note.sides[1]) {
        page.blocks[res.add.at].push({ id: nid(), t: 'p', text: `${note.sides[1].source} is out of date on this point.` });
      }
    }
    toast(res.reply);
  }

  // A note about a passage circled with the pen: the answer changes that passage, like a comment on it.
  function answerMark(note, value) {
    const res = commentOn(note.target, value);
    return res ? { state: 'done', reply: res.reply, add: null } : answerNote(note, value);
  }

  function clarify(note, choice) {
    if (choice === 'keep') {
      note.clarified = true;
      finish(note, answerNote(note, note.draft), note.draft);
    } else {
      note.state = 'open';
      note.reply = 'Okay. Change your answer, then press ✓ again.';
    }
    page.changed = true;
    save();
    draw();
    if (note.state === 'open') $(`#ans-${note.id}`)?.focus();
    tourCheck();
  }

  // Something said in the chat or the voice window: it answers the first open note, or else goes into the
  // part of the page it fits best.
  async function addSaid(text) {
    const note = openNotes().find((n) => n.state === 'open');
    if (note) {
      reveal($(`#note-${note.id}`));
      const res = await answer(note, text);
      return res ? res.reply : '';
    }
    const at = placeFor(text);
    const b = { id: nid(), t: 'p', text: sentence(text), by: 'expert' };
    page.blocks[at].push(b);
    fresh.add(b.id);
    page.changed = true;
    save();
    draw();
    reveal(docEl.querySelector('.is-new'));
    return `Added to ${sectionLabel(at)}.`;
  }

  // ---------- comments ----------
  const commentBtn = $('#comment-btn');
  const commentPop = $('#comment-pop');

  function hideCommentBtn() { commentBtn.hidden = true; }

  function onSelection() {
    if (editing || inking || !commentPop.hidden) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideCommentBtn(); return; }
    const range = sel.getRangeAt(0);
    const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const host = start && start.closest('#kp-doc [data-text]');
    if (!host) { hideCommentBtn(); return; }
    // A selection that runs past its paragraph is cut at the paragraph's end.
    const r = range.cloneRange();
    if (!host.contains(range.endContainer)) r.setEnd(host, host.childNodes.length);
    const quote = r.toString().replace(/\s+/g, ' ').trim();
    if (quote.length < 2) { hideCommentBtn(); return; }
    const [block, item] = host.dataset.text.split(':');
    const rect = r.getBoundingClientRect();
    picked = { block, item: item === undefined ? null : Number(item), quote, rect: { left: rect.left, top: rect.top, bottom: rect.bottom } };
    commentBtn.hidden = false;
    const w = commentBtn.offsetWidth;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, rect.left + rect.width / 2 - w / 2));
    const top = rect.top > 90 ? rect.top - commentBtn.offsetHeight - 10 : rect.bottom + 10;
    Object.assign(commentBtn.style, { left: `${left}px`, top: `${top}px` });
  }

  // Below the passage it belongs to, or above it when there's no room.
  function placePop(pop, rect) {
    pop.hidden = false;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, rect.left));
    const top = rect.bottom + 8 + h < window.innerHeight - 12 ? rect.bottom + 8 : Math.max(12, rect.top - h - 8);
    Object.assign(pop.style, { left: `${left}px`, top: `${top}px` });
  }

  function openCommentBox() {
    if (!picked) return;
    commentPop.innerHTML = `
      <p class="kp-pop-quote">“${esc(picked.quote.length > 90 ? `${picked.quote.slice(0, 88)}…` : picked.quote)}”</p>
      <form id="comment-form">
        <label class="sr-only" for="comment-input">Your comment</label>
        <textarea id="comment-input" rows="3" placeholder="What should change? For example: “should be 48 points” or “we also check this with the client”."></textarea>
        <div class="kp-pop-actions"><button type="button" class="btn btn-sm btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn btn-sm btn-primary">Comment</button></div>
      </form>`;
    placePop(commentPop, picked.rect);
    hideCommentBtn();
    commentPop.querySelector('#comment-input').focus();
  }

  function closeCommentPop() {
    commentPop.hidden = true;
    commentPop.innerHTML = '';
  }

  async function submitComment(text) {
    const ctx = picked;
    const value = String(text || '').trim();
    if (!ctx || !value) return;
    closeCommentPop();
    window.getSelection()?.removeAllRanges();
    tour.clear();
    if (!findBlock(ctx.block)) return;
    const host = docEl.querySelector(`[data-text="${ctx.block}${ctx.item === null ? '' : `:${ctx.item}`}"]`);
    if (host) host.classList.add('is-updating');
    await sleep(reducedMotion() ? 150 : 750);
    if (destroyed) return;
    const res = commentOn(ctx, value);
    if (!res) return;
    page.changed = true;
    save();
    draw();
    toast(res.reply);
    tourCheck();
  }

  // A comment on a passage replaces it or adds to it. A question becomes a note to answer.
  function commentOn(ctx, value) {
    const found = findBlock(ctx.block);
    const current = found && (ctx.item === null ? found.b.text : found.b.items[ctx.item]);
    if (!current) return null;
    const { b, at } = found;
    const res = applyComment(current, ctx.quote, value);
    const c = { id: nid('c'), block: ctx.block, item: ctx.item, quote: ctx.quote, text: value, reply: res.reply, at: Date.now() };
    if (res.mode === 'replace' || res.mode === 'add') {
      if (ctx.item === null) b.text = res.text; else b.items[ctx.item] = res.text;
      if (res.mode === 'replace') c.quote = res.inserted;
      fresh.add(b.id);
    } else {
      page.notes.push({ id: nid('n'), kind: 'missing', at, note: `You asked: “${value}”`, ask: 'Answer it here, and I’ll add it to the page.', example: '', state: 'open', tries: 1, answer: '' });
    }
    page.comments.push(c);
    return res;
  }

  // Whether a comment or a mark still has its passage to point at.
  function stillThere(x) {
    const found = findBlock(x.block);
    const text = found ? (x.item === null || x.item === undefined ? found.b.text : found.b.items[x.item]) : '';
    return Boolean(text) && text.includes(x.quote);
  }

  function showComment(cid, anchor) {
    const c = page.comments.find((x) => x.id === cid);
    if (!c) return;
    commentPop.innerHTML = `
      <p class="kp-pop-label">Your comment</p><p>${esc(c.text)}</p>
      <p class="kp-pop-label">${icon('chat', { size: 14 })} Twin agent</p><p>${esc(c.reply || '')}</p>
      <div class="kp-pop-actions"><button type="button" class="btn btn-sm btn-ghost" data-cancel>Close</button><button type="button" class="btn btn-sm" data-resolve="${c.id}">Resolve</button></div>`;
    placePop(commentPop, anchor.getBoundingClientRect());
    commentPop.querySelector('[data-resolve]').focus();
  }

  // ---------- Type: edit the page in place ----------
  function setEditing(on) {
    if (on === editing) return;
    if (!on) collectEdits();
    editing = on;
    hideCommentBtn();
    closeCommentPop();
    draw();
    if (on) docEl.querySelector('[contenteditable]')?.focus();
  }

  function collectEdits() {
    let changed = false;
    docEl.querySelectorAll('[data-edit]').forEach((el) => {
      const [block, item] = el.dataset.edit.split(':');
      const found = findBlock(block);
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!found || !text) return;
      const { b } = found;
      if (item !== undefined && b.t === 'steps') {
        if (b.items[Number(item)] !== text) { b.items[Number(item)] = text; changed = true; fresh.add(b.id); }
      } else if (b.t === 'p' && b.text !== text) {
        b.text = text;
        changed = true;
        fresh.add(b.id);
      }
    });
    if (!changed) return;
    // A comment or a mark whose passage was rewritten no longer points anywhere.
    page.comments = page.comments.filter(stillThere);
    page.marks = page.marks.filter(stillThere);
    page.changed = true;
    save();
    toast('Your changes are saved. Press Validate when you’re happy with the page.');
  }

  // ---------- Chat and Voice windows ----------
  const chatPop = $('#chat-pop');
  const voicePop = $('#voice-pop');
  const chatLog = $('#chat-log');

  function chatSay(who, text) {
    chatLog.insertAdjacentHTML('beforeend', `<p class="kp-chat-msg is-${who}">${who === 'agent' ? `<span class="kp-chat-who">Twin agent</span>` : ''}${esc(text)}</p>`);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function togglePop(which, open) {
    const pop = which === 'chat' ? chatPop : voicePop;
    const other = which === 'chat' ? voicePop : chatPop;
    const willOpen = open ?? pop.hidden;
    if (willOpen && !other.hidden) togglePop(which === 'chat' ? 'voice' : 'chat', false);
    pop.hidden = !willOpen;
    $(`[data-tool="${which}"]`).setAttribute('aria-expanded', String(willOpen));
    if (which === 'chat' && willOpen) {
      if (!chatLog.children.length) {
        const note = openNotes()[0];
        chatSay('agent', note ? `I left a note under ${sectionLabel(note.at)}: ${note.ask} You can answer it here too.` : 'Tell me anything to add or change, and I’ll update the page.');
      }
      $('#chat-input').focus();
    }
    if (which === 'voice') {
      if (willOpen) startVoice(); else stopVoice(true);
    }
  }

  function voiceSample() {
    const note = openNotes().find((n) => n.state === 'open');
    if (note && note.example) return note.example;
    return 'I always check this with the people who use the product every day, not only with the people who asked for it.';
  }

  function startVoice() {
    stopVoice(true);
    let seconds = 0;
    $('#voice-body').innerHTML = `
      <span class="kp-voice-orb" aria-hidden="true"></span>
      <p class="kp-voice-status" id="voice-status">Listening… 0:00</p>
      <p class="tiny muted">Demo: nothing is recorded. Stopping fills in a sample transcript you can edit.</p>
      <button type="button" class="btn btn-primary" data-voice="stop">${icon('stop', { size: 18 })} Stop</button>`;
    recorder = setInterval(() => {
      seconds += 1;
      const s = $('#voice-status');
      if (s) s.textContent = `Listening… 0:${String(seconds).padStart(2, '0')}`;
      if (seconds >= 30) stopVoice(false);
    }, 1000);
    $('[data-voice="stop"]').focus();
  }

  function stopVoice(silent) {
    if (recorder) clearInterval(recorder);
    recorder = null;
    if (silent) return;
    $('#voice-body').innerHTML = `
      <label class="kp-pop-label" for="voice-text">What you said</label>
      <textarea id="voice-text" rows="5">${esc(voiceSample())}</textarea>
      <div class="kp-pop-actions"><button type="button" class="btn btn-sm btn-ghost" data-voice="again">Record again</button><button type="button" class="btn btn-sm btn-primary" data-voice="add">Add to the page</button></div>`;
    $('#voice-text').focus();
  }

  // ---------- Pen: mark up the page, then the agent reads the marks ----------
  // Pen swaps the toolbar for pen tools, and marks are drawn straight onto the page. Done hands them to the
  // agent, which reads each mark by its shape and what's under it: crossed-out words are removed, underlined
  // ones are stressed, highlighted ones become key points, a circle asks what should change, and a drawing
  // anywhere else goes into the page as a sketch. Back leaves without changing anything.
  const screenEl = $('.kp-screen');
  const ink = $('#kp-ink');
  const penHint = $('#pen-hint');
  let inking = false;
  let reading = false;
  let penTool = 'pen';
  let strokes = []; // { tool: 'pen' | 'marker', points: [[x, y], …] }, in pixels from the page's top left
  let inkUndo = []; // earlier versions of `strokes`
  let stroke = null; // the one being drawn
  let erasing = false;
  let inkReport = null; // what the agent did with the last marks, and the page before them, for Undo

  function setInking(on) {
    if (on === inking) return;
    if (on) {
      if (editing) setEditing(false);
      if (!chatPop.hidden) togglePop('chat', false);
      if (!voicePop.hidden) togglePop('voice', false);
      closeCommentPop();
      hideCommentBtn();
      window.getSelection()?.removeAllRanges();
    }
    inking = on;
    strokes = [];
    inkUndo = [];
    stroke = null;
    erasing = false;
    penTool = 'pen';
    screenEl.classList.toggle('is-inking', on);
    $('#kp-tools').hidden = on;
    $('#pen-tools').hidden = !on;
    penHint.hidden = !on;
    penHint.innerHTML = on ? PEN_HINT : '';
    drawInk();
    drawPenTools();
    drawControls();
    (on ? $('[data-pen="pen"]') : $('[data-tool="pen"]')).focus({ preventScroll: true });
  }

  function drawPenTools() {
    root.querySelectorAll('[data-pen="pen"], [data-pen="marker"], [data-pen="eraser"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pen === penTool)));
    $('[data-pen="undo"]').disabled = !inkUndo.length || reading;
    $('[data-pen="apply"]').disabled = !strokes.length || reading;
    $('[data-pen="back"]').disabled = reading;
    screenEl.dataset.penTool = penTool;
  }

  function drawInk() {
    ink.innerHTML = strokes.map((s) => `<path class="is-${s.tool}" d="${pathD(s.points)}"></path>`).join('');
  }

  const inkAt = (e, r = ink.getBoundingClientRect()) => [e.clientX - r.left, e.clientY - r.top];

  function eraseAt(p) {
    const keep = strokes.filter((s) => distToLine(p, s.points) > (s.tool === 'marker' ? 13 : 9));
    if (keep.length === strokes.length) return;
    strokes = keep;
    drawInk();
    drawPenTools();
  }

  function undoStroke() {
    if (!inkUndo.length || reading) return;
    strokes = inkUndo.pop();
    drawInk();
    drawPenTools();
  }

  async function leavePen() {
    if (reading) return;
    if (strokes.length) {
      const discard = await dialog({
        title: 'Discard your marks?',
        body: '<p>The agent hasn’t read them yet. To keep them, press Done instead.</p>',
        actions: [{ label: 'Keep drawing', value: false }, { label: 'Discard', value: true, primary: true }],
      });
      if (!discard || destroyed || !inking) return;
    }
    setInking(false);
  }

  async function applyInk() {
    if (!strokes.length || reading) return;
    reading = true;
    // Read where everything is before anything on the page moves.
    const marks = readMarks(strokes);
    screenEl.classList.add('is-reading');
    penHint.innerHTML = '<span><span class="typing" aria-hidden="true"><span></span><span></span><span></span></span>Reading your marks…</span>';
    drawPenTools();
    await sleep(reducedMotion() ? 150 : 1000);
    if (destroyed) return;
    const before = clone(page);
    const result = applyMarks(marks);
    reading = false;
    screenEl.classList.remove('is-reading');
    setInking(false);
    if (result.changed) {
      page.changed = true;
      save();
      inkReport = { text: result.text, before };
    }
    draw();
    toast(result.text);
    tourCheck();
  }

  function undoInk() {
    if (!inkReport) return;
    const { before } = inkReport;
    Object.keys(page).forEach((k) => delete page[k]);
    Object.assign(page, before);
    save();
    draw();
    toast('Your marks are undone.');
    tourCheck();
  }

  // Every word that marks can change, with its box in the same pixels as the marks. Offsets count from the
  // start of the paragraph or step, so they match the saved text.
  function wordBoxes(base) {
    const words = [];
    docEl.querySelectorAll('[data-text]').forEach((host) => {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let offset = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const m of node.nodeValue.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (r.width) words.push({ host: host.dataset.text, start: offset + m.index, end: offset + m.index + m[0].length, x0: r.left - base.left, x1: r.right - base.left, y0: r.top - base.top, y1: r.bottom - base.top });
        }
        offset += node.nodeValue.length;
      }
    });
    return words;
  }

  // What marks can't change: examples and figures come from the expert's files, notes from the agent.
  function lockedBoxes(base) {
    return [...docEl.querySelectorAll('.kp-examples, .kp-fig, .codebox, .kp-note, .kp-sec > h2')].map((el) => {
      const r = el.getBoundingClientRect();
      const what = el.matches('.kp-examples') ? 'examples' : el.matches('.kp-note') ? 'notes' : el.matches('h2') ? 'headings' : 'figures';
      const noun = el.matches('.kp-sketch') ? 'your sketch' : el.matches('.codebox') ? 'the file excerpt'
        : el.querySelector('.fig-math') ? 'the formula' : el.querySelector('.fig-table') ? 'the table'
          : el.querySelector('.fig-steps') ? 'the steps' : el.querySelector('.fig-svg, .fig-bars') ? 'the chart' : 'the figure';
      const caption = el.matches('.kp-sketch, .codebox') ? '' : el.querySelector('figcaption')?.textContent.trim().replace(/[.]+$/, '');
      const label = what === 'examples' ? 'the examples' : what === 'headings' ? `the heading “${el.textContent.trim()}”` : caption ? `${noun} (${caption})` : noun;
      return { what, label, at: el.closest('.kp-sec')?.id.replace('sec-', '') || 'summary', x0: r.left - base.left, x1: r.right - base.left, y0: r.top - base.top, y1: r.bottom - base.top };
    });
  }

  // The section a point on the page is in, and the block just above it.
  function placeAt(y, base) {
    const secs = [...docEl.querySelectorAll('.kp-sec')];
    let sec = secs[0];
    for (const s of secs) if (s.getBoundingClientRect().top - base.top <= y) sec = s;
    let after = null;
    for (const el of sec.querySelectorAll(':scope > [data-block]')) if (el.getBoundingClientRect().top - base.top <= y) after = el.dataset.block;
    return { at: sec.id.replace('sec-', ''), after };
  }

  // Reads each mark: what it is from its shape, and what it means from what's under it.
  function readMarks(list) {
    const base = ink.getBoundingClientRect();
    const words = wordBoxes(base);
    const locked = lockedBoxes(base);
    const middle = (w) => [(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2];
    const marks = [];
    const loose = [];
    list.forEach((s, order) => {
      const sh = shapeOf(s);
      let kind = null;
      let hit = [];
      if (sh.kind === 'highlight') {
        // Words the marker went over for at least half their width, on any line it crossed.
        kind = 'highlight';
        hit = words.filter((w) => {
          const along = s.points.filter((p) => Math.abs(p[1] - (w.y0 + w.y1) / 2) <= MARKER_W / 2 + 3).map((p) => p[0]);
          return along.length > 0 && Math.min(w.x1, Math.max(...along)) - Math.max(w.x0, Math.min(...along)) >= 0.5 * (w.x1 - w.x0);
        });
      } else if (sh.kind === 'circle') {
        kind = 'ask';
        hit = words.filter((w) => inPolygon(middle(w), s.points));
      } else if (sh.kind === 'line') {
        // Through the letters crosses words out; under them stresses them.
        const votes = { strike: [], stress: [] };
        for (const w of words) {
          if (Math.min(w.x1, sh.box.x1) - Math.max(w.x0, sh.box.x0) < 0.5 * (w.x1 - w.x0)) continue;
          const cx = (w.x0 + w.x1) / 2;
          const near = s.points.reduce((a, b) => (Math.abs(b[0] - cx) < Math.abs(a[0] - cx) ? b : a));
          const t = (near[1] - w.y0) / (w.y1 - w.y0);
          if (t >= 0.15 && t <= 0.8) votes.strike.push(w);
          else if (t > 0.8 && t <= 1.5) votes.stress.push(w);
        }
        kind = votes.strike.length >= votes.stress.length ? 'strike' : 'stress';
        hit = votes[kind];
      } else if (sh.kind === 'scribble') {
        kind = 'strike';
        hit = words.filter((w) => distToLine(middle(w), s.points) <= (w.y1 - w.y0) * 0.6);
      }
      if (hit.length) {
        const byHost = new Map();
        for (const w of hit) byHost.set(w.host, [...(byHost.get(w.host) || []), w]);
        for (const [host, ws] of byHost) marks.push({ kind, host, start: Math.min(...ws.map((w) => w.start)), end: Math.max(...ws.map((w) => w.end)) });
        return;
      }
      // Nothing it can change is under it. A circle around a figure or an example asks about it; other marks
      // on them are left alone. Anything else is part of a drawing.
      const region = sh.kind !== 'sketch' && locked.find((r) => overlaps(r, sh.box));
      if (region) {
        marks.push(sh.kind === 'circle' && region.what !== 'notes' ? { kind: 'ask-about', region } : { kind: 'skip', what: region.what });
        return;
      }
      loose.push({ s, order, ...sh });
    });
    // Marks drawn close together make one sketch. A single short line or loop on its own is more likely a
    // mark that missed its words than a drawing.
    for (const g of groupNear(loose)) {
      const drawing = g.items.length > 1 || g.items.some((it) => it.kind === 'sketch' || it.kind === 'scribble') || g.items[0].length >= 120;
      if (!drawing) { marks.push({ kind: 'unclear' }); continue; }
      const items = g.items.sort((a, b) => a.order - b.order).map((it) => it.s);
      marks.push({ kind: 'sketch', src: sketchSrc(items, g.box), ...placeAt((g.box.y0 + g.box.y1) / 2, base) });
    }
    return marks;
  }

  // The text of a paragraph or a step, by its data-text key ("block" or "block:item").
  function textAt(host) {
    const [block, item] = host.split(':');
    const found = findBlock(block);
    if (!found) return null;
    return item === undefined ? found.b.text : found.b.items[Number(item)] ?? null;
  }

  // New text for a paragraph or a step. Empty text removes it, and whatever pointed at it.
  function setTextAt(host, value) {
    const [block, item] = host.split(':');
    const found = findBlock(block);
    if (!found) return;
    const { b, at } = found;
    fresh.add(b.id);
    const pointers = () => [...page.comments, ...page.marks, ...page.notes.map((n) => n.target).filter(Boolean)];
    if (item === undefined) {
      if (value) { b.text = value; return; }
      page.blocks[at] = page.blocks[at].filter((x) => x !== b);
      return;
    }
    const i = Number(item);
    if (value) { b.items[i] = value; return; }
    b.items.splice(i, 1);
    page.comments = page.comments.filter((c) => !(c.block === b.id && c.item === i));
    page.marks = page.marks.filter((m) => !(m.block === b.id && m.item === i));
    // Comments and marks on the steps after it move up one.
    for (const x of pointers()) if (x.block === b.id && x.item > i) x.item -= 1;
    if (!b.items.length) page.blocks[at] = page.blocks[at].filter((x) => x !== b);
  }

  // The agent acts on what it read, and says what it did.
  function applyMarks(marks) {
    const count = { removed: 0, stress: 0, highlight: 0, asked: 0, sketches: 0, answered: 0, unclear: 0 };
    const skipped = new Set();
    const of = (kind) => marks.filter((m) => m.kind === kind);
    // Stressed, highlighted and circled passages first, while the words are still where the marks are.
    for (const m of [...of('stress'), ...of('highlight'), ...of('ask')]) {
      const text = textAt(m.host);
      if (text === null) continue;
      const [block, item] = m.host.split(':');
      // Punctuation around the marked words isn't part of the passage.
      let { start, end } = m;
      while (start < end && /[(“‘"'[]/.test(text[start])) start += 1;
      while (end > start && /[.,;:!?)”’"'\]]/.test(text[end - 1])) end -= 1;
      if (end <= start) continue;
      const target = { block, item: item === undefined ? null : Number(item), quote: text.slice(start, end) };
      if (m.kind === 'ask') {
        const found = findBlock(block);
        page.notes.push({ id: nid('n'), kind: 'missing', label: 'From your marks.', at: found.at, note: `You circled “${target.quote}”.`, ask: 'What should change here? Tell me, and I’ll update it.', example: '', state: 'open', tries: 1, answer: '', target });
        count.asked += 1;
      } else if (!page.marks.some((x) => x.kind === m.kind && x.block === block && x.item === target.item && x.quote === target.quote)) {
        page.marks.push({ id: nid('m'), kind: m.kind, pos: start, ...target });
        fresh.add(block);
        count[m.kind] += 1;
      }
    }
    for (const m of of('ask-about')) {
      page.notes.push({ id: nid('n'), kind: 'missing', label: 'From your marks.', at: m.region.at, note: `You circled part of ${m.region.label}.`, ask: 'What should change there? Tell me, and I’ll add it to the page.', example: '', state: 'open', tries: 1, answer: '' });
      count.asked += 1;
    }
    // Crossed-out words, from the last step of a list back, so the ones before keep their place.
    const cuts = new Map();
    for (const m of of('strike')) cuts.set(m.host, [...(cuts.get(m.host) || []), [m.start, m.end]]);
    const stepOf = (host) => Number(host.split(':')[1] || 0);
    for (const [host, ranges] of [...cuts].sort((a, b) => stepOf(b[0]) - stepOf(a[0]))) {
      const text = textAt(host);
      if (text === null) continue;
      let next = text;
      for (const [a, z] of mergeRanges(ranges).reverse()) {
        count.removed += (text.slice(a, z).match(/\S+/g) || []).length;
        next = next.slice(0, a) + next.slice(z);
      }
      setTextAt(host, tidy(next, text));
    }
    if (cuts.size) {
      page.comments = page.comments.filter(stillThere);
      page.marks = page.marks.filter(stillThere);
    }
    for (const m of of('sketch')) {
      const b = { id: nid(), t: 'sketch', src: m.src, by: 'expert' };
      const list = page.blocks[m.at];
      list.splice(m.after ? list.findIndex((x) => x.id === m.after) + 1 : 0, 0, b);
      fresh.add(b.id);
      count.sketches += 1;
      // A note in that section that asked for a sketch is answered.
      const note = page.notes.find((n) => n.state === 'open' && n.at === m.at && n.sketch);
      if (note) {
        const res = answerNote(note, '', { kind: 'sketch' });
        note.state = 'done';
        note.answer = 'A sketch';
        note.reply = res.reply;
        count.answered += 1;
      }
    }
    for (const m of of('skip')) skipped.add(m.what);
    count.unclear = of('unclear').length;

    const did = [];
    if (count.removed) did.push(`removed ${plural(count.removed, 'word')}`);
    if (count.stress) did.push(`stressed ${plural(count.stress, 'passage')}`);
    if (count.highlight) did.push(`marked ${plural(count.highlight, 'key point')}`);
    if (count.asked) did.push(`left ${plural(count.asked, 'note')} on what you circled`);
    if (count.sketches) did.push(`added ${count.sketches === 1 ? 'your sketch' : `${count.sketches} sketches`}${count.answered ? `, which answers my note` : ''}`);
    const changed = did.length > 0;
    let text = changed ? `I ${listed(did)}.` : 'I didn’t find anything to change.';
    if (count.highlight) text += ' Your twin brings up key points first.';
    if (skipped.size) text += ` I left the marks on ${listed([...skipped])} as they are.`;
    if (count.unclear) text += ` I wasn’t sure what ${count.unclear === 1 ? 'one mark' : `${count.unclear} marks`} meant, so I left ${count.unclear === 1 ? 'it' : 'them'}.`;
    return { changed, text };
  }

  // ---------- Validate ----------
  function validate() {
    if (openNotes().length || editing) return;
    const finishingTour = tour.current() === 'point-validate';
    if (status !== 'complete' || page.changed) {
      status = 'complete';
      page.changed = false;
      save((p) => {
        p.status = 'complete';
        p.final = pageText(page, ['solution']) || pageText(page, ['how']) || p.summary;
        p.validatedAt = Date.now();
      });
      if (finishingTour) tour.end();
      go(`twin/${id}/map?done=${encodeURIComponent(pid)}${finishingTour ? '&tour=done' : ''}`);
      return;
    }
    go(`twin/${id}/map?focus=${encodeURIComponent(pid)}`);
  }

  // ---------- tour ----------
  function tourCheck() {
    const step = tour.current();
    if (!step || !step.startsWith('point') || destroyed) return;
    const open = openNotes();
    if (step === 'point-answer' && !open.length) tour.setStep('point-comment');
    if (tour.current() === 'point-validate' && open.length) tour.setStep('point-answer');
    showTour();
  }

  function showTour() {
    const step = tour.current();
    if (!step || !step.startsWith('point') || destroyed) return;
    if (step === 'point-intro') {
      scroller.scrollTo({ top: 0, behavior: 'instant' });
      tour.coach({
        target: docEl.querySelector('.kp-sec'), step: 5, title: 'This is what your twin learned',
        html: '<p>It reads like a document: the process, why it matters and how it’s done.</p><p>Examples from your projects are folded under each part. Click one to open it.</p>',
        onNext: () => { tour.setStep(openNotes().length ? 'point-answer' : 'point-comment'); showTour(); },
      });
    } else if (step === 'point-answer') {
      const note = docEl.querySelector('.kp-note');
      if (!note) { tour.setStep('point-comment'); showTour(); return; }
      note.scrollIntoView({ block: 'center', behavior: 'instant' });
      tour.coach({
        target: note, step: 6, title: 'Fill in the yellow note',
        html: '<p>The agent marks what your files don’t say, or where your projects differ.</p><p>Type your answer under the note and press ✓. To try it quickly, press <strong>Use example answer</strong>.</p>',
        waitFor: 'Add your answer to continue',
      });
    } else if (step === 'point-comment') {
      const target = docEl.querySelector('.is-added, .is-rule') || docEl.querySelector('.kp-p');
      target?.scrollIntoView({ block: 'center', behavior: 'instant' });
      tour.coach({
        target, step: 7, title: 'Comment on anything',
        html: '<p>Select any words on the page and press <strong>Comment</strong>. Tell the agent what to change, and it updates the page.</p><p>The toolbar at the bottom has other ways: type on the page, chat, talk, or mark it up with the <strong>Pen</strong>. Cross out, underline, circle or draw, then press ✓.</p>',
        onNext: () => { tour.setStep('point-validate'); showTour(); },
      });
    } else if (step === 'point-validate') {
      tour.coach({
        target: '#validate-btn', step: 8, title: 'Check, then validate',
        html: '<p>When no yellow notes are left, press <strong>Validate</strong>. You’ll go back to your mind map, where this point turns black.</p>',
        waitFor: 'Press Validate to finish',
        padding: 10,
      });
    }
  }

  // ---------- events ----------
  docEl.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-answer]');
    if (!form) return;
    e.preventDefault();
    const note = page.notes.find((n) => n.id === form.dataset.answer);
    if (note) answer(note, form.querySelector('textarea').value);
  });
  docEl.addEventListener('keydown', (e) => {
    // Enter sends an answer; Shift+Enter adds a line.
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches('[data-answer] textarea')) {
      e.preventDefault();
      e.target.closest('form').requestSubmit();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kp-mark')) { e.preventDefault(); showComment(e.target.dataset.comment, e.target); }
    // While typing on the page, each paragraph stays one paragraph.
    if (e.key === 'Enter' && e.target.matches('[data-edit]')) e.preventDefault();
  });
  docEl.addEventListener('click', (e) => {
    const ex = e.target.closest('[data-example]');
    if (ex) {
      const ta = $(`#ans-${ex.dataset.example}`);
      const note = page.notes.find((n) => n.id === ex.dataset.example);
      if (ta && note) { ta.value = note.example; fit(ta); ta.focus(); }
      return;
    }
    const c = e.target.closest('[data-clarify]');
    if (c) {
      const [nid2, choice] = c.dataset.clarify.split(':');
      const note = page.notes.find((n) => n.id === nid2);
      if (note) clarify(note, choice);
      return;
    }
    const mark = e.target.closest('.kp-mark');
    if (mark && window.getSelection()?.isCollapsed) { showComment(mark.dataset.comment, mark); return; }
    if (e.target.closest('[data-done-editing]')) { setEditing(false); return; }
    if (e.target.closest('[data-undo-ink]')) { undoInk(); return; }
    if (e.target.closest('[data-goto-note]')) {
      const note = docEl.querySelector('.kp-note');
      reveal(note);
      note?.querySelector('textarea, button')?.focus({ preventScroll: true });
    }
  });
  $('#kp-rail').addEventListener('click', (e) => {
    const b = e.target.closest('[data-toc]');
    if (!b) return;
    reveal($(`#sec-${b.dataset.toc}`), 'start');
    if (window.innerWidth <= 1100) toggleRail(false);
  });
  function toggleRail(open) {
    const rail = $('#kp-rail');
    const willOpen = open ?? !rail.classList.contains('is-open');
    // On narrow screens it slides in under the top bar, which can wrap to two rows.
    rail.style.top = `${$('.point-top').getBoundingClientRect().bottom}px`;
    rail.classList.toggle('is-open', willOpen);
    $('#rail-toggle').setAttribute('aria-expanded', String(willOpen));
  }
  $('#rail-toggle').addEventListener('click', () => toggleRail());

  $('#kp-tools').addEventListener('click', (e) => {
    const tool = e.target.closest('[data-tool]');
    if (!tool) return;
    const kind = tool.dataset.tool;
    if (kind === 'type') setEditing(!editing);
    if (kind === 'chat' || kind === 'voice') togglePop(kind);
    if (kind === 'pen') setInking(true);
  });
  $('#pen-tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pen]');
    if (!b || b.disabled) return;
    const what = b.dataset.pen;
    if (what === 'back') leavePen();
    else if (what === 'undo') undoStroke();
    else if (what === 'apply') applyInk();
    else { penTool = what; drawPenTools(); }
  });
  // A mouse, a stylus or one finger draws. Two fingers scroll the page, as the page can't scroll by touch
  // while the pen is out.
  const fingers = new Map();
  ink.addEventListener('pointerdown', (e) => {
    if (!inking || reading || e.button !== 0) return;
    e.preventDefault();
    ink.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      fingers.set(e.pointerId, e.clientY);
      if (fingers.size > 1) {
        // The second finger turns what the first one started into a scroll.
        if (stroke || erasing) { strokes = inkUndo.pop(); stroke = null; erasing = false; drawInk(); drawPenTools(); }
        return;
      }
    }
    inkUndo.push(strokes);
    if (penTool === 'eraser') { erasing = true; eraseAt(inkAt(e)); return; }
    stroke = { tool: penTool, points: [inkAt(e)] };
    strokes = [...strokes, stroke];
    drawInk();
    drawPenTools();
  });
  ink.addEventListener('pointermove', (e) => {
    if (fingers.size > 1) {
      if (!fingers.has(e.pointerId)) return;
      // Each finger moves the page by its share, so together they move it as far as they moved.
      scroller.scrollTop -= (e.clientY - fingers.get(e.pointerId)) / fingers.size;
      fingers.set(e.pointerId, e.clientY);
      return;
    }
    if (erasing) { eraseAt(inkAt(e)); return; }
    if (!stroke) return;
    const r = ink.getBoundingClientRect();
    // Coalesced events keep fast strokes smooth.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const p = inkAt(ev, r);
      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.5) stroke.points.push(p);
    }
    ink.lastElementChild?.setAttribute('d', pathD(stroke.points));
  });
  const endStroke = (e) => {
    fingers.delete(e.pointerId);
    // An eraser stroke that erased nothing leaves nothing to undo.
    if (erasing && inkUndo[inkUndo.length - 1] === strokes) inkUndo.pop();
    erasing = false;
    stroke = null;
    drawPenTools();
  };
  ink.addEventListener('pointerup', endStroke);
  ink.addEventListener('pointercancel', endStroke);
  root.addEventListener('click', (e) => {
    const close = e.target.closest('[data-close]');
    if (close) togglePop(close.dataset.close, false);
  });
  $('#chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    chatSay('you', text);
    const reply = await addSaid(text);
    if (reply) chatSay('agent', reply);
  });
  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); }
  });
  voicePop.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-voice]');
    if (!b) return;
    if (b.dataset.voice === 'stop') stopVoice(false);
    if (b.dataset.voice === 'again') startVoice();
    if (b.dataset.voice === 'add') {
      const text = $('#voice-text').value.trim();
      if (!text) return;
      togglePop('voice', false);
      const reply = await addSaid(text);
      if (reply) toast(reply);
    }
  });

  commentBtn.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection
  commentBtn.addEventListener('click', openCommentBox);
  commentPop.addEventListener('submit', (e) => { e.preventDefault(); submitComment(commentPop.querySelector('#comment-input').value); });
  commentPop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.id === 'comment-input') { e.preventDefault(); commentPop.querySelector('form').requestSubmit(); }
  });
  commentPop.addEventListener('click', (e) => {
    if (e.target.closest('[data-cancel]')) closeCommentPop();
    const r = e.target.closest('[data-resolve]');
    if (r) {
      page.comments = page.comments.filter((c) => c.id !== r.dataset.resolve);
      save();
      closeCommentPop();
      drawDoc();
      toast('Comment resolved.');
    }
  });
  const onSelectionChange = () => { clearTimeout(onSelectionChange.t); onSelectionChange.t = setTimeout(onSelection, 120); };
  document.addEventListener('selectionchange', onSelectionChange);
  let ticking = false;
  scroller.addEventListener('scroll', () => {
    hideCommentBtn();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; markCurrent(); });
  }, { passive: true });
  docEl.addEventListener('input', (e) => { if (e.target.matches('[data-answer] textarea')) fit(e.target); });
  validateBtn.addEventListener('click', validate);

  const onKey = (e) => {
    if (inking && (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undoStroke(); return; }
    if (e.key !== 'Escape') return;
    if (inking) { leavePen(); return; }
    if (!commentPop.hidden) { closeCommentPop(); return; }
    if (!chatPop.hidden) { togglePop('chat', false); $('[data-tool="chat"]').focus(); return; }
    if (!voicePop.hidden) { togglePop('voice', false); $('[data-tool="voice"]').focus(); return; }
    if ($('#kp-rail').classList.contains('is-open')) toggleRail(false);
  };
  document.addEventListener('keydown', onKey);

  // ---------- start ----------
  draw();
  focusHeading(root);
  if (tour.current() === 'point-intro') setTimeout(showTour, 300); else tourCheck();

  return () => {
    destroyed = true;
    if (recorder) clearInterval(recorder);
    if (editing) collectEdits();
    document.removeEventListener('selectionchange', onSelectionChange);
    document.removeEventListener('keydown', onKey);
    tour.clear();
  };
}
