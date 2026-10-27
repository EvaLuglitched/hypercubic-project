// A knowledge point, full screen, like an AI chat. The agent explains what it found, asks about the gap
// or conflict, and the expert answers by typing, talking, uploading or sketching. The right panel is an
// outline of the conversation. Flow: Information missing → Refine or edit info input → Clarifying question
// → Refine / Override → Validate → Update brain.
import { esc, icon, rich, dialog, go, toast, sleep, reducedMotion, firstName, fmtBytes, focusHeading } from '../ui.js';
import { store, getTwin, updateTwin, tasksFor, uid } from '../store.js';
import { openingMessages, respond, choose, summarize } from '../agent.js';
import * as tour from '../tour.js';

const STATUS = { complete: 'Validated', missing: 'Needs you', conflict: 'Sources disagree' };
const clone = (x) => JSON.parse(JSON.stringify(x));
const plain = (t) => String(t || '').replace(/\*\*/g, '').replace(/`/g, '');

export function render(root, { id, pid }) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return; }
  const point = twin.points.find((p) => p.id === pid);
  if (!point) { location.replace(`#/twin/${id}/map`); return; }
  const section = twin.sections.find((s) => s.id === point.section) || { title: '' };
  const name = firstName(store.get().user);
  const conv = twin.chats && twin.chats[pid]
    ? clone(twin.chats[pid])
    : { stage: point.status === 'complete' ? 'done' : 'asking', messages: [], answers: [], followups: 0, clarified: false, overrode: false, sketches: 0, summary: null };
  let busy = false;
  let destroyed = false;
  let pendingKind = 'text';
  let recording = null;
  let observer = null;

  root.innerHTML = `
  <div class="point-screen">
    <header class="point-top">
      <a class="icon-btn" href="#/twin/${id}/map" aria-label="Back to the mind map">${icon('arrowLeft')}</a>
      <div class="point-titles">
        <span class="point-crumb">${esc(twin.name)} / ${esc(section.title)}</span>
        <h1 class="point-title">${esc(point.title)}</h1>
      </div>
      <div class="point-top-actions">
        <span class="status-pill status-${point.status}" id="status-pill">${STATUS[point.status]}</span>
        <button type="button" class="btn btn-sm outline-toggle" id="outline-toggle" aria-expanded="false" aria-controls="outline">${icon('outline', { size: 18 })} Outline</button>
        <button type="button" class="btn btn-primary btn-sm" id="ipad-btn">${icon('ipad', { size: 18 })} <span>${store.get().ipad ? 'iPad connected' : 'Connect to iPad'}</span></button>
      </div>
    </header>
    <div class="point-body">
      <main class="chat" id="main">
        <div class="chat-scroll" id="chat-scroll">
          <div class="chat-col" id="thread" role="log" aria-live="polite" aria-label="Conversation with the twin agent"></div>
        </div>
        <div class="composer-area" id="composer-area">
          <div class="composer-inner">
            <div class="suggest-row" id="suggest"></div>
            <div class="tool-tray" id="tool-tray" hidden>
              <button type="button" class="tool" data-tool="chat"><span class="tool-circle">${icon('chat', { size: 22 })}</span>Type</button>
              <button type="button" class="tool" data-tool="upload"><span class="tool-circle">${icon('upload', { size: 22 })}</span>Upload a file</button>
              <button type="button" class="tool" data-tool="pen"><span class="tool-circle">${icon('pen', { size: 22 })}</span>Sketch</button>
            </div>
            <div class="composer-row">
              <form class="composer" id="composer">
                <label for="msg" class="sr-only">Your answer</label>
                <textarea id="msg" rows="1" placeholder="Reply to the agent…"></textarea>
                <div class="recording" id="recording" hidden><span id="rec-label">Recording 0:00</span></div>
                <button type="button" class="icon-btn" id="mic-btn" aria-label="Answer by voice">${icon('mic')}</button>
                <button type="button" class="icon-btn" id="more-btn" aria-expanded="false" aria-controls="tool-tray" aria-label="More ways to answer">${icon('more')}</button>
                <button type="submit" class="icon-btn icon-btn-dark" id="send-btn" aria-label="Send">${icon('send')}</button>
              </form>
              <button type="button" class="btn btn-primary validate-btn" id="validate-btn" aria-describedby="validate-hint">Validate</button>
            </div>
            <p class="validate-hint" id="validate-hint"></p>
            <input type="file" id="chat-file" accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg" hidden>
          </div>
        </div>
      </main>
      <aside class="outline" id="outline" aria-labelledby="outline-h">
        <h2 id="outline-h">Outline</h2>
        <ol class="outline-list" id="outline-list"></ol>
        <div class="outline-meta" id="outline-meta"></div>
        <div class="outline-next" id="outline-next"></div>
      </aside>
    </div>
  </div>`;

  const $ = (sel) => root.querySelector(sel);
  const thread = $('#thread');
  const scroller = $('#chat-scroll');
  const textarea = $('#msg');
  const validateBtn = $('#validate-btn');

  // ---------- rendering ----------
  function codebox(x) {
    return `<figure class="codebox"><figcaption class="codebox-head"><span>${esc(x.file)}${x.where ? ` · ${esc(x.where)}` : ''}</span><span>${esc(x.lang || '')}</span></figcaption><pre>${esc(x.code)}</pre></figure>`;
  }

  function agentBody(m) {
    let html = m.heading ? `<p class="msg-heading">${esc(m.heading)}</p>` : '';
    if (m.kind === 'gap') {
      html += `<div class="callout"><p class="callout-label">${icon('help')} Open question</p><p class="callout-text msg-text">${rich(m.text)}</p></div>`;
    } else if (m.kind === 'conflict') {
      html += `<div class="callout"><p class="callout-label"><span class="legend-badge" aria-hidden="true">!</span> Two of your files disagree</p>
        <p class="msg-text">${rich(m.text)}</p>
        <div class="sides">${(m.sides || []).map((s) => `<blockquote class="side"><p>“${esc(s.claim)}”</p><cite>${esc(s.source)}</cite></blockquote>`).join('')}</div>
        <p class="callout-text">${rich(m.ask)}</p></div>`;
    } else if (m.kind === 'note') {
      html += `<p class="msg-text">${icon('check', { size: 18 })} ${rich(m.text)}</p>`;
    } else if (m.kind === 'done') {
      const next = tasksFor(getTwin(id)).find((p) => p.id !== pid);
      html += `<div class="done-note">${icon('check')}<span class="msg-text">${rich(m.text)}</span></div>
        <div class="choices"><a class="btn btn-sm" href="#/twin/${id}/map?done=${encodeURIComponent(pid)}">${icon('map', { size: 18 })} Back to the mind map</a>${next ? `<a class="btn btn-sm btn-primary" href="#/twin/${id}/point/${encodeURIComponent(next.id)}">Next task: ${esc(next.title)} ${icon('arrowRight', { size: 18 })}</a>` : ''}</div>`;
    } else {
      html += `<p class="msg-text">${rich(m.text)}</p>`;
    }
    if (m.kind === 'summary' && m.summary) {
      html += `<div class="summary-card">
        <p class="summary-label">What your twin will know</p>
        <ul>${m.summary.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="summary-src">From: ${esc(m.summary.sources.join(', ') || 'your answers')} · and your answers</p>
        <div class="choices"><button type="button" class="btn btn-sm" data-choice="refine-summary" ${m.chosen || conv.stage === 'done' ? 'disabled' : ''}>${icon('edit', { size: 18 })} Refine</button></div>
      </div>`;
    }
    if (m.excerpt) html += codebox(m.excerpt);
    if (m.cites && m.cites.length) html += `<div class="cites" aria-label="Sources">${m.cites.map((c) => `<span class="cite">${icon('file', { size: 14 })}${esc(c)}</span>`).join('')}</div>`;
    if (m.choices) {
      html += `<div class="choices">${m.choices.map((c) => `<button type="button" class="btn btn-sm${c.primary ? ' btn-primary' : ''}" data-choice="${esc(c.id)}" ${m.chosen ? 'disabled' : ''}>${esc(c.label)}</button>`).join('')}</div>`;
    }
    return html;
  }

  function msgHTML(m) {
    if (m.role === 'user') {
      let inner = '';
      if (m.kind === 'sketch') inner = `<span class="bubble-label">${icon('pen', { size: 14 })} Sketch</span><img src="${m.image}" alt="Your sketch">`;
      else if (m.kind === 'file') inner = `<span class="bubble-label">${icon('upload', { size: 14 })} File</span><span>${esc(m.file.name)} <span class="tiny muted">${fmtBytes(m.file.size)}</span></span>`;
      else if (m.kind === 'voice') inner = `<span class="bubble-label">${icon('mic', { size: 14 })} Voice answer</span><span>${esc(m.text).replace(/\n/g, '<br>')}</span>`;
      else inner = esc(m.text).replace(/\n/g, '<br>');
      return `<div class="msg msg-user" id="${m.id}" data-heading="${esc(m.heading || 'Your answer')}"><div class="bubble">${inner}</div></div>`;
    }
    return `<div class="msg msg-agent" id="${m.id}"><span class="avatar" aria-hidden="true">${icon('chat', { size: 18 })}</span>
      <div class="msg-body"><p class="msg-author">Twin agent <span class="ai-tag">AI</span></p>${agentBody(m)}</div></div>`;
  }

  function scrollDown(instant = false) {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: instant || reducedMotion() ? 'auto' : 'smooth' });
  }

  function persist() {
    updateTwin(id, (t) => { t.chats = t.chats || {}; t.chats[pid] = clone(conv); });
  }

  function rebuildOutline() {
    const items = conv.messages.filter((m) => m.heading);
    $('#outline-list').innerHTML = items.map((m) => `<li><button type="button" class="outline-item${m.role === 'user' ? ' is-user' : ''}" data-target="${m.id}"><span class="outline-dot" aria-hidden="true"></span><span>${esc(m.heading)}</span></button></li>`).join('');
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        root.querySelectorAll('.outline-item').forEach((b) => b.classList.toggle('is-current', b.dataset.target === entry.target.id));
      }
    }, { root: scroller, rootMargin: '0px 0px -55% 0px' });
    items.forEach((m) => { const el = root.querySelector(`#${CSS.escape(m.id)}`); if (el) observer.observe(el); });
  }

  function drawMeta() {
    const t = getTwin(id);
    const p = t.points.find((x) => x.id === pid);
    const related = (p.links || []).map((l) => t.points.find((x) => x.id === l)).filter(Boolean);
    $('#outline-meta').innerHTML = `
      <div class="row"><span class="muted">Status</span><span class="status-pill status-${p.status}">${STATUS[p.status]}</span></div>
      <div class="row"><span class="muted">Section</span><span>${esc(section.title)}</span></div>
      <div><p class="muted" style="margin-bottom:.375rem">Sources</p><div class="cites">${(p.sources || []).map((s) => `<span class="cite">${icon('file', { size: 14 })}${esc(s.file)}</span>`).join('') || '<span class="tiny muted">None yet</span>'}</div></div>
      ${related.length ? `<div><p class="muted" style="margin-bottom:.375rem">Related points</p><div class="chips">${related.map((r) => `<a class="chip" href="#/twin/${id}/point/${encodeURIComponent(r.id)}"><span class="dot-mini ${r.status === 'complete' ? 'is-done' : 'is-gap'}" aria-hidden="true"></span>${esc(r.title)}</a>`).join('')}</div></div>` : ''}`;
    const next = tasksFor(t).find((x) => x.id !== pid);
    $('#outline-next').innerHTML = next
      ? `<p class="muted tiny">Next task</p><a class="btn btn-sm btn-block" href="#/twin/${id}/point/${encodeURIComponent(next.id)}">${esc(next.title)} ${icon('arrowRight', { size: 18 })}</a>`
      : '<p class="muted tiny">No other tasks. Your map is complete.</p>';
    const pill = $('#status-pill');
    pill.className = `status-pill status-${p.status}`;
    pill.textContent = STATUS[p.status];
  }

  function drawControls() {
    const stage = conv.stage;
    const hint = $('#validate-hint');
    validateBtn.disabled = stage !== 'summary' || busy;
    if (stage === 'done') {
      validateBtn.innerHTML = `${icon('check', { size: 18 })} Validated`;
      hint.textContent = 'This point is part of your twin. You can still add details.';
    } else {
      validateBtn.textContent = 'Validate';
      hint.textContent = stage === 'summary' ? 'Check the summary. If it’s right, press Validate.'
        : stage === 'clarify' ? 'Choose an option in the conversation first.'
          : 'Answer the open question first.';
    }
    textarea.placeholder = stage === 'done' ? 'Add a detail or correction…' : stage === 'clarify' ? 'Or type your answer again…' : 'Reply to the agent…';
    const suggest = $('#suggest');
    const canSuggest = (stage === 'asking' || stage === 'refining') && point.example && !busy;
    const html = canSuggest ? `<span class="tiny muted">Testing the prototype?</span><button type="button" class="btn btn-sm" data-example>Use example answer</button>` : '';
    if (suggest.innerHTML !== html) {
      // The composer changes height, so keep the newest message in view.
      const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
      suggest.innerHTML = html;
      if (atBottom) scrollDown(true);
    }
    $('#send-btn').disabled = busy;
  }

  async function typeInto(el, text) {
    const words = plain(text).split(/(\s+)/);
    const total = Math.min(1400, Math.max(300, words.length * 28));
    const per = total / Math.max(1, words.length);
    el.textContent = '';
    for (let i = 0; i < words.length; i++) {
      if (destroyed) return;
      el.textContent += words[i];
      if (i % 3 === 0) await sleep(per * 3);
    }
  }

  async function agentSay(messages) {
    for (const m of messages) {
      if (destroyed) return;
      const typing = document.createElement('div');
      typing.className = 'msg msg-agent';
      typing.innerHTML = `<span class="avatar" aria-hidden="true">${icon('chat', { size: 18 })}</span><div class="msg-body"><p class="msg-author">Twin agent <span class="ai-tag">AI</span></p><div class="typing" aria-label="The agent is thinking"><span></span><span></span><span></span><span class="typing-label">Thinking…</span></div></div>`;
      thread.appendChild(typing);
      scrollDown();
      await sleep(reducedMotion() ? 150 : 650 + Math.random() * 500);
      if (destroyed) return;
      typing.remove();
      const msg = { id: uid('m'), at: Date.now(), ...m };
      conv.messages.push(msg);
      persist();
      thread.insertAdjacentHTML('beforeend', msgHTML(msg));
      const el = thread.lastElementChild;
      const textEl = el.querySelector('.msg-text');
      if (textEl && !reducedMotion() && msg.kind !== 'done') {
        const full = textEl.innerHTML;
        el.querySelectorAll('.summary-card, .codebox, .cites, .choices, .sides, .callout-text:not(.msg-text)').forEach((x) => { x.style.visibility = 'hidden'; });
        await typeInto(textEl, msg.text);
        textEl.innerHTML = full;
        el.querySelectorAll('[style*="visibility"]').forEach((x) => { x.style.visibility = ''; });
      }
      rebuildOutline();
      scrollDown();
    }
  }

  // ---------- actions ----------
  async function send(text, kind = 'text', extra = {}) {
    if (busy) return;
    const value = String(text || '').trim();
    if (kind === 'text' && !value) { textarea.focus(); return; }
    busy = true;
    tour.clear();
    drawControls();
    const answered = conv.messages.some((m) => m.role === 'user');
    const heading = kind === 'sketch' ? 'Your sketch' : kind === 'file' ? 'Your file' : answered ? 'Your reply' : 'Your answer';
    const msg = { id: uid('m'), at: Date.now(), role: 'user', kind, text: value, heading, ...extra };
    conv.messages.push(msg);
    if (kind === 'text' || kind === 'voice') conv.answers.push(value);
    if (kind === 'sketch') conv.sketches = (conv.sketches || 0) + 1;
    persist();
    thread.insertAdjacentHTML('beforeend', msgHTML(msg));
    rebuildOutline();
    scrollDown();
    textarea.value = '';
    autosize();

    let res;
    if (kind === 'file') {
      updateTwin(id, (t) => {
        if (!t.files.some((f) => f.name === extra.file.name)) t.files.push({ name: extra.file.name, size: extra.file.size, type: (extra.file.name.split('.').pop() || '').toUpperCase(), addedAt: Date.now() });
        const p = t.points.find((x) => x.id === pid);
        if (!p.sources.some((s) => s.file === extra.file.name)) p.sources.push({ file: extra.file.name, where: 'added in chat' });
      });
      res = { stage: conv.stage, messages: [{ role: 'agent', heading: 'File added', text: `Thanks. I’ve added **${extra.file.name}** to your sources, and I’ll check it against the rest of your files.${conv.stage === 'done' ? '' : ' Is there anything in it that answers the open question? Tell me in your own words.'}` }] };
    } else {
      res = respond(point, conv, value, { name, kind });
      if (res.followup) conv.followups += 1;
    }
    conv.stage = res.stage;
    if (res.summary) conv.summary = res.summary;
    if (res.addition) {
      updateTwin(id, (t) => {
        const p = t.points.find((x) => x.id === pid);
        p.final = [p.final || p.summary, value].filter(Boolean).join(' ');
      });
    }
    persist();
    await agentSay(res.messages);
    busy = false;
    pendingKind = 'text';
    drawControls();
    drawMeta();
    afterAgent();
  }

  async function onChoice(choiceId, button) {
    if (busy) return;
    const msgEl = button.closest('.msg');
    const m = conv.messages.find((x) => x.id === msgEl.id);
    if (m) m.chosen = choiceId;
    msgEl.querySelectorAll('[data-choice]').forEach((b) => { b.disabled = true; });
    busy = true;
    tour.clear();
    drawControls();
    const label = choiceId === 'override' ? 'Keep my answer.' : choiceId === 'refine' ? 'I want to refine my answer.' : 'I want to change the summary.';
    const userMsg = { id: uid('m'), at: Date.now(), role: 'user', kind: 'text', text: label, heading: 'Your choice' };
    conv.messages.push(userMsg);
    thread.insertAdjacentHTML('beforeend', msgHTML(userMsg));
    const res = choose(point, conv, choiceId === 'refine-summary' ? 'refine-summary' : choiceId);
    conv.stage = res.stage;
    if (res.summary) conv.summary = res.summary;
    persist();
    rebuildOutline();
    scrollDown();
    await agentSay(res.messages);
    busy = false;
    drawControls();
    afterAgent();
    if (conv.stage === 'refining') textarea.focus();
  }

  async function validate() {
    if (conv.stage !== 'summary' || busy) return;
    const summary = conv.summary || summarize(point, conv);
    conv.stage = 'done';
    updateTwin(id, (t) => {
      const p = t.points.find((x) => x.id === pid);
      p.status = 'complete';
      p.final = summary.lines.join(' ');
      p.validatedAt = Date.now();
    });
    persist();
    tour.clear();
    busy = true;
    drawControls();
    drawMeta();
    thread.querySelectorAll('[data-choice="refine-summary"]').forEach((b) => { b.disabled = true; });
    await agentSay([{ role: 'agent', heading: 'Validated', kind: 'done', text: `Validated. **${point.title}** is now part of your twin, and its circle on your mind map is black.` }]);
    busy = false;
    drawControls();
    if (tour.current() === 'point-validate') {
      tour.end();
      const back = await dialog({
        title: 'You validated your first knowledge point',
        body: `<p>That’s the whole loop: the agent found a gap, you filled it in your own words, and you checked the result.</p>
          <p>Its circle on your mind map is now black. Work through the other tasks whenever you’re ready. When you’re done, press <strong>Complete</strong>.</p>`,
        actions: [{ label: 'Stay here', value: false }, { label: 'Back to the mind map', value: true, primary: true }],
      });
      if (back) go(`twin/${id}/map?done=${encodeURIComponent(pid)}`);
    }
  }

  // ---------- tour ----------
  function afterAgent() {
    const step = tour.current();
    if (!step || !step.startsWith('point')) return;
    if (conv.stage === 'summary') { tour.setStep('point-validate'); showTour(); }
    else if (conv.stage === 'clarify') { tour.setStep('point-clarify'); showTour(); }
    else if (conv.stage === 'asking' || conv.stage === 'refining') { tour.setStep('point-answer'); showTour(); }
  }

  function showTour() {
    const step = tour.current();
    if (!step || !step.startsWith('point') || destroyed) return;
    if (step === 'point-intro') {
      const first = thread.querySelector('.msg');
      // Back to the start of the conversation, so the spotlight isn't cut off at the top.
      scroller.scrollTo({ top: 0, behavior: 'instant' });
      tour.coach({
        target: first, step: 5, title: 'The agent explains what it found',
        html: '<p>It tells you what it learned from your documents, and which files it used.</p><p>Below that, it asks about the part that is missing or doesn’t match.</p>',
        onNext: () => {
          const outline = $('#outline');
          if (outline && outline.offsetParent) { tour.setStep('point-outline'); showTour(); } else { tour.setStep('point-answer'); showTour(); }
        },
      });
    } else if (step === 'point-outline') {
      tour.coach({
        target: '#outline', step: 6, title: 'Jump around with the outline',
        html: '<p>Every part of the conversation is listed here. Click one to jump straight to it.</p>',
        onNext: () => { tour.setStep('point-answer'); showTour(); },
      });
    } else if (step === 'point-answer') {
      // The open question sits just above the reply box.
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
      tour.coach({
        target: '#composer-area', step: 7, title: 'Answer in your own words',
        html: '<p>Type your answer, talk with the microphone, or press <strong>…</strong> to upload a file or sketch with the pen.</p><p>To try it quickly, press <strong>Use example answer</strong>, then send it.</p>',
        waitFor: 'Send an answer to continue',
      });
    } else if (step === 'point-clarify') {
      const choices = [...thread.querySelectorAll('.msg')].reverse().find((el) => el.querySelector('[data-choice]:not([disabled])'));
      tour.coach({
        target: choices, step: 7, title: 'Your answer doesn’t match a file',
        html: '<p>Choose <strong>Override</strong> if you’re right and the file is out of date. Choose <strong>Refine</strong> to change your answer.</p>',
        waitFor: 'Choose an option to continue',
      });
    } else if (step === 'point-validate') {
      tour.coach({
        target: '#validate-btn', step: 8, title: 'Check, then validate',
        html: '<p>Read the summary of what your twin will know. If it’s right, press <strong>Validate</strong>.</p><p>If not, press <strong>Refine</strong> and tell the agent what to change.</p>',
        waitFor: 'Press Validate to finish',
        padding: 10,
      });
    }
  }

  // ---------- voice, sketch, file, iPad ----------
  function toggleRecording() {
    const recEl = $('#recording');
    const mic = $('#mic-btn');
    if (recording) {
      clearInterval(recording.timer);
      recording = null;
      recEl.hidden = true;
      textarea.hidden = false;
      mic.innerHTML = icon('mic');
      mic.setAttribute('aria-label', 'Answer by voice');
      textarea.value = conv.stage !== 'done' && point.example ? point.example : 'This is where the transcript of your voice note would appear.';
      pendingKind = 'voice';
      autosize();
      textarea.focus();
      toast('Demo: your voice note was turned into text. Check it, then press Send.');
      return;
    }
    let seconds = 0;
    recording = { timer: setInterval(() => {
      seconds += 1;
      $('#rec-label').textContent = `Recording 0:${String(seconds).padStart(2, '0')}. Press stop when you’re done.`;
      if (seconds >= 30) toggleRecording();
    }, 1000) };
    $('#rec-label').textContent = 'Recording 0:00. Press stop when you’re done.';
    recEl.hidden = false;
    textarea.hidden = true;
    mic.innerHTML = icon('stop');
    mic.setAttribute('aria-label', 'Stop recording');
    mic.focus();
  }

  async function openSketch() {
    let drawn = false;
    const image = await dialog({
      title: store.get().ipad ? 'Sketch here or on your iPad' : 'Sketch your answer',
      wide: true,
      body: `<div class="sketch-wrap">
        <p class="muted">Draw the flow, a diagram or handwritten notes. ${store.get().ipad ? 'Your iPad is connected, so you can also draw there.' : ''}</p>
        <canvas class="sketch-canvas" id="sketch" aria-label="Drawing area"></canvas>
        <div class="sketch-tools" role="group" aria-label="Drawing tools">
          <button type="button" class="chip" data-mode="pen" aria-pressed="true">${icon('pen', { size: 18 })} Pen</button>
          <button type="button" class="chip" data-mode="eraser" aria-pressed="false">${icon('eraser', { size: 18 })} Eraser</button>
          <button type="button" class="chip" data-clear>${icon('trash', { size: 18 })} Clear</button>
        </div></div>`,
      actions: [{ label: 'Cancel', value: null }, { label: 'Attach sketch', primary: true, getValue: (box) => (drawn ? box.querySelector('#sketch').toDataURL('image/jpeg', 0.72) : null) }],
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
          ctx.strokeStyle = mode === 'pen' ? '#141414' : '#ffffff';
          ctx.lineWidth = mode === 'pen' ? 4 : 28;
          ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          last = p;
          if (mode === 'pen') drawn = true;
        });
        const stop = () => { last = null; };
        canvas.addEventListener('pointerup', stop);
        canvas.addEventListener('pointercancel', stop);
        box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
          mode = b.dataset.mode;
          box.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        box.querySelector('[data-clear]').addEventListener('click', () => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); drawn = false; });
      },
    });
    if (image) send('', 'sketch', { image });
  }

  async function ipadDialog() {
    if (store.get().ipad) {
      const off = await dialog({
        title: 'Your iPad is connected',
        body: '<p>Sketches and handwriting from your iPad appear in this conversation.</p><p class="muted">Demo: no real device is connected.</p>',
        actions: [{ label: 'Disconnect', value: true }, { label: 'Done', value: false, primary: true }],
      });
      if (off) { store.update((s) => { s.ipad = false; }); $('#ipad-btn span').textContent = 'Connect to iPad'; toast('iPad disconnected.'); }
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ok = await dialog({
      title: 'Connect your iPad',
      body: `<ol class="steps-list"><li><span>Open ${'Twin Studio'} on your iPad and sign in.</span></li><li><span>Tap <strong>Connect to computer</strong>.</span></li><li><span>Enter this code:</span></li></ol>
        <p class="pair-code" aria-label="Pairing code ${code.split('').join(' ')}">${code}</p>
        <p class="muted">Then sketch, handwrite or mark up a photo with your Apple Pencil. It shows up here. Demo: no real device is needed.</p>`,
      actions: [{ label: 'Cancel', value: false }, { label: 'My iPad is connected', value: true, primary: true }],
    });
    if (ok) { store.update((s) => { s.ipad = true; }); $('#ipad-btn span').textContent = 'iPad connected'; toast('iPad connected (demo). Use the pen to sketch.'); }
  }

  function autosize() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(160, textarea.scrollHeight)}px`;
  }

  // ---------- events ----------
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); if (recording) toggleRecording(); send(textarea.value, pendingKind); });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(textarea.value, pendingKind); }
  });
  textarea.addEventListener('input', () => { autosize(); if (!textarea.value) pendingKind = 'text'; });
  $('#mic-btn').addEventListener('click', toggleRecording);
  $('#more-btn').addEventListener('click', () => {
    const tray = $('#tool-tray');
    tray.hidden = !tray.hidden;
    $('#more-btn').setAttribute('aria-expanded', String(!tray.hidden));
    if (!tray.hidden) tray.querySelector('.tool').focus();
  });
  $('#tool-tray').addEventListener('click', (e) => {
    const tool = e.target.closest('[data-tool]');
    if (!tool) return;
    $('#tool-tray').hidden = true;
    $('#more-btn').setAttribute('aria-expanded', 'false');
    if (tool.dataset.tool === 'chat') textarea.focus();
    if (tool.dataset.tool === 'upload') $('#chat-file').click();
    if (tool.dataset.tool === 'pen') openSketch();
  });
  $('#chat-file').addEventListener('change', () => {
    const file = $('#chat-file').files[0];
    $('#chat-file').value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast('That file is over 50 MB.'); return; }
    send(file.name, 'file', { file: { name: file.name, size: file.size } });
  });
  $('#suggest').addEventListener('click', (e) => {
    if (!e.target.closest('[data-example]')) return;
    textarea.value = point.example;
    pendingKind = 'text';
    autosize();
    textarea.focus();
  });
  validateBtn.addEventListener('click', validate);
  thread.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-choice]');
    if (btn && !btn.disabled) onChoice(btn.dataset.choice, btn);
  });
  $('#outline-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-target]');
    if (!item) return;
    const el = root.querySelector(`#${CSS.escape(item.dataset.target)}`);
    if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    root.querySelectorAll('.outline-item').forEach((b) => b.classList.toggle('is-current', b === item));
    if (window.innerWidth <= 1100) { $('#outline').classList.remove('is-open'); $('#outline-toggle').setAttribute('aria-expanded', 'false'); }
  });
  $('#outline-toggle').addEventListener('click', () => {
    const open = !$('#outline').classList.contains('is-open');
    $('#outline').classList.toggle('is-open', open);
    $('#outline-toggle').setAttribute('aria-expanded', String(open));
  });
  $('#ipad-btn').addEventListener('click', ipadDialog);
  const onKey = (e) => {
    if (e.key === 'Escape' && $('#outline').classList.contains('is-open')) { $('#outline').classList.remove('is-open'); $('#outline-toggle').setAttribute('aria-expanded', 'false'); }
  };
  document.addEventListener('keydown', onKey);

  // ---------- start ----------
  drawMeta();
  drawControls();
  focusHeading(root);
  (async () => {
    if (!conv.messages.length) {
      busy = true;
      drawControls();
      await agentSay(openingMessages(point));
      busy = false;
      drawControls();
    } else {
      thread.innerHTML = conv.messages.map(msgHTML).join('');
      rebuildOutline();
      scrollDown(true);
    }
    if (destroyed) return;
    if (tour.current() === 'point-intro') showTour();
    else afterAgent();
    // Ready for an answer: put the cursor in the reply box (the tour manages focus itself).
    if (!tour.current() && conv.stage !== 'done') textarea.focus({ preventScroll: true });
  })();

  return () => {
    destroyed = true;
    if (recording) clearInterval(recording.timer);
    if (observer) observer.disconnect();
    document.removeEventListener('keydown', onKey);
    tour.clear();
  };
}
