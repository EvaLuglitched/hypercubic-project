// Entry point: a small hash router. Each screen renders into #app and may return a cleanup function.
import { store, applySettings, signedIn } from './store.js';
import * as auth from './views/auth.js';
import * as dash from './views/dashboard.js';
import * as upload from './views/upload.js';
import * as thinking from './views/thinking.js';
import * as mapView from './views/map.js';
import * as pointView from './views/point.js';
import * as finish from './views/finish.js';

const ROUTES = [
  ['signup', auth.signup, { guest: true }],
  ['login', auth.login, { guest: true }],
  ['about', auth.about],
  ['home', dash.home],
  ['account', dash.account],
  ['settings', dash.settings],
  ['help', dash.help],
  ['twin/:id/upload', upload.render],
  ['twin/:id/thinking', thinking.render],
  ['twin/:id/map', mapView.render],
  ['twin/:id/point/:pid', pointView.render],
  ['twin/:id/create', finish.create],
  ['twin/:id/validate', finish.validate],
  ['twin/:id/ready', finish.ready],
  ['twin/:id/terms', finish.terms],
  ['twin/:id/try', finish.tryTwin],
  ['twin/:id/published', finish.published],
];

const app = document.getElementById('app');
let cleanup = null;

function match(path) {
  const parts = path.split('/');
  for (const [pattern, view, opts = {}] of ROUTES) {
    const keys = pattern.split('/');
    if (keys.length !== parts.length) continue;
    const params = {};
    const ok = keys.every((k, i) => {
      if (k.startsWith(':')) { params[k.slice(1)] = decodeURIComponent(parts[i]); return true; }
      return k === parts[i];
    });
    if (ok) return { view, params, opts };
  }
  return null;
}

function router() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const found = match(path);
  if (!found) { location.replace(signedIn() ? '#/home' : (store.get().user ? '#/login' : '#/signup')); return; }
  if (!found.opts.guest && !signedIn()) { location.replace(store.get().user ? '#/login' : '#/signup'); return; }
  if (found.opts.guest && signedIn()) { location.replace('#/home'); return; }

  if (cleanup) {
    try { cleanup(); } catch (e) { console.error(e); }
    cleanup = null;
  }
  document.getElementById('overlay-root').innerHTML = '';
  app.innerHTML = '';
  window.scrollTo(0, 0);
  try {
    cleanup = found.view(app, { ...found.params, query }) || null;
  } catch (e) {
    console.error(e);
    app.innerHTML = `<main id="main" style="padding:4rem 2rem;max-width:40rem"><h1 style="font-size:2rem;font-weight:400">Something went wrong</h1><p style="margin:1rem 0">This screen couldn’t load. Your data is safe.</p><a class="btn btn-primary" href="#/home">Back to the dashboard</a></main>`;
  }
}

applySettings();
window.addEventListener('hashchange', router);
router();
