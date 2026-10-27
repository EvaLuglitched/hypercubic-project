// App state, saved in this browser's localStorage. The prototype keeps one local account per browser.
import { demoAccount } from './demo.js';

const KEY = 'twin-studio-v2';

const fresh = () => ({
  v: 2,
  user: null,
  session: false,
  twins: [],
  settings: { text: 'standard', contrast: 'standard', motion: 'full' },
  tour: null,
  ipad: false,
});

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.v === 2) return { ...fresh(), ...saved, settings: { ...fresh().settings, ...(saved.settings || {}) } };
  } catch (e) {
    // Broken data: start over.
  }
  return fresh();
}

let S = load();

export const store = {
  get: () => S,
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      console.warn('Could not save prototype data', e);
    }
  },
  update(fn) {
    fn(S);
    store.save();
  },
  reset() {
    S = fresh();
    store.save();
    applySettings();
  },
};

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function applySettings() {
  const root = document.documentElement;
  root.dataset.text = S.settings.text;
  root.dataset.contrast = S.settings.contrast;
  root.dataset.motion = S.settings.motion;
}

export function signedIn() {
  return Boolean(S.user && S.session);
}

export function createAccount({ name, email }) {
  store.update((s) => {
    s.user = { name, email, role: '', company: '', years: '', field: '', skills: [], tourSeen: false, isDemo: false, createdAt: Date.now() };
    s.session = true;
    s.twins = [];
    s.tour = null;
    s.ipad = false;
  });
}

export function logIn(email) {
  const known = S.user && S.user.email && S.user.email.toLowerCase() === email.trim().toLowerCase();
  if (known) store.update((s) => { s.session = true; });
  return Boolean(known);
}

// `categoryId` picks the demo account: one per demo category in demo.js.
export function logInDemo(categoryId) {
  const demo = demoAccount(categoryId);
  store.update((s) => {
    s.user = demo.user;
    s.twins = demo.twins;
    s.session = true;
    s.tour = null;
  });
}

export function logOut() {
  store.update((s) => {
    s.session = false;
    s.tour = null;
  });
}

export function getTwin(id) {
  return S.twins.find((t) => t.id === id) || null;
}

export function updateTwin(id, fn) {
  store.update((s) => {
    const twin = s.twins.find((t) => t.id === id);
    if (twin) {
      fn(twin);
      twin.updatedAt = Date.now();
    }
  });
}

export function createTwin(name) {
  const twin = {
    id: uid('twin'),
    name: name.trim() || 'Untitled twin',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft', // draft → building → ready → published
    files: [],
    pending: [],
    sections: [],
    points: [],
    chats: {},
    validation: null,
    terms: null,
    publishedAt: null,
    usage: { answers: 0, earned: 0, statements: [] },
  };
  store.update((s) => { s.twins.unshift(twin); });
  return twin;
}

export function deleteTwin(id) {
  store.update((s) => { s.twins = s.twins.filter((t) => t.id !== id); });
}

export function progress(twin) {
  const total = twin.points.length;
  const done = twin.points.filter((p) => p.status === 'complete').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Open work for the Tasks panel: conflicts first, then missing information.
export function tasksFor(twin) {
  const rank = { conflict: 0, missing: 1 };
  return twin.points.filter((p) => p.status !== 'complete').sort((a, b) => rank[a.status] - rank[b.status]);
}

// Where a twin card on the dashboard should take you.
export function twinHome(twin) {
  if (twin.status === 'draft' || !twin.points.length) return `#/twin/${twin.id}/upload`;
  if (twin.status === 'published') return `#/twin/${twin.id}/published`;
  if (twin.status === 'ready') return `#/twin/${twin.id}/ready`;
  return `#/twin/${twin.id}/map`;
}
