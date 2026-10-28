// A knowledge point as a document, like a Notion page. It shows the process the twin learned: a summary,
// the challenge, why it matters, how it's done and the solution, with examples from each project folded
// underneath. Yellow notes from the agent mark what the files don't say, or where projects or files differ;
// the expert answers right under a note and presses ✓. Select any text to comment on it, and the agent
// updates the page. Type, Chat, Voice and Pen at the bottom are other ways to add to it. Validate goes back
// to the mind map, focused on this point.
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
      </div>
    </header>
    <div class="kp-body">
      <nav class="kp-rail" id="kp-rail" aria-label="About this page"></nav>
      <main class="kp-main" id="main">
        <div class="kp-scroll" id="kp-scroll">
          <article class="kp-doc" id="kp-doc" aria-label="${esc(point.title)}"></article>
        </div>
        <div class="kp-dock">
          <div class="kp-tools" role="toolbar" aria-label="Ways to add to this page">
            <button type="button" class="kp-tool" data-tool="type" aria-pressed="false"><span class="tool-circle">${icon('type', { size: 22 })}</span><span class="kp-tool-label">Type</span></button>
            <button type="button" class="kp-tool" data-tool="chat" aria-expanded="false" aria-controls="chat-pop"><span class="tool-circle">${icon('chat', { size: 22 })}</span><span class="kp-tool-label">Chat</span></button>
            <button type="button" class="kp-tool" data-tool="voice" aria-expanded="false" aria-controls="voice-pop"><span class="tool-circle">${icon('mic', { size: 22 })}</span><span class="kp-tool-label">Voice</span></button>
            <button type="button" class="kp-tool" data-tool="pen"><span class="tool-circle">${icon('pen', { size: 22 })}</span><span class="kp-tool-label">Pen</span></button>
          </div>
          <div class="kp-validate">
            <p class="validate-hint" id="validate-hint" aria-live="polite"></p>
            <button type="button" class="btn btn-primary kp-validate-btn" id="validate-btn" aria-describedby="validate-hint">Validate</button>
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
    updateTwin(id, (t) => {
      const p = t.points.find((x) => x.id === pid);
      p.page = clone(page);
      if (extra) extra(p);
    });
  }

  // ---------- rendering ----------
  // Passages someone commented on are underlined; the comment opens when you click them.
  function marked(text, block, item = null) {
    if (editing) return esc(text);
    const spans = page.comments
      .filter((c) => c.block === block && (c.item ?? null) === item && c.quote && text.includes(c.quote))
      .map((c) => ({ c, start: text.indexOf(c.quote), end: text.indexOf(c.quote) + c.quote.length }))
      .sort((a, b) => a.start - b.start);
    let html = '';
    let at = 0;
    for (const s of spans) {
      if (s.start < at) continue;
      html += `${esc(text.slice(at, s.start))}<mark class="kp-mark" data-comment="${s.c.id}" tabindex="0" role="button" aria-label="Commented: ${esc(s.c.text)}">${esc(text.slice(s.start, s.end))}</mark>`;
      at = s.end;
    }
    return html + esc(text.slice(at));
  }

  function editable(key) {
    return editing ? ` contenteditable="true" spellcheck="true" data-edit="${key}"` : '';
  }

  function blockHTML(b) {
    const flash = fresh.has(b.id) ? ' is-new' : '';
    if (b.t === 'p') {
      const by = b.by === 'expert' ? (b.rule ? ' is-rule' : ' is-added') : '';
      return `<p class="kp-p${by}${flash}" data-text="${b.id}"${editable(b.id)}>${marked(b.text, b.id)}</p>`;
    }
    if (b.t === 'steps') {
      return `<ol class="kp-steps${flash}">${b.items.map((s, i) => `<li data-text="${b.id}:${i}"${editable(`${b.id}:${i}`)}>${marked(s, b.id, i)}</li>`).join('')}</ol>`;
    }
    if (b.t === 'figure') return figureHTML(b.fig);
    if (b.t === 'sketch') return `<figure class="kp-fig kp-sketch${flash}"><img src="${b.src}" alt="Your sketch"><figcaption>Your sketch</figcaption></figure>`;
    if (b.t === 'examples') {
      const n = b.items.length;
      return `<details class="kp-examples">
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
      <p><strong>${esc(NOTE_LABEL[n.kind] || 'Note.')}</strong> ${esc(n.note)}</p>
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
    if (open.length) {
      return `<div class="kp-lead">${icon('chat', { size: 18 })}<span>The twin agent left ${open.length === 1 ? 'a note' : `${open.length} notes`} on this page. Answer ${open.length === 1 ? 'it' : 'them'}, then press Validate.</span><button type="button" class="link-btn" data-goto-note>Go to the note</button></div>`;
    }
    return `<div class="kp-lead">${icon('check', { size: 18 })}<span>${status === 'complete' && !page.changed ? 'Validated.' : 'No notes left.'} Select any text to comment on it.</span></div>`;
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
    const pill = $('#status-pill');
    pill.className = `status-pill status-${status}`;
    pill.textContent = STATUS[status];
    markCurrent();
  }

  function drawControls() {
    const open = openNotes().length;
    const needs = status !== 'complete' || page.changed;
    validateBtn.disabled = Boolean(open) || editing;
    validateBtn.innerHTML = needs ? 'Validate' : `${icon('map', { size: 18 })} Back to the map`;
    $('#validate-hint').textContent = editing ? 'Press Done to finish editing.'
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
    const res = answerNote(note, value, { kind });
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
      const b = { id: nid(), t: 'p', text: res.add.text, by: 'expert', rule: res.add.rule || undefined };
      page.blocks[res.add.at].push(b);
      fresh.add(b.id);
      if (note.kind === 'conflict' && note.sides && note.sides[1]) {
        page.blocks[res.add.at].push({ id: nid(), t: 'p', text: `${note.sides[1].source} is out of date on this point.` });
      }
    }
    toast(res.reply);
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
    if (editing || !commentPop.hidden) return;
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
    const found = findBlock(ctx.block);
    if (!found) return;
    const { b, at } = found;
    const host = docEl.querySelector(`[data-text="${ctx.block}${ctx.item === null ? '' : `:${ctx.item}`}"]`);
    if (host) host.classList.add('is-updating');
    await sleep(reducedMotion() ? 150 : 750);
    if (destroyed) return;
    const current = ctx.item === null ? b.text : b.items[ctx.item];
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
    page.changed = true;
    save();
    draw();
    toast(res.reply);
    tourCheck();
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
    // A comment whose passage was rewritten no longer points anywhere.
    page.comments = page.comments.filter((c) => {
      const found = findBlock(c.block);
      const text = found ? (c.item === null || c.item === undefined ? found.b.text : found.b.items[c.item]) : '';
      return text && text.includes(c.quote);
    });
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

  // ---------- Pen ----------
  async function openSketch() {
    let drawn = false;
    const image = await dialog({
      title: 'Sketch it',
      wide: true,
      body: `<div class="sketch-wrap">
        <p class="muted">Draw the flow, a diagram or handwritten notes. It goes into the page.</p>
        <canvas class="sketch-canvas" id="sketch" aria-label="Drawing area"></canvas>
        <div class="sketch-tools" role="group" aria-label="Drawing tools">
          <button type="button" class="chip" data-mode="pen" aria-pressed="true">${icon('pen', { size: 18 })} Pen</button>
          <button type="button" class="chip" data-mode="marker" aria-pressed="false">${icon('edit', { size: 18 })} Marker</button>
          <button type="button" class="chip" data-mode="eraser" aria-pressed="false">${icon('eraser', { size: 18 })} Eraser</button>
          <button type="button" class="chip" data-clear>${icon('trash', { size: 18 })} Clear</button>
        </div></div>`,
      actions: [{ label: 'Cancel', value: null }, { label: 'Add to the page', primary: true, getValue: (box) => (drawn ? box.querySelector('#sketch').toDataURL('image/jpeg', 0.72) : null) }],
      onMount: (box) => {
        const canvas = box.querySelector('#sketch');
        const W = 960;
        const H = 600;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let mode = 'pen';
        let last = null;
        const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
        canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); last = pos(e); });
        canvas.addEventListener('pointermove', (e) => {
          if (!last) return;
          const p = pos(e);
          ctx.globalAlpha = mode === 'marker' ? 0.35 : 1;
          ctx.strokeStyle = mode === 'eraser' ? '#ffffff' : mode === 'marker' ? '#e8c400' : '#141414';
          ctx.lineWidth = mode === 'pen' ? 4 : mode === 'marker' ? 22 : 28;
          ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          last = p;
          if (mode !== 'eraser') drawn = true;
        });
        const stop = () => { last = null; };
        canvas.addEventListener('pointerup', stop);
        canvas.addEventListener('pointercancel', stop);
        box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
          mode = b.dataset.mode;
          box.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        box.querySelector('[data-clear]').addEventListener('click', () => { ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); drawn = false; });
      },
    });
    if (!image) return;
    const note = openNotes().find((n) => n.state === 'open');
    const at = note ? note.at : 'how';
    const b = { id: nid(), t: 'sketch', src: image, by: 'expert' };
    page.blocks[at].push(b);
    fresh.add(b.id);
    if (note) {
      const res = answerNote(note, '', { kind: 'sketch' });
      note.reply = res.reply;
      note.tries += 1;
      if (res.state === 'done') { note.state = 'done'; note.answer = 'A sketch'; }
      toast(res.reply);
    } else {
      toast(`Your sketch is in ${sectionLabel(at)}.`);
    }
    page.changed = true;
    save();
    draw();
    reveal(docEl.querySelector('.is-new'));
    tourCheck();
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
        html: '<p>Select any words on the page and press <strong>Comment</strong>. Tell the agent what to change, and it updates the page.</p><p>The circles at the bottom are other ways to add to it: type on the page, chat, talk or sketch.</p>',
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

  $('.kp-tools').addEventListener('click', (e) => {
    const tool = e.target.closest('[data-tool]');
    if (!tool) return;
    const kind = tool.dataset.tool;
    if (kind === 'type') setEditing(!editing);
    if (kind === 'chat' || kind === 'voice') togglePop(kind);
    if (kind === 'pen') openSketch();
  });
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
    if (e.key !== 'Escape') return;
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
