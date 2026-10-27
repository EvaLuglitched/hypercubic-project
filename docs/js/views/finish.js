// After "Complete": Create digital twin → Final validation (agent answer vs. user answer → similarity)
// → Digital twin complete (try it, set up terms and royalties, edit) → Release / publish → End.
import { esc, icon, rich, logoMark, PRODUCT, dialog, go, toast, sleep, reducedMotion, money, firstName, focusHeading } from '../ui.js';
import { store, getTwin, updateTwin, progress, uid } from '../store.js';
import { testQuestionsFor, twinTestAnswer, similarity, askTwin } from '../agent.js';
import { TRY_SUGGESTIONS } from '../demo.js';

const crumb = (twin, label, href = `#/twin/${twin.id}/map`) =>
  `<a class="crumb" href="${href}">${logoMark()}<span>${PRODUCT}</span><span class="crumb-sep" aria-hidden="true">/</span><span>${esc(label)}</span></a>`;

function guard(id) {
  const twin = getTwin(id);
  if (!twin) { location.replace('#/home'); return null; }
  if (!twin.points.length) { location.replace(`#/twin/${id}/upload`); return null; }
  return twin;
}

const verdict = (score) => (score >= 70 ? 'Matches you' : score >= 40 ? 'Close, worth a look' : 'Different from you');

// ---------- Create digital twin ----------
export function create(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  const pr = progress(twin);
  const steps = [
    ['Knowledge agent', `Taking in ${pr.done} validated knowledge points`],
    ['Knowledge agent', 'Linking related points across sections'],
    ['Knowledge agent', `Learning how ${firstName(store.get().user)} explains things`],
    ['Validate agent', 'Preparing your final check'],
  ];
  root.innerHTML = `
  <div class="thinking-screen">
    ${crumb(twin, twin.name)}
    <main class="thinking-main" id="main">
      <h1 class="thinking-title">Creating your twin<span class="dots" aria-hidden="true"></span></h1>
      <p class="thinking-sub" id="now" aria-live="polite">Starting</p>
      <div class="thinking-bar" aria-hidden="true"><span id="bar"></span></div>
      <ol class="agent-steps">${steps.map(([a, t], i) => `<li class="agent-step" data-i="${i}"><span class="step-mark" aria-hidden="true"></span><span class="step-agent">${esc(a)}</span><span class="step-text">${esc(t)}</span></li>`).join('')}</ol>
    </main>
  </div>`;
  focusHeading(root);
  let cancelled = false;
  (async () => {
    const items = root.querySelectorAll('.agent-step');
    for (let i = 0; i < steps.length; i++) {
      if (cancelled) return;
      items[i].classList.add('is-active');
      root.querySelector('#now').textContent = `${steps[i][0]}: ${steps[i][1]}`;
      await sleep(reducedMotion() ? 200 : 900);
      items[i].classList.replace('is-active', 'is-done');
      root.querySelector('#bar').style.width = `${Math.round(((i + 1) / steps.length) * 100)}%`;
    }
    if (cancelled) return;
    updateTwin(id, (t) => { t.createdTwinAt = Date.now(); });
    go(`twin/${id}/validate`);
  })();
  return () => { cancelled = true; };
}

// ---------- Final validation ----------
export function validate(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  const name = firstName(store.get().user);
  const questions = testQuestionsFor(twin);
  const results = [];
  let index = 0;

  root.innerHTML = `
  <div class="flow-screen">
    ${crumb(twin, 'Final validation')}
    <main class="flow-main" id="main">
      <header class="flow-head">
        <p class="eyebrow">Final validation</p>
        <h1 class="display">Does your twin think like you?</h1>
        <p class="lead">Answer ${questions.length} questions the way you would on the job. Then compare your answer with your twin’s. Your twin can’t see your answers.</p>
      </header>
      <div class="qa-steps" aria-hidden="true">${questions.map(() => '<span></span>').join('')}</div>
      <section class="card qa-card" id="qa" aria-live="polite"></section>
    </main>
  </div>`;
  focusHeading(root);
  const box = root.querySelector('#qa');
  const bars = root.querySelectorAll('.qa-steps span');

  function ask() {
    const q = questions[index];
    bars.forEach((b, i) => b.classList.toggle('is-done', i < index));
    box.innerHTML = `
      <p class="eyebrow">Question ${index + 1} of ${questions.length}</p>
      <h2 class="qa-q">${esc(q.question)}</h2>
      <div class="field"><label for="qa-answer">Your answer</label><textarea class="textarea" id="qa-answer" rows="4"></textarea></div>
      <div class="choices" style="justify-content:space-between;align-items:center">
        <span><span class="tiny muted">Testing the prototype?</span> <button type="button" class="btn btn-sm" data-example>Use example answer</button></span>
        <button type="button" class="btn btn-primary" data-compare disabled>Compare with my twin ${icon('arrowRight', { size: 18 })}</button>
      </div>`;
    const area = box.querySelector('#qa-answer');
    const compareBtn = box.querySelector('[data-compare]');
    area.addEventListener('input', () => { compareBtn.disabled = !area.value.trim(); });
    box.querySelector('[data-example]').addEventListener('click', () => { area.value = q.example; compareBtn.disabled = false; area.focus(); });
    compareBtn.addEventListener('click', () => compare(area.value.trim()));
    area.focus();
  }

  async function compare(answer) {
    const q = questions[index];
    const twinAns = twinTestAnswer(getTwin(id), q, name);
    const score = twinAns.caveat ? Math.min(similarity(answer, twinAns.text, q.keywords), 45) : similarity(answer, q.answer, q.keywords);
    results.push({ id: q.id, question: q.question, answer, twin: twinAns.text, score, unsure: twinAns.unsure.map((p) => p.id) });
    box.innerHTML = `
      <p class="eyebrow">Question ${index + 1} of ${questions.length}</p>
      <h2 class="qa-q">${esc(q.question)}</h2>
      <div class="qa-compare">
        <div class="qa-side"><p class="qa-side-label">${icon('user', { size: 18 })} You</p><p>${esc(answer)}</p></div>
        <div class="qa-side is-twin"><p class="qa-side-label">${icon('chat', { size: 18 })} Your twin <span class="ai-tag">AI</span></p><p id="twin-answer"><span class="typing"><span></span><span></span><span></span><span class="typing-label">Thinking…</span></span></p></div>
      </div>
      <div class="meter" id="meter" hidden>
        <div class="meter-top"><span class="verdict">${verdict(score)}</span><span class="meter-value">${score}% similar</span></div>
        <div class="meter-bar" aria-hidden="true"><span style="width:0%"></span></div>
        ${twinAns.caveat ? `<p class="caveat">${icon('alert', { size: 18 })}<span>Your twin isn’t sure, because ${twinAns.unsure.map((p) => `<strong>${esc(p.title)}</strong>`).join(', ')} ${twinAns.unsure.length === 1 ? 'isn’t' : 'aren’t'} validated yet.</span></p>` : ''}
      </div>
      <div class="choices" id="qa-next" style="justify-content:flex-end;margin-top:1.25rem" hidden>
        ${twinAns.unsure.length ? `<a class="btn" href="#/twin/${id}/point/${encodeURIComponent(twinAns.unsure[0].id)}">Fix it in the mind map</a>` : ''}
        <button type="button" class="btn btn-primary" data-next>${index + 1 < questions.length ? 'Next question' : 'See results'} ${icon('arrowRight', { size: 18 })}</button>
      </div>`;
    await sleep(reducedMotion() ? 150 : 1100);
    if (!document.contains(box)) return;
    box.querySelector('#twin-answer').textContent = twinAns.text;
    box.querySelector('#meter').hidden = false;
    requestAnimationFrame(() => { box.querySelector('.meter-bar span').style.width = `${score}%`; });
    box.querySelector('#qa-next').hidden = false;
    box.querySelector('[data-next]').addEventListener('click', () => {
      index += 1;
      if (index < questions.length) ask(); else finish();
    });
    box.querySelector('[data-next]').focus();
  }

  function finish() {
    bars.forEach((b) => b.classList.add('is-done'));
    const overall = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const good = overall >= 70;
    updateTwin(id, (t) => { t.validation = { overall, results, at: Date.now() }; });
    box.innerHTML = `
      <p class="eyebrow">Results</p>
      <div class="meter" style="margin-top:.25rem">
        <div class="meter-top"><h2 class="qa-q" style="margin:0">${good ? 'Your twin answers like you.' : 'Your twin needs a little more work.'}</h2><span class="meter-value">${overall}%</span></div>
        <div class="meter-bar" aria-hidden="true"><span style="width:${overall}%"></span></div>
      </div>
      <table class="table" style="margin-top:1.25rem;min-width:0">
        <thead><tr><th scope="col">Question</th><th scope="col">Similarity</th></tr></thead>
        <tbody>${results.map((r) => `<tr><td>${esc(r.question)}</td><td class="mono">${r.score}%</td></tr>`).join('')}</tbody>
      </table>
      <p class="muted" style="margin-top:1rem">${good ? 'You can still improve any answer later from the mind map.' : 'Answers drop when knowledge points aren’t validated yet. Fill those gaps, or accept the twin as it is: it will say “I don’t know” where it isn’t sure.'}</p>
      <div class="choices" style="justify-content:flex-end;margin-top:1.25rem">
        <a class="btn" href="#/twin/${id}/map">Improve on the mind map</a>
        <button type="button" class="btn btn-primary" data-accept>${good ? 'Continue' : 'Accept and continue'} ${icon('arrowRight', { size: 18 })}</button>
      </div>`;
    box.querySelector('[data-accept]').addEventListener('click', () => {
      updateTwin(id, (t) => { if (t.status !== 'published') t.status = 'ready'; });
      go(`twin/${id}/ready`);
    });
    box.querySelector('[data-accept]').focus();
  }

  ask();
}

// ---------- Digital twin complete ----------
export function ready(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  const v = twin.validation;
  const termsDone = Boolean(twin.terms);
  const published = twin.status === 'published';
  root.innerHTML = `
  <div class="flow-screen">
    ${crumb(twin, twin.name, '#/home')}
    <main class="flow-main" id="main">
      <header class="flow-head">
        <span class="big-check" aria-hidden="true">${icon('check', { size: 36 })}</span>
        <p class="eyebrow">${published ? 'Published' : 'Digital twin complete'}</p>
        <h1 class="display">${esc(twin.name)} is ready</h1>
        <p class="lead">${v ? `In the final check, your twin’s answers were <strong>${v.overall}% similar</strong> to yours.` : 'Your twin has taken in everything you validated.'} Try it, decide who can use it, and publish it when you’re happy.</p>
      </header>
      <div class="option-grid">
        <a class="option-card" href="#/twin/${id}/try"><span class="option-icon">${icon('chat')}</span><h3>Try your twin</h3><p class="muted">Ask it questions the way a new engineer would.</p></a>
        <a class="option-card" href="#/twin/${id}/terms"><span class="option-icon">${icon('coin')}</span><h3>Terms and royalties</h3><p class="muted">Who can use it, and how you earn from it.</p>${termsDone ? `<span class="done-mark">${icon('check', { size: 14 })} Set up</span>` : '<span class="done-mark">Needed before you publish</span>'}</a>
        <a class="option-card" href="#/twin/${id}/map"><span class="option-icon">${icon('edit')}</span><h3>Edit knowledge</h3><p class="muted">Go back to the mind map to fix or add anything.</p></a>
      </div>
      <section class="release-bar" aria-label="Release">
        <div><h2 style="font-size:1.25rem;font-weight:600">${published ? 'Your twin is live' : 'Release your twin'}</h2><p class="muted">${published ? 'People you chose can ask it questions now.' : termsDone ? 'Everything is set. Publishing makes it available to the people you chose.' : 'Set up terms and royalties first.'}</p></div>
        ${published ? `<a class="btn btn-primary btn-lg" href="#/twin/${id}/published">View published twin</a>` : `<button type="button" class="btn btn-primary btn-lg" data-publish ${termsDone ? '' : 'disabled'}>Release / Publish</button>`}
      </section>
    </main>
  </div>`;
  focusHeading(root);
  const pub = root.querySelector('[data-publish]');
  if (pub) {
    pub.addEventListener('click', async () => {
      const t = getTwin(id);
      const who = { team: 'your team', company: 'everyone at your company', partners: 'licensed partners' }[t.terms.access];
      const ok = await dialog({
        title: `Publish ${t.name}?`,
        body: `<p>Your twin will be available to ${who}. Every answer is labelled as AI and shows its sources.</p><p>You can withdraw it at any time.</p>`,
        actions: [{ label: 'Not yet', value: false }, { label: 'Publish', value: true, primary: true }],
      });
      if (!ok) return;
      updateTwin(id, (x) => { x.status = 'published'; x.publishedAt = Date.now(); });
      go(`twin/${id}/published`);
    });
  }
}

// ---------- Terms and royalties ----------
export function terms(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  const t = twin.terms || { access: 'company', model: 'per-answer', rate: 0.25, credit: true, escalate: true, limits: '', consent: false };
  root.innerHTML = `
  <div class="flow-screen">
    ${crumb(twin, 'Terms and royalties', `#/twin/${id}/ready`)}
    <main class="flow-main" id="main" style="max-width:48rem">
      <header class="flow-head">
        <p class="eyebrow">Set up terms and usage</p>
        <h1 class="display">Your knowledge, your terms</h1>
        <p class="lead">Decide who can use ${esc(twin.name)} and how you’re paid when they do. You can change this at any time.</p>
      </header>
      <form id="terms-form" novalidate>
        <section class="panel" aria-labelledby="who-h">
          <div class="panel-head"><h2 id="who-h">Who can use your twin</h2></div>
          <div class="radio-cards" role="radiogroup" aria-labelledby="who-h">
            ${[['team', 'My team', 'The engineers you work with every day.'], ['company', 'My whole company', 'Anyone at your company can ask it.'], ['partners', 'Licensed partners', 'Other companies pay a license to use it. You earn more.']]
              .map(([v, l, d]) => `<label class="radio-card"><input type="radio" name="access" value="${v}" ${t.access === v ? 'checked' : ''}><span><strong>${l}</strong><span class="muted">${d}</span></span></label>`).join('')}
          </div>
        </section>
        <section class="panel" aria-labelledby="royalty-h">
          <div class="panel-head"><h2 id="royalty-h">Royalties</h2></div>
          <p class="muted" style="margin-bottom:1rem">You earn every time your twin helps someone, even after you retire.</p>
          <div class="radio-cards" role="radiogroup" aria-label="Royalty model">
            <label class="radio-card"><input type="radio" name="model" value="per-answer" ${t.model !== 'license' ? 'checked' : ''}><span><strong>Per answer</strong><span class="muted">A fixed amount each time your twin answers a question.</span></span></label>
            <label class="radio-card"><input type="radio" name="model" value="license" ${t.model === 'license' ? 'checked' : ''}><span><strong>License share</strong><span class="muted">20% of what each team or partner pays per month to use your twin.</span></span></label>
          </div>
          <div class="field" id="rate-field" style="margin-top:1.25rem">
            <label for="rate">Rate per answer</label>
            <select class="select" id="rate" style="max-width:14rem">${[0.1, 0.25, 0.5, 1].map((r) => `<option value="${r}" ${Number(t.rate) === r ? 'selected' : ''}>${money(r)} per answer</option>`).join('')}</select>
          </div>
          <div class="field" style="margin-top:.5rem">
            <label for="volume">If your twin answers <span id="volume-out">200</span> questions a month</label>
            <input type="range" class="range" id="volume" min="20" max="1000" step="20" value="200">
          </div>
          <div class="estimate" aria-live="polite"><span class="muted">You’d earn about</span><strong id="estimate">$50.00 a month</strong><span class="tiny muted">An estimate for planning, not a promise.</span></div>
        </section>
        <section class="panel" aria-labelledby="credit-h">
          <div class="panel-head"><h2 id="credit-h">Credit and limits</h2></div>
          <label class="check"><input type="checkbox" id="credit" ${t.credit ? 'checked' : ''}><span><strong>Show my name on every answer.</strong> People see whose knowledge they’re using.</span></label>
          <label class="check"><input type="checkbox" id="escalate" ${t.escalate ? 'checked' : ''}><span><strong>Let people ask me directly</strong> when the twin doesn’t know.</span></label>
          <div class="field"><label for="limits">Topics your twin should not answer <span class="muted">(optional)</span></label><textarea class="textarea" id="limits" rows="3" placeholder="For example: anything about salaries, or systems I didn’t work on">${esc(t.limits)}</textarea></div>
        </section>
        <section class="panel" aria-labelledby="consent-h">
          <div class="panel-head"><h2 id="consent-h">Your consent</h2></div>
          <label class="check"><input type="checkbox" id="consent" ${t.consent ? 'checked' : ''}><span>I have the right to share this knowledge, and I understand I can withdraw my twin at any time.</span></label>
          <p class="form-error" role="alert" hidden></p>
        </section>
        <div class="choices" style="justify-content:flex-end;margin-top:1.5rem">
          <a class="btn btn-lg" href="#/twin/${id}/ready">Cancel</a>
          <button type="submit" class="btn btn-primary btn-lg">Save terms</button>
        </div>
      </form>
    </main>
  </div>`;
  focusHeading(root);
  const form = root.querySelector('#terms-form');
  const est = () => {
    const model = form.querySelector('input[name="model"]:checked').value;
    const volume = Number(form.querySelector('#volume').value);
    const access = form.querySelector('input[name="access"]:checked').value;
    form.querySelector('#volume-out').textContent = volume;
    form.querySelector('#rate-field').hidden = model === 'license';
    const fee = { team: 150, company: 400, partners: 1200 }[access];
    const amount = model === 'license' ? fee * 0.2 * Math.max(1, Math.round(volume / 200)) : volume * Number(form.querySelector('#rate').value);
    form.querySelector('#estimate').textContent = `${money(amount)} a month`;
  };
  form.addEventListener('input', est);
  form.addEventListener('change', est);
  est();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const consent = form.querySelector('#consent');
    const err = form.querySelector('.form-error');
    if (!consent.checked) {
      err.textContent = 'Please confirm your consent before saving.';
      err.hidden = false;
      consent.focus();
      return;
    }
    updateTwin(id, (x) => {
      x.terms = {
        access: form.querySelector('input[name="access"]:checked').value,
        model: form.querySelector('input[name="model"]:checked').value,
        rate: Number(form.querySelector('#rate').value),
        credit: form.querySelector('#credit').checked,
        escalate: form.querySelector('#escalate').checked,
        limits: form.querySelector('#limits').value.trim(),
        consent: true,
        savedAt: Date.now(),
      };
    });
    toast('Terms saved.');
    go(`twin/${id}/${getTwin(id).status === 'published' ? 'published' : 'ready'}`);
  });
}

// ---------- Try your twin ----------
export function tryTwin(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  const user = store.get().user;
  const name = firstName(user);
  const back = twin.status === 'published' ? `#/twin/${id}/published` : `#/twin/${id}/ready`;
  root.innerHTML = `
  <div class="point-screen">
    <header class="point-top">
      <a class="icon-btn" href="${back}" aria-label="Back">${icon('arrowLeft')}</a>
      <div class="point-titles"><span class="point-crumb">${esc(twin.name)}</span><h1 class="point-title">Try your twin</h1></div>
    </header>
    <div class="point-body" style="grid-template-columns:minmax(0,1fr)">
      <main class="chat" id="main">
        <div class="chat-scroll" id="chat-scroll">
          <div class="chat-col" id="thread" role="log" aria-live="polite">
            <p class="disclosure">${icon('shield')}<span>This is an <strong>AI twin of ${esc(user.name)}’s knowledge</strong>${user.role ? `, ${esc(user.role)}` : ''}. It is not ${esc(name)}. It answers only from what ${esc(name)} validated, shows its sources, and says “I don’t know” instead of guessing.</span></p>
          </div>
        </div>
        <div class="composer-area">
          <div class="composer-inner">
            <div class="suggest-row" id="suggest">${TRY_SUGGESTIONS.map((s) => `<button type="button" class="btn btn-sm" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
            <div class="composer-row">
              <form class="composer" id="composer"><label for="ask-twin" class="sr-only">Ask your twin</label><textarea id="ask-twin" rows="1" placeholder="Ask a question, like a new engineer would…"></textarea><button type="submit" class="icon-btn icon-btn-dark" aria-label="Send">${icon('send')}</button></form>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>`;
  focusHeading(root);
  const thread = root.querySelector('#thread');
  const scroller = root.querySelector('#chat-scroll');
  const input = root.querySelector('#ask-twin');
  let busy = false;

  async function ask(question) {
    const q = question.trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    thread.insertAdjacentHTML('beforeend', `<div class="msg msg-user"><div class="bubble">${esc(q)}</div></div>`);
    thread.insertAdjacentHTML('beforeend', `<div class="msg msg-agent" id="typing"><span class="avatar" aria-hidden="true">${icon('chat', { size: 18 })}</span><div class="msg-body"><p class="msg-author">${esc(name)}’s twin <span class="ai-tag">AI</span></p><div class="typing"><span></span><span></span><span></span></div></div></div>`);
    scroller.scrollTo({ top: scroller.scrollHeight });
    await sleep(reducedMotion() ? 150 : 900);
    root.querySelector('#typing').remove();
    const a = askTwin(getTwin(id), q, name);
    const mid = uid('a');
    thread.insertAdjacentHTML('beforeend', `
      <div class="msg msg-agent" id="${mid}"><span class="avatar" aria-hidden="true">${icon('chat', { size: 18 })}</span>
        <div class="msg-body">
          <p class="msg-author">${esc(name)}’s twin <span class="ai-tag">AI</span></p>
          ${a.point ? `<p class="msg-heading">${esc(a.point)}</p>` : ''}
          <p class="msg-text">${rich(a.text)}</p>
          ${a.caveat ? `<p class="caveat">${icon('alert', { size: 18 })}<span>${esc(a.caveat)}</span></p>` : ''}
          ${a.cites.length ? `<div class="cites">${a.cites.map((c) => `<span class="cite">${icon('file', { size: 14 })}${esc(c)}</span>`).join('')}</div>` : ''}
          <div class="choices">
            ${a.unknown ? `<button type="button" class="btn btn-sm btn-primary" data-escalate>Ask ${esc(name)} directly</button>` : ''}
            <button type="button" class="btn btn-sm btn-ghost" data-flag>${icon('flag', { size: 16 })} Flag this answer</button>
          </div>
        </div>
      </div>`);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
    busy = false;
  }

  root.querySelector('#composer').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  root.querySelector('#suggest').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
  thread.addEventListener('click', (e) => {
    if (e.target.closest('[data-flag]')) { e.target.closest('[data-flag]').disabled = true; toast(`Thanks. ${name} will review this answer.`); }
    if (e.target.closest('[data-escalate]')) { e.target.closest('[data-escalate]').disabled = true; toast(`Your question was sent to ${name}. (Demo)`); }
  });
  input.focus();
}

// ---------- Published (End) ----------
export function published(root, { id }) {
  const twin = guard(id);
  if (!twin) return;
  if (twin.status !== 'published') { location.replace(`#/twin/${id}/ready`); return; }
  const slug = twin.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url = `twinstudio.example/t/${slug}`;
  const t = twin.terms || {};
  const who = { team: 'Your team', company: 'Your whole company', partners: 'Licensed partners' }[t.access] || '—';
  const royalty = t.model === 'license' ? '20% of license fees' : `${money(t.rate)} per answer`;
  root.innerHTML = `
  <div class="flow-screen">
    ${crumb(twin, twin.name, '#/home')}
    <main class="flow-main" id="main">
      <header class="flow-head">
        <span class="big-check" aria-hidden="true">${icon('check', { size: 36 })}</span>
        <p class="eyebrow">Published</p>
        <h1 class="display">${esc(twin.name)} is live</h1>
        <p class="lead">Your knowledge keeps working. People can ask your twin questions now, and you earn royalties every time it helps.</p>
      </header>
      <section class="panel" aria-labelledby="share-h">
        <div class="panel-head"><h2 id="share-h">Share link</h2></div>
        <div class="share-row"><span class="share-link">${esc(url)}</span><button type="button" class="btn" data-copy>${icon('copy', { size: 18 })} Copy link</button></div>
      </section>
      <section class="stat-row" aria-label="Usage">
        <div class="stat"><span class="stat-label">Who can use it</span><span class="stat-value" style="font-size:1.375rem">${who}</span></div>
        <div class="stat"><span class="stat-label">Your royalty</span><span class="stat-value" style="font-size:1.375rem">${royalty}</span></div>
        <div class="stat"><span class="stat-label">Answers so far</span><span class="stat-value">${twin.usage.answers}</span></div>
        <div class="stat"><span class="stat-label">Earned so far</span><span class="stat-value">${money(twin.usage.earned)}</span></div>
      </section>
      <div class="choices">
        <a class="btn btn-primary btn-lg" href="#/home">Back to dashboard</a>
        <a class="btn btn-lg" href="#/twin/${id}/try">Try your twin</a>
        <a class="btn btn-lg" href="#/twin/${id}/terms">Change terms</a>
        <a class="btn btn-lg" href="#/twin/${id}/map">Edit knowledge</a>
        <button type="button" class="btn btn-lg btn-ghost" data-unpublish>Withdraw twin</button>
      </div>
    </main>
  </div>`;
  focusHeading(root);
  root.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`https://${url}`); toast('Link copied. (It’s a demo link.)'); } catch (e) { toast('Copy isn’t available here.'); }
  });
  root.querySelector('[data-unpublish]').addEventListener('click', async () => {
    const ok = await dialog({
      title: `Withdraw ${twin.name}?`,
      body: '<p>People will no longer be able to ask it questions, and its royalties stop. You can publish it again later.</p>',
      actions: [{ label: 'Keep it live', value: false }, { label: 'Withdraw', value: true, primary: true }],
    });
    if (!ok) return;
    updateTwin(id, (x) => { x.status = 'ready'; });
    toast('Your twin was withdrawn.');
    go(`twin/${id}/ready`);
  });
}
