// The Styles block in the panel: size ratios for the heading levels, the quote indent and the citation
// size. Rows show only for the styles the text uses. Values are remembered between visits.
import { parseStyled, stylesUsed } from './styled-text.js';
import { STYLE_DEFAULTS } from './style-settings.js';

const KEY = 'compositorStyles2'; // new key: the heading defaults changed
// style -> [input id, settings key, readout kind]
const ROWS = {
    h1: ['styleH1', 'h1'],
    h2: ['styleH2', 'h2'],
    h3: ['styleH3', 'h3'],
    quote: ['styleQuote', 'quoteIndent'],
    citation: ['styleCitation', 'citationSize'],
};

/** Current style settings from the panel, falling back to the defaults. */
export function getStyleSettings() {
    const out = { ...STYLE_DEFAULTS };
    for (const [, [id, key]] of Object.entries(ROWS)) {
        const v = parseFloat(document.getElementById(id)?.value);
        if (isFinite(v) && v > 0)
            out[key] = v;
    }
    return out;
}

function refresh() {
    const text = document.getElementById('sampleText')?.value || '';
    const used = stylesUsed(parseStyled(text));
    const typeSize = parseFloat(document.getElementById('typeSize')?.value) || 12;
    let any = false;
    for (const [style, [id, key]] of Object.entries(ROWS)) {
        const row = document.querySelector(`.style-row[data-style="${style}"]`);
        if (row)
            row.hidden = !used[style];
        any = any || used[style];
        const readout = document.getElementById(id + 'Pt');
        const v = parseFloat(document.getElementById(id)?.value);
        if (readout && isFinite(v)) {
            readout.textContent = `${Math.round(v * typeSize * 10) / 10} pt`;
        }
    }
    const none = document.getElementById('stylesNone');
    if (none)
        none.hidden = any;
    const note = document.getElementById('stylesNote');
    if (note)
        note.hidden = !any;
}

/** Wires the panel. onChange redraws the page. */
export function initStylesPanel(onChange) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    for (const [, [id, key]] of Object.entries(ROWS)) {
        const input = document.getElementById(id);
        if (!input)
            continue;
        input.value = String(isFinite(saved[key]) && saved[key] > 0 ? saved[key] : STYLE_DEFAULTS[key]);
        input.addEventListener('input', () => {
            refresh();
            try { localStorage.setItem(KEY, JSON.stringify(getStyleSettings())); } catch (e) { /* storage can be unavailable */ }
            if (onChange)
                onChange();
        });
    }
    document.getElementById('sampleText')?.addEventListener('input', refresh);
    document.getElementById('typeSize')?.addEventListener('input', refresh);
    refresh();
}
