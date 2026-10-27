/* Twin Studio — clickable prototype.
   Screens follow the Figma frames; navigation follows the User Flow board:
   Start → Registered? → (Login | Registration → Personal info → Profile created → Learn the tool)
   → Start Session → Upload sources / Text / From scratch → Knowledge Agent + Validate Agent
   → Brain graph (knowledge points: edit, iPad sketch, validate, clarify, refine/override)
   → Complete? → Create Digital Twin → Final validation (agent vs. user answer, similarity)
   → Digital Twin Complete → Terms & usage / Test / Edit → Release → End. */

const KEY = "twin-studio-v1";
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

/* ---------- state ---------- */
function fresh() {
  const s = JSON.parse(JSON.stringify(window.SEED));
  s.terms = { access: "team", uses: ["answer", "onboard"], escalate: true, review: "quarterly" };
  s.twin = { created: false, userAnswer: "", score: null, validated: false };
  s.published = false;
  s.activity = [];
  return s;
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  return fresh();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function log(text) { S.activity.unshift({ text, at: Date.now() }); S.activity = S.activity.slice(0, 8); save(); }

/* ---------- helpers ---------- */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const go = (path) => { location.hash = "#/" + path; };
const first = () => (S.user?.name || "Robert").split(" ")[0];
const initials = () => (S.user?.name || "Robert Alvarez").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const done = () => S.points.filter((p) => p.status === "complete").length;
const pct = () => Math.round((done() / Math.max(1, S.points.length)) * 100);
const sourceNames = () => S.sources.map((s) => s.name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago";
}
const logo = (text = "Twin Studio") => `<span class="logo"><span class="logo-mark"></span>${text}</span>`;

/* ---------- router ---------- */
const routes = {
  "": renderLogin, login: renderLogin, signup: renderSignup, info: renderInfo, welcome: renderWelcome,
  dashboard: renderDashboard, add: renderAdd, processing: renderProcessing, graph: renderGraph,
  twin: renderTwin, validation: renderValidation, publish: renderPublish, end: renderEnd, map: renderMap,
};
const needsUser = new Set(["dashboard", "add", "processing", "graph", "twin", "validation", "publish", "end", "welcome", "info"]);
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  return { path, query: Object.fromEntries(new URLSearchParams(qs || "")) };
}
function router() {
  const { path, query } = parseHash();
  if (needsUser.has(path) && !S.user) {
    // Deep links from the prototype map still work: drop in as the demo expert.
    S.user = { name: "Robert Alvarez", email: "robert@example.com", role: "Senior Mainframe Engineer", years: 31, area: "Claims batch processing" };
    save();
  }
  closeModal();
  (routes[path] || renderLogin)(query);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", router);

/* ---------- shell (Dashboard / Add Knowledge frame) ---------- */
const NAV = [
  ["dashboard", "Dashboard"], ["add", "Add Knowledge"], ["twin", "Digital Twin"],
  ["graph", "Brain Graph"], ["validation", "Validation"], ["publish", "Terms / Publish"],
];
function shell(active, inner, { title, crumb, tabs = "", flush = false } = {}) {
  const todo = S.points.length - done();
  const nav = NAV.map(([k, label]) => {
    const count = k === "graph" && todo ? `<span class="count">${todo}</span>` : "";
    return `<a class="nav ${active === k ? "active" : ""}" href="#/${k}"><span class="box"></span>${label}${count}</a>`;
  }).join("");
  const top = title ? `<header class="topbar">${crumb ? `<div class="crumb">${crumb}</div>` : ""}<h1>${title}</h1>${tabs || '<div style="height:18px"></div>'}</header>` : "";
  app.innerHTML = `
  <div class="shell">
    <aside class="side">
      <div class="brand">${logo()}</div>
      <nav aria-label="Main">${nav}</nav>
      <div class="bottom">
        <a class="nav" href="#/map"><span class="box"></span>Help · Prototype map</a>
        <a class="nav" href="#" data-action="settings"><span class="box"></span>Settings</a>
        <div class="account"><span class="avatar">${esc(initials())}</span><span>${esc(S.user?.name)}</span>
          <button class="btn ghost small" style="margin-left:auto;color:#aaa" data-action="logout" title="Log out">⏻</button></div>
      </div>
    </aside>
    <main class="main">${top}<section class="content ${flush ? "flush" : ""}">${inner}</section></main>
  </div>`;
}

/* ---------- Login / Registration ---------- */
function authFrame(inner) {
  app.innerHTML = `
  <div class="auth">
    <div class="auth-art">
      ${logo()}
      <svg class="graphic" viewBox="0 0 320 240" aria-hidden="true">
        <g stroke="#111" stroke-width="1.2" fill="none">
          <line x1="70" y1="170" x2="140" y2="110"/><line x1="140" y1="110" x2="230" y2="140"/><line x1="230" y1="140" x2="260" y2="60"/><line x1="140" y1="110" x2="120" y2="40"/>
        </g>
        <circle cx="70" cy="170" r="26" fill="#111"/><circle cx="230" cy="140" r="26" fill="#111"/><circle cx="120" cy="40" r="20" fill="#111"/>
        <circle cx="140" cy="110" r="22" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="140" cy="110" r="30" fill="none" stroke="#111" stroke-dasharray="4 4"/>
        <circle cx="260" cy="60" r="18" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="260" cy="60" r="25" fill="none" stroke="#111" stroke-dasharray="4 4"/>
      </svg>
      <div>
        <div class="big">Your know&#8209;how,<br>kept.</div>
        <p class="muted" style="margin-top:14px;max-width:340px">Build a digital twin of what you know — in your own words, on your terms — so the people after you aren't starting from zero.</p>
        <p style="margin-top:14px;font-size:14px"><b>Prototype.</b> <a href="#/map">See the full flow</a></p>
      </div>
    </div>
    <div class="auth-main"><div class="auth-card">${inner}</div></div>
  </div>`;
}
function renderLogin() {
  authFrame(`
    <div class="center"><span class="pill">${logo("Twin Studio")}</span></div>
    <h1>Welcome back.</h1>
    <p class="sub">New here? <a href="#/signup" class="link">Sign up</a></p>
    <form id="login">
      <div class="field"><label for="em">Your email address</label><input id="em" class="input" type="email" autocomplete="username" placeholder="robert@example.com"></div>
      <div class="field"><label for="pw">Your password</label><input id="pw" class="input" type="password" autocomplete="current-password" placeholder="Any password works in the prototype"></div>
      <button class="btn primary block" type="submit">Log in</button>
      <div class="row between" style="margin-top:14px;font-size:14px">
        <label class="check" style="margin:0"><input type="checkbox" checked> Remember me</label>
        <a href="#" class="link" data-action="noop">Trouble logging in?</a>
      </div>
    </form>
    <div class="divider">Or log in with</div>
    <div class="sso"><button class="btn" data-action="sso">SSO</button><button class="btn" data-action="sso">Google</button><button class="btn" data-action="sso">Microsoft</button></div>
    <p class="center muted" style="margin-top:22px;font-size:13px">Your knowledge stays yours. You choose what's captured.</p>`);
  document.getElementById("login").onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById("em").value.trim();
    S.user = S.user && (!email || S.user.email === email) ? S.user
      : { name: email ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Robert Alvarez", email: email || "robert@example.com", role: "Senior Mainframe Engineer", years: 31, area: "Claims batch processing" };
    log("Logged in"); save(); go("dashboard");
  };
}
function renderSignup() {
  authFrame(`
    <div class="steps-dots"><i class="on"></i><i></i><i></i></div>
    <h1>Create your account</h1>
    <p class="sub">Already registered? <a href="#/login" class="link">Log in</a></p>
    <form id="signup">
      <div class="field"><label for="nm">Full name</label><input id="nm" class="input" required placeholder="Robert Alvarez"></div>
      <div class="field"><label for="em">Work email</label><input id="em" class="input" type="email" required placeholder="robert@example.com"></div>
      <div class="field"><label for="pw">Password</label><input id="pw" class="input" type="password" required minlength="4" placeholder="At least 4 characters"></div>
      <button class="btn primary block" type="submit">Continue</button>
    </form>`);
  document.getElementById("signup").onsubmit = (e) => {
    e.preventDefault();
    S = fresh();
    S.user = { name: document.getElementById("nm").value.trim(), email: document.getElementById("em").value.trim() };
    save(); go("info");
  };
}
function renderInfo() {
  const u = S.user || {};
  authFrame(`
    <div class="steps-dots"><i class="on"></i><i class="on"></i><i></i></div>
    <h1>About your work</h1>
    <p class="sub">This shapes what your twin knows and who it's for.</p>
    <form id="info">
      <div class="field"><label for="role">Role</label><input id="role" class="input" required value="${esc(u.role || "")}" placeholder="Senior Mainframe Engineer"></div>
      <div class="row" style="gap:12px">
        <div class="field" style="flex:1"><label for="yrs">Years in this role</label><input id="yrs" class="input" type="number" min="0" value="${esc(u.years || "")}" placeholder="31"></div>
        <div class="field" style="flex:2"><label for="area">System or area you know best</label><input id="area" class="input" value="${esc(u.area || "")}" placeholder="Claims batch processing"></div>
      </div>
      <div class="consent">
        <b>You're in control of what's captured</b>
        <ul><li>Only what you upload, type, sketch or say in a session</li><li>Your twin is always labelled as AI — never as you</li><li>You can edit, pause or withdraw it any time</li></ul>
      </div>
      <label class="check"><input id="ok" type="checkbox" required> I agree to share the knowledge I add with my team through this twin.</label>
      <button class="btn primary block" type="submit" style="margin-top:8px">Create profile</button>
    </form>`);
  document.getElementById("info").onsubmit = (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    Object.assign(S.user, { role: val("role"), years: +val("yrs") || "", area: val("area") });
    S.twinName = S.user.area || S.twinName;
    log("Profile created"); save(); go("welcome");
  };
}
function renderWelcome(q) {
  const step = +(q.step || 0);
  const tour = [
    ["Add what you already have", "Upload documents, code, runbooks — or just start typing. The Knowledge Agent turns them into knowledge points."],
    ["Fill the gaps on your brain graph", "Black points are complete. Dashed points are missing something. Click one to add it in words, a sketch from your iPad, or a photo."],
    ["Check your twin, then publish", "Your twin answers a real question next to you. When it reasons like you, set who can use it — and release."],
  ];
  if (step === 0) {
    authFrame(`
      <div class="steps-dots"><i class="on"></i><i class="on"></i><i class="on"></i></div>
      <div class="center" style="margin-bottom:10px"><span class="avatar" style="width:64px;height:64px;font-size:22px">${esc(initials())}</span></div>
      <h1>Profile created</h1>
      <p class="sub">${esc(S.user.name)} · ${esc(S.user.role || "Expert")}${S.user.years ? " · " + esc(S.user.years) + " yrs" : ""}</p>
      <div class="stack">
        <a class="btn primary block" href="#/welcome?step=1">Learn the tool (1 min)</a>
        <a class="btn block" href="#/add">Skip — start a session</a>
      </div>`);
    return;
  }
  const [h, p] = tour[step - 1];
  authFrame(`
    <div class="steps-dots">${tour.map((_, i) => `<i class="${i < step ? "on" : ""}"></i>`).join("")}</div>
    <p class="muted center" style="font-size:13px">Learn the tool · ${step} of 3</p>
    <h1 style="font-size:26px">${h}</h1>
    <p class="sub">${p}</p>
    ${tourArt(step)}
    <div class="row between" style="margin-top:24px">
      <a class="btn ghost" href="#/${step === 1 ? "welcome" : "welcome?step=" + (step - 1)}">Back</a>
      <a class="btn primary" href="#/${step === 3 ? "add" : "welcome?step=" + (step + 1)}">${step === 3 ? "Start session" : "Next"}</a>
    </div>`);
}
function tourArt(step) {
  if (step === 1) return `<div class="dropzone" style="margin-top:0"><div class="arrow">↑</div><span class="btn primary small">Upload files</span> <span class="muted" style="font-size:13px">or drag and drop</span></div>`;
  if (step === 2) return `<svg viewBox="0 0 360 120" style="width:100%"><line x1="70" y1="60" x2="180" y2="60" stroke="#111"/><line x1="180" y1="60" x2="290" y2="60" stroke="#111"/>
    <circle cx="70" cy="60" r="38" fill="#111"/><text x="70" y="64" fill="#fff" font-size="12" text-anchor="middle">Complete</text>
    <circle cx="180" cy="60" r="38" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="180" cy="60" r="47" fill="none" stroke="#111" stroke-dasharray="5 5"/><text x="180" y="64" font-size="12" text-anchor="middle">Missing info</text>
    <circle cx="290" cy="60" r="38" fill="#111"/><text x="290" y="64" fill="#fff" font-size="12" text-anchor="middle">Complete</text></svg>`;
  return `<div class="compare" style="grid-template-columns:1fr 1fr;gap:10px"><div class="answer" style="padding:12px"><span class="who">Twin</span><span style="font-size:13px">Restart from STEP030…</span></div><div class="answer" style="padding:12px"><span class="who">You</span><span style="font-size:13px">Restart from STEP030…</span></div></div>`;
}

/* ---------- Dashboard (Personal profile displayed) ---------- */
function renderDashboard() {
  const todo = S.points.filter((p) => p.status !== "complete");
  const twinState = S.published ? ["Published", "ok"] : S.twin.validated ? ["Ready to publish", "ok"] : S.twin.created ? ["Needs final validation", "warn"] : ["Not created yet", ""];
  const next = S.published ? ["Test your twin", "twin"] : S.twin.validated ? ["Set up terms & publish", "publish"] : S.twin.created ? ["Run final validation", "validation"] : todo.length ? ["Continue on brain graph", "graph"] : ["Create digital twin", "twin"];
  shell("dashboard", `
    <div class="hero">
      <div><h2>Welcome back, ${esc(first())}.</h2><p class="muted">${esc(S.user.role || "")}${S.user.area ? " · " + esc(S.user.area) : ""}</p></div>
      <div class="row"><a class="btn" href="#/add">Start session</a><a class="btn primary" href="#/${next[1]}">${next[0]} →</a></div>
    </div>
    <div class="grid cols-3" style="margin-top:20px">
      <div class="card"><h3>Knowledge points</h3><div class="stat">${done()}<span class="muted" style="font-size:18px"> / ${S.points.length}</span></div><div class="progress" style="margin-top:10px"><i style="width:${pct()}%"></i></div></div>
      <div class="card"><h3>Sources</h3><div class="stat">${S.sources.length}</div><p class="muted" style="font-size:14px">${S.sources.length ? esc(sourceNames().slice(0, 2).join(", ")) + (S.sources.length > 2 ? "…" : "") : "Nothing uploaded yet"}</p></div>
      <div class="card"><h3>Digital twin</h3><div style="margin:10px 0"><span class="tag ${twinState[1]}">${twinState[0]}</span></div><p class="muted" style="font-size:14px">${esc(S.twinName)}</p></div>
    </div>
    <div class="grid cols-2" style="margin-top:20px">
      <div class="card">
        <div class="row between"><h3>Areas needing attention</h3><a class="link" href="#/graph" style="font-size:13px">Open brain graph</a></div>
        <div class="list" style="margin-top:6px">${todo.length ? todo.map((p) => `
          <a class="item" href="#/graph?p=${p.id}" style="text-decoration:none"><span class="dot todo"></span><span>${esc(p.label)}</span>${p.inconsistent && !p.clarified ? '<span class="tag warn" style="margin-left:auto">Conflict</span>' : '<span class="tag" style="margin-left:auto">Missing info</span>'}</a>`).join("") : '<p class="muted" style="padding:12px 0">Nothing — every point is complete.</p>'}
        </div>
      </div>
      <div class="card">
        <h3>Recent activity</h3>
        <div class="list" style="margin-top:6px">${S.activity.length ? S.activity.map((a) => `<div class="item"><span class="dot done"></span><span>${esc(a.text)}</span><span class="muted" style="margin-left:auto;font-size:13px">${ago(a.at)}</span></div>`).join("") : '<p class="muted" style="padding:12px 0">No activity yet.</p>'}</div>
      </div>
    </div>`, { title: "Dashboard", crumb: esc(S.user.name) });
}

/* ---------- Add Knowledge / Start Session (Desktop - 2 frame) ---------- */
let pending = { mode: "upload", files: [], text: "" };
function renderAdd(q) {
  if (q.mode) pending.mode = q.mode;
  const m = pending.mode;
  const tabs = `<div class="tabs" role="tablist">${[["upload", "Upload files"], ["text", "Text input"], ["scratch", "From scratch"]]
    .map(([k, l]) => `<button class="tab ${m === k ? "active" : ""}" role="tab" data-action="mode" data-mode="${k}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (m === "upload") {
    body = `
    <div class="drop-wrap">
      <h2>Upload all relevant documents <span title="Runbooks, diagrams, code, recordings — anything you'd hand a new hire." style="cursor:help;font-size:15px" class="pill">?</span></h2>
      <p class="muted">The Knowledge Agent reads them and builds your first brain graph.</p>
      <div class="dropzone" id="dz">
        <div class="arrow">↓</div>
        <label class="btn primary small" style="cursor:pointer">Upload files<input id="file" type="file" multiple hidden></label>
        <span class="muted" style="font-size:14px"> or drag and drop here</span>
        <div class="mono muted" style="margin-top:10px">PDF, DOCX, TXT, MD, code, audio · up to 50 MB</div>
      </div>
      <div class="file-list">${pending.files.map((f, i) => `<div class="item"><span class="mono">▤</span>${esc(f.name)}<span class="muted" style="font-size:12px">${esc(f.kind)}</span><button class="icon-btn x" data-action="rmfile" data-i="${i}" aria-label="Remove">×</button></div>`).join("")}</div>
      <div class="row" style="justify-content:center;margin-top:20px">
        ${pending.files.length ? "" : `<button class="btn" data-action="samples">Use sample files</button>`}
        <button class="btn primary" data-action="process" ${pending.files.length ? "" : "disabled"}>Build brain graph →</button>
      </div>
    </div>`;
  } else if (m === "text") {
    body = `
    <div class="card" style="max-width:760px">
      <h3>Tell it in your own words</h3>
      <p class="muted" style="margin-bottom:14px">Write the way you'd explain it to someone sitting next to you. Fragments are fine.</p>
      <div class="field"><label for="kt">Topic</label><input id="kt" class="input" placeholder="e.g. Why CLMPROC runs twice at month-end"></div>
      <div class="field"><label for="kb">What you know</label><textarea id="kb" class="textarea" style="min-height:200px" placeholder="Start anywhere…">${esc(pending.text)}</textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" data-action="process-text">Add to brain graph →</button></div>
    </div>`;
  } else {
    body = `
    <p class="muted" style="max-width:640px">No documents? Start from an empty graph. Pick where to begin and the Knowledge Agent will ask you questions to fill it in.</p>
    <div class="choice-grid">${[["Daily operations", "What runs, when, and what to watch for"], ["When things break", "Failures you've seen and how you fix them"], ["People & history", "Who to ask, and why things are the way they are"]]
      .map(([t, d], i) => `<button class="choice ${i === 0 ? "selected" : ""}" data-action="pick"><b>${t}</b><span class="muted" style="font-size:14px">${d}</span></button>`).join("")}</div>
    <div class="row" style="margin-top:24px"><button class="btn primary" data-action="process-scratch">Start interview →</button></div>`;
  }
  shell("add", body, { title: "Add Knowledge", crumb: "Start session", tabs });
  if (m === "upload") bindDrop();
}
function kindOf(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["cbl", "cob", "jcl", "js", "py", "java", "sql", "html"].includes(ext)) return "Code";
  if (["m4a", "mp3", "wav", "mp4", "mov"].includes(ext)) return "Recording";
  if (["png", "jpg", "jpeg", "heic"].includes(ext)) return "Image";
  return "Document";
}
function bindDrop() {
  const dz = document.getElementById("dz"), input = document.getElementById("file");
  const add = (list) => { for (const f of list) pending.files.push({ name: f.name, kind: kindOf(f.name) }); renderAdd({}); };
  input.onchange = () => add(input.files);
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", (e) => add(e.dataTransfer.files));
}

/* ---------- Processing: Knowledge Agent records, Validate Agent checks ---------- */
function cylinder(color, stroke) {
  return `<svg viewBox="0 0 92 104"><path d="M2 14 v76 a44 12 0 0 0 88 0 v-76" fill="${color}" stroke="${stroke}" stroke-width="1.5"/><ellipse cx="46" cy="14" rx="44" ry="12" fill="${color}" stroke="${stroke}" stroke-width="1.5"/></svg>`;
}
async function renderProcessing() {
  const checks = ["Validate that input fits the rest of the info", "Check for data inconsistencies", "Check that the data format is readable by the tool", "Does this interaction work?"];
  shell("add", `
    <div class="agents">
      <div class="agent-row">
        <div><div class="cyl">${cylinder("#effbd6", "#9cbf55")}</div><div class="cyl-label">Knowledge Agent</div></div>
        <div><h3 style="font-size:18px;font-weight:600">Reading your sources</h3><p class="muted" id="ka">Recording ${S.sources.length} source${S.sources.length === 1 ? "" : "s"}…</p><div class="progress" style="margin-top:14px"><i id="kbar" style="width:0"></i></div></div>
      </div>
      <div class="agent-row">
        <div><div class="cyl">${cylinder("#f8d3cf", "#d9776c")}</div><div class="cyl-label">Validate Agent</div></div>
        <div><h3 style="font-size:18px;font-weight:600">Checking what it found</h3>
          <div id="checks" style="margin-top:8px">${checks.map((c) => `<div class="check-item"><span class="tick"></span>${c}</div>`).join("")}</div></div>
      </div>
      <div id="vdone" style="display:none" class="hero"><div><h2>Validation complete</h2><p class="muted">${S.points.length} knowledge points · <span id="needs"></span> need your attention</p></div><a class="btn primary" href="#/graph">See your brain graph →</a></div>
    </div>`, { title: "Building your brain graph", crumb: "Add Knowledge" });
  const bar = document.getElementById("kbar");
  for (let i = 1; i <= 10; i++) { await sleep(120); if (!bar.isConnected) return; bar.style.width = i * 10 + "%"; }
  document.getElementById("ka").textContent = `Recorded ${S.sources.length} source${S.sources.length === 1 ? "" : "s"} · extracted ${S.points.length} knowledge points`;
  const rows = document.querySelectorAll("#checks .check-item");
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].isConnected) return;
    rows[i].classList.add("running"); await sleep(650);
    rows[i].classList.remove("running");
    const flag = i === 1 && S.points.some((p) => p.inconsistent && !p.clarified);
    rows[i].classList.add(flag ? "flag" : "done");
    rows[i].querySelector(".tick").textContent = flag ? "!" : "✓";
    if (flag) rows[i].insertAdjacentHTML("beforeend", ` <span class="tag warn" style="margin-left:6px">1 conflict found</span>`);
  }
  document.getElementById("needs").textContent = S.points.length - done();
  document.getElementById("vdone").style.display = "flex";
}

/* ---------- Brain graph (Desktop - 1 / Desktop - 3 frames) ---------- */
function wrap(label, max = 12) {
  const lines = []; let cur = "";
  for (const w of label.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
function graphSVG(selected) {
  const byId = Object.fromEntries(S.points.map((p) => [p.id, p]));
  const edges = S.points.flatMap((p) => (p.links || []).filter((t) => byId[t]).map((t) => `<line class="edge" x1="${p.x}" y1="${p.y}" x2="${byId[t].x}" y2="${byId[t].y}"/>`)).join("");
  const nodes = S.points.map((p) => {
    const ok = p.status === "complete";
    const lines = wrap(p.label);
    const text = lines.map((l, i) => `<tspan x="${p.x}" dy="${i === 0 ? -(lines.length - 1) * 9 + 5 : 18}">${esc(l)}</tspan>`).join("");
    return `<g class="node ${selected === p.id ? "selected" : ""}" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.label)} — ${ok ? "complete" : "needs info"}">
      <circle class="halo" cx="${p.x}" cy="${p.y}" r="74" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="2 5"/>
      ${ok ? "" : `<circle cx="${p.x}" cy="${p.y}" r="62" fill="#fff" stroke="#111" stroke-width="1.2" stroke-dasharray="6 6"/>`}
      <circle class="fill" cx="${p.x}" cy="${p.y}" r="50" fill="${ok ? "#111" : "#fff"}" stroke="#111" stroke-width="${ok ? 0 : 2}"/>
      <text x="${p.x}" y="${p.y}" text-anchor="middle" fill="${ok ? "#fff" : "#111"}">${text}</text>
    </g>`;
  }).join("");
  const xs = S.points.map((p) => p.x), ys = S.points.map((p) => p.y), pad = 90;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const box = `${minX} ${minY} ${Math.max(...xs) + pad - minX} ${Math.max(...ys) + pad - minY}`;
  return `<svg class="graph" viewBox="${box}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Brain graph of knowledge points">${edges}${nodes}</svg>`;
}
function renderGraph(q) {
  shell("graph", `
    <div class="graph-stage" id="stage">
      <div class="float tl row"><span class="pill">${logo("Mind Map")}</span><span class="legend"><span><span class="dot done"></span>Complete</span><span><span class="dot todo"></span>Needs info</span><span class="muted">Click a point to edit</span></span></div>
      <div class="float tr twin-card">
        <div class="name">${esc(S.twinName)}</div>
        <div class="label"><b style="font-weight:500">Sources</b><a class="icon-btn" href="#/add" title="Add sources" aria-label="Add sources">+</a></div>
        <div class="srcs">${S.sources.length ? sourceNames().map((n) => `<div>${esc(n)}</div>`).join("") : '<span class="muted" style="font-size:13px">No sources yet</span>'}</div>
        <div class="label">Progress <span class="muted" style="font-size:13px" id="prog-count">${done()} / ${S.points.length}</span></div>
        <div class="progress"><i style="width:${pct()}%"></i></div>
      </div>
      <div id="graph-wrap" style="position:absolute;inset:0;padding:110px 20px 70px">${graphSVG(q.p)}</div>
      <div class="float bl"><button class="btn small" data-action="addpoint">+ New knowledge point</button></div>
      <div class="float br"><button class="btn" style="min-width:200px;box-shadow:var(--shadow)" data-action="complete">Complete</button></div>
    </div>
    <aside class="drawer" id="drawer" aria-label="Knowledge point"></aside>`, { flush: true });
  const wrapEl = document.getElementById("graph-wrap");
  wrapEl.addEventListener("click", (e) => { const n = e.target.closest(".node"); if (n) openPoint(n.dataset.id); });
  wrapEl.addEventListener("keydown", (e) => { const n = e.target.closest(".node"); if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPoint(n.dataset.id); } });
  if (q.p) openPoint(q.p);
}
function refreshGraph(selected, pulse) {
  const wrapEl = document.getElementById("graph-wrap");
  if (!wrapEl) return;
  wrapEl.innerHTML = graphSVG(selected);
  if (pulse) wrapEl.querySelector(`[data-id="${pulse}"]`)?.classList.add("pulse");
  const card = document.querySelector(".twin-card");
  document.getElementById("prog-count").textContent = `${done()} / ${S.points.length}`;
  card.querySelector(".progress i").style.width = pct() + "%";
  const count = document.querySelector('a.nav[href="#/graph"] .count');
  const todo = S.points.length - done();
  if (count) { count.textContent = todo; count.style.display = todo ? "" : "none"; }
}

let editing = null; // { id, mode, marks, attachments, clarify }
const MARKS = ["Critical", "Edge case", "Workaround", "Out of date", "Ask me first"];
function openPoint(id) {
  const p = S.points.find((x) => x.id === id);
  if (!p) return;
  editing = { id, mode: "type", marks: [...(p.marks || [])], attachments: [...(p.attachments || [])], clarify: false };
  history.replaceState(null, "", "#/graph?p=" + id);
  refreshGraph(id);
  drawPoint();
  document.getElementById("drawer").classList.add("open");
}
function drawPoint() {
  const p = S.points.find((x) => x.id === editing.id);
  const ok = p.status === "complete";
  const modes = [["type", "Entering info", "Type it out"], ["voice", "Voice inconsistency", "Something's wrong or outdated"], ["ipad", "Connect to iPad", "Sketch, handwrite, scan"]];
  const d = document.getElementById("drawer");
  d.innerHTML = `
    <header>
      <div class="row between"><span class="tag ${ok ? "dark" : p.inconsistent && !p.clarified ? "warn" : ""}">${ok ? "Complete" : p.inconsistent && !p.clarified ? "Conflict" : "Incomplete"}</span><button class="icon-btn" data-action="closepoint" aria-label="Close">×</button></div>
      <input class="input" id="ptitle" value="${esc(p.label)}" style="border:0;padding:0;height:auto;font-size:22px;font-weight:600;margin-top:10px;box-shadow:none" aria-label="Knowledge point title">
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">${(p.sources || []).map((s) => `<span class="cite">▤ ${esc(s)}</span>`).join("") || '<span class="muted" style="font-size:13px">No sources cited yet</span>'}</div>
    </header>
    <div class="body">
      ${!ok && p.missing ? `<div class="missing"><b>Information missing</b>${esc(p.missing)}</div>` : ""}
      ${editing.clarify ? clarifyBox(p) : ""}
      <div><div class="muted" style="font-size:13px;margin-bottom:8px">Refine or edit info input</div>
        <div class="input-modes">${modes.map(([k, t, s]) => `<button class="mode ${editing.mode === k ? "active" : ""}" data-action="pmode" data-mode="${k}"><b>${t}</b><span class="muted">${s}</span></button>`).join("")}</div></div>
      ${editing.mode === "type" ? `<div class="field" style="margin:0"><label for="pbody">What you know</label><textarea id="pbody" class="textarea" placeholder="Explain it like you would to a new hire…">${esc(p.body)}</textarea></div>` : ""}
      ${editing.mode === "voice" ? `<div class="field" style="margin:0"><label for="pvoice">What's inconsistent or out of date?</label><textarea id="pvoice" class="textarea" placeholder="e.g. The runbook says restart from the top — don't, it double-posts.">${esc(p.voice || "")}</textarea><span class="muted" style="font-size:13px">The Validate Agent will check this against the rest of the knowledge base.</span></div>` : ""}
      ${editing.mode === "ipad" ? `
        <div class="pair"><div class="ipad"></div><div><b>iPad connected</b><div class="muted" style="font-size:13px">Sketch, handwrite, mark up, or scan paper notes.</div></div></div>
        <div class="row"><button class="btn" data-action="sketch">Sketch / handwrite</button><label class="btn" style="cursor:pointer">Photo / scan<input id="photo" type="file" accept="image/*" hidden></label></div>` : ""}
      ${editing.attachments.length ? `<div class="stack">${editing.attachments.map((a, i) => `<div><div class="row between" style="font-size:13px;margin-bottom:4px"><span>${esc(a.name)}</span><button class="link" style="font-size:12px" data-action="rmattach" data-i="${i}">Remove</button></div><img class="attach-thumb" src="${a.src}" alt="${esc(a.name)}"></div>`).join("")}</div>` : ""}
      <div><div class="muted" style="font-size:13px;margin-bottom:8px">Marking</div>
        <div class="marks">${MARKS.map((m) => `<button class="mark ${editing.marks.includes(m) ? "on" : ""}" data-action="mark" data-m="${m}">${m}</button>`).join("")}</div></div>
    </div>
    <footer><button class="btn" data-action="closepoint">Cancel</button><button class="btn primary" data-action="validate" id="vbtn">${ok ? "Save & re-validate" : "Validate"}</button></footer>`;
  const photo = document.getElementById("photo");
  if (photo) photo.onchange = () => {
    const f = photo.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { stash(); editing.attachments.push({ name: f.name, src: r.result }); drawPoint(); };
    r.readAsDataURL(f);
  };
}
function clarifyBox(p) {
  return `<div class="clarify">
    <div class="row" style="gap:8px"><span class="tag warn">Validate Agent</span><b style="font-size:14px">Clarifying question</b></div>
    <p style="font-size:14px">This conflicts with the bigger knowledge base: <b>schedule.xlsx</b> says month-end runs move to <b>Saturday</b> when the 1st is a Sunday. Your note says the run is skipped.</p>
    <p style="font-size:14px">Is the AI right, or is your knowledge the current one?</p>
    <div class="row"><button class="btn small" data-action="refine">Refine my answer</button><button class="btn small primary" data-action="override">Override — mine is right</button></div>
  </div>`;
}
function stash() {
  // Keep unsaved drawer edits when re-rendering the drawer.
  const p = S.points.find((x) => x.id === editing.id);
  const t = document.getElementById("ptitle"), b = document.getElementById("pbody"), v = document.getElementById("pvoice");
  if (t) p.label = t.value.trim() || p.label;
  if (b) p.body = b.value;
  if (v) p.voice = v.value;
}
async function validatePoint() {
  stash();
  const p = S.points.find((x) => x.id === editing.id);
  p.marks = editing.marks; p.attachments = editing.attachments;
  const btn = document.getElementById("vbtn");
  btn.disabled = true; btn.textContent = "Validate Agent checking…";
  await sleep(1100);
  if (!document.getElementById("drawer")?.classList.contains("open")) return;
  if (!p.body.trim() && !p.voice?.trim() && !p.attachments.length) {
    save(); btn.disabled = false; btn.textContent = "Validate";
    toast("Add a few words, a sketch or a photo first");
    return;
  }
  if (p.inconsistent && !p.clarified) {
    save(); editing.clarify = true; drawPoint();
    toast("Validate Agent has a question");
    return;
  }
  const was = p.status;
  p.status = "complete"; delete p.missing;
  if (p.attachments.length && !p.sources.includes("iPad sketch")) p.sources.push("iPad sketch");
  log(`${was === "complete" ? "Updated" : "Completed"} “${p.label}”`); save();
  document.getElementById("drawer").classList.remove("open");
  history.replaceState(null, "", "#/graph");
  refreshGraph(null, p.id);
  toast(done() === S.points.length ? "All points complete — press Complete" : "Brain updated");
}

/* Sketch pad modal (Connect to iPad → Sketching + Handwriting + Marking) */
function openSketch() {
  stash();
  openModal(`
    <h2>Sketch on iPad</h2>
    <p class="muted" style="font-size:14px">Draw with a finger, pencil or mouse. It's attached to this knowledge point.</p>
    <canvas class="sketch" id="pad" width="1000" height="600" style="margin-top:14px"></canvas>
    <div class="actions"><button class="btn ghost" data-action="clearpad">Clear</button><button class="btn" data-action="closemodal">Cancel</button><button class="btn primary" data-action="savepad">Attach sketch</button></div>`);
  const c = document.getElementById("pad"), ctx = c.getContext("2d");
  ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  let drawing = false, any = false;
  const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)]; };
  c.onpointerdown = (e) => { drawing = true; any = true; c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pt(e)); };
  c.onpointermove = (e) => { if (!drawing) return; ctx.lineTo(...pt(e)); ctx.stroke(); };
  c.onpointerup = () => { drawing = false; };
  openSketch.save = () => {
    if (!any) { toast("Draw something first"); return; }
    const out = document.createElement("canvas"); out.width = c.width; out.height = c.height;
    const o = out.getContext("2d"); o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height); o.drawImage(c, 0, 0);
    editing.attachments.push({ name: "Sketch " + (editing.attachments.length + 1), src: out.toDataURL("image/jpeg", 0.7) });
    closeModal(); drawPoint(); toast("Sketch attached");
  };
  openSketch.clear = () => { ctx.clearRect(0, 0, c.width, c.height); any = false; };
}

/* ---------- Digital Twin: create, then use / test ---------- */
async function renderTwin(q) {
  if (!S.twin.created) {
    const todo = S.points.length - done();
    shell("twin", `
      <div class="grid cols-2" style="align-items:start">
        <div class="card">
          <h3>Create your digital twin</h3>
          <p class="muted" style="margin-bottom:18px">The Knowledge Agent absorbs everything on your brain graph and every source, then the Validate Agent checks it reasons the way you do.</p>
          <div class="list">
            <div class="item"><span class="dot done"></span>${done()} complete knowledge points</div>
            <div class="item"><span class="dot todo"></span>${todo} incomplete — the twin will say it doesn't know these</div>
            <div class="item"><span class="mono">▤</span>${S.sources.length} sources</div>
          </div>
          <div class="row" style="margin-top:20px"><a class="btn" href="#/graph">Back to brain graph</a><button class="btn primary" data-action="create">Create digital twin</button></div>
        </div>
        <div class="card soft" id="steps">${twinSteps(-1)}</div>
      </div>`, { title: "Digital Twin", crumb: esc(S.twinName) });
    if (q.auto) createTwin();
    return;
  }
  renderTwinChat();
}
function twinSteps(at) {
  const steps = [["Knowledge Agent absorbs everything", `${S.points.length} points · ${S.sources.length} sources`], ["Final validation", "You and the twin answer the same question"], ["Validating similarity", "Does it reason like you?"], ["Digital twin complete", "Set terms, test and release"]];
  return `<div class="timeline">${steps.map(([h, s], i) => `<div class="tl-step ${i < at ? "done" : i === at ? "now" : ""}"><span class="b">${i < at ? "✓" : i + 1}</span><div><h4>${h}</h4><p class="muted" style="font-size:14px">${s}</p></div></div>`).join("")}</div>`;
}
async function createTwin() {
  const btn = document.querySelector('[data-action="create"]');
  if (btn) { btn.disabled = true; btn.textContent = "Absorbing…"; }
  const box = document.getElementById("steps");
  box.innerHTML = twinSteps(0) + `<div class="progress" style="margin-top:6px"><i id="abar" style="width:0"></i></div>`;
  for (let i = 1; i <= 20; i++) { await sleep(90); const b = document.getElementById("abar"); if (!b) return; b.style.width = i * 5 + "%"; }
  S.twin.created = true; log("Digital twin created"); save();
  go("validation");
}
function renderTwinChat() {
  const name = first();
  shell("twin", `
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(260px,1fr);align-items:start">
      <div class="chat">
        <div class="chat-head"><span class="avatar">${esc(initials())}</span><div><b>${esc(name)}'s twin</b> <span class="ai-badge">AI</span><div class="muted" style="font-size:12px">Not ${esc(name)}. Answers only from what ${esc(name)} added, with sources.</div></div></div>
        <div class="chat-log" id="log">
          <div class="msg twin"><div>Hi — I'm an AI twin of ${esc(S.user.name)}'s knowledge about <b>${esc(S.twinName)}</b>. Ask me what you'd ask ${esc(name)}. If I don't know, I'll say so and you can reach ${esc(name)} directly.</div></div>
        </div>
        <form class="chat-input" id="chatf"><input class="input" id="chatq" placeholder="Ask ${esc(name)}'s twin…" autocomplete="off"><button class="btn primary" type="submit">Ask</button></form>
      </div>
      <div class="stack">
        <div class="card"><h3>Try asking</h3><div class="suggest" style="margin-top:10px">${["The rate step abended with S0C7", "How do I restart the job?", "What about month-end on a Sunday?", "Who do I call about storage?", "How do I migrate to Java?"].map((s) => `<button class="mark" data-action="ask" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
        <div class="card"><h3>Status</h3><p style="margin:8px 0"><span class="tag ${S.published ? "ok" : S.twin.validated ? "ok" : "warn"}">${S.published ? "Published" : S.twin.validated ? "Validated · not published" : "Needs final validation"}</span></p>
          <div class="row" style="flex-wrap:wrap;margin-top:12px">${S.published ? "" : `<a class="btn small primary" href="#/${S.twin.validated ? "publish" : "validation"}">${S.twin.validated ? "Terms & publish" : "Final validation"}</a>`}<a class="btn small" href="#/graph">Edit knowledge</a></div></div>
      </div>
    </div>`, { title: "Digital Twin", crumb: S.published ? "Published" : "Enter to use / test" });
  document.getElementById("chatf").onsubmit = (e) => { e.preventDefault(); const i = document.getElementById("chatq"); if (i.value.trim()) ask(i.value.trim()); i.value = ""; };
}
async function ask(q) {
  const logEl = document.getElementById("log");
  logEl.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(q)}</div>`);
  logEl.insertAdjacentHTML("beforeend", `<div class="msg twin" id="typing"><span class="muted">Thinking…</span></div>`);
  logEl.scrollTop = logEl.scrollHeight;
  await sleep(700);
  document.getElementById("typing")?.remove();
  const lower = q.toLowerCase(), name = first();
  const hit = S.chat.find((c) => c.match.some((m) => lower.includes(m)));
  const html = hit
    ? `<div>${esc(hit.answer.replace("Robert", name))}</div>
       ${hit.caveat ? `<div class="caveat">⚠ ${esc(name)} marked this as unresolved — check before acting.</div>` : ""}
       <div class="meta"><span class="muted" style="font-size:12px">Sources</span>${hit.cites.map((c) => `<span class="cite">▤ ${esc(c)}</span>`).join("")}</div>`
    : `<div>I don't have that in ${esc(name)}'s knowledge yet, and I'd rather not guess.</div>
       <div class="caveat">Outside what ${esc(name)} has added.</div>`;
  logEl.insertAdjacentHTML("beforeend", `<div class="msg twin">${html}
    <div class="actions"><button class="btn small" data-action="helpful">Helpful</button><button class="btn small" data-action="flag">Flag a gap</button><button class="btn small" data-action="escalate">Ask ${esc(name)}</button></div></div>`);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ---------- Validation: knowledge checks + final validation ---------- */
function similarity(a, b) {
  const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const A = words(a), B = words(b);
  if (A.size < 4) return Math.min(40, A.size * 10);
  let hit = 0; A.forEach((w) => B.has(w) && hit++);
  return Math.round(58 + 40 * Math.min(1, (hit / Math.min(A.size, B.size)) * 2.2));
}
function ring(score) {
  const r = 50, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return `<svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#e3e3e3" stroke-width="8"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="#111" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle">${score}%</text></svg>`;
}
function renderValidation() {
  const rows = S.points.map((p) => {
    const ok = p.status === "complete";
    const conflict = p.inconsistent && !p.clarified;
    return `<a class="item" href="#/graph?p=${p.id}" style="text-decoration:none"><span class="dot ${ok ? "done" : "todo"}"></span>${esc(p.label)}<span class="tag ${ok ? "ok" : conflict ? "warn" : ""}" style="margin-left:auto">${ok ? (p.overridden ? "Expert override" : "Validated") : conflict ? "Conflict" : "Missing info"}</span></a>`;
  }).join("");
  const final = !S.twin.created
    ? `<div class="card soft"><h3>Final validation</h3><p class="muted" style="margin:6px 0 14px">Unlocks after you create your digital twin.</p><a class="btn" href="#/twin">Go to Digital Twin</a></div>`
    : `<div class="card">
        <div class="row between" style="flex-wrap:wrap"><h3>Final validation</h3><span class="tag">Validate Agent</span></div>
        <p class="muted" style="margin:4px 0 14px">Answer first. Then we'll show how your twin answered the same question.</p>
        <div class="card soft" style="padding:16px"><span class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em">Question</span><p style="font-size:17px;margin-top:4px">${esc(S.testQuestion)}</p></div>
        <div class="compare" style="margin-top:16px">
          <div class="answer"><span class="who">You</span>
            <textarea id="ua" class="textarea" placeholder="How would you handle it?" ${S.twin.score != null ? "readonly" : ""}>${esc(S.twin.userAnswer)}</textarea></div>
          <div class="answer"><span class="who">Your twin</span>
            ${S.twin.score != null ? `<p style="font-size:14px">${esc(S.agentAnswer)}</p><div class="meta row" style="flex-wrap:wrap;gap:6px"><span class="cite">▤ CLMPROC.cbl</span><span class="cite">▤ runbook_2019.docx</span></div>` : `<div class="muted" style="font-size:14px;display:grid;place-items:center;min-height:120px;border:1.5px dashed var(--line-strong);border-radius:10px">Hidden until you answer</div>`}</div>
        </div>
        ${S.twin.score == null ? `<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" data-action="compare">Compare answers</button></div>` : resultBlock()}
      </div>`;
  shell("validation", `
    <div class="grid" style="grid-template-columns:minmax(260px,1fr) minmax(0,2fr);align-items:start">
      <div class="card"><div class="row between"><h3>Knowledge point checks</h3><span class="muted" style="font-size:13px">${done()}/${S.points.length}</span></div><div class="list" style="margin-top:6px">${rows}</div></div>
      ${final}
    </div>`, { title: "Validation", crumb: esc(S.twinName) });
}
function resultBlock() {
  const s = S.twin.score, good = s >= 75;
  return `<div class="score" style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line);flex-wrap:wrap">
    ${ring(s)}
    <div style="flex:1;min-width:220px">
      <h3 style="font-size:18px">${good ? "Your twin reasons like you" : "Your twin is missing part of your reasoning"}</h3>
      <p class="muted" style="font-size:14px;margin:4px 0 14px">${good ? "Similarity is high enough to release. You can still refine it later." : "Add what the twin left out on the brain graph, then try again — or accept it as is."}</p>
      <div class="row" style="flex-wrap:wrap">${good
        ? `<button class="btn" data-action="retry">Try again</button><button class="btn primary" data-action="twin-complete">Digital twin complete →</button>`
        : `<a class="btn" href="#/graph">Refine on brain graph</a><button class="btn" data-action="retry">Try again</button><button class="btn primary" data-action="twin-complete">Accept anyway</button>`}</div>
    </div></div>`;
}

/* ---------- Terms / Publish ---------- */
function renderPublish() {
  const t = S.terms;
  const opt = (name, val, label, desc, type = "radio") => {
    const on = type === "radio" ? t[name] === val : t[name].includes(val);
    return `<label class="check" style="margin:0;padding:12px 0;border-top:1px solid var(--line)"><input type="${type}" name="${name}" value="${val}" ${on ? "checked" : ""}><span><b style="font-weight:500">${label}</b><br><span class="muted" style="font-size:13px">${desc}</span></span></label>`;
  };
  shell("publish", `
    ${!S.twin.created ? `<div class="missing" style="margin-bottom:20px"><b>Your twin isn't created yet</b>Create it and run final validation before releasing. <a class="link" href="#/twin">Go to Digital Twin</a></div>` : ""}
    <div class="grid cols-2" style="align-items:start">
      <form class="card" id="terms">
        <h3>Set up terms and usage</h3>
        <p class="muted" style="font-size:14px;margin-bottom:10px">You decide who can use your twin and for what.</p>
        <div class="muted" style="font-size:13px;margin-top:14px">Who can ask it</div>
        ${opt("access", "team", "My team", "Claims batch & ops — 14 people")}
        ${opt("access", "org", "Whole organization", "Anyone signed in")}
        ${opt("access", "me", "Only me (private)", "Keep testing before you share")}
        <div class="muted" style="font-size:13px;margin-top:18px">What it can be used for</div>
        ${opt("uses", "answer", "Answer questions during work", "Day-to-day troubleshooting", "checkbox")}
        ${opt("uses", "onboard", "Onboard new engineers", "Walk new hires through the system", "checkbox")}
        ${opt("uses", "agents", "Help AI agents working on the code", "Agents cite you the same way people do", "checkbox")}
        <div class="muted" style="font-size:13px;margin-top:18px">Always on</div>
        <div class="list" style="font-size:14px">
          <div class="item"><span class="tag dark">On</span>Labelled as AI — never presented as ${esc(first())}</div>
          <div class="item"><span class="tag dark">On</span>Every answer cites its sources</div>
          <div class="item"><span class="tag dark">On</span>Says when it doesn't know</div>
        </div>
        <label class="check" style="margin-top:14px"><input type="checkbox" name="escalate" ${t.escalate ? "checked" : ""}> Let people reach me when the twin can't answer</label>
        <div class="field" style="margin-top:10px"><label for="review">Remind me to review it</label>
          <select id="review" class="input select" name="review">${["monthly", "quarterly", "yearly"].map((r) => `<option ${t.review === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
      </form>
      <div class="stack">
        <div class="card soft">
          <h3>${esc(first())}'s twin · ${esc(S.twinName)}</h3>
          <p class="muted" style="font-size:14px;margin:6px 0 14px">${done()}/${S.points.length} knowledge points · ${S.sources.length} sources · similarity ${S.twin.score ?? "—"}${S.twin.score != null ? "%" : ""}</p>
          <div class="stack">
            <a class="btn block" href="#/twin">Enter to use / test</a>
            <a class="btn block" href="#/graph">Edit</a>
            <button class="btn primary block" data-action="release" ${S.twin.created ? "" : "disabled"}>Release / publish</button>
          </div>
        </div>
        <p class="muted" style="font-size:13px">You can pause or withdraw your twin any time from Settings.</p>
      </div>
    </div>`, { title: "Terms / Publish", crumb: esc(S.twinName) });
  document.getElementById("terms").onchange = (e) => {
    const f = e.currentTarget;
    t.access = f.querySelector('[name="access"]:checked')?.value || "team";
    t.uses = [...f.querySelectorAll('[name="uses"]:checked')].map((i) => i.value);
    t.escalate = f.querySelector('[name="escalate"]').checked;
    t.review = f.querySelector('[name="review"]').value;
    save(); toast("Saved");
  };
}

/* ---------- End ---------- */
function renderEnd() {
  const url = location.origin + location.pathname + "#/twin";
  const who = { team: "your team", org: "your whole organization", me: "only you" }[S.terms.access];
  app.innerHTML = `
  <div class="end"><div class="inner">
    <svg viewBox="0 0 160 160" width="140" aria-hidden="true"><circle cx="80" cy="80" r="58" fill="#111"/><circle cx="80" cy="80" r="72" fill="none" stroke="#111" stroke-dasharray="6 6"/><path d="M56 82 l16 16 l32 -36" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <h1>Your twin is live.</h1>
    <p class="muted">${esc(first())}'s twin for <b>${esc(S.twinName)}</b> is available to ${who}. It cites its sources, says when it doesn't know, and sends hard questions back to you.</p>
    <div class="share-box"><input class="input" readonly value="${esc(url)}" id="shareurl"><button class="btn primary" data-action="copy">Copy link</button></div>
    <div class="row"><a class="btn" href="#/twin">Try it</a><a class="btn" href="#/dashboard">Back to dashboard</a></div>
  </div></div>`;
}

/* ---------- Prototype map (the User Flow board, clickable) ---------- */
function renderMap() {
  const n = (label, path, cls = "", sub = "") => `<a class="map-node ${cls}" href="#/${path}">${label}${sub ? `<small>${sub}</small>` : ""}</a>`;
  const a = `<span class="arrow-r">→</span>`;
  app.innerHTML = `
  <div class="map">
    <div class="row between" style="flex-wrap:wrap;gap:12px">${logo()}<div class="row"><button class="btn small" data-action="reset">Reset demo data</button><a class="btn small primary" href="#/login">Start from the beginning</a></div></div>
    <h1 style="font-size:32px;margin-top:28px">Prototype map</h1>
    <p class="muted" style="max-width:680px;margin-top:6px">Every step from our User Flow board, linked to the screen that implements it. Use it to jump straight to a task during usability testing.</p>
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:18px;font-size:13px">
      <span class="map-node decision" style="padding:4px 10px">User decision</span><span class="map-node system" style="padding:4px 10px">System decision</span><span class="map-node io" style="padding:4px 10px">Input / output</span><span class="map-node doc" style="padding:4px 10px">Document input</span><span class="map-node agent-k" style="padding:4px 10px">Knowledge Agent</span><span class="map-node agent-v" style="padding:4px 10px">Validate Agent</span>
    </div>

    <h3 style="margin-top:34px">1 · Get in</h3>
    <div class="map-row">${n("Start", "login")}${a}${n("Registered?", "login", "decision")}${a}${n("Login", "login", "io", "yes")}${a}${n("Personal profile displayed", "dashboard")}</div>
    <div class="map-row">${n("Account creation / registration", "signup", "", "no")}${a}${n("Enter personal info", "info", "io")}${a}${n("Personal profile created", "welcome")}${a}${n("Navigate the tool · Learn the tool", "welcome?step=1")}</div>

    <h3>2 · Start session</h3>
    <div class="map-row">${n("Start session", "add")}${a}${n("Uploading external sources?", "add", "decision")}${a}${n("Document input / file upload", "add?mode=upload", "doc")}${n("Text input", "add?mode=text", "io")}${n("From scratch", "add?mode=scratch", "decision")}</div>
    <div class="map-row">${n("Knowledge Agent records", "processing", "agent-k")}${a}${n("Validate Agent: fits · inconsistencies · format · interaction", "processing", "agent-v")}${a}${n("Validation complete", "processing")}</div>

    <h3>3 · Brain graph</h3>
    <div class="map-row">${n("Visualization of data + gaps", "graph")}${a}${n("Displays sources · Creates knowledge points · Identifies areas needing attention", "graph")}${a}${n("Edit knowledge point?", "graph?p=p2", "decision")}</div>
    <div class="map-row">${n("Information missing", "graph?p=p3")}${a}${n("Refine or edit info input", "graph?p=p3", "doc")}${a}${n("Voicing out inconsistency · Entering info · Marking", "graph?p=p3", "io")}${n("Connect to iPad → sketch / handwrite / scan", "graph?p=p9", "io")}</div>
    <div class="map-row">${n("Validate?", "graph?p=p5", "decision")}${a}${n("Knowledge point complete?", "graph?p=p5", "system")}${a}${n("Clarifying question", "graph?p=p5", "", "inconsistent with bigger database")}${a}${n("User validates · Refine / Override", "graph?p=p5", "decision")}${a}${n("Update brain / visualization", "graph")}</div>

    <h3>4 · Create the twin</h3>
    <div class="map-row">${n("Complete?", "graph", "decision")}${a}${n("Create digital twin", "twin", "agent-k", "absorb everything")}${a}${n("Final validation process", "validation", "agent-v")}${a}${n("Agent answers · User answers", "validation")}${a}${n("Validating similarity", "validation")}${a}${n("Digital twin complete", "publish")}</div>

    <h3>5 · Release</h3>
    <div class="map-row">${n("Enter to use / test", "twin")}${n("Set up terms and usage", "publish")}${n("Edit", "graph")}${a}${n("Release / publish", "publish")}${a}${n("End", "end")}</div>
  </div>`;
}

/* ---------- Modal ---------- */
function openModal(html) { modalRoot.innerHTML = `<div class="scrim" data-action="scrim"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeModal() { modalRoot.innerHTML = ""; }
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (modalRoot.innerHTML) return closeModal();
  const d = document.getElementById("drawer");
  if (d?.classList.contains("open")) { d.classList.remove("open"); history.replaceState(null, "", "#/graph"); refreshGraph(); }
});

/* ---------- Actions (event delegation) ---------- */
const actions = {
  noop: () => toast("Not part of this prototype"),
  sso: () => { S.user = S.user || { name: "Robert Alvarez", email: "robert@example.com", role: "Senior Mainframe Engineer", years: 31, area: "Claims batch processing" }; save(); go("dashboard"); },
  logout: () => { go("login"); },
  settings: () => openModal(`<h2>Settings</h2><p class="muted" style="font-size:14px">Prototype data is saved in this browser only.</p>
    <div class="list" style="margin-top:14px"><div class="item">Pause my twin<span class="tag" style="margin-left:auto">Prototype</span></div><div class="item">Withdraw my twin and delete my knowledge<span class="tag" style="margin-left:auto">Prototype</span></div></div>
    <div class="actions"><button class="btn" data-action="reset">Reset demo data</button><button class="btn primary" data-action="closemodal">Done</button></div>`),
  reset: () => { S = fresh(); save(); pending = { mode: "upload", files: [], text: "" }; closeModal(); toast("Demo data reset"); go("login"); },
  closemodal: closeModal,
  scrim: (el, e) => { if (e.target === el) closeModal(); },

  mode: (el) => { pending.mode = el.dataset.mode; renderAdd({}); },
  rmfile: (el) => { pending.files.splice(+el.dataset.i, 1); renderAdd({}); },
  samples: () => { pending.files = S.starterSources.map((s) => ({ ...s })); renderAdd({}); },
  process: () => {
    for (const f of pending.files) if (!S.sources.some((s) => s.name === f.name)) S.sources.push(f);
    log(`Uploaded ${pending.files.length} source${pending.files.length === 1 ? "" : "s"}`);
    pending.files = []; save(); go("processing");
  },
  "process-text": () => {
    const t = document.getElementById("kt").value.trim(), b = document.getElementById("kb").value.trim();
    if (!b) { toast("Write something first"); return; }
    const id = "p" + Date.now();
    S.points.push({ id, label: t || "New note", x: 1000 + Math.round(Math.random() * 200), y: 760, status: "incomplete", links: [S.points[S.points.length - 1].id], body: b, missing: "The Knowledge Agent needs one example of when this applies.", sources: ["Text input"] });
    if (!S.sources.some((s) => s.name === "Text input")) S.sources.push({ name: "Text input", kind: "Text" });
    pending.text = ""; log(`Added “${t || "New note"}”`); save(); go("processing");
  },
  pick: (el) => { document.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected")); el.classList.add("selected"); },
  "process-scratch": () => { log("Started from scratch"); save(); go("graph?p=p9"); },

  closepoint: () => { document.getElementById("drawer").classList.remove("open"); history.replaceState(null, "", "#/graph"); refreshGraph(); },
  pmode: (el) => { stash(); editing.mode = el.dataset.mode; drawPoint(); },
  mark: (el) => { const m = el.dataset.m; editing.marks = editing.marks.includes(m) ? editing.marks.filter((x) => x !== m) : [...editing.marks, m]; el.classList.toggle("on"); },
  sketch: () => openSketch(),
  savepad: () => openSketch.save(),
  clearpad: () => openSketch.clear(),
  rmattach: (el) => { stash(); editing.attachments.splice(+el.dataset.i, 1); drawPoint(); },
  validate: () => validatePoint(),
  refine: () => {
    const p = S.points.find((x) => x.id === editing.id);
    p.clarified = true; editing.clarify = false; editing.mode = "type"; drawPoint();
    const ta = document.getElementById("pbody"); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    toast("Refine your answer, then validate");
  },
  override: () => {
    const p = S.points.find((x) => x.id === editing.id);
    p.clarified = true; p.overridden = true; editing.clarify = false; validatePoint();
  },
  addpoint: () => {
    const id = "p" + Date.now();
    S.points.push({ id, label: "New knowledge point", x: 700 + Math.round(Math.random() * 300 - 150), y: 790, status: "incomplete", links: [], body: "", missing: "What should someone know about this?", sources: [] });
    save(); refreshGraph(id); openPoint(id);
    setTimeout(() => { const t = document.getElementById("ptitle"); t.focus(); t.select(); }, 260);
  },
  complete: () => {
    const todo = S.points.length - done();
    if (!todo) { go("twin?auto=1"); return; }
    openModal(`<h2>${todo} point${todo === 1 ? "" : "s"} still need${todo === 1 ? "s" : ""} attention</h2>
      <p class="muted" style="font-size:14px">You can keep going. Your twin will say it doesn't know about anything incomplete, instead of guessing.</p>
      <div class="list" style="margin-top:12px">${S.points.filter((p) => p.status !== "complete").map((p) => `<div class="item"><span class="dot todo"></span>${esc(p.label)}</div>`).join("")}</div>
      <div class="actions"><button class="btn" data-action="closemodal">Keep editing</button><a class="btn primary" href="#/twin?auto=1">Create twin anyway</a></div>`);
  },

  create: () => createTwin(),
  compare: () => {
    const ua = document.getElementById("ua").value.trim();
    if (!ua) { toast("Write your answer first"); return; }
    S.twin.userAnswer = ua; S.twin.score = similarity(ua, S.agentAnswer); save();
    log(`Final validation: ${S.twin.score}% similar`); renderValidation();
  },
  retry: () => { S.twin.score = null; save(); renderValidation(); },
  "twin-complete": () => { S.twin.validated = true; log("Digital twin complete"); save(); go("publish"); },

  ask: (el) => ask(el.dataset.q),
  helpful: (el) => { el.closest(".actions").innerHTML = '<span class="muted" style="font-size:13px">Thanks — noted.</span>'; },
  flag: (el) => { el.closest(".actions").innerHTML = `<span class="muted" style="font-size:13px">Flagged. ${esc(first())} will see it as a gap on the brain graph.</span>`; },
  escalate: (el) => { el.closest(".actions").innerHTML = `<span class="muted" style="font-size:13px">Question sent to ${esc(first())}${S.terms.escalate ? "" : " (escalation is off — this would be blocked)"}.</span>`; },

  release: () => openModal(`<h2>Release your twin?</h2><p class="muted" style="font-size:14px">It will be available to ${{ team: "your team", org: "your whole organization", me: "only you" }[S.terms.access]}. You can pause or withdraw it any time.</p>
    <div class="actions"><button class="btn" data-action="closemodal">Not yet</button><button class="btn primary" data-action="confirm-release">Release</button></div>`),
  "confirm-release": () => { S.published = true; log("Twin released"); save(); go("end"); },
  copy: () => { const i = document.getElementById("shareurl"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) {} toast("Link copied"); },
};
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === "A" && el.getAttribute("href") === "#") e.preventDefault();
  fn(el, e);
});

router();
