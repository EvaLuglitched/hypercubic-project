// "Thinking......": the Knowledge agent reads the files, the Validate agent checks them,
// then the mind map is built (Receive knowledge → Validate agent checks → Validation complete).
import { esc, logoMark, PRODUCT, go, sleep, reducedMotion, focusHeading } from '../ui.js';
import { getTwin, updateTwin } from '../store.js';
import { thinkingSteps, buildKnowledge } from '../agent.js';

export function render(root, { id }) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return; }
  const pending = twin.pending || [];
  if (!pending.length) { location.replace(`#/twin/${id}/${twin.points.length ? 'map' : 'upload'}`); return; }
  const steps = thinkingSteps(pending);

  root.innerHTML = `
  <div class="thinking-screen">
    <span class="crumb">${logoMark()}<span>${PRODUCT}</span><span class="crumb-sep" aria-hidden="true">/</span><span>${esc(twin.name)}</span></span>
    <main class="thinking-main" id="main">
      <h1 class="thinking-title">Thinking<span class="dots" aria-hidden="true"></span></h1>
      <p class="thinking-sub" id="now" aria-live="polite">Reading your files</p>
      <div class="thinking-bar" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="bar"></span></div>
      <ol class="agent-steps" aria-label="What the agents are doing">
        ${steps.map((s, i) => `<li class="agent-step" data-i="${i}"><span class="step-mark" aria-hidden="true"></span><span class="step-agent">${esc(s.agent)}</span><span class="step-text">${esc(s.text)}</span></li>`).join('')}
      </ol>
    </main>
  </div>`;
  focusHeading(root);

  let cancelled = false;
  (async () => {
    const fast = reducedMotion();
    const items = root.querySelectorAll('.agent-step');
    const bar = root.querySelector('#bar');
    const progressEl = root.querySelector('.thinking-bar');
    const now = root.querySelector('#now');
    for (let i = 0; i < steps.length; i++) {
      if (cancelled) return;
      items[i].classList.add('is-active');
      now.textContent = `${steps[i].agent}: ${steps[i].text}`;
      await sleep(fast ? 220 : 600 + Math.random() * 350);
      if (cancelled) return;
      items[i].classList.remove('is-active');
      items[i].classList.add('is-done');
      const pct = Math.round(((i + 1) / steps.length) * 100);
      bar.style.width = `${pct}%`;
      progressEl.setAttribute('aria-valuenow', String(pct));
    }
    if (cancelled) return;
    let added = 0;
    updateTwin(id, (t) => {
      const before = t.points.length;
      const built = buildKnowledge(t.pending, { sections: t.sections, points: t.points });
      const names = new Set(t.files.map((f) => f.name));
      t.files.push(...t.pending.filter((f) => !names.has(f.name)));
      t.sections = built.sections;
      t.points = built.points;
      t.pending = [];
      added = t.points.length - before;
      if (t.status === 'draft') t.status = 'building';
      // A published twin keeps answering from what's already validated; new points just become tasks.
      if (added && t.status === 'ready') t.status = 'building';
    });
    now.textContent = 'Validation complete. Opening your mind map.';
    await sleep(fast ? 100 : 500);
    if (!cancelled) go(`twin/${id}/map?added=${added}`);
  })();
  return () => { cancelled = true; };
}
