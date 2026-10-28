// The mind map: an Obsidian-style graph you can pan and zoom like a canvas.
// Zoomed out (P2) every knowledge point is a dot; zoomed in (P3) the dots become labelled circles.
// Nodes are real <button>s, so the map also works with a keyboard and screen readers.

import { esc, icon, reducedMotion } from './ui.js';
import { projectName } from './demo.js';

const MIN_K = 0.12;
const MAX_K = 1.8;
const LABEL_K = 0.5; // below this zoom level the map shows dots only

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Positions are computed from the twin's content, so the same twin always gets the same map.
export function layoutKnowledge(twin) {
  const rand = seeded(hashString(twin.id));
  const nodes = [{ id: 'root', kind: 'root', x: 0, y: 0, r: 96, label: twin.name }];
  const sections = twin.sections.filter((s) => twin.points.some((p) => p.section === s.id));
  const n = sections.length;
  const ring = n <= 1 ? 420 : 470 + n * 55;
  sections.forEach((s, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2 + 0.6;
    const hub = { id: `hub:${s.id}`, kind: 'hub', section: s.id, x: Math.cos(a) * ring * 1.3, y: Math.sin(a) * ring, r: 82, label: s.title };
    nodes.push(hub);
    const pts = twin.points.filter((p) => p.section === s.id);
    const m = pts.length;
    const spread = Math.min(Math.PI * 1.7, 0.62 * m + 0.4);
    pts.forEach((p, j) => {
      const b = a + (m === 1 ? 0 : (j / (m - 1) - 0.5) * spread);
      const dist = 280 + (j % 2) * 110 + rand() * 60;
      nodes.push({ id: p.id, kind: 'point', section: s.id, x: hub.x + Math.cos(b) * dist, y: hub.y + Math.sin(b) * dist, r: 66, point: p });
    });
  });
  // Push apart anything that overlaps.
  for (let it = 0; it < 160; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + (a.kind === 'point' && b.kind === 'point' ? 64 : 90);
        if (d < min) {
          const push = (min - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          if (a.kind !== 'root') { a.x -= ux * push; a.y -= uy * push; }
          if (b.kind !== 'root') { b.x += ux * push; b.y += uy * push; }
        }
      }
    }
  }
  return nodes;
}

export function edgesFor(twin, nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  for (const n of nodes) {
    if (n.kind === 'hub') edges.push({ a: byId.get('root'), b: n, type: 'spoke' });
    if (n.kind === 'point') edges.push({ a: byId.get(`hub:${n.section}`), b: n, type: 'spoke' });
  }
  const seen = new Set();
  for (const p of twin.points) {
    for (const other of p.links || []) {
      const key = [p.id, other].sort().join('|');
      if (seen.has(key) || !byId.has(other) || !byId.has(p.id)) continue;
      seen.add(key);
      edges.push({ a: byId.get(p.id), b: byId.get(other), type: 'cross' });
    }
  }
  return edges.filter((e) => e.a && e.b);
}

const STATUS_TEXT = { complete: 'Validated', missing: 'Missing information', conflict: 'Two sources disagree' };

// True when a label's box comes within `pad` pixels of a circle.
function boxHitsCircle(b, c, pad) {
  const x = Math.max(b.x, Math.min(c.x, b.x + b.w));
  const y = Math.max(b.y, Math.min(c.y, b.y + b.h));
  return Math.hypot(c.x - x, c.y - y) < c.r + pad;
}

export class MindMap {
  constructor(host, { twin, rightInset = 360, bottomInset = 90, onOpen = () => {}, onView = () => {}, onSelect = () => {} }) {
    this.host = host;
    this.twin = twin;
    this.rightInset = rightInset;
    this.bottomInset = bottomInset;
    this.onOpen = onOpen;
    this.onView = onView;
    this.onSelect = onSelect;
    this.view = { x: 0, y: 0, k: 1 };
    this.selected = null;
    this.lastTap = { id: null, t: 0 };
    this.nodes = layoutKnowledge(twin);
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.edges = edgesFor(twin, this.nodes);
    this.render();
    this.bind();
    this.fit(false);
    // Label sizes change once the web fonts arrive.
    document.fonts?.ready.then(() => this.place());
  }

  render() {
    const sectionTitle = (id) => (this.twin.sections.find((s) => s.id === id) || {}).title || '';
    const lines = this.edges.map((e) => `<line x1="${e.a.x.toFixed(1)}" y1="${e.a.y.toFixed(1)}" x2="${e.b.x.toFixed(1)}" y2="${e.b.y.toFixed(1)}" class="is-${e.type}"></line>`).join('');
    const nodes = this.nodes.map((n) => {
      const style = `left:${(n.x - n.r).toFixed(1)}px;top:${(n.y - n.r).toFixed(1)}px;width:${n.r * 2}px;height:${n.r * 2}px;--node-r:${n.r}`;
      if (n.kind === 'root') {
        return `<button type="button" class="mm-node is-root" data-id="root" style="${style}" aria-label="${esc(n.label)}: your digital twin"><span class="mm-label">${esc(n.label)}</span></button>`;
      }
      if (n.kind === 'hub') {
        const pts = this.twin.points.filter((p) => p.section === n.section);
        const open = pts.filter((p) => p.status !== 'complete').length;
        return `<button type="button" class="mm-node is-hub" data-id="${esc(n.id)}" style="${style}" aria-label="Section ${esc(n.label)}: ${pts.length} knowledge points, ${open} need you"><span class="mm-label">${esc(n.label)}</span></button>`;
      }
      const p = n.point;
      const cls = p.status === 'complete' ? 'is-done' : `is-gap${p.status === 'conflict' ? ' is-conflict' : ''}`;
      // One small grey dot around the circle for each project the point was found in.
      const projects = p.projects || [];
      const dots = projects.map((_, i) => `<span class="mm-proj" style="--a:${Math.round(-90 + (360 / projects.length) * i)}deg" aria-hidden="true"></span>`).join('');
      const from = projects.length ? ` From ${projects.length === 1 ? 'one project' : `${projects.length} projects`}: ${projects.map((x) => projectName(this.twin, x)).join(', ')}.` : '';
      return `<button type="button" class="mm-node ${cls}" data-id="${esc(p.id)}" style="${style}" aria-label="${esc(p.title)}. ${STATUS_TEXT[p.status]}. Section ${esc(sectionTitle(p.section))}.${esc(from)}"><span class="mm-label">${esc(p.title)}</span>${p.status === 'conflict' ? '<span class="mm-badge" aria-hidden="true">!</span>' : ''}${dots}</button>`;
    }).join('');
    // Section labels first, so they get the best spots; the twin's name is also in the panel.
    const labels = [...this.nodes.filter((n) => n.kind === 'hub'), this.byId.get('root')]
      .map((n) => `<span class="mm-hub-label${n.kind === 'root' ? ' is-root-label' : ''}" data-for="${esc(n.id)}">${esc(n.label)}</span>`).join('');
    this.host.innerHTML = `
      <div class="mm-viewport" id="mm-viewport" tabindex="0" role="group" aria-roledescription="mind map"
        aria-label="Mind map of ${esc(this.twin.name)}. Drag to move around. Use plus and minus to zoom, 0 to fit, arrow keys to move. Tab moves between circles.">
        <div class="mm-world">
          <svg class="mm-links" width="1" height="1" aria-hidden="true" focusable="false">${lines}</svg>
        </div>
        <div class="mm-hub-labels" aria-hidden="true">${labels}</div>
        <div class="mm-world">${nodes}</div>
      </div>
      <div class="mm-pop" role="dialog" aria-label="Knowledge point details" hidden></div>`;
    this.viewport = this.host.querySelector('.mm-viewport');
    // Two layers move together: the lines below the section labels, and the circles above them,
    // so a label never covers a point.
    this.worlds = Array.from(this.host.querySelectorAll('.mm-world'));
    this.world = this.worlds[1];
    this.labelLayer = this.host.querySelector('.mm-hub-labels');
    this.pop = this.host.querySelector('.mm-pop');
  }

  bind() {
    const vp = this.viewport;
    let drag = null;

    this.onWheel = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      this.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top, false);
    };
    vp.addEventListener('wheel', this.onWheel, { passive: false });

    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const node = e.target.closest('.mm-node');
      drag = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, moved: false, node: node ? node.dataset.id : null, id: e.pointerId };
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        vp.classList.add('is-panning');
        this.hidePop();
      }
      if (drag.moved) this.setView({ x: drag.vx + dx, y: drag.vy + dy, k: this.view.k }, false);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.classList.remove('is-panning');
      if (vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
      const d = drag;
      drag = null;
      if (d.moved || e.type === 'pointercancel') return;
      if (d.node) this.tap(d.node, false);
      else this.select(null);
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);

    // Keyboard "clicks" on a focused circle (Enter or Space).
    vp.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      const node = e.target.closest('.mm-node');
      if (node) this.tap(node.dataset.id, true);
    });

    vp.addEventListener('keydown', (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const step = 90;
      const actions = {
        '+': () => this.zoomBy(1.25), '=': () => this.zoomBy(1.25), '-': () => this.zoomBy(0.8), _: () => this.zoomBy(0.8),
        '0': () => this.fit(true),
        ArrowLeft: () => this.panBy(step, 0), ArrowRight: () => this.panBy(-step, 0),
        ArrowUp: () => this.panBy(0, step), ArrowDown: () => this.panBy(0, -step),
        Escape: () => this.select(null),
      };
      const fn = actions[e.key];
      if (fn) { e.preventDefault(); fn(); }
    });

    vp.addEventListener('focusin', (e) => {
      const node = e.target.closest('.mm-node');
      if (node && e.target.matches(':focus-visible')) this.ensureVisible(node.dataset.id);
    });

    this.pop.addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]');
      const zoom = e.target.closest('[data-zoom]');
      if (open) this.onOpen(open.dataset.open);
      else if (zoom) this.focusNode(zoom.dataset.zoom, Math.max(this.view.k, 0.85));
      else if (e.target.closest('[data-close]')) this.select(null, true);
    });
    this.pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); this.select(null, true); } });

    this.onResize = () => this.place();
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }

  // ----- view math -----
  area() {
    const rect = this.viewport.getBoundingClientRect();
    const right = rect.width > 900 ? this.rightInset : 0;
    const bottom = rect.width > 900 ? this.bottomInset : 0;
    return { w: Math.max(240, rect.width - right), h: Math.max(240, rect.height - bottom), full: rect };
  }

  bounds() {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const n of this.nodes) {
      const pad = n.kind === 'point' ? 24 : 12;
      minX = Math.min(minX, n.x - n.r - pad); minY = Math.min(minY, n.y - n.r - pad);
      maxX = Math.max(maxX, n.x + n.r + pad); maxY = Math.max(maxY, n.y + n.r + pad);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  setView(v, animate) {
    this.view = { x: v.x, y: v.y, k: Math.min(MAX_K, Math.max(MIN_K, v.k)) };
    const smooth = animate && !reducedMotion();
    for (const world of this.worlds) {
      world.classList.toggle('is-animating', Boolean(smooth));
      world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.k})`;
      // The zoom level, for the styles that keep outlines crisp when zoomed out.
      world.style.setProperty('--k', this.view.k.toFixed(4));
    }
    this.viewport.classList.toggle('is-overview', this.view.k < LABEL_K);
    if (smooth) {
      clearTimeout(this.animTimer);
      this.animTimer = setTimeout(() => { this.worlds.forEach((w) => w.classList.remove('is-animating')); this.place(); }, 470);
    }
    this.place();
    this.onView(this.view);
  }

  fit(animate = true) {
    const { w, h } = this.area();
    const b = this.bounds();
    const pad = 70;
    const k = Math.min(1, Math.min((w - pad * 2) / b.w, (h - pad * 2 - 40) / b.h));
    const x = w / 2 - (b.x + b.w / 2) * k;
    const y = (h + 40) / 2 - (b.y + b.h / 2) * k;
    this.setView({ x, y, k }, animate);
  }

  zoomAt(factor, sx, sy, animate) {
    const { x, y, k } = this.view;
    const nk = Math.min(MAX_K, Math.max(MIN_K, k * factor));
    const wx = (sx - x) / k;
    const wy = (sy - y) / k;
    this.setView({ k: nk, x: sx - wx * nk, y: sy - wy * nk }, animate);
  }

  zoomBy(factor) {
    const { w, h } = this.area();
    this.zoomAt(factor, w / 2, h / 2, true);
  }

  panBy(dx, dy) {
    this.setView({ x: this.view.x + dx, y: this.view.y + dy, k: this.view.k }, true);
  }

  focusNode(id, k = 1) {
    const n = this.byId.get(id);
    if (!n) return;
    const { w, h } = this.area();
    const nk = Math.min(MAX_K, Math.max(MIN_K, k));
    this.setView({ k: nk, x: w / 2 - n.x * nk, y: h / 2 - n.y * nk }, true);
  }

  ensureVisible(id) {
    const n = this.byId.get(id);
    if (!n) return;
    const { w, h } = this.area();
    const sx = n.x * this.view.k + this.view.x;
    const sy = n.y * this.view.k + this.view.y;
    const margin = 80;
    if (sx < margin || sx > w - margin || sy < margin || sy > h - margin) this.focusNode(id, Math.max(this.view.k, LABEL_K + 0.1));
  }

  screen(n) {
    return { x: n.x * this.view.k + this.view.x, y: n.y * this.view.k + this.view.y, r: n.r * this.view.k };
  }

  // Keeps the section labels (shown when zoomed out) and the popover in place.
  // Each label goes in the clearest of 48 spots around its circle (covering another label is worse than
  // sitting under a point). A section's label leans towards the centre, where its points aren't; the twin's
  // name prefers the spot below the centre circle.
  place() {
    const overview = this.view.k < LABEL_K;
    const els = Array.from(this.labelLayer.children);
    for (const el of els) el.hidden = !overview;
    if (overview) {
      const k = this.view.k;
      // Room around each circle: a point's dashed ring, or its project dots further out.
      const circles = this.nodes.map((m) => ({ id: m.id, ...this.screen(m), pad: m.point?.projects?.length ? Math.max(10, 30 * k) : Math.max(4, 14 * k) }));
      const root = circles.find((c) => c.id === 'root');
      const sizes = els.map((el) => ({ w: el.offsetWidth, h: el.offsetHeight })); // all at once: one layout
      const taken = [];
      els.forEach((el, li) => {
        const s = circles.find((c) => c.id === el.dataset.for);
        const { w, h } = sizes[li];
        const prefer = s === root ? Math.PI / 2 : Math.atan2(root.y - s.y, root.x - s.x);
        const clashes = (b) => circles.filter((c) => c !== s && boxHitsCircle(b, c, c.pad)).length
          + 3 * taken.filter((t) => b.x < t.x + t.w && t.x < b.x + b.w && b.y < t.y + t.h && t.y < b.y + b.h).length;
        const last = el.dataset.spot === undefined ? -1 : Number(el.dataset.spot);
        let best = null;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const at = (d) => ({ x: s.x + cos * d - w / 2, y: s.y + sin * d - h / 2, w, h });
          // Start where the box's edge in this direction clears the circle by 6px, then step out until no corner touches it.
          let d = s.r + 6 + Math.min(w / 2 / Math.max(Math.abs(cos), 1e-6), h / 2 / Math.max(Math.abs(sin), 1e-6));
          while (boxHitsCircle(at(d), s, 6)) d += 2;
          for (let ring = 0; ring < 3; ring++) {
            const j = ring * 16 + i;
            const b = at(d + ring * 18);
            const c = clashes(b);
            // Clear spots first, then the one nearest the preferred direction. A label stays put while its spot is clear.
            const score = c * 10 + Math.abs(Math.atan2(Math.sin(a - prefer), Math.cos(a - prefer))) + ring * 0.5 - (j === last && !c ? 1 : 0);
            if (!best || score < best.score) best = { j, b, score };
          }
        }
        el.dataset.spot = best.j;
        el.style.left = `${best.b.x}px`;
        el.style.top = `${best.b.y}px`;
        taken.push(best.b);
      });
    }
    if (this.selected && !this.pop.hidden) this.placePop();
  }

  // ----- selection -----
  tap(id, fromKeyboard) {
    const n = this.byId.get(id);
    if (!n) return;
    const now = Date.now();
    const double = this.lastTap.id === id && now - this.lastTap.t < 400;
    this.lastTap = { id, t: now };
    if (n.kind === 'point') {
      if (double || (fromKeyboard && this.selected === id)) { this.onOpen(id); return; }
      if (this.view.k < LABEL_K && !fromKeyboard) this.focusNode(id, 0.95);
      this.select(id);
    } else {
      if (this.view.k < LABEL_K || double) this.focusNode(id, Math.max(this.view.k, 0.75));
      this.select(id);
    }
  }

  select(id, returnFocus = false) {
    const prev = this.selected;
    if (prev) {
      const el = this.nodeEl(prev);
      if (el) el.classList.remove('is-selected');
    }
    this.selected = id;
    if (!id) {
      this.hidePop();
      if (returnFocus && prev) { const el = this.nodeEl(prev); if (el) el.focus({ preventScroll: true }); }
      this.onSelect(null);
      return;
    }
    const el = this.nodeEl(id);
    if (el) el.classList.add('is-selected');
    this.showPop(id);
    this.onSelect(id);
  }

  nodeEl(id) {
    return this.world.querySelector(`.mm-node[data-id="${CSS.escape(id)}"]`);
  }

  showPop(id) {
    const n = this.byId.get(id);
    const sectionTitle = (sid) => (this.twin.sections.find((s) => s.id === sid) || {}).title || '';
    let html;
    if (n.kind === 'point') {
      const p = n.point;
      const dot = p.status === 'complete' ? 'is-done' : 'is-gap';
      const summary = p.final || p.summary || 'Nothing is written down about this yet.';
      html = `
        <p class="pop-sec">${esc(sectionTitle(p.section))}</p>
        <h3>${esc(p.title)}</h3>
        <p class="pop-status"><span class="dot-mini ${dot}"></span>${STATUS_TEXT[p.status]}</p>
        ${p.projects?.length ? `<p class="pop-projects"><span class="legend-projects" aria-hidden="true"><span></span><span></span><span></span></span>${p.projects.length === 1 ? 'From one project' : `From ${p.projects.length} projects`}: ${esc(p.projects.map((x) => projectName(this.twin, x)).join(', '))}</p>` : ''}
        <p class="pop-sum">${esc(summary.length > 150 ? summary.slice(0, 148) + '…' : summary)}</p>
        <div class="pop-actions"><button type="button" class="btn btn-primary btn-sm" data-open="${esc(p.id)}">${p.status === 'complete' ? 'Open' : 'Open and fill the gap'} ${icon('arrowRight', { size: 18 })}</button></div>`;
    } else {
      const pts = n.kind === 'root' ? this.twin.points : this.twin.points.filter((p) => p.section === n.section);
      const open = pts.filter((p) => p.status !== 'complete').length;
      html = `
        <p class="pop-sec">${n.kind === 'root' ? 'Your digital twin' : 'Section'}</p>
        <h3>${esc(n.label)}</h3>
        <p class="pop-sum">${pts.length} knowledge points. ${open ? `${open} still ${open === 1 ? 'needs' : 'need'} you.` : 'All validated.'}</p>
        <div class="pop-actions"><button type="button" class="btn btn-sm" data-zoom="${esc(n.id)}">Zoom in</button></div>`;
    }
    this.pop.innerHTML = `<button type="button" class="icon-btn icon-btn-sm icon-btn-plain pop-close" data-close aria-label="Close">${icon('close', { size: 18 })}</button>${html}`;
    this.pop.hidden = false;
    this.placePop();
  }

  placePop() {
    const n = this.byId.get(this.selected);
    if (!n) return;
    const s = this.screen(n);
    const { w, full } = this.area();
    const pw = this.pop.offsetWidth || 300;
    const ph = this.pop.offsetHeight || 200;
    const ring = n.kind === 'point' ? 24 * this.view.k : 8;
    let left = s.x + s.r + ring + 16;
    if (left + pw > w - 16) left = s.x - s.r - ring - 16 - pw;
    if (left < 16) left = Math.min(w - pw - 16, Math.max(16, s.x - pw / 2));
    let top = s.y - ph / 2;
    top = Math.max(16, Math.min(full.height - ph - 16, top));
    this.pop.style.left = `${left}px`;
    this.pop.style.top = `${top}px`;
  }

  hidePop() {
    this.pop.hidden = true;
  }

  pulse(id) {
    const el = this.nodeEl(id);
    if (!el) return;
    el.classList.add('is-pulse');
    setTimeout(() => el.classList.remove('is-pulse'), 3600);
  }
}

// A small static picture of a twin's whole map for the dashboard cards, drawn in a 300 × 150 frame
// (the card's 2:1 snapshot area). The map's wide side may stretch up to 1.5 times so it fills the
// frame, and the dots keep one size in every twin, so a big map and a small one read the same.
const THUMB_W = 300;
const THUMB_H = 150;

export function thumbnailSVG(twin) {
  if (!twin.points.length) {
    return `<svg viewBox="0 0 ${THUMB_W} ${THUMB_H}" aria-hidden="true" focusable="false"><circle cx="150" cy="62" r="26" fill="none" stroke="#8d8d8d" stroke-width="1.5" stroke-dasharray="5 5"></circle><text x="150" y="116" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#6b6b6b">No map yet</text></svg>`;
  }
  const nodes = layoutKnowledge(twin);
  const edges = edgesFor(twin, nodes);
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fitX = (THUMB_W - 36) / Math.max(1, maxX - minX);
  const fitY = (THUMB_H - 28) / Math.max(1, maxY - minY);
  const even = Math.min(fitX, fitY);
  const sx = Math.min(fitX, even * 1.5);
  const sy = Math.min(fitY, even * 1.5);
  const X = (x) => (THUMB_W / 2 + (x - (minX + maxX) / 2) * sx).toFixed(1);
  const Y = (y) => (THUMB_H / 2 + (y - (minY + maxY) / 2) * sy).toFixed(1);
  const lines = edges.map((e) => `<line x1="${X(e.a.x)}" y1="${Y(e.a.y)}" x2="${X(e.b.x)}" y2="${Y(e.b.y)}" stroke="#141414" stroke-opacity="${e.type === 'cross' ? 0.22 : 0.5}" stroke-width="0.8"></line>`).join('');
  const dots = nodes.map((n) => {
    const at = `cx="${X(n.x)}" cy="${Y(n.y)}"`;
    if (n.kind === 'root') return `<circle ${at} r="5.5" fill="#fff" stroke="#141414" stroke-width="1.5"></circle>`;
    if (n.kind === 'hub') return `<circle ${at} r="5" fill="#141414"></circle>`;
    if (n.point.status !== 'complete') {
      return `<circle ${at} r="3.2" fill="#fff" stroke="#141414" stroke-width="1.2"></circle><circle ${at} r="5.4" fill="none" stroke="#141414" stroke-width="0.8" stroke-dasharray="1.6 1.4"></circle>`;
    }
    return `<circle ${at} r="3.5" fill="#141414"></circle>`;
  }).join('');
  return `<svg viewBox="0 0 ${THUMB_W} ${THUMB_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${lines}${dots}</svg>`;
}
