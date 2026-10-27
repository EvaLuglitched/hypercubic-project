// Sign up, log in and "About you" (Account creation → Enter personal info → Profile created).
import { esc, logoMark, PRODUCT, dialog, go, toast, firstName, focusHeading } from '../ui.js';
import { store, createAccount, logIn, logInDemo } from '../store.js';

const SKILLS = ['COBOL', 'JCL', 'DB2', 'CICS', 'IMS', 'VSAM', 'Assembler', 'REXX', 'PL/I'];

function graphArt() {
  // Decorative: a few dots like the zoomed-out mind map.
  const pts = [[60, 70, 1], [120, 40, 0], [170, 95, 1], [95, 130, 0], [230, 60, 1], [280, 120, 0], [210, 160, 1], [330, 70, 1], [370, 140, 0], [300, 190, 1], [140, 200, 1], [60, 180, 0], [250, 230, 0], [390, 220, 1]];
  const lines = [[0, 1], [1, 2], [2, 4], [4, 5], [2, 6], [6, 9], [5, 7], [7, 8], [8, 13], [9, 12], [6, 10], [10, 11], [3, 0], [3, 10]];
  return `<svg class="auth-graph" viewBox="0 0 440 260" aria-hidden="true" focusable="false">
    ${lines.map(([a, b]) => `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="#141414" stroke-opacity=".35" stroke-width="1.2"></line>`).join('')}
    ${pts.map(([x, y, done]) => (done
      ? `<circle cx="${x}" cy="${y}" r="11" fill="#141414"></circle>`
      : `<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="#141414" stroke-width="1.6"></circle><circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#141414" stroke-width="1" stroke-dasharray="3 3"></circle>`)).join('')}
  </svg>`;
}

function shell(inner) {
  return `
  <div class="auth">
    <aside class="auth-art">
      <div class="auth-logo">${logoMark(26)}<span>${PRODUCT}</span></div>
      <div class="auth-copy">
        <p class="display auth-display">Your knowledge keeps working.</p>
        <p class="auth-lead">Build a digital twin of what you know about your systems. New engineers get answers in your words, and you keep the credit and the royalties.</p>
      </div>
      ${graphArt()}
      <p class="tiny muted">Prototype for usability testing. <button type="button" class="link-btn" data-reset>Reset demo data</button></p>
    </aside>
    <main class="auth-main" id="main">${inner}</main>
  </div>`;
}

function bindReset(root) {
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await dialog({
      title: 'Reset all demo data?',
      body: '<p>This deletes the account, twins and settings saved in this browser. Use it between usability test sessions.</p>',
      actions: [{ label: 'Cancel', value: false }, { label: 'Reset everything', value: true, primary: true }],
    });
    if (!ok) return;
    store.reset();
    location.hash = '#/signup';
    location.reload();
  });
}

function showError(form, message, fields = []) {
  const box = form.querySelector('.form-error');
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  if (!message) { box.hidden = true; return; }
  box.textContent = message;
  box.hidden = false;
  fields.forEach((el) => el.setAttribute('aria-invalid', 'true'));
  if (fields[0]) fields[0].focus();
}

function bindPasswordToggle(root) {
  root.querySelectorAll('[data-toggle-pass]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
}

export function signup(root) {
  root.innerHTML = shell(`
    <div class="auth-box">
      <p class="eyebrow">Step 1 of 2</p>
      <h1 class="auth-title">Create your account</h1>
      <p class="muted">Already have one? <a href="#/login">Log in</a></p>
      <form id="signup-form" novalidate>
        <div class="field"><label for="su-name">Full name</label><input class="input" id="su-name" autocomplete="name" required></div>
        <div class="field"><label for="su-email">Work email</label><input class="input" id="su-email" type="email" autocomplete="email" required></div>
        <div class="field">
          <label for="su-pass">Password</label>
          <div class="input-wrap"><input class="input" id="su-pass" type="password" autocomplete="new-password" aria-describedby="su-pass-hint" required><button type="button" class="input-btn" data-toggle-pass aria-label="Show password">Show</button></div>
          <p class="hint" id="su-pass-hint">At least 8 characters. This prototype doesn’t store passwords, so please don’t use a real one.</p>
        </div>
        <label class="check"><input type="checkbox" id="su-consent"><span>I decide what goes into my twin, and I can delete anything at any time.</span></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Create account</button>
      </form>
    </div>`);
  bindReset(root);
  bindPasswordToggle(root);
  const form = root.querySelector('#signup-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#su-name');
    const email = form.querySelector('#su-email');
    const pass = form.querySelector('#su-pass');
    const consent = form.querySelector('#su-consent');
    if (!name.value.trim()) return showError(form, 'Please enter your name.', [name]);
    if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return showError(form, 'Please enter an email address like name@company.com.', [email]);
    if (pass.value.length < 8) return showError(form, 'Your password needs at least 8 characters.', [pass]);
    if (!consent.checked) return showError(form, 'Please confirm that you control what goes into your twin.', [consent]);
    createAccount({ name: name.value.trim().replace(/\s+/g, ' '), email: email.value.trim() });
    go('about');
  });
  form.querySelector('#su-name').focus();
}

export function login(root) {
  root.innerHTML = shell(`
    <div class="auth-box">
      <h1 class="auth-title">Welcome back</h1>
      <p class="muted">New here? <a href="#/signup">Create an account</a></p>
      <form id="login-form" novalidate>
        <div class="field"><label for="li-email">Work email</label><input class="input" id="li-email" type="email" autocomplete="email" required></div>
        <div class="field">
          <label for="li-pass">Password</label>
          <div class="input-wrap"><input class="input" id="li-pass" type="password" autocomplete="current-password" required><button type="button" class="input-btn" data-toggle-pass aria-label="Show password">Show</button></div>
        </div>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button>
      </form>
      <div class="divider"><span>or</span></div>
      <button type="button" class="btn btn-lg btn-block" data-demo>Use the demo account</button>
      <p class="hint" style="margin-top:.625rem">Robert is a mainframe engineer with one twin in progress and one already published.</p>
    </div>`);
  bindReset(root);
  bindPasswordToggle(root);
  const form = root.querySelector('#login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('#li-email');
    if (!email.value.trim()) return showError(form, 'Please enter your email.', [email]);
    if (logIn(email.value)) {
      toast(`Welcome back, ${firstName(store.get().user)}.`);
      go('home');
    } else {
      showError(form, 'We couldn’t find an account for that email in this browser. Create an account, or use the demo account.', [email]);
    }
  });
  root.querySelector('[data-demo]').addEventListener('click', () => {
    logInDemo();
    toast('Logged in as Robert, the demo user.');
    go('home');
  });
  form.querySelector('#li-email').focus();
}

export function about(root) {
  const user = store.get().user;
  const picked = new Set(user.skills || []);
  root.innerHTML = shell(`
    <div class="auth-box">
      <p class="eyebrow">Step 2 of 2</p>
      <h1 class="auth-title">Tell us about your work</h1>
      <p class="muted">Your twin uses this to introduce you to the people who ask it questions.</p>
      <form id="about-form" novalidate>
        <div class="field"><label for="ab-role">Job title</label><input class="input" id="ab-role" placeholder="For example: Senior mainframe engineer" value="${esc(user.role)}"></div>
        <div class="field"><label for="ab-company">Company</label><input class="input" id="ab-company" value="${esc(user.company)}"></div>
        <div class="field"><label for="ab-years">Years of experience</label><input class="input" id="ab-years" inputmode="numeric" value="${esc(user.years)}" style="max-width:10rem"></div>
        <fieldset class="field" style="border:0;padding:0;margin:0 0 1.5rem">
          <legend class="field-label" style="margin-bottom:.5rem">Systems you know <span class="muted">(choose any)</span></legend>
          <div class="chips">${SKILLS.map((s) => `<button type="button" class="chip" aria-pressed="${picked.has(s)}" data-skill="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        </fieldset>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Continue to dashboard</button>
        <p style="text-align:center;margin-top:1rem"><button type="button" class="link-btn" data-skip>Skip for now</button></p>
      </form>
    </div>`);
  bindReset(root);
  root.querySelectorAll('[data-skill]').forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-pressed') !== 'true';
    chip.setAttribute('aria-pressed', String(on));
    if (on) picked.add(chip.dataset.skill); else picked.delete(chip.dataset.skill);
  }));
  const form = root.querySelector('#about-form');
  const save = () => {
    store.update((s) => {
      s.user.role = form.querySelector('#ab-role').value.trim();
      s.user.company = form.querySelector('#ab-company').value.trim();
      s.user.years = form.querySelector('#ab-years').value.trim();
      s.user.skills = [...picked];
    });
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
    toast('Your profile is ready.');
    go('home');
  });
  root.querySelector('[data-skip]').addEventListener('click', () => go('home'));
  focusHeading(root);
}
