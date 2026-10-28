// P1: upload documents (Start session → Uploading external sources → Document input / file upload).
import { esc, icon, logoMark, PRODUCT, dialog, go, toast, fmtBytes, focusHeading } from '../ui.js';
import { store, getTwin, updateTwin } from '../store.js';
import { categoryById, categoryFor } from '../demo.js';
import { chooseCategory } from './demo-picker.js';

const ACCEPTED = ['pdf', 'docx', 'doc', 'txt', 'md'];
const MAX_BYTES = 50 * 1024 * 1024;
const TEXT_LIMIT = 20000;

const ext = (name) => (name.split('.').pop() || '').toLowerCase();

function readText(file) {
  return new Promise((resolve) => {
    if (!['txt', 'md'].includes(ext(file.name))) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').slice(0, TEXT_LIMIT));
    reader.onerror = () => resolve('');
    reader.readAsText(file.slice(0, TEXT_LIMIT * 2));
  });
}

export function render(root, { id, query }) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return; }
  const adding = query.mode === 'add' || twin.points.length > 0;
  const already = new Set(twin.files.map((f) => f.name));
  // A twin that already has demo files stays with that demo category.
  const lockedStory = categoryFor(twin);
  const fieldStory = categoryById(store.get().user?.field);
  const hint = (lockedStory || fieldStory)?.uploadHint || 'Process documents, notes, research, specs, diagrams, transcripts.';
  let files = [];
  let story = null; // the demo category whose files are in the list

  root.innerHTML = `
  <div class="upload-screen">
    <a class="crumb" href="${adding ? `#/twin/${id}/map` : '#/home'}" aria-label="${adding ? 'Back to the mind map' : 'Back to your dashboard'}">${logoMark()}<span>${PRODUCT}</span><span class="crumb-sep" aria-hidden="true">/</span><span>${adding ? 'Mind Map' : esc(twin.name)}</span></a>
    <main class="upload-main" id="main">
      <div class="upload-head">
        <h1 class="upload-title">${adding ? 'Add More Documents' : 'Upload All Relevant Documents'}</h1>
        <button type="button" class="help-dot" id="upload-help" aria-label="What should I upload?">?</button>
      </div>
      <p class="upload-sub">${adding
        ? `New files are checked against what <strong>${esc(twin.name)}</strong> already knows.`
        : `${esc(hint)} Organized or not, the AI will sort it out.`}</p>
      <span class="down-arrow" aria-hidden="true">${icon('arrowDown', { size: 36 })}</span>
      <section class="upload-card" aria-label="Upload documents">
        <div class="dropzone" id="dropzone">
          <div class="dz-row"><button type="button" class="btn btn-primary" id="pick">Upload files</button><span>or drag and drop here</span></div>
          <p class="formats">PDF, DOCX, TXT, MD up to 50 MB</p>
          <input type="file" id="file-input" multiple accept=".pdf,.docx,.doc,.txt,.md" hidden>
        </div>
        <div class="demo-row">
          <span class="muted">No files at hand?</span>
          <button type="button" class="btn btn-sm" id="demo-btn">${icon('file', { size: 18 })} Use Demo Files</button>
        </div>
        <p class="form-error" role="alert" id="upload-error" hidden></p>
        <div class="demo-note" id="demo-note" hidden></div>
        <ul class="file-list" id="file-list" aria-label="Files to upload"></ul>
      </section>
      <div class="upload-actions">
        ${adding ? `<a class="btn btn-lg" href="#/twin/${id}/map">Cancel</a>` : ''}
        <button type="button" class="btn btn-primary btn-lg" id="go-btn" disabled>${adding ? 'Add to mind map' : 'Create mind map'} ${icon('arrowRight')}</button>
      </div>
    </main>
  </div>`;

  const list = root.querySelector('#file-list');
  const goBtn = root.querySelector('#go-btn');
  const input = root.querySelector('#file-input');
  const zone = root.querySelector('#dropzone');
  const error = root.querySelector('#upload-error');
  const note = root.querySelector('#demo-note');

  const draw = () => {
    list.innerHTML = files.map((f, i) => `
      <li class="file-row">
        <span class="file-icon" aria-hidden="true">${esc(ext(f.name).toUpperCase().slice(0, 4))}</span>
        <span class="file-text"><span class="file-name">${esc(f.name)}</span><span class="file-meta">${fmtBytes(f.size)}${f.text ? ' · text read' : ''}</span></span>
        ${f.demo ? '<span class="tag">Demo</span>' : ''}
        <button type="button" class="icon-btn icon-btn-sm icon-btn-plain" data-remove="${i}" aria-label="Remove ${esc(f.name)}">${icon('close', { size: 18 })}</button>
      </li>`).join('');
    goBtn.disabled = files.length === 0;
    if (!files.some((f) => f.demo)) story = null;
    note.hidden = !story;
    note.innerHTML = story ? `
      <span class="demo-note-icon" aria-hidden="true">${icon(story.icon, { size: 20 })}</span>
      <span class="demo-note-text"><span class="tiny muted">Demo files for</span><strong>${esc(story.label)}</strong></span>
      ${lockedStory ? '' : '<button type="button" class="btn btn-sm" data-change-demo>Change</button>'}` : '';
  };

  // Before any demo files load, the person chooses which demo category to explore.
  async function useDemoFiles() {
    const id = lockedStory ? lockedStory.id : await chooseCategory({
      title: 'Which demo do you want to explore?',
      intro: 'Each demo is a set of files from a made-up expert. Choose the field you know best. You’ll play that expert and fill in the gaps the AI finds.',
      confirmLabel: 'Use these demo files',
      selected: story?.id || fieldStory?.id,
      describe: (c) => ({ text: c.summary, meta: `${c.files.length} demo ${c.files.length === 1 ? 'file' : 'files'} · ${c.points.length} knowledge points` }),
    });
    if (!id) return;
    const chosen = categoryById(id);
    // Switching to another demo replaces the demo files already in the list.
    if (story && story !== chosen) files = files.filter((f) => !f.demo);
    const fresh = chosen.files.filter((f) => !files.some((x) => x.name === f.name) && !already.has(f.name));
    if (!fresh.length) {
      toast(lockedStory ? 'The demo files are already in this twin.' : 'Those demo files are already in the list.');
      return;
    }
    story = chosen;
    files.push(...fresh.map((f) => ({ ...f, demo: true, text: '' })));
    draw();
    toast(`Added ${fresh.length} demo files for ${chosen.label}.`);
  }
  const showError = (msg) => { error.textContent = msg; error.hidden = !msg; };

  async function addFiles(fileList) {
    showError('');
    const skipped = [];
    for (const file of fileList) {
      if (!ACCEPTED.includes(ext(file.name))) { skipped.push(`${file.name} (type not supported yet)`); continue; }
      if (file.size > MAX_BYTES) { skipped.push(`${file.name} (over 50 MB)`); continue; }
      if (files.some((f) => f.name === file.name) || already.has(file.name)) { skipped.push(`${file.name} (already added)`); continue; }
      files.push({ name: file.name, size: file.size, type: ext(file.name).toUpperCase(), text: await readText(file) });
    }
    if (skipped.length) showError(`Some files were skipped: ${skipped.join(', ')}.`);
    draw();
  }

  root.querySelector('#pick').addEventListener('click', () => input.click());
  input.addEventListener('change', () => { addFiles(Array.from(input.files)); input.value = ''; });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-over');
    addFiles(Array.from(e.dataTransfer.files || []));
  });
  root.querySelector('#demo-btn').addEventListener('click', useDemoFiles);
  note.addEventListener('click', (e) => { if (e.target.closest('[data-change-demo]')) useDemoFiles(); });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    files.splice(Number(btn.dataset.remove), 1);
    draw();
    (goBtn.disabled ? root.querySelector('#pick') : goBtn).focus();
  });
  root.querySelector('#upload-help').addEventListener('click', () => dialog({
    title: 'What should I upload?',
    body: `<p>Anything that holds what you know:</p>
      <ul style="padding-left:1.25rem;display:grid;gap:.375rem">
        <li>Process documents, runbooks and checklists</li><li>Briefs, specs and design files (exported as PDF)</li><li>Research notes and test reports</li>
        <li>Diagrams, code walkthroughs and incident reports</li><li>Interview or meeting transcripts</li></ul>
      <p>It doesn’t need to be tidy. The AI reads everything, checks it against the rest, and asks you about anything that’s missing or doesn’t match.</p>
      <p>No files at hand? Press <strong>Use Demo Files</strong> and choose a field to explore.</p>
      <p class="muted">Your files stay private. Nothing is shared until you publish your twin.</p>`,
    actions: [{ label: 'Got it', value: true, primary: true }],
  }));
  goBtn.addEventListener('click', () => {
    updateTwin(id, (t) => {
      t.pending = files.map((f) => ({ ...f, addedAt: Date.now() }));
      // A twin that wasn't given a name takes the demo story's name.
      if (story && t.name === 'Untitled twin') t.name = story.twinName;
    });
    go(`twin/${id}/thinking`);
  });
  focusHeading(root);
}
