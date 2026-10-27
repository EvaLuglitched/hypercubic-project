// "Which demo do you want to explore?": shown before the demo files load (P1 upload), and for the demo
// accounts on the log-in screen. One card per demo category in demo.js.
import { esc, icon, dialog } from '../ui.js';
import { CATEGORIES } from '../demo.js';

// Resolves with the chosen category's id, or null if the person cancels.
// `describe(category)` returns the { text, meta } lines for its card.
export function chooseCategory({ title, intro, confirmLabel, selected = null, describe }) {
  const preset = CATEGORIES.some((c) => c.id === selected) ? selected : null;
  return dialog({
    title,
    wide: true,
    body: `<p>${intro}</p>
      <div class="radio-cards cat-cards" role="radiogroup" aria-label="${esc(title)}">
        ${CATEGORIES.map((c) => {
          const d = describe(c);
          return `<label class="radio-card cat-card">
            <input type="radio" name="demo-category" value="${esc(c.id)}"${c.id === preset ? ' checked autofocus' : ''}>
            <span class="cat-icon" aria-hidden="true">${icon(c.icon, { size: 26 })}</span>
            <span class="cat-text"><strong>${esc(c.label)}</strong><span>${esc(d.text)}</span><span class="cat-meta">${esc(d.meta)}</span></span>
          </label>`;
        }).join('')}
      </div>`,
    actions: [
      { label: 'Cancel', value: null },
      { label: confirmLabel, primary: true, getValue: (box) => box.querySelector('input[name="demo-category"]:checked')?.value || null },
    ],
    onMount: (box, close) => {
      const confirm = box.querySelector('.dialog-actions .btn-primary');
      const sync = () => { confirm.disabled = !box.querySelector('input[name="demo-category"]:checked'); };
      sync();
      box.addEventListener('change', sync);
      // Shortcuts: double-click a card, or press Enter on one, to choose it straight away.
      box.addEventListener('dblclick', (e) => {
        const input = e.target.closest('.cat-card')?.querySelector('input');
        if (input) close(input.value);
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('input[name="demo-category"]')) {
          e.preventDefault();
          close(e.target.value);
        }
      });
    },
  });
}
