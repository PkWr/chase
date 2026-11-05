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

const FONT_KEY = 'compositorStyleFonts';

/** Typeface chosen for each style, '' meaning the body typeface. */
export function getStyleFonts() {
    const out = {};
    for (const style of Object.keys(ROWS)) {
        out[style] = document.querySelector(`.style-font[data-style="${style}"]`)?.value || '';
    }
    return out;
}

function refresh() {
    const text = document.getElementById('sampleText')?.value || '';
    const used = stylesUsed(parseStyled(text));
    const typeSize = parseFloat(document.getElementById('typeSize')?.value) || 12;
    const family = document.getElementById('fontFamily')?.value || 'serif';
    let any = false;
    for (const [style, [id, key]] of Object.entries(ROWS)) {
        const row = document.querySelector(`.style-row[data-style="${style}"]`);
        if (row)
            row.hidden = false; // every style is always listed, used or not
        any = any || used[style];
        const readout = document.getElementById(id + 'Pt');
        const v = parseFloat(document.getElementById(id)?.value);
        // The label is a preview of the style: set at the style's size (1 pt = 4/3 px) in the body typeface
        const label = row?.querySelector('label');
        if (label && isFinite(v)) {
            const bodyPx = typeSize * 4 / 3;
            label.style.fontFamily = getStyleFonts()[style] || family;
            label.style.fontStyle = 'normal';
            label.style.fontSize = (style === 'quote' ? bodyPx : bodyPx * v) + 'px';
            label.style.lineHeight = '1.15';
            label.style.paddingLeft = style === 'quote' || style === 'citation' ? (style === 'quote' ? v : STYLE_DEFAULTS.quoteIndent) * bodyPx + 'px' : '0';
        }
        if (readout && isFinite(v)) {
            readout.textContent = `${Math.round(v * typeSize * 10) / 10} pt`;
        }
    }
    const none = document.getElementById('stylesNone');
    if (none)
        none.hidden = true;
    const note = document.getElementById('stylesNote');
    if (note)
        note.hidden = false;
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
    // A typeface menu for each style, built from the body typeface menu; the first choice follows the body
    let savedFonts = {};
    try { savedFonts = JSON.parse(localStorage.getItem(FONT_KEY) || '{}') || {}; } catch (e) { savedFonts = {}; }
    const bodyMenu = document.getElementById('fontFamily');
    for (const style of Object.keys(ROWS)) {
        const row = document.querySelector(`.style-row[data-style="${style}"]`);
        const anchor = row?.querySelector('.num-step, input');
        if (!row || !bodyMenu || !anchor)
            continue;
        const sel = document.createElement('select');
        sel.className = 'style-font';
        sel.dataset.style = style;
        sel.setAttribute('aria-label', `${row.querySelector('label')?.textContent || style} typeface`);
        sel.innerHTML = '<option value="">Same as body</option>' + bodyMenu.innerHTML;
        sel.value = savedFonts[style] || '';
        if (sel.value !== (savedFonts[style] || ''))
            sel.value = '';
        sel.addEventListener('change', () => {
            refresh();
            try { localStorage.setItem(FONT_KEY, JSON.stringify(getStyleFonts())); } catch (e) { /* storage can be unavailable */ }
            if (onChange)
                onChange();
        });
        row.insertBefore(sel, anchor.closest('.num-step') || anchor);
    }
    document.getElementById('sampleText')?.addEventListener('input', refresh);
    document.getElementById('typeSize')?.addEventListener('input', refresh);
    document.getElementById('fontFamily')?.addEventListener('change', refresh);
    refresh();
}
