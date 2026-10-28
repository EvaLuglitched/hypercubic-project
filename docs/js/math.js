// Formulas on knowledge point pages: a small TeX-to-MathML converter. Browsers draw MathML natively, so
// there is nothing to load. It covers what the demo stories use: fractions, roots, sub- and superscripts,
// sums and min/max with limits, accents, Greek letters, text, \left…\right, cases and common operators.
// Every character is escaped, so a formula can never inject markup. Unknown commands show as plain text.
import { esc } from './ui.js';

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'ϕ', varphi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ',
  Psi: 'Ψ', Omega: 'Ω',
};
const OPS = {
  cdot: '·', times: '×', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', approx: '≈', in: '∈', sim: '∼',
  propto: '∝', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', infty: '∞', pm: '±', mid: '∣', Vert: '‖',
  lVert: '‖', rVert: '‖', ldots: '…', cdots: '⋯', forall: '∀', partial: '∂', nabla: '∇', lfloor: '⌊', rfloor: '⌋',
  lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩', subset: '⊂', cup: '∪', cap: '∩', circ: '∘', '{': '{', '}': '}',
  '|': '‖',
};
// Big operators that take their limits above and below.
const LIMITS = { sum: '∑', prod: '∏', min: 'min', max: 'max', argmin: 'arg min', argmax: 'arg max', lim: 'lim', sup: 'sup', inf: 'inf' };
const FUNCS = new Set(['exp', 'log', 'ln', 'sin', 'cos', 'tan', 'arg', 'det', 'dim']);
const ACCENTS = { hat: '^', widehat: '^', bar: '¯', overline: '¯', tilde: '~', widetilde: '~', vec: '→', dot: '˙' };
const FENCES = new Set(['{', '}', '|', 'Vert', 'lVert', 'rVert', 'mid', 'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil']);
const SPACES = { ',': '0.17em', ':': '0.22em', ';': '0.28em', ' ': '0.33em', quad: '1em', qquad: '2em' };
// Browsers only support mathvariant="normal", so double-struck and script capitals use their Unicode
// math letters instead (𝔼, ℝ, ℳ…). Lowercase and other letters fall back to plain upright text.
const LETTERS = {
  mathbb: { base: 0x1d538, holes: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
  mathcal: { base: 0x1d49c, holes: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ' } },
};
const styled = (kind, text) => [...text].map((ch) => {
  const set = LETTERS[kind];
  if (!set || !/[A-Z]/.test(ch)) return ch;
  return set.holes[ch] || String.fromCodePoint(set.base + ch.charCodeAt(0) - 65);
}).join('');
const VARIANTS = new Set(['mathbb', 'mathcal', 'mathbf', 'mathrm', 'mathit']);

function tokenize(tex) {
  const out = [];
  for (let i = 0; i < tex.length;) {
    const c = tex[i];
    if (c === '\\') {
      const m = tex.slice(i + 1).match(/^([A-Za-z]+|.)/);
      out.push({ cmd: m ? m[1] : '' });
      i += 1 + (m ? m[1].length : 0);
    } else if (/\s/.test(c)) {
      // Spaces only matter inside \text{…}; the math parser skips them.
      if (!out.length || !out[out.length - 1].sp) out.push({ sp: true });
      i += 1;
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(tex[i + 1] || ''))) {
      const m = tex.slice(i).match(/^[0-9]*\.?[0-9]+|^[0-9]+/);
      out.push({ num: m[0] });
      i += m[0].length;
    } else {
      out.push({ ch: c });
      i += 1;
    }
  }
  return out;
}

const mo = (s, attrs = '') => `<mo${attrs}>${esc(s)}</mo>`;
const mi = (s, variant) => `<mi${variant ? ` mathvariant="${variant}"` : ''}>${esc(s)}</mi>`;
const row = (parts) => (parts.length === 1 ? parts[0] : `<mrow>${parts.join('')}</mrow>`);

export function texToMathML(tex, { display = true } = {}) {
  const t = tokenize(String(tex || ''));
  let i = 0;
  const peek = () => t[i];
  const isCh = (x, c) => x && x.ch === c;

  // Reads raw text up to the matching brace, for \text{…}.
  function rawGroup() {
    if (!isCh(peek(), '{')) return '';
    i += 1;
    let depth = 1;
    let s = '';
    while (i < t.length) {
      const x = t[i++];
      if (isCh(x, '{')) depth += 1;
      if (isCh(x, '}') && --depth === 0) break;
      s += x.sp || x.cmd === ' ' ? ' ' : x.ch ?? x.num ?? (GREEK[x.cmd] || OPS[x.cmd] || x.cmd);
    }
    return s;
  }

  // One argument: a {group} or a single token.
  function arg() {
    while (peek() && peek().sp) i += 1;
    if (isCh(peek(), '{')) {
      i += 1;
      const inner = seq((x) => isCh(x, '}'));
      i += 1;
      return row(inner.length ? inner : ['<mrow></mrow>']);
    }
    const a = atom();
    return a ? a.html : '<mrow></mrow>';
  }

  // A base with its limits flag, before any sub- or superscripts.
  function atom() {
    const x = t[i++];
    if (!x) return null;
    if (x.sp) return { html: '' };
    if (x.num) return { html: `<mn>${esc(x.num)}</mn>` };
    if (x.ch) {
      if (x.ch === '{') { const inner = seq((y) => isCh(y, '}')); i += 1; return { html: row(inner.length ? inner : ['<mrow></mrow>']) }; }
      if (/[A-Za-z]/.test(x.ch)) return { html: mi(x.ch) };
      if (x.ch === '-') return { html: mo('−') };
      // As in TeX, only \left…\right brackets grow with what's inside them.
      if ('()[]|'.includes(x.ch)) return { html: mo(x.ch, ' stretchy="false"') };
      if (x.ch === "'") return { html: mo('′') };
      return { html: mo(x.ch) };
    }
    const c = x.cmd;
    if (GREEK[c]) return { html: mi(GREEK[c]) };
    if (LIMITS[c]) {
      // "arg min" is two words with a thin space; MathML would run them together.
      if (c === 'sum' || c === 'prod') return { html: mo(LIMITS[c], ' largeop="true"'), limits: display };
      const words = LIMITS[c].split(' ').map((w) => mi(w, 'normal'));
      // One element either way, so it can carry limits underneath.
      return { html: words.length > 1 ? `<mrow>${words.join(`<mspace width="${SPACES[',']}"></mspace>`)}</mrow>` : words[0], limits: display };
    }
    if (FUNCS.has(c)) return { html: mi(c, 'normal') };
    if (SPACES[c]) return { html: `<mspace width="${SPACES[c]}"></mspace>` };
    if (OPS[c]) return { html: mo(OPS[c], FENCES.has(c) ? ' stretchy="false"' : '') };
    if (c === 'frac') { const a = arg(); const b = arg(); return { html: `<mfrac>${a}${b}</mfrac>` }; }
    if (c === 'sqrt') return { html: `<msqrt>${arg()}</msqrt>` };
    if (ACCENTS[c]) return { html: `<mover accent="true">${arg()}${mo(ACCENTS[c])}</mover>` };
    if (c === 'text' || c === 'operatorname') {
      const s = rawGroup();
      if (c !== 'text') return { html: mi(s, 'normal') };
      // MathML trims spaces at the ends of text, so they become real spaces.
      const gap = `<mspace width="${SPACES[' ']}"></mspace>`;
      return { html: `${/^\s/.test(s) ? gap : ''}<mtext>${esc(s.trim())}</mtext>${/\s$/.test(s) ? gap : ''}` };
    }
    if (VARIANTS.has(c)) {
      const s = rawGroup();
      if (c === 'mathbb' || c === 'mathcal') return { html: mi(styled(c, s)) };
      if (c === 'mathbf') return { html: `<mi mathvariant="normal" style="font-weight:700">${esc(s)}</mi>` };
      return { html: c === 'mathit' ? mi(s) : mi(s, 'normal') };
    }
    if (c === 'left' || c === 'right') {
      const d = t[i++];
      const sym = d ? (d.ch ?? OPS[d.cmd] ?? '') : '';
      return { html: sym === '.' || !sym ? '' : mo(sym, ` stretchy="true" fence="true"`) };
    }
    if (c === 'begin') {
      const env = rawGroup();
      if (env !== 'cases') return { html: `<mtext>${esc(env)}</mtext>` };
      const rows = [[[]]];
      while (i < t.length && !(t[i].cmd === 'end')) {
        if (peek().sp) { i += 1; continue; }
        if (isCh(peek(), '&')) { i += 1; rows[rows.length - 1].push([]); continue; }
        if (peek().cmd === '\\') { i += 1; rows.push([[]]); continue; }
        const cell = rows[rows.length - 1];
        cell[cell.length - 1].push(...seq((y) => !y || isCh(y, '&') || y.cmd === '\\' || y.cmd === 'end'));
      }
      i += 1;
      rawGroup();
      const table = rows.filter((r) => r.some((c2) => c2.length))
        .map((r) => `<mtr>${r.map((c2) => `<mtd>${row(c2.length ? c2 : ['<mrow></mrow>'])}</mtd>`).join('')}</mtr>`).join('');
      return { html: `<mrow>${mo('{', ' stretchy="true" fence="true"')}<mtable columnalign="left left" columnspacing="1em">${table}</mtable></mrow>` };
    }
    return { html: `<mtext>${esc(c)}</mtext>` };
  }

  // A run of atoms with their scripts, until `stop` says so.
  function seq(stop) {
    const parts = [];
    while (i < t.length && !stop(t[i])) {
      const base = atom();
      if (!base) break;
      let sub = null;
      let sup = null;
      while (peek() && peek().sp && (isCh(t[i + 1], '_') || isCh(t[i + 1], '^'))) i += 1;
      while (isCh(peek(), '_') || isCh(peek(), '^')) {
        const which = t[i++].ch;
        if (which === '_') sub = arg(); else sup = arg();
      }
      const b = base.html || '<mrow></mrow>';
      if (base.limits && (sub || sup)) {
        parts.push(sub && sup ? `<munderover>${b}${sub}${sup}</munderover>` : sub ? `<munder>${b}${sub}</munder>` : `<mover>${b}${sup}</mover>`);
      } else if (sub && sup) parts.push(`<msubsup>${b}${sub}${sup}</msubsup>`);
      else if (sub) parts.push(`<msub>${b}${sub}</msub>`);
      else if (sup) parts.push(`<msup>${b}${sup}</msup>`);
      else if (base.html) parts.push(base.html);
    }
    return parts;
  }

  const body = seq(() => false);
  return `<math${display ? ' display="block"' : ''}><mrow>${body.join('')}</mrow></math>`;
}
