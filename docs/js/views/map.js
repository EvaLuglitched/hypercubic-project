// P2 / P3 / P4: the mind map screen. Canvas in the middle, the twin panel and Tasks on the right,
// Complete at the bottom right, zoom controls and legend at the bottom left.
import { esc, icon, logoMark, PRODUCT, dialog, go, toast, fmtBytes, timeAgo } from '../ui.js';
import { store, getTwin, updateTwin, progress, tasksFor } from '../store.js';
import { MindMap } from '../mindmap.js';
import { projectsFor } from '../demo.js';
import * as tour from '../tour.js';

const TASKS_SHOWN = 5;

function taskIcon(p) {
  return p.status === 'conflict'
    ? '<span class="legend-badge" aria-hidden="true">!</span>'
    : '<span class="dot-mini is-gap" aria-hidden="true"></span>';
}

export function render(root, { id, query }) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return; }
  if (!twin.points.length) { location.replace(`#/twin/${id}/upload`); return; }
  let showAll = false;

  root.innerHTML = `
  <div class="map-screen">
    <h1 class="sr-only">Mind map of ${esc(twin.name)}</h1>
    <div class="map-stage" id="map-stage"></div>
    <a class="crumb" href="#/home" aria-label="Back to your dashboard">${logoMark()}<span>${PRODUCT}</span><span class="crumb-sep" aria-hidden="true">/</span><span>Mind Map</span></a>
    <div class="map-tools">
      <div class="zoom-group" role="group" aria-label="Zoom">
        <button type="button" class="icon-btn" data-zoom="out" aria-label="Zoom out">${icon('minus')}</button>
        <span class="zoom-readout" id="zoom-readout" aria-live="off">100%</span>
        <button type="button" class="icon-btn" data-zoom="in" aria-label="Zoom in">${icon('plus')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-zoom="fit">${icon('fit', { size: 18 })} Fit</button>
      </div>
      <div class="legend" aria-label="Legend">
        <span><span class="dot-mini is-done" aria-hidden="true"></span>Validated</span>
        <span><span class="dot-mini is-gap" aria-hidden="true"></span>Needs you</span>
        <span><span class="legend-badge" aria-hidden="true">!</span>Sources disagree</span>
        ${projectsFor(twin).length ? '<span><span class="legend-projects" aria-hidden="true"><span></span><span></span><span></span></span>Projects behind it</span>' : ''}
      </div>
      <button type="button" class="icon-btn" data-help aria-label="How to use the mind map">${icon('help')}</button>
    </div>
    <aside class="map-panel" aria-label="Twin details and tasks">
      <section class="panel-card" id="panel-info"></section>
      <section class="panel-card" id="panel-tasks" aria-labelledby="tasks-h"></section>
    </aside>
    <button type="button" class="map-complete" id="complete-btn">Complete</button>
  </div>`;

  const screen = root.querySelector('.map-screen');
  const readout = root.querySelector('#zoom-readout');
  const map = new MindMap(root.querySelector('#map-stage'), {
    twin,
    // Keep the map clear of the right panel, whatever the text size setting.
    rightInset: root.querySelector('.map-panel').offsetWidth + 56,
    bottomInset: 96,
    onOpen: (pid) => openPoint(pid),
    onView: (v) => { readout.textContent = `${Math.round(v.k * 100)}%`; },
  });

  function openPoint(pid) {
    if (tour.current() === 'choose-task') tour.setStep('point-intro', { pointId: pid });
    tour.clear();
    go(`twin/${id}/point/${pid}`);
  }

  function drawPanel() {
    const t = getTwin(id);
    const pr = progress(t);
    const tasks = tasksFor(t);
    root.querySelector('#panel-info').innerHTML = `
      <div class="panel-top">
        <h2 class="panel-title" id="twin-name">${esc(t.name)}</h2>
        <button type="button" class="icon-btn icon-btn-sm icon-btn-plain" data-rename aria-label="Rename twin">${icon('edit', { size: 18 })}</button>
      </div>
      <div class="panel-row">
        <button type="button" class="row-link" data-sources>Sources <span class="tiny muted mono">${t.files.length}</span></button>
        <button type="button" class="plain-plus" data-add aria-label="Add sources">${icon('plus')}</button>
      </div>
      <div class="panel-row"><span>Progress</span><span class="mono tiny">${pr.done} / ${pr.total}</span></div>
      <div class="progress" role="progressbar" aria-label="Validated knowledge points" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pr.pct}"><span style="width:${pr.pct}%"></span></div>`;
    const shown = showAll ? tasks : tasks.slice(0, TASKS_SHOWN);
    root.querySelector('#panel-tasks').innerHTML = `
      <h2 class="panel-title" id="tasks-h">Tasks</h2>
      ${tasks.length ? `
        <ol class="task-list">
          ${shown.map((p, i) => `<li><button type="button" class="task" data-task="${esc(p.id)}" aria-label="${i + 1}. ${esc(p.title)}: ${p.status === 'conflict' ? 'sources disagree' : 'missing information'}">${taskIcon(p)}<span class="task-text">${i + 1}. ${esc(p.title)}</span>${icon('chevronRight', { size: 18 })}</button></li>`).join('')}
        </ol>
        ${tasks.length > TASKS_SHOWN ? `<button type="button" class="link-btn task-more" data-more>${showAll ? 'Show fewer' : `Show all ${tasks.length} tasks`}</button>` : ''}`
        : '<p class="muted" style="margin-top:.5rem">Every knowledge point is validated. Press Complete to create your twin.</p>'}`;
    const complete = root.querySelector('#complete-btn');
    complete.classList.toggle('is-ready', tasks.length === 0);
    complete.textContent = t.status === 'published' ? 'Update published twin' : 'Complete';
  }
  drawPanel();

  root.querySelector('.map-panel').addEventListener('click', async (e) => {
    const task = e.target.closest('[data-task]');
    if (task) { openPoint(task.dataset.task); return; }
    if (e.target.closest('[data-more]')) { showAll = !showAll; drawPanel(); return; }
    if (e.target.closest('[data-add]')) { go(`twin/${id}/upload?mode=add`); return; }
    if (e.target.closest('[data-sources]')) { sourcesDialog(); return; }
    if (e.target.closest('[data-rename]')) {
      const t = getTwin(id);
      const name = await dialog({
        title: 'Rename twin',
        body: `<div class="field"><label for="rename-input">Twin name</label><input class="input" id="rename-input" maxlength="60" value="${esc(t.name)}"></div>`,
        actions: [{ label: 'Cancel', value: null }, { label: 'Save', primary: true, getValue: (box) => box.querySelector('#rename-input').value.trim() }],
      });
      if (name) { updateTwin(id, (x) => { x.name = name; }); drawPanel(); toast('Twin renamed.'); }
    }
  });

  async function sourcesDialog() {
    const t = getTwin(id);
    const choice = await dialog({
      title: `Sources for ${t.name}`,
      wide: true,
      body: `<ul class="file-list" style="margin-top:0">${t.files.map((f) => `
        <li class="file-row"><span class="file-icon" aria-hidden="true">${esc((f.type || '').slice(0, 4))}</span>
        <span class="file-text"><span class="file-name">${esc(f.name)}</span><span class="file-meta">${f.size ? fmtBytes(f.size) + ' · ' : ''}added ${timeAgo(f.addedAt || t.createdAt)}</span></span>
        ${f.demo ? '<span class="tag">Demo</span>' : ''}</li>`).join('')}</ul>`,
      actions: [{ label: 'Close', value: null }, { label: 'Add more files', value: 'add', primary: true }],
    });
    if (choice === 'add') go(`twin/${id}/upload?mode=add`);
  }

  root.querySelector('.map-tools').addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) {
      if (z.dataset.zoom === 'in') map.zoomBy(1.3);
      if (z.dataset.zoom === 'out') map.zoomBy(1 / 1.3);
      if (z.dataset.zoom === 'fit') map.fit(true);
    }
    if (e.target.closest('[data-help]')) helpDialog();
  });

  async function helpDialog() {
    const replay = await dialog({
      title: 'Using the mind map',
      body: `<p>Each circle is one piece of your knowledge.</p>
        <ul style="padding-left:1.25rem;display:grid;gap:.375rem">
          <li><strong>Black circles</strong> are validated.</li>
          <li><strong>Circles with a dashed ring</strong> need you: something is missing.</li>
          <li><strong>A “!”</strong> means your files or your projects disagree.</li>
          <li><strong>Small grey dots</strong> around a circle are the projects it came from.</li></ul>
        <p><strong>Move around:</strong> drag the background, or use the arrow keys. <strong>Zoom:</strong> scroll, or press + and −. <strong>See everything:</strong> press Fit or 0.</p>
        <p><strong>Open a point:</strong> click its circle, then press Open. Or pick one from Tasks.</p>`,
      actions: [{ label: 'Replay the tour', value: true }, { label: 'Close', value: false, primary: true }],
    });
    if (replay) { tour.setStep('map-intro'); runTour(); }
  }

  root.querySelector('#complete-btn').addEventListener('click', async () => {
    const t = getTwin(id);
    const pr = progress(t);
    const left = pr.total - pr.done;
    const ok = await dialog({
      title: left ? 'Complete your twin now?' : 'Create your digital twin?',
      body: left
        ? `<p>${left} knowledge ${left === 1 ? 'point still needs' : 'points still need'} you. If you complete now, your twin will answer “I don’t know” about ${left === 1 ? 'it' : 'them'} until you fill the gaps.</p><p class="muted">You can come back and finish them at any time.</p>`
        : '<p>The Knowledge agent will take in every validated point. Then you’ll test your twin: it answers a few questions next to you, so you can see how closely it matches your thinking.</p>',
      actions: left
        ? [{ label: 'Keep working', value: false }, { label: 'Complete anyway', value: true, primary: true }]
        : [{ label: 'Not yet', value: false }, { label: 'Create my twin', value: true, primary: true }],
    });
    if (ok) go(`twin/${id}/create`);
  });

  // ----- tour (first-time users) -----
  function runTour() {
    const step = tour.current();
    if (!step) return;
    if (step === 'map-intro') {
      map.fit(true);
      tour.coach({
        target: null, step: 1, title: 'This is your mind map',
        html: `<p>Everything the AI learned from your documents. Each circle is one piece of your knowledge.</p>
          <div class="coach-legend">
            <span><span class="dot-mini is-done"></span>Black: validated</span>
            <span><span class="dot-mini is-gap"></span>Dashed ring: needs you</span>
            <span><span class="legend-badge">!</span>Two files disagree</span>
          </div>`,
        onNext: () => { tour.setStep('map-move'); runTour(); },
      });
    } else if (step === 'map-move') {
      tour.coach({
        target: '.map-tools', step: 2, title: 'Move around',
        html: '<p>Zoom with + and −, or with your mouse’s scroll wheel. Drag the background to move.</p><p>Press <strong>Fit</strong> to see your whole map again.</p>',
        onNext: () => { tour.setStep('map-panel'); runTour(); },
      });
    } else if (step === 'map-panel') {
      tour.coach({
        target: '#panel-info', step: 3, title: 'Your twin at a glance',
        html: '<p>Your twin’s name, its sources and your progress are always here.</p><p>Press <strong>+</strong> next to Sources to add more documents later.</p>',
        onNext: () => { tour.setStep('choose-task'); runTour(); },
      });
    } else if (step === 'choose-task') {
      tour.chooseTask(root.querySelector('#panel-tasks'));
    }
  }

  if (query.done || query.focus) {
    // Back from a knowledge point: show it on the map, with its update.
    const pid = query.done || query.focus;
    setTimeout(() => { map.focusNode(pid, 0.9); map.pulse(pid); }, 250);
    if (query.done) {
      const pr = progress(getTwin(id));
      toast(`Validated. ${pr.done} of ${pr.total} knowledge points are done.`);
    }
    if (query.tour === 'done') {
      setTimeout(() => {
        if (!document.contains(screen)) return;
        dialog({
          title: 'You validated your first knowledge point',
          body: `<p>That’s the whole loop: the agent found a gap, you filled it in your own words, and you checked the page.</p>
            <p>Its circle is black now. Work through the other tasks whenever you’re ready. When you’re done, press <strong>Complete</strong>.</p>`,
          actions: [{ label: 'Got it', value: true, primary: true }],
        });
      }, 1100);
    }
  } else if (Number(query.added) > 0 && getTwin(id).status !== 'draft') {
    toast(`The AI found ${query.added} knowledge points in your files.`);
  }

  const step = tour.current();
  if (step && step.startsWith('point')) tour.setStep('choose-task');
  if (tour.current()) {
    setTimeout(runTour, 350);
  } else if (store.get().user && !store.get().user.tourSeen) {
    setTimeout(async () => {
      if (!document.contains(screen)) return;
      if (await tour.offer()) runTour();
    }, 700);
  }

  return () => {
    map.destroy();
    tour.clear();
  };
}
