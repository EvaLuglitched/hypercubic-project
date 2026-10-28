// Figures inside a knowledge point document: process steps, bar charts, a journey curve, a priority matrix,
// sizes drawn to scale, small tables and file excerpts. Each takes plain data from the demo stories, so a
// real model could return the same shapes. Black and white, like the rest of the app.
import { esc } from './ui.js';

function steps(f) {
  return `<ol class="fig-steps">${f.items.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

function bars(f) {
  const max = f.max || Math.max(...f.bars.map((b) => b.value));
  return `<ul class="fig-bars">${f.bars.map((b) => `
    <li><span class="fig-bar-label">${esc(b.label)}</span>
      <span class="fig-bar-track"><span class="fig-bar" style="width:${Math.max(2, (b.value / max) * 100).toFixed(1)}%"></span></span>
      <span class="fig-bar-value">${esc(String(b.value))}${esc(f.unit || '')}</span></li>`).join('')}</ul>`;
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
  return `<table class="fig-table"><thead><tr>${f.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${f.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
}

export function codebox(x) {
  return `<figure class="codebox"><figcaption class="codebox-head"><span>${esc(x.file)}${x.where ? ` · ${esc(x.where)}` : ''}</span><span>${esc(x.lang || '')}</span></figcaption><pre>${esc(x.code)}</pre></figure>`;
}

const DRAW = { steps, bars, curve, matrix, sizes, table };

export function figureHTML(f) {
  if (f.kind === 'code') return codebox(f);
  const draw = DRAW[f.kind];
  if (!draw) return '';
  return `<figure class="kp-fig">${draw(f)}${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ''}</figure>`;
}
