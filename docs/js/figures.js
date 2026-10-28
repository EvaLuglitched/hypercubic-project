// Figures inside a knowledge point document: process steps, bar charts, line charts, a journey curve, a
// priority matrix, sizes drawn to scale, small tables, formulas and file excerpts. Each takes plain data from
// the demo stories, so a real model could return the same shapes. Black and white, like the rest of the app.
import { esc } from './ui.js';
import { texToMathML } from './math.js';

function steps(f) {
  return `<ol class="fig-steps">${f.items.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

const shown = (v, unit = '') => `${v < 0 ? '−' : ''}${esc(String(Math.abs(v)))}${esc(unit)}`;

// One bar per row. Bars marked `strong` stay black and the rest turn grey; `series` makes grouped bars.
function bars(f) {
  if (f.series) return groupedBars(f);
  const max = f.max || Math.max(...f.bars.map((b) => b.value));
  const focus = f.bars.some((b) => b.strong);
  return `<ul class="fig-bars">${f.bars.map((b) => `
    <li${b.strong ? ' class="is-strong"' : ''}><span class="fig-bar-label">${esc(b.label)}</span>
      <span class="fig-bar-track"><span class="fig-bar${focus && !b.strong ? ' is-soft' : ''}" style="width:${Math.max(2, (b.value / max) * 100).toFixed(1)}%"></span></span>
      <span class="fig-bar-value">${b.display ? esc(b.display) : shown(b.value, f.unit)}</span></li>`).join('')}</ul>`;
}

function groupedBars(f) {
  const max = f.max || Math.max(...f.bars.flatMap((b) => b.values.map(Math.abs)));
  return `<p class="fig-legend">${f.series.map((s, i) => `<span><span class="fig-swatch is-s${i}" aria-hidden="true"></span>${esc(s)}</span>`).join('')}</p>
    <ul class="fig-bars is-grouped">${f.bars.map((b) => `
      <li><span class="fig-bar-label">${esc(b.label)}</span>
        <span class="fig-bar-group">${b.values.map((v, i) => `<span class="fig-bar-row" aria-label="${esc(f.series[i])}: ${shown(v, f.unit)}">
          <span class="fig-bar-track"><span class="fig-bar is-s${i}" style="width:${v > 0 ? Math.max(2, (v / max) * 100).toFixed(1) : 0}%"></span></span>
          <span class="fig-bar-value">${shown(v, f.unit)}</span></span>`).join('')}</span></li>`).join('')}</ul>`;
}

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const tick = (v, log) => (log ? `10${String(Math.round(Math.log10(v))).split('').map((d) => (d === '-' ? '⁻' : SUPER[d])).join('')}` : v >= 1000 ? `${v / 1000}k` : String(v));

// Lines over a shared x axis, with an optional log scale for y. Up to four series, told apart by line style.
function lines(f) {
  const W = 560;
  const H = 280;
  const L = 58;
  const R = W - 16;
  const T = 14;
  const B = H - 44;
  const { x, y } = f;
  const ly = (v) => (y.log ? Math.log10(v) : v);
  const px = (v) => L + ((v - (x.min || 0)) / (x.max - (x.min || 0))) * (R - L);
  const py = (v) => B - ((ly(v) - ly(y.min)) / (ly(y.max) - ly(y.min))) * (B - T);
  const styles = ['is-strong', 'is-dashed', 'is-soft', 'is-dotted'];
  return `<svg class="fig-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(f.caption || 'Line chart')}">
    ${(y.ticks || []).map((v) => `<line x1="${L}" y1="${py(v).toFixed(1)}" x2="${R}" y2="${py(v).toFixed(1)}" class="fig-grid"></line><text x="${L - 8}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end" class="fig-text">${tick(v, y.log)}</text>`).join('')}
    ${(x.ticks || []).map((v) => `<text x="${px(v).toFixed(1)}" y="${B + 18}" text-anchor="middle" class="fig-text">${tick(v, false)}</text>`).join('')}
    <line x1="${L}" y1="${B}" x2="${R}" y2="${B}" class="fig-axis"></line>
    <line x1="${L}" y1="${T}" x2="${L}" y2="${B}" class="fig-axis"></line>
    <text x="${(L + R) / 2}" y="${H - 6}" text-anchor="middle" class="fig-text">${esc(x.label)} →</text>
    ${y.label ? `<text x="12" y="${(T + B) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(T + B) / 2})" class="fig-text">${esc(y.label)} →</text>` : ''}
    ${f.series.map((s, i) => `<polyline points="${s.points.map(([a, b]) => `${px(a).toFixed(1)},${py(b).toFixed(1)}`).join(' ')}" class="fig-series ${styles[i % styles.length]}"></polyline>`).join('')}
  </svg>
  <p class="fig-legend">${f.series.map((s, i) => `<span><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" class="fig-series ${styles[i % styles.length]}"></line></svg>${esc(s.name)}</span>`).join('')}</p>`;
}

// A journey: one dot per stage, joined by a line, with the low point ringed like a "Needs you" point.
function curve(f) {
  const W = 560;
  const H = 190;
  const padX = 44;
  const top = 26;
  const bottom = 132;
  const n = f.stages.length;
  const x = (i) => padX + (i * (W - padX * 2)) / Math.max(1, n - 1);
  const y = (v) => bottom - v * (bottom - top);
  const pts = f.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const low = f.low ?? f.values.indexOf(Math.min(...f.values));
  return `<svg class="fig-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(f.caption || 'Journey')}">
    <line x1="${padX}" y1="${bottom + 10}" x2="${W - padX}" y2="${bottom + 10}" class="fig-axis"></line>
    <polyline points="${pts}" class="fig-line"></polyline>
    ${f.values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === low ? 7 : 5}" class="${i === low ? 'fig-dot is-low' : 'fig-dot'}"></circle>${i === low ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="13" class="fig-ring"></circle>` : ''}`).join('')}
    ${f.stages.map((s, i) => `<text x="${x(i).toFixed(1)}" y="${H - 22}" text-anchor="middle" class="fig-text">${esc(s)}</text>`).join('')}
    <text x="${x(low).toFixed(1)}" y="${(y(f.values[low]) - 20).toFixed(1)}" text-anchor="middle" class="fig-text is-strong">Low point</text>
  </svg>`;
}

// Two axes from low to high, one dot per item, and the corner that matters labelled.
function matrix(f) {
  const W = 560;
  const H = 300;
  const L = 64;
  const R = W - 24;
  const T = 18;
  const B = H - 52;
  const px = (v) => L + v * (R - L);
  const py = (v) => B - v * (B - T);
  return `<svg class="fig-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(f.caption || 'Matrix')}">
    <rect x="${px(0.5)}" y="${T}" width="${R - px(0.5)}" height="${py(0.5) - T}" class="fig-zone"></rect>
    <text x="${R - 10}" y="${T + 20}" text-anchor="end" class="fig-text is-strong">${esc(f.corner || 'Fix first')}</text>
    <line x1="${L}" y1="${B}" x2="${R}" y2="${B}" class="fig-axis"></line>
    <line x1="${L}" y1="${T}" x2="${L}" y2="${B}" class="fig-axis"></line>
    <line x1="${px(0.5)}" y1="${T}" x2="${px(0.5)}" y2="${B}" class="fig-grid"></line>
    <line x1="${L}" y1="${py(0.5)}" x2="${R}" y2="${py(0.5)}" class="fig-grid"></line>
    <text x="${(L + R) / 2}" y="${H - 14}" text-anchor="middle" class="fig-text">${esc(f.x)} →</text>
    <text x="22" y="${(T + B) / 2}" text-anchor="middle" transform="rotate(-90 22 ${(T + B) / 2})" class="fig-text">${esc(f.y)} →</text>
    ${f.items.map((it) => `<circle cx="${px(it.x).toFixed(1)}" cy="${py(it.y).toFixed(1)}" r="6" class="fig-dot"></circle>
      <text x="${(px(it.x) + (it.x > 0.75 ? -12 : 12)).toFixed(1)}" y="${(py(it.y) + 4).toFixed(1)}" text-anchor="${it.x > 0.75 ? 'end' : 'start'}" class="fig-text">${esc(it.label)}</text>`).join('')}
  </svg>`;
}

// Squares at their real size, so 44 and 32 can be compared at a glance.
function sizes(f) {
  return `<div class="fig-sizes">${f.items.map((s) => `
    <div class="fig-size"><span class="fig-square" style="width:${s.size}px;height:${s.size}px"></span>
      <span class="fig-size-label"><strong>${esc(String(s.size))} ${esc(s.unit || 'px')}</strong>${esc(s.label)}</span></div>`).join('')}</div>`;
}

function table(f) {
  return `<div class="fig-scroll"><table class="fig-table"><thead><tr>${f.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${f.rows.map((r) => {
      // A row is a list of cells, or { cells, strong } to make it bold.
      const cells = Array.isArray(r) ? r : r.cells;
      return `<tr${r.strong ? ' class="is-strong"' : ''}>${cells.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
}

// One or more formulas, written in TeX, each with an optional note under it.
function formula(f) {
  const items = f.tex ? [{ tex: f.tex, note: f.note }] : f.items;
  return items.map((it) => `<div class="fig-scroll fig-math">${texToMathML(it.tex)}</div>${it.note ? `<p class="fig-note">${esc(it.note)}</p>` : ''}`).join('');
}

export function codebox(x) {
  return `<figure class="codebox"><figcaption class="codebox-head"><span>${esc(x.file)}${x.where ? ` · ${esc(x.where)}` : ''}</span><span>${esc(x.lang || '')}</span></figcaption><pre>${esc(x.code)}</pre></figure>`;
}

const DRAW = { steps, bars, lines, curve, matrix, sizes, table, formula };

export function figureHTML(f) {
  if (f.kind === 'code') return codebox(f);
  const draw = DRAW[f.kind];
  if (!draw) return '';
  return `<figure class="kp-fig">${draw(f)}${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ''}</figure>`;
}
