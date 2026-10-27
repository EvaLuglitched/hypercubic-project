// Demo content for the prototype. Nothing here is real data.
// Each demo category is one story: a made-up expert, their files, the knowledge points the AI finds in
// them, the final-validation questions and a returning demo account. The stories live in js/demo/.
// To add a category, copy one of those files, change its content, and list it in CATEGORIES.
import design from './demo/design.js';
import mainframe from './demo/mainframe.js';

// In the order the "Use Demo Files" and "Use a demo account" pickers show them.
export const CATEGORIES = [design, mainframe];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || null;

// The demo story a twin comes from: set on the demo accounts' twins, otherwise read from its demo files.
export function categoryFor(twin) {
  if (!twin) return null;
  if (twin.category) return categoryById(twin.category);
  const names = new Set([...(twin.files || []), ...(twin.pending || [])].map((f) => f.name));
  return CATEGORIES.find((c) => c.files.some((f) => names.has(f.name))) || null;
}

export const clonePoint = (p) => JSON.parse(JSON.stringify(p));

// A returning user for "Use a demo account" on the log-in page: one twin in progress, one published.
export function demoAccount(categoryId) {
  const c = categoryById(categoryId) || CATEGORIES[0];
  const { user, building, published: p } = c.account;
  const now = Date.now();
  const day = 86400000;
  const month = (offset) => new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const statements = p.monthly.map((answers, i) => ({ month: month(p.monthly.length - 1 - i), answers, amount: answers * p.terms.rate }));
  const inProgress = {
    id: building, name: c.twinName, category: c.id, createdAt: now - 6 * day, updatedAt: now - 3 * 3600000,
    status: 'building', pending: [],
    files: c.files.map((f) => ({ ...f, demo: true, addedAt: now - 6 * day })),
    sections: c.sections.map((s) => ({ ...s })), points: c.points.map(clonePoint),
    chats: {}, validation: null, terms: null, publishedAt: null, usage: { answers: 0, earned: 0, statements: [] },
  };
  const live = {
    id: p.id, name: p.name, category: c.id, createdAt: now - 95 * day, updatedAt: now - 20 * day,
    status: 'published', pending: [],
    files: p.files.map((f) => ({ ...f, addedAt: now - 95 * day })),
    sections: p.sections.map((s) => ({ ...s })), points: p.points.map(clonePoint),
    suggestions: p.suggestions.slice(),
    chats: {}, validation: { overall: p.match, results: [] },
    terms: { ...p.terms, consent: true, savedAt: now - 90 * day },
    publishedAt: now - 88 * day,
    usage: {
      answers: statements.reduce((sum, st) => sum + st.answers, 0),
      earned: statements.reduce((sum, st) => sum + st.amount, 0),
      licensees: p.licensees,
      statements,
    },
  };
  return {
    user: { ...user, skills: user.skills.slice(), field: c.id, tourSeen: true, isDemo: true, createdAt: now - 95 * day },
    twins: [inProgress, live],
  };
}
