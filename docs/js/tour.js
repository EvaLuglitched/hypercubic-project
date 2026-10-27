// First-time tutorial. It shows how to move around the mind map, then walks the expert
// through completing and validating one knowledge point. Steps that need an action wait for it.

import { store } from './store.js';
import { esc, dialog, $ } from './ui.js';

export const TOTAL = 8;

export const current = () => store.get().tour?.step || null;

export function setStep(step, extra = {}) {
  store.update((s) => { s.tour = step ? { ...(s.tour || {}), ...extra, step } : null; });
}

export function end() {
  store.update((s) => {
    s.tour = null;
    if (s.user) s.user.tourSeen = true;
  });
  clear();
}

export async function offer() {
  const yes = await dialog({
    title: 'Would you like a quick tour?',
    body: `<p>This is your mind map: everything the AI learned from your documents.</p>
      <p>The tour takes about two minutes. It shows you how to move around the map, then walks you through completing and validating one knowledge point.</p>
      <p class="muted">You can replay it from Help at any time.</p>`,
    actions: [{ label: 'No, thanks', value: false }, { label: 'Yes, show me', value: true, primary: true }],
  });
  store.update((s) => { if (s.user) s.user.tourSeen = true; });
  if (yes) setStep('map-intro');
  return Boolean(yes);
}

let layer = null;
let onResize = null;

export function clear() {
  if (layer) layer.remove();
  layer = null;
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  document.querySelectorAll('.choose-pill, .choose-arrow, .choose-help').forEach((el) => el.remove());
  const screen = document.querySelector('.map-screen');
  if (screen) screen.classList.remove('is-choosing');
}

// Shows a coach card next to `target` (an element or selector) and dims everything else.
// With `waitFor`, there is no Next button: the step ends when the screen calls setStep().
export function coach({ target, step, title, html, waitFor = '', nextLabel = 'Next', onNext = null, padding = 8 }) {
  clear();
  const el = typeof target === 'string' ? $(target) : target;
  layer = document.createElement('div');
  layer.className = 'coach-layer';
  layer.innerHTML = `
    <div class="coach-block" data-b="top"></div><div class="coach-block" data-b="left"></div>
    <div class="coach-block" data-b="right"></div><div class="coach-block" data-b="bottom"></div>
    <div class="coach-ring"></div>
    <section class="coach-card" role="dialog" aria-labelledby="coach-title" aria-describedby="coach-text">
      <p class="coach-step">Tour · step ${step} of ${TOTAL}</p>
      <h2 id="coach-title">${esc(title)}</h2>
      <div class="coach-text" id="coach-text">${html}</div>
      <div class="coach-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-skip>Skip tour</button>
        ${waitFor ? `<span class="coach-wait">${esc(waitFor)}</span>` : `<button type="button" class="btn btn-primary btn-sm" data-next>${esc(nextLabel)}</button>`}
      </div>
    </section>`;
  document.body.appendChild(layer);
  layer.querySelector('[data-skip]').addEventListener('click', () => end());
  const next = layer.querySelector('[data-next]');
  if (next) {
    next.addEventListener('click', () => onNext && onNext());
    next.focus();
  } else {
    layer.querySelector('.coach-card').setAttribute('tabindex', '-1');
    layer.querySelector('.coach-card').focus({ preventScroll: true });
  }

  const position = () => {
    if (!layer) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = el ? el.getBoundingClientRect() : { left: vw / 2, top: vh / 2, right: vw / 2, bottom: vh / 2, width: 0, height: 0 };
    const hole = el
      ? { l: Math.max(0, r.left - padding), t: Math.max(0, r.top - padding), r: Math.min(vw, r.right + padding), b: Math.min(vh, r.bottom + padding) }
      : { l: vw / 2, t: vh / 2, r: vw / 2, b: vh / 2 };
    const set = (name, css) => Object.assign(layer.querySelector(`[data-b="${name}"]`).style, css);
    set('top', { left: '0px', top: '0px', width: `${vw}px`, height: `${hole.t}px` });
    set('bottom', { left: '0px', top: `${hole.b}px`, width: `${vw}px`, height: `${Math.max(0, vh - hole.b)}px` });
    set('left', { left: '0px', top: `${hole.t}px`, width: `${hole.l}px`, height: `${hole.b - hole.t}px` });
    set('right', { left: `${hole.r}px`, top: `${hole.t}px`, width: `${Math.max(0, vw - hole.r)}px`, height: `${hole.b - hole.t}px` });
    const ring = layer.querySelector('.coach-ring');
    Object.assign(ring.style, { left: `${hole.l}px`, top: `${hole.t}px`, width: `${hole.r - hole.l}px`, height: `${hole.b - hole.t}px`, display: el ? 'block' : 'none' });

    const card = layer.querySelector('.coach-card');
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gap = 18;
    let left;
    let top;
    if (!el) { left = (vw - cw) / 2; top = (vh - ch) / 2; }
    else if (hole.r + gap + cw < vw - 12) { left = hole.r + gap; top = hole.t; }
    else if (hole.l - gap - cw > 12) { left = hole.l - gap - cw; top = hole.t; }
    else if (hole.b + gap + ch < vh - 12) { left = hole.l; top = hole.b + gap; }
    else { left = hole.l; top = hole.t - gap - ch; }
    left = Math.max(12, Math.min(vw - cw - 12, left));
    top = Math.max(12, Math.min(vh - ch - 12, top));
    Object.assign(card.style, { left: `${left}px`, top: `${top}px` });
  };
  position();
  requestAnimationFrame(position);
  onResize = () => position();
  window.addEventListener('resize', onResize);
  return { reposition: position };
}

// P4: blur the map and point a dashed arrow at the Tasks list.
export function chooseTask(tasksEl) {
  clear();
  const screen = document.querySelector('.map-screen');
  if (screen) screen.classList.add('is-choosing');
  const pill = document.createElement('div');
  pill.className = 'choose-pill';
  pill.textContent = 'Choose a Task';
  const arrow = document.createElement('div');
  arrow.className = 'choose-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  const help = document.createElement('section');
  help.className = 'choose-help';
  help.setAttribute('role', 'dialog');
  help.setAttribute('aria-label', 'Tour');
  help.innerHTML = `<p class="coach-step">Tour · step 4 of ${TOTAL}</p>
    <p>Each task is a knowledge point that needs you. Click one to open it.</p>
    <div class="coach-actions"><button type="button" class="btn btn-ghost btn-sm" data-skip>Skip tour</button></div>`;
  document.body.append(pill, arrow, help);
  help.querySelector('[data-skip]').addEventListener('click', () => end());

  const position = () => {
    const r = tasksEl.getBoundingClientRect();
    const firstTask = tasksEl.querySelector('.task') || tasksEl;
    const tr = firstTask.getBoundingClientRect();
    const midY = tr.top + tr.height / 2;
    const pw = pill.offsetWidth;
    const ph = pill.offsetHeight;
    const arrowLen = 90;
    const pillLeft = Math.max(16, r.left - arrowLen - pw - 8);
    Object.assign(pill.style, { left: `${pillLeft}px`, top: `${midY - ph / 2}px` });
    Object.assign(arrow.style, { left: `${pillLeft + pw}px`, top: `${midY - 1}px`, width: `${Math.max(30, r.left - (pillLeft + pw) - 8)}px` });
    Object.assign(help.style, { left: `${pillLeft}px`, top: `${midY + ph / 2 + 16}px` });
  };
  position();
  onResize = () => position();
  window.addEventListener('resize', onResize);
  const first = tasksEl.querySelector('.task');
  if (first) first.focus();
}
