// Shared helpers for every screen: escaping, icons, dialogs, toasts and formatters.

export const PRODUCT = 'Twin Studio';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Agent text supports **bold**, `code` and line breaks. Everything else is escaped.
export function rich(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function reducedMotion() {
  return document.documentElement.dataset.motion === 'reduced'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function go(path) {
  location.hash = '#/' + path;
}

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowDown: '<path d="M12 3v18M6 15l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  more: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  pen: '<path d="M4 20l1.2-4.4L16 4.8l3.2 3.2L8.4 18.8z"/><path d="M14 7l3 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6"/><path d="M12 17.2v.1"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.1"/>',
  type: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  eraser: '<path d="M8 20h12M4 16l9-9 5 5-6 6H7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-.9-1.4-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.7 5.2 1.4 5.2 4.1 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.5-2.7-1.4M12 6.5v1.7M12 15.8v1.7"/>',
  outline: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  map: '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="M8.3 8.2l2.6 6.6M15.8 7.3l-2.7 7.6M8.5 7l7-1"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  // Demo categories: a terminal prompt (Mainframe Engineering) and a Figma-style frame (Digital Product Design).
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>',
  frame: '<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>',
};

export function icon(name, { size = 20, label = '' } = {}) {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${ICONS[name] || ''}</svg>`;
}

// Two overlapping circles: the expert and their twin. A placeholder until the team picks a logo.
export function logoMark(size = 22) {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="12" r="6.5" fill="currentColor"></circle><circle cx="15" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle></svg>`;
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A modal dialog. Resolves with the chosen action's value, or null when dismissed.
export function dialog({ title, body = '', actions = [{ label: 'OK', value: true, primary: true }], dismissible = true, wide = false, onMount = null }) {
  return new Promise((resolve) => {
    const root = document.getElementById('overlay-root');
    const previous = document.activeElement;
    const titleId = 'dlg-' + Math.random().toString(36).slice(2, 8);
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = `
      <div class="dialog${wide ? ' dialog-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <h2 id="${titleId}" class="dialog-title">${esc(title)}</h2>
        <div class="dialog-body">${body}</div>
        <div class="dialog-actions">
          ${actions.map((a, i) => `<button type="button" class="btn${a.primary ? ' btn-primary' : ''}${a.danger ? ' btn-danger' : ''}" data-action-index="${i}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>`;
    root.appendChild(scrim);
    const box = scrim.querySelector('.dialog');

    function close(value) {
      document.removeEventListener('keydown', onKey, true);
      scrim.remove();
      if (previous && document.contains(previous) && previous.focus) previous.focus();
      resolve(value);
    }
    function onKey(event) {
      if (!document.contains(scrim)) { document.removeEventListener('keydown', onKey, true); return; }
      if (event.key === 'Escape' && dismissible) { event.preventDefault(); event.stopPropagation(); close(null); }
      if (event.key === 'Enter' && event.target.matches('input:not([type="checkbox"]):not([type="radio"])')) {
        const primary = box.querySelector('.dialog-actions .btn-primary');
        if (primary) { event.preventDefault(); primary.click(); }
      }
      if (event.key === 'Tab') {
        const items = $$(FOCUSABLE, box);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    scrim.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action-index]');
      if (button) {
        const action = actions[Number(button.dataset.actionIndex)];
        if (action.validate && !action.validate(box)) return;
        close(action.getValue ? action.getValue(box) : action.value);
      } else if (event.target === scrim && dismissible) {
        close(null);
      }
    });
    document.addEventListener('keydown', onKey, true);
    if (onMount) onMount(box, close);
    const target = box.querySelector('[autofocus]') || box.querySelector('input:not([type="checkbox"]), textarea, select') || box.querySelector('.btn-primary') || box.querySelector('button');
    if (target) target.focus();
  });
}

export function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function money(amount) {
  return '$' + Number(amount || 0).toFixed(2);
}

export function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function firstName(user) {
  return (user?.name || 'there').trim().split(/\s+/)[0];
}

export function initials(name) {
  return (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function monthLabel(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

// Moves keyboard and screen reader focus to the new screen's main heading.
export function focusHeading(root) {
  const h = root.querySelector('h1');
  if (!h) return;
  if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}
