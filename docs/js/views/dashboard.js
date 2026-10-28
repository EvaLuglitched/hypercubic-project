// The dashboard: one level above the mind map, like Photoshop's home screen.
// Home lists every digital twin (plus a "+" box to create one), Account holds the profile and royalties.
import { esc, icon, logoMark, PRODUCT, dialog, go, toast, money, timeAgo, greeting, firstName, initials, monthLabel, focusHeading, reducedMotion } from '../ui.js';
import { store, createTwin, deleteTwin, updateTwin, progress, logOut, applySettings, twinHome } from '../store.js';
import { thumbnailSVG } from '../mindmap.js';
import { categoryById } from '../demo.js';

const STATUS = { draft: 'Draft', building: 'Building', ready: 'Ready to publish', published: 'Published' };

function shell(active, inner) {
  const user = store.get().user;
  const nav = [['home', 'Home', 'home'], ['account', 'Account', 'user'], ['settings', 'Settings', 'settings'], ['help', 'Help', 'help']];
  return `
  <div class="dash">
    <nav class="dash-side" aria-label="Main">
      <a class="side-logo" href="#/home">${logoMark(24)}<span>${PRODUCT}</span></a>
      <ul class="side-nav">
        ${nav.map(([key, label, ic]) => `<li><a class="side-link" href="#/${key}"${active === key ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a></li>`).join('')}
      </ul>
      <div class="side-user">
        <span class="avatar-circle" aria-hidden="true">${esc(initials(user.name))}</span>
        <span class="side-user-text"><span class="side-user-name">${esc(user.name)}</span><span class="tiny muted">${esc(user.role || 'Expert')}</span></span>
        <button type="button" class="icon-btn icon-btn-sm icon-btn-plain" data-logout aria-label="Log out" title="Log out">${icon('logout', { size: 18 })}</button>
      </div>
    </nav>
    <main class="dash-main" id="main">${inner}</main>
  </div>`;
}

function bindShell(root) {
  root.querySelector('[data-logout]').addEventListener('click', () => {
    logOut();
    toast('You’re logged out.');
    go('login');
  });
  focusHeading(root);
}

function royaltyTotals(twins) {
  const now = monthLabel();
  let month = 0;
  let total = 0;
  let answers = 0;
  for (const t of twins) {
    const u = t.usage || {};
    total += u.earned || 0;
    answers += u.answers || 0;
    const st = (u.statements || []).find((x) => x.month === now);
    if (st) month += st.amount;
  }
  return { month, total, answers, published: twins.filter((t) => t.status === 'published').length };
}

// Search ignores case and accents, so "cafe" finds "Café Counter App".
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// A snapshot of the twin's mind map on top, its details in the white frame below.
// The "…" menu sits on the snapshot, so it never covers the text.
function twinCard(t) {
  const pr = progress(t);
  const sources = t.files.length;
  const draft = t.status === 'draft' || !t.points.length;
  return `
    <article class="twin-card" data-name="${esc(fold(t.name))}">
      <a class="twin-card-link" href="${twinHome(t)}">
        <div class="twin-thumb">${thumbnailSVG(t)}</div>
        <div class="twin-card-body">
          <div class="twin-card-top">
            <h3 class="twin-name">${esc(t.name)}</h3>
            <span class="status-pill status-${t.status}">${STATUS[t.status]}</span>
          </div>
          <p class="twin-meta">${sources} ${sources === 1 ? 'source' : 'sources'} · ${draft ? 'Created' : 'Edited'} ${timeAgo(draft ? t.createdAt : t.updatedAt)}</p>
          <div class="twin-progress"><span>Progress</span><span class="mono">${pr.pct}%</span></div>
          <div class="progress progress-sm" role="progressbar" aria-label="${pr.done} of ${pr.total} knowledge points validated" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pr.pct}"><span style="width:${pr.pct}%"></span></div>
        </div>
      </a>
      <button type="button" class="icon-btn icon-btn-sm twin-menu" data-menu="${esc(t.id)}" aria-label="More options for ${esc(t.name)}">${icon('more', { size: 18 })}</button>
    </article>`;
}

async function createFlow() {
  const example = categoryById(store.get().user.field)?.twinName || 'Batch Systems Support';
  const name = await dialog({
    title: 'Name your digital twin',
    body: `<div class="field"><label for="twin-name">Twin name</label>
      <input class="input" id="twin-name" maxlength="60" placeholder="For example: ${esc(example)}">
      <p class="hint">Name it after the product, system or area you know best. You can change it later.</p></div>`,
    actions: [{ label: 'Cancel', value: null }, { label: 'Create twin', primary: true, getValue: (box) => box.querySelector('#twin-name').value.trim() || 'Untitled twin' }],
  });
  if (!name) return;
  const twin = createTwin(name);
  go(`twin/${twin.id}/upload`);
}

async function twinMenu(id, rerender) {
  const twin = store.get().twins.find((t) => t.id === id);
  if (!twin) return;
  const choice = await dialog({
    title: twin.name,
    body: `<p class="muted">${STATUS[twin.status]} · created ${timeAgo(twin.createdAt)}</p>`,
    actions: [{ label: 'Delete twin', value: 'delete', danger: true }, { label: 'Rename', value: 'rename' }, { label: 'Open', value: 'open', primary: true }],
  });
  if (choice === 'open') location.hash = twinHome(twin);
  if (choice === 'rename') {
    const name = await dialog({
      title: 'Rename twin',
      body: `<div class="field"><label for="rename-input">Twin name</label><input class="input" id="rename-input" maxlength="60" value="${esc(twin.name)}"></div>`,
      actions: [{ label: 'Cancel', value: null }, { label: 'Save', primary: true, getValue: (box) => box.querySelector('#rename-input').value.trim() }],
    });
    if (name) { updateTwin(id, (t) => { t.name = name; }); rerender(); toast('Twin renamed.'); }
  }
  if (choice === 'delete') {
    const sure = await dialog({
      title: `Delete “${twin.name}”?`,
      body: `<p>This removes the twin, its mind map and every conversation in it.${twin.status === 'published' ? ' People will no longer be able to ask it questions, and its royalties stop.' : ''} You can’t undo this.</p>`,
      actions: [{ label: 'Keep it', value: false }, { label: 'Delete twin', value: true, primary: true }],
    });
    if (sure) { deleteTwin(id); rerender(); toast('Twin deleted.'); }
  }
}

export function home(root) {
  const render = () => {
    const s = store.get();
    const twins = s.twins;
    root.innerHTML = shell('home', `
      <header class="page-head page-head-row">
        <div class="page-head-text">
          <p class="eyebrow">${greeting()}, ${esc(firstName(s.user))}</p>
          <h1 class="display">Your digital twins</h1>
          <p class="page-sub">Pick a twin to keep building, or start a new one.</p>
        </div>
        ${twins.length ? `<div class="search-field">${icon('search', { size: 18 })}<label for="twin-search" class="sr-only">Search twins</label><input type="search" class="search-input" id="twin-search" placeholder="Search twins" autocomplete="off"></div>` : ''}
      </header>
      <section class="twin-grid" aria-label="Your twins">
        <button type="button" class="twin-card create-card" data-create>
          <span class="create-plus" aria-hidden="true">${icon('plus', { size: 28 })}</span>
          <span class="create-label">New digital twin</span>
          <span class="tiny muted mono">Start by uploading documents</span>
        </button>
        ${twins.map(twinCard).join('')}
        ${twins.length ? '<p class="no-match muted" id="no-match" role="status" hidden></p>' : `<div class="hint-card"><p class="hint-title">Start here</p><p>Create your first twin. You’ll upload documents about a product, system or process you know well, and the AI turns them into a mind map of your knowledge. Then you fill the gaps only you can fill.</p><p class="muted">No documents at hand? Choose <strong>Use Demo Files</strong> on the next screen.</p></div>`}
      </section>`);
    bindShell(root);
    root.querySelector('[data-create]').addEventListener('click', createFlow);
    root.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', () => twinMenu(b.dataset.menu, render)));
    const search = root.querySelector('#twin-search');
    if (search) {
      search.addEventListener('input', () => {
        const q = fold(search.value.trim());
        let shown = 0;
        root.querySelectorAll('.twin-card[data-name]').forEach((card) => {
          card.hidden = Boolean(q) && !card.dataset.name.includes(q);
          if (!card.hidden) shown += 1;
        });
        const none = root.querySelector('#no-match');
        none.hidden = shown > 0;
        none.textContent = shown ? '' : `No twins match “${search.value.trim()}”.`;
      });
    }
  };
  render();
}

export function account(root, { query }) {
  const s = store.get();
  const u = s.user;
  const twins = s.twins;
  const r = royaltyTotals(twins);
  const published = twins.filter((t) => t.status === 'published');
  const statements = [];
  for (const t of published) for (const st of t.usage.statements || []) statements.push({ ...st, twin: t.name });
  statements.sort((a, b) => new Date(b.month) - new Date(a.month));
  const rate = (t) => (t.terms ? (t.terms.model === 'license' ? '20% of license fees' : `${money(t.terms.rate)} per answer`) : '—');
  const access = { team: 'My team', company: 'My company', partners: 'Licensed partners' };

  const nextPayout = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  root.innerHTML = shell('account', `
    <header class="page-head">
      <p class="eyebrow">Account</p>
      <h1 class="display">${esc(u.name)}</h1>
    </header>
    <section class="stat-row account-stats" aria-label="Royalties">
      <div class="stat"><span class="stat-label">Royalties this month</span><span class="stat-value">${money(r.month)}</span></div>
      <div class="stat"><span class="stat-label">All-time royalties</span><span class="stat-value">${money(r.total)}</span></div>
      <div class="stat"><span class="stat-label">Answers from your twins</span><span class="stat-value">${r.answers}</span></div>
      <button type="button" class="stat stat-link" data-jump>
        <span class="stat-label">${r.published ? `${r.published} published ${r.published === 1 ? 'twin earns' : 'twins earn'} royalties` : 'Publish a twin to start earning'}</span>
        <span class="stat-cta">How royalties work ${icon('arrowRight', { size: 18 })}</span>
      </button>
    </section>
    <section class="panel" aria-labelledby="profile-h">
      <div class="panel-head"><h2 id="profile-h">Profile</h2></div>
      <form id="profile-form" novalidate>
        <div class="grid-2">
          <div class="field"><label for="pf-name">Full name</label><input class="input" id="pf-name" value="${esc(u.name)}"></div>
          <div class="field"><label for="pf-email">Work email</label><input class="input" id="pf-email" type="email" value="${esc(u.email)}"></div>
          <div class="field"><label for="pf-role">Job title</label><input class="input" id="pf-role" value="${esc(u.role)}"></div>
          <div class="field"><label for="pf-company">Company</label><input class="input" id="pf-company" value="${esc(u.company)}"></div>
        </div>
        <p class="hint" style="margin-bottom:1rem">Your name and title appear on every answer your published twins give, so people know whose knowledge it is.</p>
        <button class="btn btn-primary" type="submit">Save profile</button>
      </form>
    </section>
    <section class="panel" id="royalties" aria-labelledby="royalties-h">
      <div class="panel-head"><h2 id="royalties-h" tabindex="-1">Royalties and payouts</h2></div>
      <h3 style="font-weight:600;margin-bottom:.5rem">How royalties work</h3>
      <p class="muted" style="max-width:46rem;margin-bottom:1.25rem">Every time someone gets an answer from one of your published twins, you earn a royalty. You choose the rate for each twin when you set its terms. Royalties keep coming after you retire, for as long as people use your twin, and you can withdraw a twin at any time.</p>
      ${published.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th scope="col">Twin</th><th scope="col">Who can use it</th><th scope="col">Royalty</th><th scope="col">Answers</th><th scope="col">Earned</th></tr></thead>
          <tbody>${published.map((t) => `<tr><td><a href="#/twin/${t.id}/published">${esc(t.name)}</a></td><td>${access[t.terms?.access] || '—'}</td><td>${rate(t)}</td><td>${t.usage.answers}</td><td>${money(t.usage.earned)}</td></tr>`).join('')}</tbody>
        </table></div>` : '<p class="hint-card" style="display:block">You don’t have a published twin yet. Royalties start when you publish one.</p>'}
      <div class="setting-row" style="margin-top:1.5rem;border-top:1px solid var(--line);padding-top:1.25rem">
        <div class="setting-text"><strong>Payout method</strong><span class="muted">Not set up. Payouts are sent on the 1st of each month. Next payout: ${nextPayout}.</span></div>
        <button type="button" class="btn" data-payout>Set up payouts</button>
      </div>
      ${statements.length ? `
        <h3 style="font-weight:600;margin:1.5rem 0 .5rem">Statements</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr><th scope="col">Month</th><th scope="col">Twin</th><th scope="col">Answers</th><th scope="col">Amount</th></tr></thead>
          <tbody>${statements.map((st) => `<tr><td>${esc(st.month)}</td><td>${esc(st.twin)}</td><td>${st.answers}</td><td>${money(st.amount)}</td></tr>`).join('')}</tbody>
        </table></div>` : ''}
    </section>`);
  bindShell(root);
  root.querySelector('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    store.update((st) => {
      st.user.name = root.querySelector('#pf-name').value.trim() || st.user.name;
      st.user.email = root.querySelector('#pf-email').value.trim() || st.user.email;
      st.user.role = root.querySelector('#pf-role').value.trim();
      st.user.company = root.querySelector('#pf-company').value.trim();
    });
    toast('Profile saved.');
    account(root, { query });
  });
  root.querySelector('[data-payout]').addEventListener('click', () => dialog({
    title: 'Set up payouts',
    body: '<p>In the real product, you’d connect a bank account here to receive your royalties.</p><p class="muted">This is a prototype, so it doesn’t collect any payment details.</p>',
    actions: [{ label: 'OK', value: true, primary: true }],
  }));
  // "How royalties work" (and the #/account?section=royalties link) jump to the royalties panel.
  const showRoyalties = (smooth) => {
    root.querySelector('#royalties').scrollIntoView({ block: 'start', behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
    root.querySelector('#royalties-h').focus({ preventScroll: true });
  };
  root.querySelector('[data-jump]').addEventListener('click', () => showRoyalties(true));
  if (query.section === 'royalties') showRoyalties(false);
}

export function settings(root) {
  const render = () => {
    const s = store.get();
    const seg = (key, options) => `<div class="seg" role="group" aria-label="${key}">${options.map(([value, label]) => `<button type="button" data-set="${key}" data-value="${value}" aria-pressed="${s.settings[key] === value}">${label}</button>`).join('')}</div>`;
    root.innerHTML = shell('settings', `
      <header class="page-head">
        <p class="eyebrow">Settings</p>
        <h1 class="display">Make it comfortable</h1>
      </header>
      <section class="panel" aria-labelledby="a11y-h">
        <div class="panel-head"><h2 id="a11y-h">Reading and display</h2></div>
        <div class="setting-row"><div class="setting-text"><strong>Text size</strong><span class="muted">Makes all text and buttons bigger.</span></div>${seg('text', [['standard', 'Standard'], ['large', 'Large'], ['xl', 'Extra large']])}</div>
        <div class="setting-row"><div class="setting-text"><strong>Contrast</strong><span class="muted">Darker lines and grey text.</span></div>${seg('contrast', [['standard', 'Standard'], ['high', 'High']])}</div>
        <div class="setting-row"><div class="setting-text"><strong>Motion</strong><span class="muted">Turns off animations, like the mind map gliding when you zoom.</span></div>${seg('motion', [['full', 'Full'], ['reduced', 'Reduced']])}</div>
      </section>
      <section class="panel" aria-labelledby="map-h">
        <div class="panel-head"><h2 id="map-h">Mind map tour</h2></div>
        <div class="setting-row"><div class="setting-text"><strong>Show the tour again</strong><span class="muted">The next time you open a mind map, we’ll offer the tour again.</span></div><button type="button" class="btn" data-tour>Show it next time</button></div>
      </section>
      <section class="panel" aria-labelledby="data-h">
        <div class="panel-head"><h2 id="data-h">Prototype data</h2></div>
        <div class="setting-row"><div class="setting-text"><strong>Reset demo data</strong><span class="muted">Deletes the account, twins and settings saved in this browser. Use it between usability test sessions.</span></div><button type="button" class="btn btn-danger" data-reset>Reset demo data</button></div>
      </section>`);
    bindShell(root);
    root.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
      store.update((st) => { st.settings[b.dataset.set] = b.dataset.value; });
      applySettings();
      render();
      root.querySelector(`[data-set="${b.dataset.set}"][data-value="${b.dataset.value}"]`).focus();
    }));
    root.querySelector('[data-tour]').addEventListener('click', () => {
      store.update((st) => { if (st.user) st.user.tourSeen = false; st.tour = null; });
      toast('The tour will start the next time you open a mind map.');
    });
    root.querySelector('[data-reset]').addEventListener('click', async () => {
      const ok = await dialog({
        title: 'Reset all demo data?',
        body: '<p>This deletes the account, twins and settings saved in this browser.</p>',
        actions: [{ label: 'Cancel', value: false }, { label: 'Reset everything', value: true, primary: true }],
      });
      if (!ok) return;
      store.reset();
      location.hash = '#/signup';
      location.reload();
    });
  };
  render();
}

export function help(root) {
  root.innerHTML = shell('help', `
    <header class="page-head">
      <p class="eyebrow">Help</p>
      <h1 class="display">How ${PRODUCT} works</h1>
    </header>
    <section class="panel" aria-labelledby="start-h">
      <div class="panel-head"><h2 id="start-h">Building a twin, step by step</h2></div>
      <ol class="steps-list">
        <li><span><strong>Create a twin.</strong> On Home, press the box with the plus sign and give it a name.</span></li>
        <li><span><strong>Upload documents.</strong> Briefs, runbooks, research, specs, notes, transcripts, from as many projects as you like. Organized or not. No files? Use the demo files and choose a field to explore.</span></li>
        <li><span><strong>Fill the gaps.</strong> The AI builds a mind map of your process and lists tasks. Each knowledge point opens as a page, with yellow notes where something is missing or your projects differ. Answer under the note, or select any text and comment on it.</span></li>
        <li><span><strong>Validate.</strong> Check the page. When it’s right, press Validate and the circle turns black.</span></li>
        <li><span><strong>Complete and test.</strong> Your twin answers test questions next to you, so you can see how closely it matches.</span></li>
        <li><span><strong>Set terms and publish.</strong> Decide who can use it and how you earn royalties.</span></li>
      </ol>
    </section>
    <section class="panel" aria-labelledby="keys-h">
      <div class="panel-head"><h2 id="keys-h">Moving around the mind map</h2><button type="button" class="btn" data-tour>${icon('play', { size: 18 })} Replay the tour</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th scope="col">To do this</th><th scope="col">Mouse</th><th scope="col">Keyboard</th></tr></thead>
        <tbody>
          <tr><td>Zoom in or out</td><td>Scroll wheel, or the + and − buttons</td><td><span class="kbd">+</span> <span class="kbd">−</span></td></tr>
          <tr><td>Move around</td><td>Drag the background</td><td><span class="kbd">←</span> <span class="kbd">↑</span> <span class="kbd">→</span> <span class="kbd">↓</span></td></tr>
          <tr><td>See the whole map</td><td>The Fit button</td><td><span class="kbd">0</span></td></tr>
          <tr><td>Look at a knowledge point</td><td>Click its circle</td><td><span class="kbd">Tab</span> to it, then <span class="kbd">Enter</span></td></tr>
          <tr><td>Open it</td><td>Double-click, or press Open</td><td><span class="kbd">Enter</span> again</td></tr>
        </tbody>
      </table></div>
    </section>
    <section class="panel faq" aria-labelledby="faq-h">
      <div class="panel-head"><h2 id="faq-h">Questions</h2></div>
      <details><summary>What are the demo files?</summary><p>They let you try ${PRODUCT} without your own documents. On the upload screen, press Use Demo Files and choose a field: Digital Product Design (a design director’s process across a café app, a banking dashboard and a museum guide) or Mainframe Engineering (two COBOL batch systems). You play that made-up expert and fill the gaps the AI finds.</p></details>
      <details><summary>Who can see my twin?</summary><p>Only you, until you publish it. When you publish, you choose who can use it: your team, your whole company, or licensed partners.</p></details>
      <details><summary>How do royalties work?</summary><p>Each time someone gets an answer from your published twin, you earn a royalty: either a fixed amount per answer, or a share of the license fee. Royalties continue after you retire, as long as the twin is in use.</p></details>
      <details><summary>What if the AI gets something wrong?</summary><p>Nothing goes into your twin until you validate it. If something on a page is wrong, select it and press Comment, or press Type and change it yourself. If your files disagree with you, you can keep your answer and mark the file as out of date.</p></details>
      <details><summary>Will my twin pretend to be me?</summary><p>No. Every answer is labelled as coming from an AI twin, shows its sources, and says “I don’t know” instead of guessing. People can ask you directly if you allow it.</p></details>
      <details><summary>Can I delete things?</summary><p>Yes. You can delete a twin at any time from Home. Deleting a published twin stops its answers and its royalties.</p></details>
    </section>`);
  bindShell(root);
  root.querySelector('[data-tour]').addEventListener('click', () => {
    store.update((st) => { if (st.user) st.user.tourSeen = false; st.tour = null; });
    const twin = store.get().twins.find((t) => t.points.length && t.status !== 'published');
    if (twin) go(`twin/${twin.id}/map`);
    else toast('The tour will start the next time you open a mind map.');
  });
}
